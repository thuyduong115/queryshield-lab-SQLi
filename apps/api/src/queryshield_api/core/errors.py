"""Stable JSON error model. Messages never contain SQL, stack traces or submitted values."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class LabError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.extra = extra or {}


def database_unavailable() -> LabError:
    return LabError(503, "DATABASE_UNAVAILABLE", "Không kết nối được cơ sở dữ liệu của lab.")


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def error_body(request: Request, code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {
        "error": {"code": code, "message": message, "request_id": request_id_of(request), **extra}
    }


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(LabError)
    async def handle_lab_error(request: Request, exc: LabError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(request, exc.code, exc.message, **exc.extra),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Report only field location and error type: Pydantic's default body echoes the
        # submitted input, which could include a password.
        fields = [
            {
                "field": ".".join(str(part) for part in err.get("loc", ()) if part != "body"),
                "issue": err.get("type", "invalid"),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_body(
                request, "VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ.", fields=fields
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        message = (
            "Không tìm thấy tài nguyên." if exc.status_code == 404 else "Yêu cầu không hợp lệ."
        )
        return JSONResponse(status_code=exc.status_code, content=error_body(request, code, message))

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_body(request, "INTERNAL_ERROR", "Lỗi không mong muốn phía máy chủ."),
        )
