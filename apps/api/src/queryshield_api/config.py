from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["development", "local", "test"] = "development"
    lab_enable_unsafe: bool = False
    database_url: str = "postgresql://queryshield:queryshield_local_only@db:5432/queryshield"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def reject_unsafe_nonlocal_configuration(self) -> "Settings":
        if self.lab_enable_unsafe and self.app_env != "local":
            raise ValueError("LAB_ENABLE_UNSAFE=true requires APP_ENV=local")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
