"""Runtime connections for the two least-privileged roles."""

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from queryshield_api.config import Settings
from queryshield_api.core.errors import database_unavailable


def _open(url: str | None, *, read_only: bool) -> psycopg.Connection:
    if not url:
        raise database_unavailable()
    try:
        conn = psycopg.connect(url, connect_timeout=3, row_factory=dict_row)
    except psycopg.OperationalError:
        raise database_unavailable() from None
    conn.read_only = read_only
    return conn


@contextmanager
def query_connection(settings: Settings) -> Iterator[psycopg.Connection]:
    """Connection for the login adapters: read-only role, read-only transaction."""
    conn = _open(settings.lab_query_database_url, read_only=True)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def app_connection(settings: Settings) -> Iterator[psycopg.Connection]:
    """Connection for evidence persistence and simulated dashboard reads."""
    conn = _open(settings.lab_app_database_url, read_only=False)
    try:
        with conn:
            yield conn
    except psycopg.OperationalError:
        raise database_unavailable() from None
    finally:
        conn.close()
