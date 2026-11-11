from fastapi.testclient import TestClient

from queryshield_api.config import get_settings
from queryshield_api.main import app


def test_health_endpoint_reports_safe_state(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "false")
    get_settings.cache_clear()

    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "environment": "development",
        "unsafeLabEnabled": False,
    }

    get_settings.cache_clear()
