"""Deterministic synthetic fixtures. Passwords are public, disposable classroom values.

They are hashed with pgcrypto bcrypt during seeding and never stored in plaintext.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class FixtureUser:
    id: int
    username: str
    demo_password: str
    role: str
    display_name: str
    department: str


@dataclass(frozen=True)
class FixtureTicket:
    id: int
    owner_id: int
    title: str
    status: str
    priority: str
    visibility: str
    created_at: str


USERS: tuple[FixtureUser, ...] = (
    FixtureUser(1, "admin", "AdminDemo123!", "admin", "Quản trị hệ thống", "Phòng CNTT"),
    FixtureUser(2, "student01", "StudentDemo123!", "student", "Sinh viên 01", "Khoa CNTT"),
    FixtureUser(3, "staff01", "StaffDemo123!", "staff", "Nhân viên 01", "Phòng Đào tạo"),
)

TICKETS: tuple[FixtureTicket, ...] = (
    FixtureTicket(
        1001,
        2,
        "Không đăng nhập được Wi-Fi thư viện",
        "open",
        "normal",
        "owner",
        "2026-11-02T08:15:00+07:00",
    ),
    FixtureTicket(
        1002,
        2,
        "Xin cấp lại quyền truy cập LMS",
        "resolved",
        "low",
        "owner",
        "2026-10-28T14:40:00+07:00",
    ),
    FixtureTicket(
        1003,
        3,
        "Máy chiếu phòng B2-301 không nhận HDMI",
        "in_progress",
        "high",
        "owner",
        "2026-11-05T09:05:00+07:00",
    ),
    FixtureTicket(
        1004,
        3,
        "Cập nhật lịch thi học kỳ trên cổng thông tin",
        "open",
        "normal",
        "owner",
        "2026-11-07T16:20:00+07:00",
    ),
    FixtureTicket(
        1005,
        1,
        "[Nội bộ] Xoay vòng khóa sao lưu cơ sở dữ liệu",
        "open",
        "high",
        "internal",
        "2026-11-08T07:30:00+07:00",
    ),
    FixtureTicket(
        1006,
        1,
        "[Nội bộ] Rà soát tài khoản quản trị không hoạt động",
        "in_progress",
        "high",
        "internal",
        "2026-11-09T10:10:00+07:00",
    ),
)

SCENARIO = {
    "id": "login-bypass",
    "title": "Vượt qua đăng nhập bằng SQL Injection",
    "description": (
        "So sánh cùng một truy vấn đăng nhập SecureDesk khi giá trị người dùng được nối chuỗi "
        "vào SQL và khi được bind tham số bằng Psycopg, trên cùng dữ liệu tổng hợp."
    ),
}
