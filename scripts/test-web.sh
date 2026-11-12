#!/usr/bin/env bash
# Web lint + format + unit tests + production build inside a Node container.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker run --rm \
  -v "$ROOT_DIR/apps/web:/app" \
  -v queryshield-web-node-modules:/app/node_modules \
  -w /app \
  node:22.14.0-alpine \
  sh -lc "npm install -g pnpm@10.15.1 --silent >/dev/null 2>&1; pnpm install --frozen-lockfile --store-dir /tmp/pnpm-store >/dev/null && pnpm lint && pnpm format:check && pnpm test && pnpm build"
