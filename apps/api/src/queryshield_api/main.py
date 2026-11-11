from fastapi import FastAPI

from queryshield_api.config import get_settings

app = FastAPI(
    title="QueryShield Lab API",
    version="0.1.0",
    docs_url="/docs",
)


@app.get("/api/v1/health", tags=["system"])
def health() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.app_env,
        "unsafeLabEnabled": settings.lab_enable_unsafe,
    }
