#!/usr/bin/env bash
# Playwright E2E against the running local Compose stack, from a container on the
# private Compose network. Requires APP_ENV=local and LAB_ENABLE_UNSAFE=true in .env.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="queryshield-lab_queryshield-private"

docker run --rm --ipc=host \
  --network "$NETWORK" \
  -v "$ROOT_DIR/tests/e2e:/e2e" \
  -v queryshield-e2e-node-modules:/e2e/node_modules \
  -w /e2e \
  -e E2E_BASE_URL=http://web:5173 \
  -e CAPTURE_SCREENS="${CAPTURE_SCREENS:-}" \
  -e CAPTURE_DIR="${CAPTURE_DIR:-screens}" \
  mcr.microsoft.com/playwright:v1.50.1-noble \
  sh -lc "npm install -g pnpm@10.15.1 --silent >/dev/null 2>&1; pnpm install --frozen-lockfile --store-dir /tmp/pnpm-store >/dev/null && pnpm exec playwright test $*"
