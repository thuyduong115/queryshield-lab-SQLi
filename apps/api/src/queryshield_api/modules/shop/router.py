"""Synthetic shop and local observation desk. No real sessions or SQL console."""

import importlib
import time
import uuid

import psycopg
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field, field_validator

from queryshield_api.config import get_settings
from queryshield_api.core.errors import LabError, database_unavailable
from queryshield_api.core.guards import lab_disabled_error, unsafe_allowed
from queryshield_api.db.connection import app_connection, query_connection
from queryshield_api.modules.experiments import observations
from queryshield_api.modules.laboratory.adapters import shop_queries as safe
from queryshield_api.modules.laboratory.inspector import PREVIEW_LABEL
from queryshield_api.modules.laboratory.schemas import Mode

router = APIRouter(prefix="/api/v1/shop", tags=["shop"])


class TextInput(BaseModel):
    value: str = Field(max_length=128)

    @field_validator("value")
    @classmethod
    def reject_nul(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("NUL character is not allowed")
        return value


class SearchInput(TextInput):
    mode: Mode = "secure"


class ProfileInput(TextInput):
    value: str = Field(min_length=1, max_length=128)


class ReportInput(BaseModel):
    profile_id: uuid.UUID
    mode: Mode = "secure"


def adapter(settings, mode):
    if mode == "secure":
        return safe
    if not unsafe_allowed(settings):
        raise lab_disabled_error()
    return importlib.import_module("queryshield_api.modules.laboratory.adapters.vulnerable")


def inspect(template, parameters, preview=None):
    return {
        "query_template": template,
        "sql_preview_redacted": preview if preview is not None else template,
        "preview_label": PREVIEW_LABEL,
        "parameters": parameters,
    }


def execute_read(settings, mode, operation, value, *, profile_id=None):
    implementation = adapter(settings, mode)  # Guard before DB access or unsafe import.
    search = operation == "search"
    template = safe.SEARCH_SQL if search else safe.ORDER_SQL
    parameters = ["%" + value + "%" if search else value] if mode == "secure" else []
    preview = None
    if mode == "vulnerable":
        preview = (
            implementation.search_query(value) if search else implementation.order_query(value)
        )
    start = time.perf_counter()
    rows, sqlstate = [], None
    with query_connection(settings) as conn:
        try:
            rows = (
                implementation.search_products(conn, value)
                if search
                else implementation.customer_orders(conn, value)
            )
        except psycopg.OperationalError:
            raise database_unavailable() from None
        except psycopg.Error as exc:
            if mode == "secure":
                raise
            sqlstate = exc.sqlstate or "UNKNOWN"
    detail = {
        "inspector": inspect(template, parameters, preview),
        "rows": rows,
        "sqlstate": sqlstate,
        "duration_ms": max(0, round((time.perf_counter() - start) * 1000)),
        "profile_id": str(profile_id) if profile_id else None,
        "saved_value": value if profile_id else None,
    }
    outcome = "QUERY_ERROR" if sqlstate else "ROWS_RETURNED"
    event_id = observations.record(settings, operation, mode, outcome, detail)
    return {"id": event_id, "operation": operation, "mode": mode, "outcome": outcome, **detail}


@router.post("/search")
def search_products(body: SearchInput):
    return execute_read(get_settings(), body.mode, "search", body.value)


@router.post("/profiles")
def save_profile(body: ProfileInput):
    settings = get_settings()
    profile_id = uuid.uuid4()
    start = time.perf_counter()
    with app_connection(settings) as conn:
        row = conn.execute(safe.SAVE_PROFILE_SQL, (profile_id, body.value)).fetchone()
    detail = {
        "inspector": inspect(safe.SAVE_PROFILE_SQL, [str(profile_id), body.value]),
        "rows": [row],
        "duration_ms": max(0, round((time.perf_counter() - start) * 1000)),
        "sqlstate": None,
    }
    event_id = observations.record(settings, "profile-save", "secure", "SAVED", detail)
    return {
        "id": event_id,
        "profile_id": str(profile_id),
        "operation": "profile-save",
        "mode": "secure",
        "outcome": "SAVED",
        **detail,
    }


@router.post("/order-report")
def order_report(body: ReportInput):
    settings = get_settings()
    adapter(settings, body.mode)  # Fail closed before reading the saved value.
    with app_connection(settings) as conn:
        profile = conn.execute(safe.READ_PROFILE_SQL, (body.profile_id,)).fetchone()
    if profile is None:
        raise LabError(404, "PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ demo đã lưu.")
    return execute_read(
        settings, body.mode, "order-report", profile["customer_name"], profile_id=body.profile_id
    )


@router.get("/observations")
def list_observations(limit: int = Query(default=30, ge=1, le=100)):
    with app_connection(get_settings()) as conn:
        rows = conn.execute(
            "SELECT id::text, operation, mode, outcome, detail, created_at "
            "FROM lab.observations ORDER BY created_at DESC, id LIMIT %s",
            (limit,),
        ).fetchall()
    return {"observations": rows}


@router.get("/database")
def database_snapshot():
    settings = get_settings()
    # This endpoint intentionally displays PUBLIC, disposable fixture passwords.
    # It cannot be used outside the explicitly enabled local lab.
    if not unsafe_allowed(settings):
        raise lab_disabled_error()
    with query_connection(settings) as conn:
        users = conn.execute(
            "SELECT id, username, password, role FROM demo.users ORDER BY id"
        ).fetchall()
        products = conn.execute(safe.PRODUCT_COLUMNS + " ORDER BY id").fetchall()
        orders = conn.execute(safe.ORDER_COLUMNS + " ORDER BY id").fetchall()
    with app_connection(settings) as conn:
        profiles = conn.execute(
            "SELECT id::text, customer_name FROM demo.profiles ORDER BY id LIMIT 30"
        ).fetchall()
    return {
        "users": users,
        "products": products,
        "orders": orders,
        "profiles": profiles,
        "notice": (
            "Dữ liệu giả hiện tại; mật khẩu fixture dạng thô chỉ dùng để giảng dạy. "
            "Đây không phải snapshot tại thời điểm từng truy vấn."
        ),
    }
