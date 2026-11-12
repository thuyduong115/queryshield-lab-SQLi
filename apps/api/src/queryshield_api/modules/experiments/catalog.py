"""Fixed, allow-listed test catalog for the login-bypass scenario.

Inputs reference only the public disposable fixture passwords. The API exposes labels,
never the password values.
"""

from dataclasses import dataclass
from typing import Literal

from queryshield_api.db.fixtures import USERS

Outcome = Literal["AUTHENTICATED", "DENIED", "QUERY_ERROR", "VALIDATION_ERROR"]

_PASSWORDS = {user.username: user.demo_password for user in USERS}


@dataclass(frozen=True)
class LabTestCase:
    id: str
    title: str
    purpose: str
    username: str
    password: str
    input_label: str
    password_label: str
    expected_vulnerable: Outcome
    expected_secure: Outcome
    gating: bool

    def expected_for(self, mode: str) -> Outcome:
        return self.expected_vulnerable if mode == "vulnerable" else self.expected_secure


CATALOG: tuple[LabTestCase, ...] = (
    LabTestCase(
        "T01",
        "Đăng nhập hợp lệ",
        "Chức năng hợp lệ được giữ nguyên",
        "student01",
        _PASSWORDS["student01"],
        "student01",
        "mật khẩu đúng của student01",
        "AUTHENTICATED",
        "AUTHENTICATED",
        True,
    ),
    LabTestCase(
        "T02",
        "Sai mật khẩu",
        "Mật khẩu sai bị từ chối",
        "student01",
        "wrong-password",
        "student01",
        "wrong-password (sai)",
        "DENIED",
        "DENIED",
        True,
    ),
    LabTestCase(
        "T03",
        "Payload SQL Injection",
        "Tấn công so với phòng thủ",
        "admin' -- ",
        "wrong-password",
        "admin' -- ",
        "wrong-password (sai)",
        "AUTHENTICATED",
        "DENIED",
        True,
    ),
    LabTestCase(
        "T04",
        "Người dùng không tồn tại",
        "Đối chứng âm",
        "ghost_user",
        "AnyPassword1!",
        "ghost_user",
        "AnyPassword1!",
        "DENIED",
        "DENIED",
        True,
    ),
    LabTestCase(
        "T05",
        "Tên có dấu nháy hợp lệ",
        "Dấu nháy được xử lý như dữ liệu ở chế độ an toàn",
        "O'Connor",
        "Random-Pass-1",
        "O'Connor",
        "Random-Pass-1",
        "QUERY_ERROR",
        "DENIED",
        False,
    ),
    LabTestCase(
        "T06",
        "Tên Unicode",
        "Xử lý Unicode",
        "nguyễn.văn.an",
        "wrong-password",
        "nguyễn.văn.an",
        "wrong-password (sai)",
        "DENIED",
        "DENIED",
        False,
    ),
    LabTestCase(
        "T07",
        "Input quá dài",
        "Kiểm tra schema (129 ký tự)",
        "a" * 129,
        "wrong-password",
        "129 × 'a'",
        "wrong-password (sai)",
        "VALIDATION_ERROR",
        "VALIDATION_ERROR",
        False,
    ),
    LabTestCase(
        "T08",
        "Tên đăng nhập rỗng",
        "Kiểm tra schema",
        "",
        "wrong-password",
        "(rỗng)",
        "wrong-password (sai)",
        "VALIDATION_ERROR",
        "VALIDATION_ERROR",
        False,
    ),
)

BY_ID = {case.id: case for case in CATALOG}
