"""Defense-in-depth evaluation matrix (ADR-017).

Expectations are written down here BEFORE running and compared with measured outcomes;
they are never derived from results. Only the existing catalog inputs are used.
"""

from dataclasses import dataclass
from typing import Literal

from queryshield_api.modules.experiments.catalog import BY_ID

Role = Literal["legitimate", "wrong_credentials", "attack"]


@dataclass(frozen=True)
class Configuration:
    id: str
    title: str
    mode: Literal["vulnerable", "secure"]
    input_validation: bool


CONFIGURATIONS: tuple[Configuration, ...] = (
    Configuration("C0", "Nối chuỗi, không lớp bổ sung", "vulnerable", False),
    Configuration("C1", "Nối chuỗi + allow-list (L2)", "vulnerable", True),
    Configuration("C2", "Bind tham số (L1)", "secure", False),
    Configuration("C3", "Bind tham số (L1) + allow-list (L2)", "secure", True),
)

CASES: tuple[tuple[str, Role], ...] = (
    ("T01", "legitimate"),
    ("T11", "legitimate"),
    ("T02", "wrong_credentials"),
    ("T04", "wrong_credentials"),
    ("T03", "attack"),
)

EXPECTED: dict[tuple[str, str], str] = {
    ("C0", "T01"): "AUTHENTICATED",
    ("C0", "T11"): "QUERY_ERROR",
    ("C0", "T02"): "DENIED",
    ("C0", "T04"): "DENIED",
    ("C0", "T03"): "AUTHENTICATED",
    ("C1", "T01"): "AUTHENTICATED",
    ("C1", "T11"): "REJECTED_BY_VALIDATION",
    ("C1", "T02"): "DENIED",
    ("C1", "T04"): "DENIED",
    ("C1", "T03"): "REJECTED_BY_VALIDATION",
    ("C2", "T01"): "AUTHENTICATED",
    ("C2", "T11"): "AUTHENTICATED",
    ("C2", "T02"): "DENIED",
    ("C2", "T04"): "DENIED",
    ("C2", "T03"): "DENIED",
    ("C3", "T01"): "AUTHENTICATED",
    ("C3", "T11"): "REJECTED_BY_VALIDATION",
    ("C3", "T02"): "DENIED",
    ("C3", "T04"): "DENIED",
    ("C3", "T03"): "REJECTED_BY_VALIDATION",
}

assert set(EXPECTED) == {(c.id, case) for c in CONFIGURATIONS for case, _ in CASES}
assert all(case in BY_ID for case, _ in CASES)
