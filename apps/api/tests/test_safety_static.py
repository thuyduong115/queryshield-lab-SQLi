"""Static and no-database safety regressions (T07, T08, T09, T10, R04, R06)."""

import ast
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from queryshield_api.config import get_settings
from queryshield_api.db import admin
from queryshield_api.main import app

SRC = Path(__file__).resolve().parents[1] / "src" / "queryshield_api"
UNSAFE_ADAPTER = SRC / "modules" / "laboratory" / "adapters" / "vulnerable.py"
SQL_WORDS = re.compile(r"\b(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|VALUES)\b")
CONSTANT_NAME = re.compile(r"^[A-Z][A-Z0-9_]*$")


def _non_constant_fstring_sql(tree: ast.AST) -> list[int]:
    hits = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.JoinedStr):
            continue
        literal = "".join(v.value for v in node.values if isinstance(v, ast.Constant))
        if not SQL_WORDS.search(literal):
            continue
        for value in node.values:
            if isinstance(value, ast.FormattedValue) and not (
                isinstance(value.value, ast.Name) and CONSTANT_NAME.match(value.value.id)
            ):
                hits.append(node.lineno)
    return hits


def test_sql_interpolation_exists_only_in_the_vulnerable_adapter() -> None:
    offenders = {}
    for path in SRC.rglob("*.py"):
        if path == UNSAFE_ADAPTER:
            continue
        hits = _non_constant_fstring_sql(ast.parse(path.read_text(encoding="utf-8")))
        if hits:
            offenders[str(path.relative_to(SRC))] = hits
    assert offenders == {}


def test_unsafe_adapter_does_interpolate() -> None:
    tree = ast.parse(UNSAFE_ADAPTER.read_text(encoding="utf-8"))
    assert _non_constant_fstring_sql(tree), "the lab must contain the deliberate flaw"


def test_unsafe_module_not_imported_eagerly() -> None:
    for path in SRC.rglob("*.py"):
        if path == UNSAFE_ADAPTER:
            continue
        text = path.read_text(encoding="utf-8")
        assert "adapters.vulnerable import" not in text
        assert "from queryshield_api.modules.laboratory.adapters import vulnerable" not in text


@pytest.fixture
def no_db_client(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "false")
    monkeypatch.delenv("LAB_APP_DATABASE_URL", raising=False)
    monkeypatch.delenv("LAB_QUERY_DATABASE_URL", raising=False)
    get_settings.cache_clear()
    yield TestClient(app)
    get_settings.cache_clear()


def test_t09_vulnerable_mode_refused_when_guard_off(no_db_client) -> None:
    response = no_db_client.post(
        "/api/v1/labs/login-bypass/execute",
        json={"mode": "vulnerable", "username": "admin' -- ", "password": "wrong-password"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "LAB_DISABLED"
    assert response.json()["error"]["request_id"]


@pytest.mark.parametrize(
    ("username", "case"),
    [("a" * 129, "T07"), ("", "T08")],
)
def test_t07_t08_schema_validation_without_echoing_input(no_db_client, username, case) -> None:
    secret = "Pw-should-not-echo-1"
    response = no_db_client.post(
        "/api/v1/labs/login-bypass/execute",
        json={"mode": "secure", "username": username, "password": secret},
    )
    assert response.status_code == 422, case
    body = response.text
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert secret not in body
    if username:
        assert username not in body


def test_unknown_mode_rejected(no_db_client) -> None:
    response = no_db_client.post(
        "/api/v1/labs/login-bypass/execute",
        json={"mode": "raw-sql", "username": "x", "password": "y"},
    )
    assert response.status_code == 422


def test_no_arbitrary_sql_or_reset_routes() -> None:
    paths = {route.path for route in app.routes}
    for forbidden in ("/api/v1/execute-sql", "/api/v1/admin/reset", "/api/v1/reset"):
        assert forbidden not in paths
    assert not any("reset" in path or "sql" in path for path in paths)


def test_database_unavailable_is_503_not_success(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "false")
    monkeypatch.setenv("LAB_QUERY_DATABASE_URL", "postgresql://u:p@127.0.0.1:1/none")
    monkeypatch.setenv("LAB_APP_DATABASE_URL", "postgresql://u:p@127.0.0.1:1/none")
    get_settings.cache_clear()
    response = TestClient(app).post(
        "/api/v1/labs/login-bypass/execute",
        json={"mode": "secure", "username": "student01", "password": "x"},
    )
    get_settings.cache_clear()
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"


@pytest.mark.parametrize(
    ("url", "database"),
    [
        ("postgresql://u:p@db.example.com:5432/postgres", "queryshield_lab"),
        ("postgresql://u:p@10.0.0.5:5432/postgres", "queryshield_lab"),
        ("postgresql://u:p@db:5432/postgres", "production"),
    ],
)
def test_admin_cli_refuses_non_lab_targets(url: str, database: str) -> None:
    config = admin.AdminConfig(url, database, "a", "b")
    with pytest.raises(admin.AdminSafetyError):
        admin.assert_safe_target(config)
