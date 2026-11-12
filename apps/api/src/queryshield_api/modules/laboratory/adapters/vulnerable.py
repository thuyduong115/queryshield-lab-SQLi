"""!!! DELIBERATELY VULNERABLE — EDUCATIONAL LAB ONLY — NEVER USE OR COPY THIS PATTERN !!!

This is the single approved exception to the project's "always parameterize" rule
(see AGENTS.md and docs/06-THREAT-MODEL.md). It exists so the `login-bypass` scenario can
show a real SQL Injection against the synthetic fixture database.

Containment:
- Imported lazily, only after the guard confirms APP_ENV=local AND LAB_ENABLE_UNSAFE=true.
- Executed on the `qs_lab_query` role: SELECT on demo.users only, read-only transactions,
  2 s statement timeout, no access to the `lab` schema.
- Psycopg sends the statement via the extended protocol, so stacked statements are rejected.
- The statement must stay on ONE line so `-- ` comments out the rest of the predicate.
"""

import psycopg

from queryshield_api.modules.laboratory.adapters.base import (
    MAX_ROWS,
    SELECT_COLUMNS,
    LoginOutcome,
    outcome_from_rows,
)

# Human-readable template shown by the inspector. Never executed as-is.
VULNERABLE_LOGIN_TEMPLATE = (
    f"{SELECT_COLUMNS} "
    "WHERE username = '{username}' "
    "AND password_hash = crypt('{password}', password_hash) LIMIT 1"
)


def build_query(username: str, password: str) -> str:
    # UNSAFE: untrusted values become part of the SQL syntax.
    return (
        f"{SELECT_COLUMNS} "
        f"WHERE username = '{username}' "
        f"AND password_hash = crypt('{password}', password_hash) LIMIT 1"
    )


def query_parts(username: str, password: str) -> tuple[tuple[str, str], ...]:
    """The same concatenation as build_query, split by origin for the inspector."""
    return (
        (f"{SELECT_COLUMNS} WHERE username = '", "template"),
        (username, "username"),
        ("' AND password_hash = crypt('", "template"),
        (password, "password"),
        ("', password_hash) LIMIT 1", "template"),
    )


class VulnerableLoginAdapter:
    def authenticate(self, conn: psycopg.Connection, username: str, password: str) -> LoginOutcome:
        query = build_query(username, password)
        with conn.cursor() as cur:
            # No parameters: PostgreSQL parses whatever the concatenation produced.
            cur.execute(query)  # type: ignore[arg-type]
            rows = cur.fetchmany(MAX_ROWS)
        conn.rollback()
        return outcome_from_rows(rows)
