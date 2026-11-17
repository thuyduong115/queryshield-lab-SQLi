"""Defense layers that can be switched per request (ADR-017).

L1 parameter binding is the `secure` mode itself. L3 least privilege is a property of the
database role and is measured, not toggled (see privileges.py).
"""

import re
from dataclasses import dataclass

from pydantic import BaseModel

# L2: allow-list for usernames. Unicode letters/digits plus . _ - @, 1..64 chars.
# This is a business rule about what a username may look like. It is NOT a SQL Injection
# fix on its own: it also rejects legitimate names such as o'connor (measured as a false
# rejection in the evaluation matrix).
USERNAME_ALLOW_LIST = re.compile(r"^[\w.@-]{1,64}$")


class Layers(BaseModel):
    input_validation: bool = False
    error_masking: bool = False

    def active(self, mode: str) -> list[str]:
        names = []
        if mode == "secure":
            names.append("binding")
        if self.input_validation:
            names.append("validation")
        if self.error_masking:
            names.append("error_masking")
        names.append("monitoring")
        return names


def passes_allow_list(username: str) -> bool:
    return USERNAME_ALLOW_LIST.fullmatch(username) is not None


@dataclass(frozen=True)
class DetectionRule:
    id: str
    description: str
    pattern: re.Pattern[str]


# L5: observe-only signals. Matches are recorded as rule IDs; the input itself is never
# stored. These rules will raise false alarms on legitimate names by design.
DETECTION_RULES: tuple[DetectionRule, ...] = (
    DetectionRule("QUOTE", "Tên đăng nhập chứa dấu nháy đơn", re.compile(r"'")),
    DetectionRule(
        "COMMENT", "Tên đăng nhập chứa chuỗi bắt đầu chú thích SQL", re.compile(r"--|/\*")
    ),
    DetectionRule("SEPARATOR", "Tên đăng nhập chứa dấu chấm phẩy", re.compile(r";")),
)


def detect(username: str) -> list[str]:
    return [rule.id for rule in DETECTION_RULES if rule.pattern.search(username)]
