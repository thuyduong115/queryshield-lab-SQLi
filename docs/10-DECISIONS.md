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
