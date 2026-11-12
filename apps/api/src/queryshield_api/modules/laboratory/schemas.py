from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Mode = Literal["vulnerable", "secure"]
ResultCode = Literal["AUTHENTICATED", "DENIED", "QUERY_ERROR", "LAB_DISABLED", "VALIDATION_ERROR"]


class LoginRequest(BaseModel):
    mode: Mode
    # No SQLi deny-list on purpose: the defense is parameter binding, not input filtering.
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=128)
    test_case_id: str | None = Field(default=None, max_length=16)

    @field_validator("username", "password")
    @classmethod
    def reject_nul(cls, value: str) -> str:
        # PostgreSQL text cannot store NUL; this is a data-validity rule, not a SQLi filter.
        if "\x00" in value:
            raise ValueError("NUL character is not allowed")
        return value

    def __repr__(self) -> str:  # never render the password in logs or tracebacks
        return f"LoginRequest(mode={self.mode!r}, test_case_id={self.test_case_id!r})"

    __str__ = __repr__


class SimulatedUser(BaseModel):
    username: str
    role: str


class Authentication(BaseModel):
    authenticated: bool
    simulated_user: SimulatedUser | None
    rows_returned: int | None


class SegmentOut(BaseModel):
    text: str
    origin: Literal["template", "username", "password", "placeholder"]
    syntax: Literal["code", "string", "comment"]


class ParameterOut(BaseModel):
    position: int
    name: str
    sql_type: str
    value: str | None
    redacted: bool


class InspectorOut(BaseModel):
    query_template: str
    sql_preview_redacted: str
    preview_label: str
    segments: list[SegmentOut]
    parameters: list[ParameterOut]
    explanation_code: Literal["UNSAFE_CONCATENATION", "PARAMETER_BINDING"]
    observations: list[str]


class QueryError(BaseModel):
    sqlstate: str | None
    category: str


class LoginRunResponse(BaseModel):
    run_id: str
    scenario_id: str
    mode: Mode
    test_case_id: str | None
    outcome: ResultCode
    authentication: Authentication
    inspector: InspectorOut
    query_error: QueryError | None
    duration_ms: int
    dataset_version: str
    created_at: datetime
    simulation_notice: str


class ScenarioOut(BaseModel):
    id: str
    title: str
    description: str
    enabled: bool


class ScenarioCatalog(BaseModel):
    scenarios: list[ScenarioOut]
    unsafe_lab_enabled: bool
    dataset_version: str | None


class RunSummary(BaseModel):
    run_id: str
    scenario_id: str
    mode: Mode
    test_case_id: str | None
    suite_id: str | None
    outcome: ResultCode
    authenticated: bool
    simulated_user: str | None
    simulated_role: str | None
    rows_returned: int | None
    sqlstate: str | None
    expected_outcome: str | None
    passed: bool | None
    duration_ms: int
    dataset_version: str
    created_at: datetime
