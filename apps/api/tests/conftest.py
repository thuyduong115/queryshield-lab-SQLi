"""Shared fixtures.

Integration tests need a real PostgreSQL. They run against an isolated database
`queryshield_lab_test`, recreated per session through the local admin CLI code path.
They are skipped (and reported as skipped, never passed) when TEST_ADMIN_DATABASE_URL is unset.
"""

import os
from collections.abc import Iterator

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo

from queryshield_api.config import get_settings
from queryshield_api.db import admin
from support import TEST_DB, admin_url, role_url


@pytest.fixture(scope="session")
def lab_db() -> dict[str, str]:
    base_url = admin_url()
    if base_url is None:
        pytest.skip("TEST_ADMIN_DATABASE_URL not set")
    query_pw = os.environ.get("LAB_QUERY_DB_PASSWORD", "qs_lab_query_local_only")
    app_pw = os.environ.get("LAB_APP_DB_PASSWORD", "qs_lab_app_local_only")

    with psycopg.connect(base_url, dbname="postgres", autocommit=True) as conn:
        conn.execute(
            sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(TEST_DB))
        )

    config = admin.AdminConfig(
        admin_url=base_url,
        database=TEST_DB,
        query_role_password=query_pw,
        app_role_password=app_pw,
    )
    assert admin.bootstrap(config) == "seeded"
    return {
        "admin": make_conninfo(base_url, dbname=TEST_DB),
        "query": role_url(base_url, "qs_lab_query", query_pw),
        "app": role_url(base_url, "qs_lab_app", app_pw),
    }


@pytest.fixture
def api_env(monkeypatch: pytest.MonkeyPatch, lab_db: dict[str, str]) -> Iterator[None]:
    """Point the FastAPI settings at the isolated test database with the lab enabled."""
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "true")
    monkeypatch.setenv("LAB_QUERY_DATABASE_URL", lab_db["query"])
    monkeypatch.setenv("LAB_APP_DATABASE_URL", lab_db["app"])
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def api_env_guard_off(monkeypatch: pytest.MonkeyPatch, lab_db: dict[str, str]) -> Iterator[None]:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("LAB_ENABLE_UNSAFE", "false")
    monkeypatch.setenv("LAB_QUERY_DATABASE_URL", lab_db["query"])
    monkeypatch.setenv("LAB_APP_DATABASE_URL", lab_db["app"])
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
