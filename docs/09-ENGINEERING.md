# 09 — Engineering Standards and Local Tooling

## Repository organization
Keep one monorepo. A directory should exist when populated by real implementation; no decorative empty `sdks/`, `services/` or similar. Source roots:
- `apps/web/src`: UI, components, features, API client, TypeScript types.
- `apps/api/src`: FastAPI core, modules, database adapters.
- `infra/`: Compose, migration/seed bootstrap.
- `tests/`: cross-service tests and Playwright; module unit tests beside API if appropriate.
- `tools/postman/`: exported Postman collections; `tools/` also local reset/seed scripts.

## Naming and structure
- Python: snake_case files/functions, type hints, small services, Pydantic DTOs separate from DB models.
- TypeScript: strict mode; PascalCase React components; feature folders. Avoid `any` for API responses.
- Route handlers thin; orchestration in services; adapter contains SQL; no DB operations in React.
- No duplicated implementation of business logic just to draw comparisons.
- Comments in English; text shown to users and core documentation in Vietnamese where possible.

## Quality tools
- Backend: Ruff for lint/format, Pytest for tests, typing where feasible.
- Frontend: ESLint, Prettier, TypeScript compiler/build; Playwright for E2E.
- GitHub Actions: only after project build/test is reproducible locally.
- Dependencies: `uv` for Python and `pnpm` for Node. Check versions available to environment; commit lockfiles. Do not hardcode dependencies against unsupported Node/Python versions.
- External services/API keys are not required. Do not add paid dependencies without a scope change.

## Local addresses
- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8000`
- API docs: `/docs` (Swagger OpenAPI)
- Database service: internal Docker `db:5432`; optional manual DBeaver access `127.0.0.1:5433` with explicit local port mapping.

## Intended commands (Codex must implement/verify)
```bash
docker compose -f infra/compose.yaml up --build
cd apps/api && uv run ruff check . && uv run pytest
cd apps/web && pnpm lint && pnpm build
cd tests/e2e && pnpm exec playwright test
```

Do not write these commands as 'verified' until actually run. For Windows PowerShell document equivalent commands if different.

## Error handling
- FastAPI returns opaque request ID and sanitized stable codes. Server logs include request ID, timing, route, outcome but not SQL queries with passwords or full login bodies.
- UI distinguishes denied login (normal result) vs 403 lab disabled vs 503 DB unavailable vs validation failure.
- Timeouts and DB exceptions never become success responses.

## Security code review checklist
- [ ] Unsafe interpolation only in single guarded adapter.
- [ ] Everything else bound through Psycopg or ORM safely.
- [ ] Valid input containing apostrophe supported securely.
- [ ] No real auth tokens from simulated bypass.
- [ ] No secrets in logs, screenshots, Postman exports or git.
- [ ] Local-only binding and role privileges verified.
- [ ] All tests are real and reproducible, not skipped silently.
