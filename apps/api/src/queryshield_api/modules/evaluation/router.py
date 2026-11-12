"""HTTP boundary for defense layers and the evaluation matrix."""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from queryshield_api.config import get_settings
from queryshield_api.core.errors import request_id_of
from queryshield_api.modules.defenses.layers import DETECTION_RULES, USERNAME_ALLOW_LIST
from queryshield_api.modules.defenses.privileges import RoleReport, probe_query_role
from queryshield_api.modules.evaluation.runner import EvaluationResult, run_evaluation

router = APIRouter(prefix="/api/v1/labs/login-bypass", tags=["defenses"])


class DetectionRuleOut(BaseModel):
    id: str
    description: str


class DefenseCatalog(BaseModel):
    allow_list_pattern: str
    detection_rules: list[DetectionRuleOut]
    least_privilege: RoleReport


@router.get("/defenses", response_model=DefenseCatalog)
def defenses() -> DefenseCatalog:
    return DefenseCatalog(
        allow_list_pattern=USERNAME_ALLOW_LIST.pattern,
        detection_rules=[
            DetectionRuleOut(id=rule.id, description=rule.description) for rule in DETECTION_RULES
        ],
        least_privilege=probe_query_role(get_settings()),
    )


@router.post("/evaluation/run", response_model=EvaluationResult)
def evaluate(request: Request) -> EvaluationResult:
    return run_evaluation(get_settings(), request_id_of(request))
