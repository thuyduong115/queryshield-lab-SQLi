#!/usr/bin/env bash
# Run API lint + unit + PostgreSQL integration tests inside the private Compose network.
# Integration tests use an isolated database `queryshield_lab_test`, never `queryshield_lab`.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT_DIR/infra/compose.yaml")
if [[ -f "$ROOT_DIR/.env" ]]; then
  COMPOSE+=(--env-file "$ROOT_DIR/.env")
fi

"${COMPOSE[@]}" build lab-admin
"${COMPOSE[@]}" up -d --wait db

PG_USER="${POSTGRES_USER:-queryshield}"
PG_PASSWORD="${POSTGRES_PASSWORD:-queryshield_local_only}"

"${COMPOSE[@]}" run --rm --no-deps --user root \
  -v "$ROOT_DIR/apps/api:/work" \
  -v queryshield-api-test-venv:/work/.venv \
  -w /work \
  -e TEST_ADMIN_DATABASE_URL="postgresql://$PG_USER:$PG_PASSWORD@db:5432/postgres" \
  --entrypoint sh \
  lab-admin -lc "uv sync --locked && uv run ruff check . && uv run ruff format --check . && uv run pytest -ra ${PYTEST_ARGS:-}"
