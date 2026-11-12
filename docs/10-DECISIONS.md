# 10 — Architecture Decision Records (ADRs)

These are **initial project design choices**, not assertions about what already exists in code. Changes require a brief appended ADR with reasons and affected docs/tests.

| ID | Status | Choice | Reason / trade-off |
|---|---|---|---|
| ADR-001 | Accepted | Modular monolith + monorepo | Keeps MVP simple while separating domains |
| ADR-002 | Accepted | React + TypeScript + Vite | Lightweight UI with clear feature modules |
| ADR-003 | Accepted | FastAPI + Pydantic + Psycopg 3 | Easy API and explicit SQL binding demonstration |
| ADR-004 | Accepted | PostgreSQL 17 + pgcrypto for demo fixtures | Same SQL-side password predicate can be compared before/after; educational only |
| ADR-005 | Accepted | Postman over Bruno | Team preference; simple request and API collection workflow |
| ADR-006 | Accepted | Pytest + Playwright | Evidence across logic, API and browser layers |
| ADR-007 | Accepted | One DB; synthetic schemas; least privilege | Apples-to-apples comparison with limited possible impact |
| ADR-008 | Accepted | Unsafe SQL only in one adapter, local-only | Explicit bounded vulnerability for teaching; never public |
| ADR-009 | Accepted | Never issue real auth token from bypass | Prevent lab result becoming control-plane authorization |
| ADR-010 | Accepted | Reset is a CLI operation, not HTTP | Lowers accidental/destructive endpoint risk |
| ADR-011 | Deferred | SQLAlchemy/Alembic after DB adapter foundation | Keep explanation simple, add when persisted experiment domain grows |
| ADR-012 | Deferred | Optional Recharts/WeasyPrint | Add after real metrics/report need is proven |
| ADR-013 | Rejected MVP | Microservices, Redis, Kafka, K8s, AI | Complexity without project requirement |

## Future ADR format
```
### ADR-XXX — Title
- Date:
- Context:
- Options:
- Decision:
- Consequences:
- Affected files/contracts/tests:
```

### ADR-014 — Segment-based SQL inspector instead of Monaco
- Date: 2026-11-13
- Context: P3 suggested a read-only Monaco editor. The lesson needs to show *which characters came from the user* and *which part PostgreSQL treats as a comment*.
- Decision: the API returns lexed segments (origin × syntax) derived from the same builder the adapter executes; the web renders them with input highlighting, struck-through comments and sealed parameter "envelopes". Monaco was not added.
- Consequences: smaller bundle, no editor dependency; the preview stays labelled as a redacted derived view.
- Affected: `modules/laboratory/inspector.py`, `apps/web/src/components/SqlInspector.tsx`, tests.

### ADR-015 — Vulnerable-mode parse errors reported as `QUERY_ERROR` with HTTP 200
- Date: 2026-11-13
- Context: T05 (`O'Connor`) breaks the concatenated SQL. This is the experiment's observed result, not a server fault.
- Decision: return HTTP 200 with `outcome=QUERY_ERROR`, `authenticated=false`, SQLSTATE only; persist `result_code=QUERY_ERROR`. Secure-mode DB errors remain 500.
- Affected: `docs/04-API-CONTRACT.md`, `lab.runs.result_code`, T05 expectations.

### ADR-016 — One-shot `lab-admin` Compose service for bootstrap/reset
- Date: 2026-11-13
- Decision: the privileged DB URL lives only in the `lab-admin` service (`python -m queryshield_api.db.admin bootstrap|reset|check`), which runs to completion before the API starts. No HTTP reset route.
