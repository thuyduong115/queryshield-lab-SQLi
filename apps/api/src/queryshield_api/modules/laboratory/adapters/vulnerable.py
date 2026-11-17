"""!!! DELIBERATELY VULNERABLE — EDUCATIONAL LAB ONLY — NEVER USE OR COPY THIS PATTERN !!!

This file contains the approved exceptions to the project's "always parameterize" rule
(see AGENTS.md and docs/12-SHOP-DEMO.md). It exists so the approved login, search and
second-order scenarios can show real SQL Injection against the synthetic fixture database.

Containment:
- Imported lazily, only after the guard confirms APP_ENV=local AND LAB_ENABLE_UNSAFE=true.
- Executed on the `qs_lab_query` role: SELECT on demo.users/products/orders, read-only transactions,
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
from queryshield_api.modules.laboratory.adapters.shop_queries import (
    ORDER_COLUMNS,
    PRODUCT_COLUMNS,
)

# Human-readable template shown by the inspector. Never executed as-is.
VULNERABLE_LOGIN_TEMPLATE = (
    f"{SELECT_COLUMNS} WHERE username = '{{username}}' AND password = '{{password}}' LIMIT 1"
)


def build_query(username: str, password: str) -> str:
    # UNSAFE: untrusted values become part of the SQL syntax.
    return f"{SELECT_COLUMNS} WHERE username = '{username}' AND password = '{password}' LIMIT 1"


def query_parts(username: str, password: str) -> tuple[tuple[str, str], ...]:
    """The same concatenation as build_query, split by origin for the inspector."""
    return (
        (f"{SELECT_COLUMNS} WHERE username = '", "template"),
        (username, "username"),
        ("' AND password = '", "template"),
        (password, "password"),
        ("' LIMIT 1", "template"),
    )


class VulnerableLoginAdapter:
    def authenticate(self, conn: psycopg.Connection, username: str, password: str) -> LoginOutcome:
        query = build_query(username, password)
        with conn.cursor() as cur:
            # No parameters: PostgreSQL parses whatever the concatenation produced.
            cur.execute(query, prepare=True)  # type: ignore[arg-type]
            rows = cur.fetchmany(MAX_ROWS)
        conn.rollback()
        return outcome_from_rows(rows)


# Shop extensions approved 2026-11-13. All callers apply the same local-only guard.
# Values below are intentionally interpolated; the matching safe functions bind them.
def search_query(term: str) -> str:
    return (
        f"{PRODUCT_COLUMNS} WHERE name ILIKE '%{term}%' AND published = true ORDER BY id LIMIT 20"
    )


def order_query(customer_name: str) -> str:
    return (
        f"{ORDER_COLUMNS} WHERE customer_name = '{customer_name}' "
        "AND visibility = 'public' ORDER BY id LIMIT 20"
    )


def search_products(conn, term: str) -> list[dict]:
    return conn.execute(search_query(term), prepare=True).fetchmany(20)


def customer_orders(conn, customer_name: str) -> list[dict]:
    return conn.execute(order_query(customer_name), prepare=True).fetchmany(20)
