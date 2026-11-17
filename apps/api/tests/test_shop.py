"""Shop comparison, stored-input reuse and observation boundaries."""

import pytest
from fastapi.testclient import TestClient

from queryshield_api.config import get_settings
from queryshield_api.main import app
from queryshield_api.modules.experiments.observations import redact
from support import requires_db


@pytest.fixture
def client(api_env):
    return TestClient(app)


def test_unsafe_flag_outside_local_is_rejected_at_startup(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "true")
    get_settings.cache_clear()
    try:
        with pytest.raises(ValueError, match="requires APP_ENV=local"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_shop_unsafe_paths_fail_before_database(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "false")
    monkeypatch.delenv("LAB_APP_DATABASE_URL", raising=False)
    monkeypatch.delenv("LAB_QUERY_DATABASE_URL", raising=False)
    get_settings.cache_clear()
    try:
        client = TestClient(app)
        for path, body in (
            ("/shop/search", {"mode": "vulnerable", "value": "x"}),
            (
                "/shop/order-report",
                {"mode": "vulnerable", "profile_id": "00000000-0000-0000-0000-000000000001"},
            ),
        ):
            response = client.post("/api/v1" + path, json=body)
            assert response.status_code == 403
            assert response.json()["error"]["code"] == "LAB_DISABLED"
        assert client.get("/api/v1/shop/database").status_code == 403
    finally:
        get_settings.cache_clear()


def test_nested_evidence_redaction():
    detail = {"rows": [{"username": "secret-probe"}], "parameters": ["secret-probe"]}
    assert "secret-probe" not in str(redact(detail, "secret-probe"))


@requires_db
def test_search_comparison_uses_same_database(client):
    for mode in ("vulnerable", "secure"):
        response = client.post("/api/v1/shop/search", json={"value": "Bàn phím", "mode": mode})
        assert response.status_code == 200
        assert [row["id"] for row in response.json()["rows"]] == [1]
    attack = "' OR true -- "
    vulnerable = client.post(
        "/api/v1/shop/search", json={"value": attack, "mode": "vulnerable"}
    ).json()
    secure = client.post("/api/v1/shop/search", json={"value": attack, "mode": "secure"}).json()
    assert any(row["published"] is False for row in vulnerable["rows"])
    assert secure["rows"] == []


@requires_db
def test_second_order_binds_storage_and_binds_reuse_in_secure_mode(client):
    value = "admin' -- "
    saved = client.post("/api/v1/shop/profiles", json={"value": value})
    assert saved.status_code == 200
    profile_id = saved.json()["profile_id"]
    assert saved.json()["rows"][0]["customer_name"] == value
    results = {}
    for mode in ("vulnerable", "secure"):
        response = client.post(
            "/api/v1/shop/order-report", json={"profile_id": profile_id, "mode": mode}
        )
        assert response.status_code == 200
        results[mode] = response.json()
        assert results[mode]["saved_value"] == value
        assert results[mode]["profile_id"] == profile_id
    assert {row["id"] for row in results["vulnerable"]["rows"]} == {1003, 1004}
    assert results["secure"]["rows"] == []
    assert results["secure"]["inspector"]["parameters"] == [value]


@requires_db
def test_second_order_preserves_normal_behavior(client):
    saved = client.post("/api/v1/shop/profiles", json={"value": "student01"}).json()
    for mode in ("vulnerable", "secure"):
        response = client.post(
            "/api/v1/shop/order-report", json={"profile_id": saved["profile_id"], "mode": mode}
        )
        assert {row["id"] for row in response.json()["rows"]} == {1001, 1002}


@requires_db
def test_observations_survive_reread_and_hide_submitted_password(client):
    secret = "unique-submitted-password-812"
    run = client.post(
        "/api/v1/labs/login-bypass/execute",
        json={"mode": "vulnerable", "username": "admin' -- ", "password": secret},
    ).json()
    response = client.get("/api/v1/shop/observations")
    assert secret not in response.text
    event = next(row for row in response.json()["observations"] if row["id"] == run["run_id"])
    assert (
        event["detail"]["inspector"]["sql_preview_redacted"]
        == run["inspector"]["sql_preview_redacted"]
    )
    assert event["detail"]["rows"] == [{"id": 1, "username": "admin", "role": "admin"}]
    assert "set-cookie" not in response.headers


@requires_db
def test_database_snapshot_only_exposes_disposable_fixtures(client):
    snapshot = client.get("/api/v1/shop/database")
    assert snapshot.status_code == 200
    student = next(row for row in snapshot.json()["users"] if row["username"] == "student01")
    assert student["password"] == "StudentDemo123!"
    assert len(snapshot.json()["products"]) == 7


@requires_db
def test_missing_profile_and_input_validation_are_honest(client):
    invalid = client.post("/api/v1/shop/order-report", json={"profile_id": "bad-id"})
    assert invalid.status_code == 422
    missing = client.post(
        "/api/v1/shop/order-report",
        json={"profile_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert missing.status_code == 404
    for value in ("x" * 129, "\x00"):
        assert client.post("/api/v1/shop/search", json={"value": value}).status_code == 422
