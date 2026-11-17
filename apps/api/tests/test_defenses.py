"""P6 defense layers and evaluation matrix (ADR-017)."""

import psycopg
import pytest
from fastapi.testclient import TestClient

from queryshield_api.main import app
from queryshield_api.modules.defenses.layers import Layers, detect, passes_allow_list
from queryshield_api.modules.evaluation.matrix import CASES, CONFIGURATIONS, EXPECTED
from support import requires_db

EXECUTE = "/api/v1/labs/login-bypass/execute"
EVALUATE = "/api/v1/labs/login-bypass/evaluation/run"


@pytest.mark.parametrize(
    ("username", "allowed"),
    [
        ("student01", True),
        ("nguyễn.văn.an", True),
        ("first.last@desk", True),
        ("admin' -- ", False),
        ("o'connor", False),  # legitimate but rejected: the cost of L2
        ("a" * 65, False),
    ],
)
def test_allow_list(username: str, allowed: bool) -> None:
    assert passes_allow_list(username) is allowed


def test_detection_is_rule_ids_only() -> None:
    assert detect("admin' -- ") == ["QUOTE", "COMMENT"]
    assert detect("o'connor") == ["QUOTE"]
    assert detect("student01") == []


def test_active_layers_reflect_mode_and_switches() -> None:
    assert Layers().active("vulnerable") == ["monitoring"]
    assert Layers(input_validation=True, error_masking=True).active("secure") == [
        "binding",
        "validation",
        "error_masking",
        "monitoring",
    ]


def test_matrix_expectations_are_complete() -> None:
    assert len(EXPECTED) == len(CONFIGURATIONS) * len(CASES)


@requires_db
class TestWithDatabase:
    @pytest.fixture
    def client(self, api_env) -> TestClient:
        return TestClient(app)

    def test_validation_rejects_before_database(self, client) -> None:
        body = client.post(
            EXECUTE,
            json={
                "mode": "vulnerable",
                "username": "admin' -- ",
                "password": "wrong-password",
                "layers": {"input_validation": True},
            },
        ).json()
        assert body["outcome"] == "REJECTED_BY_VALIDATION"
        assert body["authentication"]["authenticated"] is False
        assert body["inspector"]["observations"] == ["REJECTED_BEFORE_DATABASE"]
        assert body["layers"] == ["validation", "monitoring"]

    def test_binding_accepts_legitimate_apostrophe_name(self, client) -> None:
        body = client.post(
            EXECUTE,
            json={"mode": "secure", "username": "o'connor", "password": "OConnorDemo123!"},
        ).json()
        assert body["outcome"] == "AUTHENTICATED"
        assert body["alerts"] == ["QUOTE"]  # L5 false alarm, recorded but not blocking

    def test_error_masking_hides_sqlstate_but_keeps_it_internally(self, client, lab_db) -> None:
        body = client.post(
            EXECUTE,
            json={
                "mode": "vulnerable",
                "username": "o'connor",
                "password": "OConnorDemo123!",
                "layers": {"error_masking": True},
            },
        ).json()
        assert body["outcome"] == "QUERY_ERROR"
        assert body["query_error"] == {"sqlstate": None, "category": "masked"}
        with psycopg.connect(lab_db["admin"]) as conn:
            stored = conn.execute(
                "SELECT sqlstate FROM lab.runs WHERE id = %s", (body["run_id"],)
            ).fetchone()[0]
        assert stored == "42601"

    def test_security_events_store_rule_ids_not_input(self, client, lab_db) -> None:
        run = client.post(
            EXECUTE, json={"mode": "secure", "username": "admin' -- ", "password": "x-probe"}
        ).json()
        with psycopg.connect(lab_db["admin"]) as conn:
            rows = conn.execute(
                "SELECT row_to_json(e)::text FROM lab.security_events e WHERE run_id = %s",
                (run["run_id"],),
            ).fetchall()
        stored = " ".join(r[0] for r in rows)
        assert '"QUOTE"' in stored and '"COMMENT"' in stored
        assert "admin" not in stored and "x-probe" not in stored

    def test_least_privilege_is_measured_from_catalog(self, client) -> None:
        report = client.get("/api/v1/labs/login-bypass/defenses").json()["least_privilege"]
        tables = {t["table"]: t["granted"] for t in report["tables"]}
        assert tables["demo.users"] == ["SELECT"]
        assert tables["demo.tickets"] == []
        assert tables["lab.runs"] == []
        assert tables["lab.security_events"] == []
        assert report["superuser"] is False
        assert "statement_timeout=2s" in report["settings"]
        assert "default_transaction_read_only=on" in report["settings"]

    def test_evaluation_matrix_meets_written_expectations(self, client) -> None:
        body = client.post(EVALUATE).json()
        failed = [
            (c["configuration_id"], c["test_case_id"], c["actual_outcome"])
            for c in body["cells"]
            if c["status"] != "passed"
        ]
        assert failed == []
        assert body["expectations_met"] == body["expectations_total"] == 20

        summary = {c["id"]: c for c in body["configurations"]}
        assert summary["C0"]["attack_blocked"] is False
        assert summary["C0"]["false_rejections"] == 1  # o'connor breaks the concatenated SQL
        assert summary["C1"]["attack_blocked"] is True
        assert summary["C1"]["false_rejections"] == 1
        assert summary["C2"]["attack_blocked"] is True
        assert summary["C2"]["false_rejections"] == 0
        assert summary["C3"]["false_rejections"] == 1
        assert all(c["alerts_on_attack"] == 1 for c in summary.values())
        assert all(c["alerts_on_legitimate"] == 1 for c in summary.values())


@requires_db
def test_evaluation_skips_unsafe_configurations_when_guard_off(api_env_guard_off) -> None:
    body = TestClient(app).post(EVALUATE).json()
    summary = {c["id"]: c for c in body["configurations"]}
    assert summary["C0"]["skipped"] and summary["C1"]["skipped"]
    assert not summary["C2"]["skipped"]
    skipped = [c for c in body["cells"] if c["status"] == "skipped"]
    assert len(skipped) == 10
    assert body["expectations_total"] == 10
