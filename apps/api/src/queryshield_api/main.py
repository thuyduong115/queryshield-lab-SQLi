import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import Response

from queryshield_api.config import get_settings
from queryshield_api.core.errors import LabError, install_error_handlers
from queryshield_api.db.connection import app_connection
from queryshield_api.modules.experiments.repository import current_dataset_version
from queryshield_api.modules.laboratory.router import router as labs_router
from queryshield_api.modules.securedesk.router import router as securedesk_router

logger = logging.getLogger("queryshield.api")

app = FastAPI(
    title="QueryShield Lab API",
    version="1.0.0",
    docs_url="/docs",
    description="API cục bộ của phòng thí nghiệm SQL Injection QueryShield Lab.",
)
install_error_handlers(app)


@app.middleware("http")
async def request_context(request: Request, call_next) -> Response:
    request.state.request_id = uuid.uuid4().hex
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["Cache-Control"] = "no-store"
    # Log route, status and timing only: never bodies, query strings or SQL.
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%d",
        request.state.request_id,
        request.method,
        request.url.path,
        response.status_code,
        round((time.perf_counter() - start) * 1000),
    )
    return response


@app.get("/api/v1/health", tags=["system"])
def health() -> dict[str, str | bool | None]:
    settings = get_settings()
    database = "unavailable"
    dataset_version = None
    try:
        with app_connection(settings) as conn:
            dataset_version = current_dataset_version(conn)
        database = "ok"
    except LabError:
        pass
    return {
        "status": "ok" if database == "ok" else "degraded",
        "environment": settings.app_env,
        "unsafeLabEnabled": settings.unsafe_lab_allowed,
        "database": database,
        "datasetVersion": dataset_version,
    }


app.include_router(labs_router)
app.include_router(securedesk_router)
