"""Local-only database administration CLI (bootstrap / reset / check).

Usage (inside the Compose network):
    python -m queryshield_api.db.admin bootstrap   # idempotent schema + roles + seed if empty
    python -m queryshield_api.db.admin reset       # restore fixtures, clear experiment runs
    python -m queryshield_api.db.admin check       # print dataset version and row counts

This is intentionally NOT exposed over HTTP. It uses the privileged ADMIN_DATABASE_URL,
which is never given to the API runtime.
"""

import argparse
import os
import sys
from dataclasses import dataclass

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict

from queryshield_api.db import fixtures, schema
from queryshield_api.modules.experiments.catalog import CATALOG

ALLOWED_HOSTS = frozenset({"db", "localhost", "127.0.0.1", "::1"})
ALLOWED_DATABASES = frozenset({"queryshield_lab", "queryshield_lab_test"})


class AdminSafetyError(RuntimeError):
    pass


@dataclass(frozen=True)
class AdminConfig:
    admin_url: str
    database: str
    query_role_password: str
    app_role_password: str

    @classmethod
    def from_env(cls, database: str | None = None) -> "AdminConfig":
        try:
            return cls(
                admin_url=os.environ["ADMIN_DATABASE_URL"],
                database=database or os.environ.get("LAB_DATABASE_NAME", "queryshield_lab"),
                query_role_password=os.environ["LAB_QUERY_DB_PASSWORD"],
                app_role_password=os.environ["LAB_APP_DB_PASSWORD"],
            )
        except KeyError as missing:
            raise AdminSafetyError(f"Missing required environment variable {missing}") from None


def assert_safe_target(config: AdminConfig) -> None:
    """Refuse anything that is not the known local lab database."""
    host = conninfo_to_dict(config.admin_url).get("host") or "localhost"
    if host not in ALLOWED_HOSTS:
        raise AdminSafetyError(f"Refusing non-local database host {host!r}")
    if config.database not in ALLOWED_DATABASES:
        raise AdminSafetyError(f"Refusing unknown database name {config.database!r}")


def _connect(config: AdminConfig, dbname: str) -> psycopg.Connection:
    return psycopg.connect(config.admin_url, dbname=dbname, autocommit=True, connect_timeout=5)


def ensure_database(config: AdminConfig) -> None:
    with _connect(config, "postgres") as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (config.database,)
        ).fetchone()
        if not exists:
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(config.database)))


def ensure_roles(conn: psycopg.Connection, config: AdminConfig) -> None:
    # DDL cannot take bind parameters; psycopg.sql composes identifiers and literals safely.
    for role, password in (
        (schema.QUERY_ROLE, config.query_role_password),
        (schema.APP_ROLE, config.app_role_password),
    ):
        exists = conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,)).fetchone()
        verb = "ALTER" if exists else "CREATE"
        conn.execute(
            sql.SQL(
                verb + " ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE "
                "NOINHERIT CONNECTION LIMIT 20 PASSWORD {}"
            ).format(sql.Identifier(role), sql.Literal(password))
        )
    # Defense in depth for the adapter role: read-only transactions and a short timeout.
    query_role = sql.Identifier(schema.QUERY_ROLE)
    conn.execute(sql.SQL("ALTER ROLE {} SET default_transaction_read_only = on").format(query_role))
    conn.execute(sql.SQL("ALTER ROLE {} SET statement_timeout = '2s'").format(query_role))
    conn.execute(
        sql.SQL("ALTER ROLE {} SET statement_timeout = '5s'").format(
            sql.Identifier(schema.APP_ROLE)
        )
    )


def apply_schema(conn: psycopg.Connection, config: AdminConfig) -> None:
    conn.execute(schema.SCHEMA_DDL)
    conn.execute(
        sql.SQL(schema.PRIVILEGES_DDL).format(
            db=sql.Identifier(config.database),
            query_role=sql.Identifier(schema.QUERY_ROLE),
            app_role=sql.Identifier(schema.APP_ROLE),
        )
    )


def seed(conn: psycopg.Connection) -> None:
    with conn.transaction():
        conn.execute("TRUNCATE lab.runs, lab.test_cases, demo.tickets, demo.users")
        conn.execute("DELETE FROM lab.dataset")
        conn.execute("DELETE FROM lab.scenarios")
        conn.execute(
            "INSERT INTO lab.scenarios (id, title, description) VALUES (%s, %s, %s)",
            (fixtures.SCENARIO["id"], fixtures.SCENARIO["title"], fixtures.SCENARIO["description"]),
        )
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO demo.users (id, username, password_hash, role, display_name, "
                "department) VALUES (%s, %s, crypt(%s, gen_salt('bf', 8)), %s, %s, %s)",
                [
                    (u.id, u.username, u.demo_password, u.role, u.display_name, u.department)
                    for u in fixtures.USERS
                ],
            )
            cur.executemany(
                "INSERT INTO demo.tickets (id, owner_id, title, status, priority, visibility, "
                "created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                [
                    (t.id, t.owner_id, t.title, t.status, t.priority, t.visibility, t.created_at)
                    for t in fixtures.TICKETS
                ],
            )
            cur.executemany(
                "INSERT INTO lab.test_cases (id, scenario_id, title, input_ref, "
                "expected_vulnerable, expected_secure) VALUES (%s, %s, %s, %s, %s, %s)",
                [
                    (
                        c.id,
                        fixtures.SCENARIO["id"],
                        c.title,
                        c.input_label,
                        c.expected_vulnerable,
                        c.expected_secure,
                    )
                    for c in CATALOG
                ],
            )
        conn.execute("INSERT INTO lab.dataset (version) VALUES (%s)", (schema.DATASET_VERSION,))


def bootstrap(config: AdminConfig, *, force_seed: bool = False) -> str:
    assert_safe_target(config)
    ensure_database(config)
    with _connect(config, config.database) as conn:
        ensure_roles(conn, config)
        apply_schema(conn, config)
        seeded = conn.execute("SELECT version FROM lab.dataset").fetchone()
        if force_seed or not seeded:
            seed(conn)
            return "seeded"
    return "already-seeded"


def check(config: AdminConfig) -> dict[str, object]:
    assert_safe_target(config)
    with _connect(config, config.database) as conn:
        version = conn.execute("SELECT version FROM lab.dataset").fetchone()
        counts = {
            table: conn.execute(
                sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(*table.split(".")))
            ).fetchone()[0]
            for table in ("demo.users", "demo.tickets", "lab.test_cases", "lab.runs")
        }
    return {"dataset_version": version[0] if version else None, **counts}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="QueryShield Lab local database admin")
    parser.add_argument("command", choices=("bootstrap", "reset", "check"))
    args = parser.parse_args(argv)
    try:
        config = AdminConfig.from_env()
        if args.command == "bootstrap":
            print(f"bootstrap: {bootstrap(config)} ({config.database})")
        elif args.command == "reset":
            bootstrap(config, force_seed=True)
            print(f"reset: fixtures restored to {schema.DATASET_VERSION}, runs cleared")
        else:
            for key, value in check(config).items():
                print(f"{key}: {value}")
    except AdminSafetyError as exc:
        print(f"refused: {exc}", file=sys.stderr)
        return 2
    except psycopg.OperationalError as exc:
        print(f"database unavailable: {exc.__class__.__name__}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
