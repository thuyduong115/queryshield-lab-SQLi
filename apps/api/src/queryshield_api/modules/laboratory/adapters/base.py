"""Shared adapter contract. Adapters contain SQL only and do not depend on FastAPI."""

from dataclasses import dataclass
from typing import Protocol

import psycopg

# Both adapters select the same columns from the same table with the same predicate.
# They differ ONLY in how the username/password values reach PostgreSQL.
SELECT_COLUMNS = "SELECT id, username, role FROM demo.users"

# Upper bound on rows fetched so an injected tautology cannot stream a whole table.
MAX_ROWS = 10


@dataclass(frozen=True)
class LoginOutcome:
    authenticated: bool
    username: str | None
    role: str | None
    rows_returned: int


class LoginAdapter(Protocol):
    def authenticate(
        self, conn: psycopg.Connection, username: str, password: str
    ) -> LoginOutcome: ...


def outcome_from_rows(rows: list[dict]) -> LoginOutcome:
    """The application logs in as the first returned row, exactly like naive login code."""
    if not rows:
        return LoginOutcome(False, None, None, 0)
    first = rows[0]
    return LoginOutcome(True, first["username"], first["role"], len(rows))
