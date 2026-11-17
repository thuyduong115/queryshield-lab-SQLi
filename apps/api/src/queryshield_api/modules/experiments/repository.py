"""Evidence persistence on the qs_lab_app role. All statements are parameterized.

Stored per run: mode, case/suite IDs, observed outcome, measured duration, simulated fixture
username/role. Never stored: password, raw request body, SQL text, free-text username input.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

import psycopg

from queryshield_api.config import Settings
from queryshield_api.db.connection import app_connection


@dataclass(frozen=True)
class RunRecord:
    scenario_id: str
    mode: str
    result_code: str
    authenticated: bool
    duration_ms: int
    request_id: str
    test_case_id: str | None = None
    suite_id: str | None = None
    simulated_user: str | None = None
    simulated_role: str | None = None
    rows_returned: int | None = None
    sqlstate: str | None = None
    expected_result: str | None = None
    passed: bool | None = None
    layers: tuple[str, ...] = ()
    alerts: tuple[str, ...] = ()


RUN_COLUMNS = (
    "id::text AS run_id, scenario_id, mode, test_case_id, suite_id::text AS suite_id, "
    "result_code AS outcome, authenticated, simulated_user, simulated_role, rows_returned, "
    "sqlstate, expected_result AS expected_outcome, passed, layers, duration_ms, dataset_version, "
    "created_at"
)


def current_dataset_version(conn: psycopg.Connection) -> str:
    row = conn.execute("SELECT version FROM lab.dataset").fetchone()
    return row["version"] if row else "unseeded"


def insert_run(settings: Settings, record: RunRecord) -> tuple[str, datetime, str]:
    run_id = str(uuid.uuid4())
    with app_connection(settings) as conn:
        version = current_dataset_version(conn)
        row = conn.execute(
            "INSERT INTO lab.runs (id, scenario_id, mode, test_case_id, suite_id, authenticated, "
            "simulated_user, simulated_role, rows_returned, result_code, sqlstate, "
            "expected_result, passed, duration_ms, dataset_version, request_id, layers) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "RETURNING created_at",
            (
                run_id,
                record.scenario_id,
                record.mode,
                record.test_case_id,
                record.suite_id,
                record.authenticated,
                record.simulated_user,
                record.simulated_role,
                record.rows_returned,
                record.result_code,
                record.sqlstate,
                record.expected_result,
                record.passed,
                record.duration_ms,
                version,
                record.request_id,
                list(record.layers),
            ),
        ).fetchone()
        if record.alerts:
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT INTO lab.security_events (run_id, rule_id) VALUES (%s, %s)",
                    [(run_id, rule) for rule in record.alerts],
                )
    return run_id, row["created_at"], version


def get_run(settings: Settings, run_id: str) -> dict | None:
    with app_connection(settings) as conn:
        return conn.execute(
            f"SELECT {RUN_COLUMNS} FROM lab.runs WHERE id = %s", (run_id,)
        ).fetchone()


def list_runs(settings: Settings, scenario_id: str, limit: int) -> list[dict]:
    with app_connection(settings) as conn:
        return conn.execute(
            f"SELECT {RUN_COLUMNS} FROM lab.runs WHERE scenario_id = %s "
            "ORDER BY created_at DESC LIMIT %s",
            (scenario_id, limit),
        ).fetchall()
