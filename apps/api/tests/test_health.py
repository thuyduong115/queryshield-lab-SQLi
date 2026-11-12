from fastapi.testclient import TestClient

from queryshield_api.config import get_settings
from queryshield_api.main import app


def test_health_reports_safe_state_without_database(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "false")
    monkeypatch.delenv("LAB_APP_DATABASE_URL", raising=False)
    monkeypatch.delenv("LAB_QUERY_DATABASE_URL", raising=False)
    get_settings.cache_clear()

    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "degraded",
        "environment": "development",
        "unsafeLabEnabled": False,
        "database": "unavailable",
        "datasetVersion": None,
    }
    assert response.headers["X-Request-ID"]

    get_settings.cache_clear()
