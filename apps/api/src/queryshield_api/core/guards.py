"""Lab safety boundary for the deliberately vulnerable adapter."""

from queryshield_api.config import Settings
from queryshield_api.core.errors import LabError


def lab_disabled_error(run_id: str | None = None) -> LabError:
    extra = {"run_id": run_id} if run_id else None
    return LabError(
        403,
        "LAB_DISABLED",
        "Bài thực hành dễ bị tấn công đang tắt. Chỉ bật khi APP_ENV=local "
        "và LAB_ENABLE_UNSAFE=true trên máy cục bộ.",
        extra,
    )


def unsafe_allowed(settings: Settings) -> bool:
    """Both flags are required; anything else (missing, production, false) fails closed."""
    return settings.unsafe_lab_allowed
