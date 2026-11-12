"""Runs the evaluation matrix through the same service path as every other lab run."""

import uuid

from pydantic import BaseModel

from queryshield_api.config import Settings
from queryshield_api.core.errors import LabError
from queryshield_api.core.guards import unsafe_allowed
from queryshield_api.modules.defenses.layers import Layers
from queryshield_api.modules.evaluation.matrix import (
    CASES,
    CONFIGURATIONS,
    EXPECTED,
    Configuration,
)
from queryshield_api.modules.experiments.catalog import BY_ID
from queryshield_api.modules.laboratory.schemas import LoginRequest
from queryshield_api.modules.laboratory.service import ExecutionContext, execute_login


class Cell(BaseModel):
    configuration_id: str
    test_case_id: str
    role: str
    expected_outcome: str
    actual_outcome: str | None
    status: str  # passed | failed | skipped
    alerts: list[str]
    run_id: str | None
    duration_ms: int | None


class CaseInfo(BaseModel):
    id: str
    role: str
    input_label: str
    password_label: str


class ConfigurationSummary(BaseModel):
    id: str
    title: str
    mode: str
    layers: list[str]
    skipped: bool
    attack_blocked: bool | None
    legitimate_accepted: int
    legitimate_total: int
    false_rejections: int
    wrong_credentials_denied: int
    wrong_credentials_total: int
    alerts_on_attack: int
    alerts_on_legitimate: int
    mean_duration_ms: float | None


class EvaluationResult(BaseModel):
    suite_id: str
    unsafe_lab_enabled: bool
    cases: list[CaseInfo]
    configurations: list[ConfigurationSummary]
    cells: list[Cell]
    expectations_met: int
    expectations_total: int


def _run_cell(
    settings: Settings, config: Configuration, case_id: str, role: str, ctx: ExecutionContext
) -> Cell:
    case = BY_ID[case_id]
    request = LoginRequest(
        mode=config.mode,
        username=case.username,
        password=case.password,
        test_case_id=case_id,
        layers=Layers(input_validation=config.input_validation),
    )
    base = {
        "configuration_id": config.id,
        "test_case_id": case_id,
        "role": role,
        "expected_outcome": ctx.expected_result,
    }
    try:
        response = execute_login(settings, request, ctx)
    except LabError as exc:
        if exc.code != "LAB_DISABLED":
            raise
        # Honest skip: nothing was measured, so nothing is counted as passed.
        return Cell(
            **base,
            actual_outcome=None,
            status="skipped",
            alerts=[],
            run_id=exc.extra.get("run_id"),
            duration_ms=None,
        )
    return Cell(
        **base,
        actual_outcome=response.outcome,
        status="passed" if response.outcome == ctx.expected_result else "failed",
        alerts=response.alerts,
        run_id=response.run_id,
        duration_ms=response.duration_ms,
    )


def run_evaluation(settings: Settings, request_id: str) -> EvaluationResult:
    suite_id = str(uuid.uuid4())
    cells: list[Cell] = []
    summaries: list[ConfigurationSummary] = []
    for config in CONFIGURATIONS:
        config_cells = [
            _run_cell(
                settings,
                config,
                case_id,
                role,
                ExecutionContext(request_id, suite_id, EXPECTED[(config.id, case_id)]),
            )
            for case_id, role in CASES
        ]
        cells.extend(config_cells)
        summaries.append(_summarize(config, config_cells))

    measured = [c for c in cells if c.status != "skipped"]
    return EvaluationResult(
        suite_id=suite_id,
        unsafe_lab_enabled=unsafe_allowed(settings),
        cases=[
            CaseInfo(
                id=case_id,
                role=role,
                input_label=BY_ID[case_id].input_label,
                password_label=BY_ID[case_id].password_label,
            )
            for case_id, role in CASES
        ],
        configurations=summaries,
        cells=cells,
        expectations_met=sum(c.status == "passed" for c in measured),
        expectations_total=len(measured),
    )


def _summarize(config: Configuration, cells: list[Cell]) -> ConfigurationSummary:
    measured = [c for c in cells if c.actual_outcome is not None]
    legit = [c for c in measured if c.role == "legitimate"]
    wrong = [c for c in measured if c.role == "wrong_credentials"]
    attack = [c for c in measured if c.role == "attack"]
    durations = [c.duration_ms for c in measured if c.duration_ms is not None]
    return ConfigurationSummary(
        id=config.id,
        title=config.title,
        mode=config.mode,
        layers=Layers(input_validation=config.input_validation).active(config.mode),
        skipped=not measured,
        attack_blocked=(
            all(c.actual_outcome != "AUTHENTICATED" for c in attack) if attack else None
        ),
        legitimate_accepted=sum(c.actual_outcome == "AUTHENTICATED" for c in legit),
        legitimate_total=len(legit),
        false_rejections=sum(c.actual_outcome != "AUTHENTICATED" for c in legit),
        wrong_credentials_denied=sum(c.actual_outcome != "AUTHENTICATED" for c in wrong),
        wrong_credentials_total=len(wrong),
        alerts_on_attack=sum(bool(c.alerts) for c in attack),
        alerts_on_legitimate=sum(bool(c.alerts) for c in legit),
        mean_duration_ms=round(sum(durations) / len(durations), 1) if durations else None,
    )
