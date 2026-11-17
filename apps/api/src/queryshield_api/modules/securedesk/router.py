"""Simulated SecureDesk dashboard derived from an authenticated lab run.

This is NOT authentication: no cookie or token is issued, and the response grants nothing
in QueryShield Lab. It only shows what the fixture account would have seen.
"""

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from queryshield_api.config import get_settings
from queryshield_api.core.errors import LabError
from queryshield_api.db.connection import app_connection
from queryshield_api.modules.experiments import repository

router = APIRouter(prefix="/api/v1/securedesk", tags=["securedesk"])


class Profile(BaseModel):
    username: str
    role: str
    display_name: str
    department: str


class Ticket(BaseModel):
    id: int
    title: str
    status: Literal["open", "in_progress", "resolved"]
    priority: Literal["low", "normal", "high"]
    visibility: Literal["owner", "internal"]
    owner_username: str
    created_at: datetime


class SimulatedSession(BaseModel):
    run_id: str
    mode: str
    simulated: bool
    profile: Profile
    tickets: list[Ticket]
    notice: str


@router.get("/simulated-session/{run_id}", response_model=SimulatedSession)
def simulated_session(run_id: str) -> SimulatedSession:
    settings = get_settings()
    _require_uuid(run_id)
    run = repository.get_run(settings, run_id)
    if run is None or not run["authenticated"] or not run["simulated_user"]:
        raise LabError(
            404,
            "NO_SIMULATED_SESSION",
            "Lần chạy này không đăng nhập được, không có phiên mô phỏng.",
        )
    with app_connection(settings) as conn:
        profile = conn.execute(
            "SELECT id, username, role, display_name, department FROM demo.users "
            "WHERE username = %s",
            (run["simulated_user"],),
        ).fetchone()
        if profile is None:
            raise LabError(404, "NO_SIMULATED_SESSION", "Tài khoản fixture không còn tồn tại.")
        # Admins see every ticket (the impact of the bypass); others see their own.
        tickets = conn.execute(
            "SELECT t.id, t.title, t.status, t.priority, t.visibility, t.created_at, "
            "u.username AS owner_username FROM demo.tickets t JOIN demo.users u "
            "ON u.id = t.owner_id WHERE %s = 'admin' OR t.owner_id = %s ORDER BY t.created_at DESC",
            (profile["role"], profile["id"]),
        ).fetchall()
    return SimulatedSession(
        run_id=run_id,
        mode=run["mode"],
        simulated=True,
        profile=Profile(
            **{k: profile[k] for k in ("username", "role", "display_name", "department")}
        ),
        tickets=[Ticket(**t) for t in tickets],
        notice="Phiên mô phỏng từ dữ liệu tổng hợp. Không có cookie/token nào được cấp.",
    )


def _require_uuid(value: str) -> None:
    try:
        uuid.UUID(value)
    except ValueError:
        raise LabError(404, "RUN_NOT_FOUND", "Không tìm thấy lần chạy.") from None
