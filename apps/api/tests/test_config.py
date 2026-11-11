import pytest
from pydantic import ValidationError

from queryshield_api.config import Settings


def test_safe_defaults_disable_unsafe_lab() -> None:
    settings = Settings(_env_file=None)
    assert settings.app_env == "development"
    assert settings.lab_enable_unsafe is False


def test_unsafe_lab_is_rejected_outside_local_environment() -> None:
    with pytest.raises(ValidationError, match="requires APP_ENV=local"):
        Settings(app_env="development", lab_enable_unsafe=True, _env_file=None)
