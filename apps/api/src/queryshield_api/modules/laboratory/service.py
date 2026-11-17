"""Scenario orchestration: guard -> adapter -> measured outcome -> redacted evidence."""

import importlib
import time
from dataclasses import asdict, dataclass

import psycopg

from queryshield_api.config import Settings
from queryshield_api.core.errors import LabError, database_unavailable
from queryshield_api.core.guards import lab_disabled_error, unsafe_allowed
from queryshield_api.db.connection import query_connection
from queryshield_api.modules.defenses.layers import detect, passes_allow_list
from queryshield_api.modules.experiments import observations, repository
from queryshield_api.modules.experiments.catalog import BY_ID
from queryshield_api.modules.laboratory import inspector as insp
from queryshield_api.modules.laboratory.adapters.base import LoginOutcome
from queryshield_api.modules.laboratory.adapters.secure import (
    SECURE_LOGIN_SQL,
    SecureLoginAdapter,
)
from queryshield_api.modules.laboratory.schemas import LoginRequest, LoginRunResponse

SCENARIO_ID = "login-bypass"
SIMULATION_NOTICE = (
    "Kết quả đăng nhập cửa hàng chỉ là mô phỏng: không cấp cookie, token hay quyền "
    "nào trong QueryShield Lab."
)


@dataclass(frozen=True)
class ExecutionContext:
    request_id: str
    suite_id: str | None = None
    expected_result: str | None = None


def _load_vulnerable():
    """Import the unsafe module only after the guard has passed."""
    return importlib.import_module("queryshield_api.modules.laboratory.adapters.vulnerable")


def _ms_since(start: float) -> int:
    return max(0, round((time.perf_counter() - start) * 1000))


def record_lab_disabled(
    settings: Settings, request: LoginRequest, ctx: ExecutionContext
) -> str | None:
    try:
        run_id, _, _ = repository.insert_run(
            settings,
            repository.RunRecord(
                scenario_id=SCENARIO_ID,
                mode=request.mode,
                result_code="LAB_DISABLED",
                authenticated=False,
                duration_ms=0,
                request_id=ctx.request_id,
                test_case_id=request.test_case_id,
                suite_id=ctx.suite_id,
                expected_result=ctx.expected_result,
                passed=None,
            ),
        )
        return run_id
    except LabError:
        return None


def execute_login(
    settings: Settings, request: LoginRequest, ctx: ExecutionContext
) -> LoginRunResponse:
    if request.test_case_id is not None and request.test_case_id not in BY_ID:
        raise LabError(404, "TEST_CASE_NOT_FOUND", "Không có test case với mã này.")

    # Mask repeated passwords before lexical segmentation, including when a secret
    # spans several SQL tokens. The real adapter still receives the original inputs.
    display_username = request.username.replace(request.password, insp.PASSWORD_MASK)

    # The guard comes first: a disabled lab never reaches any other layer.
    if request.mode == "vulnerable":
        if not unsafe_allowed(settings):
            raise lab_disabled_error(record_lab_disabled(settings, request, ctx))
        module = _load_vulnerable()
        adapter = module.VulnerableLoginAdapter()
        inspector = insp.vulnerable_inspector(
            display_username, module.VULNERABLE_LOGIN_TEMPLATE, module.query_parts
        )
    else:
        adapter = SecureLoginAdapter()
        inspector = insp.secure_inspector(display_username, SECURE_LOGIN_SQL)

    layers = request.layers.active(request.mode)
    alerts = detect(request.username)  # L5: observe only, never blocks
    query_error = None
    outcome = LoginOutcome(False, None, None, 0)

    start = time.perf_counter()
    if request.layers.input_validation and not passes_allow_list(request.username):
        # L2: rejected before any SQL is built or sent.
        result_code = "REJECTED_BY_VALIDATION"
        inspector.observations = ["REJECTED_BEFORE_DATABASE"]
    else:
        with query_connection(settings) as conn:
            try:
                outcome = adapter.authenticate(conn, request.username, request.password)
                result_code = "AUTHENTICATED" if outcome.authenticated else "DENIED"
            except psycopg.OperationalError:
                raise database_unavailable() from None
            except psycopg.Error as exc:
                # Only the vulnerable adapter can turn input into a parse error. Report the
                # SQLSTATE class, never the server message (which could echo input).
                if request.mode != "vulnerable":
                    raise
                result_code = "QUERY_ERROR"
                query_error = {"sqlstate": exc.sqlstate, "category": type(exc).__name__}
    duration_ms = _ms_since(start)

    passed = None
    if ctx.expected_result is not None:
        passed = ctx.expected_result == result_code

    executed = result_code in ("AUTHENTICATED", "DENIED")
    run_id, created_at, version = repository.insert_run(
        settings,
        repository.RunRecord(
            scenario_id=SCENARIO_ID,
            mode=request.mode,
            result_code=result_code,
            authenticated=outcome.authenticated,
            duration_ms=duration_ms,
            request_id=ctx.request_id,
            test_case_id=request.test_case_id,
            suite_id=ctx.suite_id,
            simulated_user=outcome.username,
            simulated_role=outcome.role,
            rows_returned=outcome.rows_returned if executed else None,
            # Kept internally even when L4 masks it from the response.
            sqlstate=query_error["sqlstate"] if query_error else None,
            expected_result=ctx.expected_result,
            passed=passed,
            layers=tuple(layers),
            alerts=tuple(alerts),
        ),
    )

    if query_error and request.layers.error_masking:
        query_error = {"sqlstate": None, "category": "masked"}

    response = LoginRunResponse(
        run_id=run_id,
        scenario_id=SCENARIO_ID,
        mode=request.mode,
        test_case_id=request.test_case_id,
        outcome=result_code,
        authentication={
            "authenticated": outcome.authenticated,
            "simulated_user": (
                {"username": outcome.username, "role": outcome.role}
                if outcome.authenticated
                else None
            ),
            "rows_returned": outcome.rows_returned if executed else None,
        },
        inspector=asdict(inspector),
        query_error=query_error,
        layers=layers,
        alerts=alerts,
        duration_ms=duration_ms,
        dataset_version=version,
        created_at=created_at,
        simulation_notice=SIMULATION_NOTICE,
    )
    # Inspector is a redacted reconstruction, never a raw DB trace or request body.
    # Also mask a password repeated inside the username field.
    safe_detail = {
        "inspector": response.inspector.model_dump(),
        "rows": observations.redact(list(outcome.rows), request.password),
        "duration_ms": duration_ms,
        "sqlstate": query_error["sqlstate"] if query_error else None,
    }
    observations.record(settings, "login", request.mode, result_code, safe_detail, run_id=run_id)
    return response
