"""REST API against real PostgreSQL: contract, evidence, no-leak, suite runner (T03, T09, T10)."""

import psycopg
import pytest
from fastapi.testclient import TestClient

from queryshield_api.main import app
from support import requires_db

pytestmark = requires_db

EXECUTE = "/api/v1/labs/login-bypass/execute"
ATTACK = {"username": "admin' -- ", "password": "wrong-password"}
SECRET_PASSWORD = "Unique-Leak-Probe-7731"


@pytest.fixture
def client(api_env) -> TestClient:
    return TestClient(app)


def test_health_reports_database_and_dataset(client) -> None:
    body = client.get("/api/v1/health").json()
    assert body["database"] == "ok"
    assert body["datasetVersion"] == "fixtures-v3-shop"
    assert body["unsafeLabEnabled"] is True


def test_catalog_lists_login_bypass(client) -> None:
    body = client.get("/api/v1/labs").json()
    assert [s["id"] for s in body["scenarios"]] == ["login-bypass"]


def test_test_cases_expose_no_passwords(client) -> None:
    text = client.get("/api/v1/labs/login-bypass/test-cases").text
    for secret in ("StudentDemo123!", "AdminDemo123!", "StaffDemo123!"):
        assert secret not in text


def test_t03_same_input_bypasses_vulnerable_and_fails_secure(client) -> None:
    vulnerable = client.post(EXECUTE, json={"mode": "vulnerable", **ATTACK, "test_case_id": "T03"})
    secure = client.post(EXECUTE, json={"mode": "secure", **ATTACK, "test_case_id": "T03"})
    assert vulnerable.status_code == secure.status_code == 200

    v, s = vulnerable.json(), secure.json()
    assert v["authentication"]["authenticated"] is True
    assert v["authentication"]["simulated_user"] == {"username": "admin", "role": "admin"}
    assert v["inspector"]["explanation_code"] == "UNSAFE_CONCATENATION"
    assert "PASSWORD_CHECK_COMMENTED_OUT" in v["inspector"]["observations"]

    assert s["authentication"]["authenticated"] is False
    assert s["outcome"] == "DENIED"
    assert s["inspector"]["explanation_code"] == "PARAMETER_BINDING"
    assert v["run_id"] != s["run_id"]


def test_t05_apostrophe_breaks_vulnerable_query_honestly(client) -> None:
    body = client.post(
        EXECUTE, json={"mode": "vulnerable", "username": "O'Connor", "password": "x"}
    ).json()
    assert body["outcome"] == "QUERY_ERROR"
    assert body["authentication"]["authenticated"] is False
    assert body["query_error"]["sqlstate"] == "42601"


def test_t10_no_token_and_no_password_leak(client, lab_db) -> None:
    response = client.post(
        EXECUTE, json={"mode": "vulnerable", "username": "admin' -- ", "password": SECRET_PASSWORD}
    )
    assert response.status_code == 200
    assert "set-cookie" not in {h.lower() for h in response.headers}
    assert "authorization" not in {h.lower() for h in response.headers}
    assert SECRET_PASSWORD not in response.text

    run_id = response.json()["run_id"]
    assert SECRET_PASSWORD not in client.get(f"/api/v1/labs/runs/{run_id}").text
    with psycopg.connect(lab_db["admin"]) as conn:
        row = conn.execute("SELECT row_to_json(r)::text FROM lab.runs r WHERE id = %s", (run_id,))
        stored = row.fetchone()[0]
    assert SECRET_PASSWORD not in stored
    assert "admin' --" not in stored  # free-text input is not persisted either


def test_run_summary_is_persisted_with_measured_values(client) -> None:
    run = client.post(
        EXECUTE, json={"mode": "secure", "username": "student01", "password": "StudentDemo123!"}
    ).json()
    summary = client.get(f"/api/v1/labs/runs/{run['run_id']}").json()
    assert summary["outcome"] == "AUTHENTICATED"
    assert summary["simulated_user"] == "student01"
    assert summary["duration_ms"] == run["duration_ms"] >= 0


def test_unknown_test_case_id_rejected(client) -> None:
    response = client.post(EXECUTE, json={"mode": "secure", **ATTACK, "test_case_id": "T99"})
    assert response.status_code == 404


def test_suite_runs_all_cases_and_passes(client) -> None:
    body = client.post("/api/v1/labs/login-bypass/tests/run").json()
    assert body["total"] == 18
    assert body["skipped"] == 0
    failed = [
        (r["test_case_id"], r["mode"], r["actual_outcome"])
        for r in body["results"]
        if r["status"] != "passed"
    ]
    assert failed == []
    t03 = {r["mode"]: r for r in body["results"] if r["test_case_id"] == "T03"}
    assert t03["vulnerable"]["actual_authenticated"] is True
    assert t03["secure"]["actual_authenticated"] is False

    recent = client.get("/api/v1/labs/login-bypass/results?limit=18").json()["runs"]
    assert {r["suite_id"] for r in recent} == {body["suite_id"]}


def test_securedesk_session_shows_admin_impact_without_auth(client) -> None:
    run = client.post(EXECUTE, json={"mode": "vulnerable", **ATTACK}).json()
    response = client.get(f"/api/v1/securedesk/simulated-session/{run['run_id']}")
    assert response.status_code == 200
    assert "set-cookie" not in {h.lower() for h in response.headers}
    body = response.json()
    assert body["simulated"] is True
    assert body["profile"]["role"] == "admin"
    assert any(t["visibility"] == "internal" for t in body["tickets"])

    denied = client.post(EXECUTE, json={"mode": "secure", **ATTACK}).json()
    missing = client.get(f"/api/v1/securedesk/simulated-session/{denied['run_id']}")
    assert missing.status_code == 404


def test_student_session_sees_only_own_tickets(client) -> None:
    run = client.post(
        EXECUTE, json={"mode": "secure", "username": "student01", "password": "StudentDemo123!"}
    ).json()
    body = client.get(f"/api/v1/securedesk/simulated-session/{run['run_id']}").json()
    assert {t["owner_username"] for t in body["tickets"]} == {"student01"}


class TestGuardOff:
    @pytest.fixture
    def client(self, api_env_guard_off) -> TestClient:
        return TestClient(app)

    def test_t09_vulnerable_refused_and_recorded(self, client) -> None:
        response = client.post(EXECUTE, json={"mode": "vulnerable", **ATTACK})
        assert response.status_code == 403
        run_id = response.json()["error"]["run_id"]
        assert client.get(f"/api/v1/labs/runs/{run_id}").json()["outcome"] == "LAB_DISABLED"

    def test_secure_mode_still_works(self, client) -> None:
        response = client.post(EXECUTE, json={"mode": "secure", **ATTACK})
        assert response.json()["outcome"] == "DENIED"

    def test_suite_marks_vulnerable_cases_skipped_not_passed(self, client) -> None:
        body = client.post("/api/v1/labs/login-bypass/tests/run").json()
        vulnerable = [r for r in body["results"] if r["mode"] == "vulnerable"]
        db_cases = [r for r in vulnerable if r["expected_outcome"] != "VALIDATION_ERROR"]
        assert all(r["status"] == "skipped" and r["passed"] is None for r in db_cases)
        assert body["unsafe_lab_enabled"] is False
