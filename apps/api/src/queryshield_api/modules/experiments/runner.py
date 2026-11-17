"""Comparative suite runner over the fixed allow-listed catalog. No user-supplied input."""

import uuid
from typing import Literal

from pydantic import BaseModel, ValidationError

from queryshield_api.config import Settings
from queryshield_api.core.errors import LabError
from queryshield_api.core.guards import unsafe_allowed
from queryshield_api.modules.experiments import repository
from queryshield_api.modules.experiments.catalog import CATALOG, LabTestCase
from queryshield_api.modules.laboratory.schemas import LoginRequest, Mode
from queryshield_api.modules.laboratory.service import (
    SCENARIO_ID,
    ExecutionContext,
    execute_login,
)

Status = Literal["passed", "failed", "skipped"]


class SuiteCaseResult(BaseModel):
    test_case_id: str
    title: str
    input_label: str
    password_label: str
    gating: bool
    mode: Mode
    expected_outcome: str
    actual_outcome: str
    expected_authenticated: bool
    actual_authenticated: bool | None
    status: Status
    passed: bool | None
    run_id: str | None
    duration_ms: int | None


class SuiteResult(BaseModel):
    suite_id: str
    scenario_id: str
    dataset_version: str | None
    unsafe_lab_enabled: bool
    total: int
    passed: int
    failed: int
    skipped: int
    results: list[SuiteCaseResult]


def _record_validation_failure(
    settings: Settings, case: LabTestCase, mode: str, ctx: ExecutionContext
) -> str:
    passed = ctx.expected_result == "VALIDATION_ERROR"
    run_id, _, _ = repository.insert_run(
        settings,
        repository.RunRecord(
            scenario_id=SCENARIO_ID,
            mode=mode,
            result_code="VALIDATION_ERROR",
            authenticated=False,
            duration_ms=0,
            request_id=ctx.request_id,
            test_case_id=case.id,
            suite_id=ctx.suite_id,
            expected_result=ctx.expected_result,
            passed=passed,
        ),
    )
    return run_id


def _run_case(
    settings: Settings, case: LabTestCase, mode: Mode, suite_id: str, request_id: str
) -> SuiteCaseResult:
    expected = case.expected_for(mode)
    ctx = ExecutionContext(request_id=request_id, suite_id=suite_id, expected_result=expected)
    base = {
        "test_case_id": case.id,
        "title": case.title,
        "input_label": case.input_label,
        "password_label": case.password_label,
        "gating": case.gating,
        "mode": mode,
        "expected_outcome": expected,
        "expected_authenticated": expected == "AUTHENTICATED",
    }

    try:
        request = LoginRequest(
            mode=mode, username=case.username, password=case.password, test_case_id=case.id
        )
    except ValidationError:
        run_id = _record_validation_failure(settings, case, mode, ctx)
        passed = expected == "VALIDATION_ERROR"
        return SuiteCaseResult(
            **base,
            actual_outcome="VALIDATION_ERROR",
            actual_authenticated=False,
            status="passed" if passed else "failed",
            passed=passed,
            run_id=run_id,
            duration_ms=0,
        )

    if mode == "vulnerable" and not unsafe_allowed(settings):
        try:
            execute_login(settings, request, ctx)
        except LabError as exc:
            # Honest skip: the guard refused, so nothing about the attack was proven.
            return SuiteCaseResult(
                **base,
                actual_outcome="LAB_DISABLED",
                actual_authenticated=None,
                status="skipped",
                passed=None,
                run_id=exc.extra.get("run_id"),
                duration_ms=None,
            )

    response = execute_login(settings, request, ctx)
    passed = response.outcome == expected
    return SuiteCaseResult(
        **base,
        actual_outcome=response.outcome,
        actual_authenticated=response.authentication.authenticated,
        status="passed" if passed else "failed",
        passed=passed,
        run_id=response.run_id,
        duration_ms=response.duration_ms,
    )


def run_suite(settings: Settings, request_id: str) -> SuiteResult:
    suite_id = str(uuid.uuid4())
    results = [
        _run_case(settings, case, mode, suite_id, request_id)
        for case in CATALOG
        for mode in ("vulnerable", "secure")
    ]
    version = None
    for result in results:
        if result.run_id:
            run = repository.get_run(settings, result.run_id)
            version = run["dataset_version"] if run else None
            break
    return SuiteResult(
        suite_id=suite_id,
        scenario_id=SCENARIO_ID,
        dataset_version=version,
        unsafe_lab_enabled=unsafe_allowed(settings),
        total=len(results),
        passed=sum(r.status == "passed" for r in results),
        failed=sum(r.status == "failed" for r in results),
        skipped=sum(r.status == "skipped" for r in results),
        results=results,
    )
