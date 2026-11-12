# 03 — Data Model and Deterministic Fixtures

## Database strategy
One PostgreSQL 17 database called `queryshield_lab` with schema separation:
- `demo`: fixture-only data used in the deliberately vulnerable/secure login.
- `lab`: scenario metadata, experimental runs/results.
- Optional `audit`: sanitized security events (may be combined with `lab` in MVP).

Use migrations and idempotent seed operations. In P0/P1, plain SQL migration scripts are acceptable; add SQLAlchemy + Alembic only when it materially improves maintainability.

## Conceptual schema

### `demo.users`
| Column | Type | Rule |
|---|---|---|
| `id` | UUID or BIGINT | PK |
| `username` | TEXT | UNIQUE, NOT NULL |
| `password_hash` | TEXT | NOT NULL, demo bcrypt hash generated with `crypt(..., gen_salt('bf'))` |
| `role` | TEXT | one of `admin`, `staff`, `student` (fixture only) |
| `created_at` | TIMESTAMPTZ | defaults to now() |

### `demo.tickets` (tiny fixture for simulated dashboard)
| Column | Type | Rule |
|---|---|---|
| `id` | BIGINT | PK |
| `owner_id` | FK -> `demo.users.id` | synthetic owner |
| `title` | TEXT | fake support ticket |
| `status` | TEXT | e.g. `open`, `resolved` |

### `lab.scenarios`
| Column | Type | Rule |
|---|---|---|
| `id` | TEXT | e.g. `login-bypass` |
| `title` | TEXT | scenario name |
| `description` | TEXT | scenario objective |
| `enabled` | BOOLEAN | default true; execution still gated |

### `lab.test_cases`
| Column | Type | Rule |
|---|---|---|
| `id` | TEXT | `T01`...`T08` |
| `scenario_id` | FK | `login-bypass` |
| `input_ref` | TEXT | fixture identifier; no real secret storage |
| `expected_vulnerable` | BOOLEAN | explicit expected auth outcome |
| `expected_secure` | BOOLEAN | explicit expected auth outcome |

### `lab.runs`
| Column | Type | Rule |
|---|---|---|
| `id` | UUID | primary run ID |
| `scenario_id` | TEXT | fixed scenario |
| `mode` | TEXT | `vulnerable` / `secure` |
| `test_case_id` | TEXT NULL | optional associated test |
| `authenticated` | BOOLEAN | observed result, never hardcoded |
| `simulated_user` | TEXT NULL | allowed username from synthetic fixtures |
| `duration_ms` | INT | measured, not invented |
| `created_at` | TIMESTAMPTZ | server timestamp |
| `result_code` | TEXT | `AUTHENTICATED`, `DENIED`, `QUERY_ERROR`, `LAB_DISABLED`, `VALIDATION_ERROR` |
| `suite_id`, `expected_result`, `passed` | NULL-able | set only for suite runs; `passed` is NULL for skipped cases |
| `rows_returned`, `sqlstate`, `simulated_role`, `dataset_version`, `request_id` | | observed metadata; `sqlstate` only for `QUERY_ERROR` |

Do **not** persist submitted password, whole request body, raw SQL containing a password, session tokens, or uncontrolled free-text input. If storing username for comparisons, prefer a known fixture ID or a non-reversible digest.

## Seed identities (public classroom demo only)
| Username | Demo password | Role | Notes |
|---|---|---|---|
| `admin` | `AdminDemo123!` | `admin` | Target of bypass example |
| `student01` | `StudentDemo123!` | `student` | Valid-login control |
| `staff01` | `StaffDemo123!` | `staff` | Additional synthetic control |

These passwords are **deliberately public disposable fixtures**, never actual security credentials. Do not reuse them in any other system. Create hashes during fixture seed (`gen_salt('bf')`); never store passwords as plaintext in database tables.

## Primary SQL semantics

Secure template (Psycopg placeholders, **not** runnable as literal SQL in psql without binding):

```sql
SELECT id, username, role FROM demo.users
WHERE username = %s
  AND password_hash = crypt(%s, password_hash)
LIMIT 1
```

Unsafe adapter constructs semantically equivalent query but with interpolated values, **all on one line**; `admin' -- ` should eliminate the password condition in the unsafe case. This is intentionally dangerous and prohibited everywhere outside the guarded adapter. See `docs/05-DEMO-RUNBOOK.md`.

## Permissions
- `seed/migrator` principal: schema DDL and fixture reset, never used by web/API runtime.
- `lab_readonly` principal: minimum SELECT on `demo.users` and permitted fixture views; no INSERT/UPDATE/DELETE, no DDL, no access to sensitive tables in `lab` / `audit`, no SUPERUSER.
- `lab_writer` principal, if separate: INSERT/SELECT on `lab.runs` with strictly needed permissions; never passed into vulnerable adapter.

## Reproducibility
- Seed script is idempotent; reset recreates fixed identities and test cases, clears only experiment data, not host files or unrelated DBs.
- `T01`–`T08` use stable fixture IDs. Compare expected with actual after a fresh reset.
- Document database extension availability (`pgcrypto`) and fail with actionable message if missing.

## Implementation notes (P1)
- Schema DDL: `apps/api/src/queryshield_api/db/schema.py`; fixtures: `db/fixtures.py`; test catalog: `modules/experiments/catalog.py`.
- `demo.users` also has `display_name`, `department`; `demo.tickets` has `priority`, `visibility` (`owner`/`internal`) for the simulated dashboard. `lab.dataset` stores the fixture version (`fixtures-v1`).
- Roles: `qs_lab_query` (= `lab_readonly`: SELECT `demo.users`, `default_transaction_read_only=on`, `statement_timeout=2s`), `qs_lab_app` (= `lab_writer`: SELECT/INSERT `lab.runs`, SELECT metadata, column-level SELECT on `demo.users` without `password_hash`, SELECT `demo.tickets`). The Compose superuser is used only by the `lab-admin` CLI service.
- `lab.test_cases.expected_*` store outcome codes (not booleans) so T05 can record the documented vulnerable `QUERY_ERROR` (SQLSTATE 42601).

## P6 additions (`fixtures-v2`)
- Fixture user `o'connor` / `OConnorDemo123!` (staff): a legitimate name containing an apostrophe, used to measure false rejections.
- `lab.runs.layers TEXT[]`: active defense layers for the run. `result_code` adds `REJECTED_BY_VALIDATION`.
- `lab.security_events (id, run_id, rule_id, created_at)`: L5 detections. Stores rule IDs only, never the submitted input. `qs_lab_app` has SELECT/INSERT; `qs_lab_query` has no access.
- Bootstrap reseeds automatically when the stored dataset version differs from the code version.
