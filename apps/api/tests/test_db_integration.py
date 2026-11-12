"""Real PostgreSQL integration: adapters, least privilege, read-only containment (T01-T06)."""

import psycopg
import pytest

from queryshield_api.db.fixtures import USERS
from queryshield_api.modules.experiments.catalog import BY_ID
from queryshield_api.modules.laboratory.adapters.secure import SecureLoginAdapter
from queryshield_api.modules.laboratory.schemas import LoginRequest
from queryshield_api.modules.laboratory.service import ExecutionContext, execute_login
from support import make_settings, requires_db

pytestmark = requires_db


def _vulnerable_adapter():
    from queryshield_api.modules.laboratory.adapters import vulnerable

    return vulnerable.VulnerableLoginAdapter()


@pytest.fixture
def query_conn(lab_db):
    conn = psycopg.connect(lab_db["query"], row_factory=psycopg.rows.dict_row)
    conn.read_only = True
    yield conn
    conn.close()


@pytest.mark.parametrize("case_id", ["T01", "T02", "T03", "T04", "T05", "T06"])
@pytest.mark.parametrize("mode", ["vulnerable", "secure"])
def test_catalog_cases_match_observed_outcome(lab_db, case_id: str, mode: str) -> None:
    case = BY_ID[case_id]
    settings = make_settings(lab_db, unsafe=True)
    response = execute_login(
        settings,
        LoginRequest(
            mode=mode, username=case.username, password=case.password, test_case_id=case_id
        ),
        ExecutionContext(request_id="test"),
    )
    assert response.outcome == case.expected_for(mode)


def test_t03_bypass_is_real_in_vulnerable_and_blocked_in_secure(query_conn) -> None:
    attack = ("admin' -- ", "wrong-password")
    vulnerable = _vulnerable_adapter().authenticate(query_conn, *attack)
    secure = SecureLoginAdapter().authenticate(query_conn, *attack)
    assert vulnerable.authenticated is True
    assert (vulnerable.username, vulnerable.role) == ("admin", "admin")
    assert secure.authenticated is False and secure.rows_returned == 0


def test_valid_login_works_in_both_modes(query_conn) -> None:
    for adapter in (_vulnerable_adapter(), SecureLoginAdapter()):
        outcome = adapter.authenticate(query_conn, "student01", "StudentDemo123!")
        assert (outcome.authenticated, outcome.username) == (True, "student01")


def test_secure_mode_accepts_apostrophe_as_data(query_conn) -> None:
    outcome = SecureLoginAdapter().authenticate(query_conn, "O'Connor", "x")
    assert outcome.authenticated is False


def test_stacked_statement_cannot_modify_fixtures(lab_db, query_conn) -> None:
    payload = "admin'; DELETE FROM demo.users; -- "
    with pytest.raises(psycopg.Error):
        _vulnerable_adapter().authenticate(query_conn, payload, "x")
    query_conn.rollback()
    with psycopg.connect(lab_db["admin"]) as admin_conn:
        count = admin_conn.execute("SELECT count(*) FROM demo.users").fetchone()[0]
    assert count == len(USERS)


def test_query_role_is_read_only_and_scoped(lab_db) -> None:
    with psycopg.connect(lab_db["query"], autocommit=True) as conn:
        for statement in (
            "SELECT * FROM lab.runs",
            "SELECT * FROM demo.tickets",
            "INSERT INTO demo.users (id, username, password_hash, role, display_name, "
            "department) VALUES (99, 'x', 'x', 'admin', 'x', 'x')",
            "CREATE TABLE demo.evil (id int)",
        ):
            with pytest.raises(psycopg.Error):
                conn.execute(statement)
        timeout = conn.execute("SHOW statement_timeout").fetchone()[0]
        read_only = conn.execute("SHOW default_transaction_read_only").fetchone()[0]
    assert timeout == "2s" and read_only == "on"


def test_app_role_cannot_read_password_hashes(lab_db) -> None:
    with psycopg.connect(lab_db["app"], autocommit=True) as conn:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("SELECT password_hash FROM demo.users")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("DELETE FROM lab.runs")


def test_passwords_are_hashed_not_plaintext(lab_db) -> None:
    with psycopg.connect(lab_db["admin"]) as conn:
        rows = conn.execute("SELECT username, password_hash FROM demo.users").fetchall()
    plaintext = {u.username: u.demo_password for u in USERS}
    for username, password_hash in rows:
        assert password_hash.startswith("$2a$")
        assert plaintext[username] not in password_hash
