#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/compose.yaml"

docker compose -f "$COMPOSE_FILE" build api web

docker run --rm \
  --user root \
  -v "$ROOT_DIR/apps/api:/work" \
  -v queryshield-api-test-venv:/work/.venv \
  -w /work \
  queryshield-lab-api \
  sh -lc "uv sync --locked && uv run ruff check . && uv run ruff format --check . && uv run pytest"

docker compose -f "$COMPOSE_FILE" run --rm --no-deps web \
  sh -lc "pnpm lint && pnpm format:check && pnpm test && pnpm build"

