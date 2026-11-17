"""Test helpers shared by conftest and test modules."""

import os

import pytest
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from queryshield_api.config import Settings

TEST_DB = "queryshield_lab_test"


def admin_url() -> str | None:
    return os.environ.get("TEST_ADMIN_DATABASE_URL")


requires_db = pytest.mark.skipif(
    admin_url() is None, reason="TEST_ADMIN_DATABASE_URL not set; no isolated PostgreSQL"
)


def role_url(base_url: str, role: str, password: str) -> str:
    info = conninfo_to_dict(base_url)
    return make_conninfo(
        host=info.get("host", "localhost"),
        port=info.get("port", "5432"),
        dbname=TEST_DB,
        user=role,
        password=password,
    )


def make_settings(lab_db: dict[str, str] | None, *, unsafe: bool) -> Settings:
    return Settings(
        _env_file=None,
        app_env="local" if unsafe else "development",
        lab_enable_unsafe=unsafe,
        lab_query_database_url=lab_db["query"] if lab_db else None,
        lab_app_database_url=lab_db["app"] if lab_db else None,
    )
