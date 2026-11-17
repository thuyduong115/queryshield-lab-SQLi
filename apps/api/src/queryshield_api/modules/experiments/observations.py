"""Bounded, redacted query evidence. No passwords or raw login bodies are stored."""

import uuid

from psycopg.types.json import Jsonb

from queryshield_api.db.connection import app_connection


def redact(value, password: str):
    if isinstance(value, str):
        return value.replace(password, "[mật khẩu đã ẩn]") if password else value
    if isinstance(value, dict):
        return {key: redact(item, password) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item, password) for item in value]
    return value


def record(settings, operation: str, mode: str, outcome: str, detail: dict, *, run_id=None):
    observation_id = run_id or str(uuid.uuid4())
    with app_connection(settings) as conn:
        conn.execute(
            "INSERT INTO lab.observations (id, operation, mode, outcome, detail) "
            "VALUES (%s, %s, %s, %s, %s)",
            (observation_id, operation, mode, outcome, Jsonb(detail)),
        )
    return observation_id
