from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Unsafe lab mode is fail-closed by default."""

    # "production" is accepted so a misconfigured deployment still boots in secure-only mode.
    app_env: Literal["development", "local", "test", "production"] = "development"
    lab_enable_unsafe: bool = False

    # Least-privileged runtime connections; never the migration/seed principal.
    # lab_query: SELECT on demo.users only, used by both login adapters.
    # lab_app: run persistence, scenario metadata and the simulated SecureDesk dashboard.
    lab_query_database_url: str | None = None
    lab_app_database_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def reject_unsafe_nonlocal_configuration(self) -> "Settings":
        if self.lab_enable_unsafe and self.app_env != "local":
            raise ValueError("LAB_ENABLE_UNSAFE=true requires APP_ENV=local")
        return self

    @property
    def unsafe_lab_allowed(self) -> bool:
        return self.app_env == "local" and self.lab_enable_unsafe


@lru_cache
def get_settings() -> Settings:
    return Settings()
