"""Secure login adapter: values are bound as parameters by Psycopg, never spliced into SQL."""

import psycopg

from queryshield_api.modules.laboratory.adapters.base import (
    MAX_ROWS,
    SELECT_COLUMNS,
    LoginOutcome,
    outcome_from_rows,
)

SECURE_LOGIN_SQL = f"{SELECT_COLUMNS} WHERE username = %s AND password = %s LIMIT 1"


class SecureLoginAdapter:
    def authenticate(self, conn: psycopg.Connection, username: str, password: str) -> LoginOutcome:
        with conn.cursor() as cur:
            # The SQL text is a constant; PostgreSQL receives the two values separately
            # ($1, $2) and can only ever compare them as data.
            cur.execute(SECURE_LOGIN_SQL, (username, password))
            rows = cur.fetchmany(MAX_ROWS)
        conn.rollback()
        return outcome_from_rows(rows)
