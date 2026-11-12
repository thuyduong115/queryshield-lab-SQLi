"""HTTP boundary for the login-bypass scenario. Handlers stay thin."""

import uuid

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from queryshield_api.config import get_settings
from queryshield_api.core.errors import LabError, request_id_of
from queryshield_api.core.guards import unsafe_allowed
from queryshield_api.db.connection import app_connection
from queryshield_api.modules.experiments import repository, runner
from queryshield_api.modules.experiments.catalog import CATALOG
from queryshield_api.modules.laboratory.schemas import (
    LoginRequest,
    LoginRunResponse,
    RunSummary,
    ScenarioCatalog,
)
from queryshield_api.modules.laboratory.service import SCENARIO_ID, ExecutionContext, execute_login

router = APIRouter(prefix="/api/v1/labs", tags=["labs"])


class TestCaseOut(BaseModel):
    id: str
    title: str
    purpose: str
    input_label: str
    password_label: str
    expected_vulnerable: str
    expected_secure: str
    gating: bool


class RunList(BaseModel):
    runs: list[RunSummary]


def _require_scenario(scenario_id: str) -> None:
    if scenario_id != SCENARIO_ID:
        raise LabError(404, "SCENARIO_NOT_FOUND", "Không có kịch bản này.")


@router.get("", response_model=ScenarioCatalog)
def list_scenarios() -> ScenarioCatalog:
    settings = get_settings()
    with app_connection(settings) as conn:
        rows = conn.execute(
            "SELECT id, title, description, enabled FROM lab.scenarios ORDER BY id"
        ).fetchall()
        version = repository.current_dataset_version(conn)
    return ScenarioCatalog(
        scenarios=rows, unsafe_lab_enabled=unsafe_allowed(settings), dataset_version=version
    )


@router.get("/{scenario_id}/test-cases", response_model=list[TestCaseOut])
def list_test_cases(scenario_id: str) -> list[TestCaseOut]:
    _require_scenario(scenario_id)
    return [
        TestCaseOut(
            id=c.id,
            title=c.title,
            purpose=c.purpose,
            input_label=c.input_label,
            password_label=c.password_label,
            expected_vulnerable=c.expected_vulnerable,
            expected_secure=c.expected_secure,
            gating=c.gating,
        )
        for c in CATALOG
    ]


@router.post("/{scenario_id}/execute", response_model=LoginRunResponse)
def execute(scenario_id: str, body: LoginRequest, request: Request) -> LoginRunResponse:
    _require_scenario(scenario_id)
    return execute_login(get_settings(), body, ExecutionContext(request_id=request_id_of(request)))


@router.post("/{scenario_id}/tests/run", response_model=runner.SuiteResult)
def run_tests(scenario_id: str, request: Request) -> runner.SuiteResult:
    _require_scenario(scenario_id)
    return runner.run_suite(get_settings(), request_id_of(request))


@router.get("/{scenario_id}/results", response_model=RunList)
def results(scenario_id: str, limit: int = Query(default=50, ge=1, le=200)) -> RunList:
    _require_scenario(scenario_id)
    return RunList(runs=repository.list_runs(get_settings(), scenario_id, limit))


@router.get("/runs/{run_id}", response_model=RunSummary)
def get_run(run_id: str) -> RunSummary:
    try:
        uuid.UUID(run_id)
    except ValueError:
        raise LabError(404, "RUN_NOT_FOUND", "Không tìm thấy lần chạy.") from None
    run = repository.get_run(get_settings(), run_id)
    if run is None:
        raise LabError(404, "RUN_NOT_FOUND", "Không tìm thấy lần chạy.")
    return RunSummary(**run)
