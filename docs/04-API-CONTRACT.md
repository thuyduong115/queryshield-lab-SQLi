# 04 — REST API Contract (v1)

Base URL: `http://127.0.0.1:8000/api/v1` (local only). JSON content type. All timestamps UTC ISO 8601. IDs are opaque strings/UUIDs.

## Endpoints in MVP
| Method | Path | Purpose | Phase |
|---|---|---|---|
| GET | `/health` | API up and DB readiness if checked | P0/P1 |
| GET | `/labs` | Scenario catalog (`login-bypass`) | P2 |
| GET | `/labs/login-bypass/test-cases` | Safe predefined test-case metadata (no passwords) | P2/P4 |
| POST | `/labs/login-bypass/execute` | Run **one** selected mode with fixture input | P2 |
| POST | `/labs/login-bypass/tests/run` | Run predefined non-destructive comparative cases | P4 |
| GET | `/labs/runs/{run_id}` | Read redacted run summary | P2/P4 |
| GET | `/labs/login-bypass/results` | Last N sanitized run summaries | P4 |
| GET | `/securedesk/simulated-session/{run_id}` | Simulated SecureDesk profile + tickets for an authenticated run (no token) | P3 |

**Not allowed:** `/execute-sql`, arbitrary URLs/targets, `/admin/reset` HTTP route, bulk arbitrary payload endpoints.

## `POST /labs/login-bypass/execute`
Request:
```json
{
  "mode": "vulnerable",
  "username": "admin' -- ",
  "password": "wrong-password",
  "test_case_id": "T03"
}
```
- `mode`: required enum `vulnerable` / `secure`.
- `username`: required string; maximum length 128; Unicode allowed; no SQLi-specific deny-list.
- `password`: required string; maximum length 128 for disposable fixtures; transport only, must not be logged or persisted. For classroom tests use short known demo passwords.
- `test_case_id`: optional existing fixture ID; client cannot use arbitrary identifier to alter DB queries.

Successful HTTP 200 response **even if authentication is denied** (a normal business outcome):
```json
{
  "run_id": "EXAMPLE-UUID-REPLACED-BY-SERVER",
  "scenario_id": "login-bypass",
  "mode": "vulnerable",
  "authentication": {
    "authenticated": true,
    "simulated_user": {"username": "admin", "role": "admin"}
  },
  "inspector": {
    "query_template": "SELECT ...",
    "sql_preview_redacted": "SELECT ... [redacted] ...",
    "preview_label": "redacted educational preview (not a database trace)",
    "parameters": [],
    "explanation_code": "UNSAFE_CONCATENATION"
  },
  "duration_ms": 8,
  "created_at": "2026-11-12T00:00:00Z"
}
```
Values above are illustrative **schema examples**, never canned response data. Secure mode must return same shape with `authenticated=false` for T03 and `explanation_code=PARAMETER_BINDING`.

No real login session cookie/token may be issued. Simulated user data is fixture-only and cannot authorize laboratory operations.

## Error schema
```json
{
  "error": {
    "code": "LAB_DISABLED",
    "message": "The vulnerable exercise is disabled in this environment.",
    "request_id": "server-generated-opaque-id"
  }
}
```
Suggested statuses: 400 malformed request, 403 lab guard denied, 404 missing scenario/run, 422 Pydantic validation failure (normalize if needed), 503 database unavailable, 500 unexpected error without secrets. Don't leak SQL/stack trace externally.

## Batch runner / results
`POST /labs/login-bypass/tests/run` must run a **fixed, safe, allow-listed** suite (not user-submitted arbitrary SQL). Each result has `{test_case_id, mode, expected_authenticated, actual_authenticated, passed, run_id}`. It may execute both modes only in explicit local lab; if unsafe mode disabled, return an honest skip/denial, not a fabricated pass.

## Postman contract
- Collection file: `tools/postman/QueryShield-Lab.postman_collection.json`.
- Environment: `tools/postman/Local.postman_environment.json`; only variable `baseUrl=http://127.0.0.1:8000/api/v1` and harmless values.
- Requests: health, list scenarios, valid login, invalid password, attack vulnerable, attack secure, run suite, last results.
- Tests assert response schema, status, and expected auth result; no plaintext passwords in exported run logs.

## Versioning
If a breaking change is essential, update this contract, OpenAPI implementation, Postman collection and tests together. Never silently change modes/field names.

## Implemented response details (v1)
- `execute` response adds: `outcome` (`AUTHENTICATED` | `DENIED` | `QUERY_ERROR`), `authentication.rows_returned`, `inspector.segments` (`{text, origin: template|username|password|placeholder, syntax: code|string|comment}`), `inspector.observations` (codes such as `PASSWORD_CHECK_COMMENTED_OUT`, `VALUES_SENT_SEPARATELY`), `query_error {sqlstate, category}`, `dataset_version`, `simulation_notice`.
- A PostgreSQL parse error caused by input in **vulnerable** mode is an observed experiment outcome: HTTP 200, `outcome=QUERY_ERROR`, `authenticated=false`, only the SQLSTATE is returned (never the server message). Any DB error in secure mode is a 500.
- `403 LAB_DISABLED` includes `run_id` when the refusal could be recorded.
- 422 bodies list only `{field, issue}`; submitted values are never echoed.
- Every response carries `X-Request-ID` and `Cache-Control: no-store`; no response sets cookies.
- Suite results: `{test_case_id, mode, expected_outcome, actual_outcome, expected_authenticated, actual_authenticated, status: passed|failed|skipped, passed, run_id, duration_ms}`.

## P6 — Defense layers and evaluation (ADR-017)
- `POST /labs/login-bypass/execute` accepts optional `layers: {input_validation: bool, error_masking: bool}` (both default `false`). Response adds `layers` (active layer names, e.g. `["binding", "validation", "monitoring"]`) and `alerts` (L5 rule IDs `QUOTE`, `COMMENT`, `SEPARATOR`; observe-only).
- New outcome `REJECTED_BY_VALIDATION`: L2 rejected the username before any SQL was built; `inspector.observations = ["REJECTED_BEFORE_DATABASE"]`.
- With `error_masking=true`, a `QUERY_ERROR` response returns `query_error = {sqlstate: null, category: "masked"}`; the SQLSTATE is still stored in `lab.runs` for the operator.
- `GET /labs/login-bypass/defenses`: allow-list pattern, detection rules, and `least_privilege` measured live from the PostgreSQL catalog (`has_table_privilege`, `pg_roles`, `pg_db_role_setting`) for `qs_lab_query`.
- `POST /labs/login-bypass/evaluation/run`: runs configurations C0–C3 over T01, T11, T02, T04, T03. Returns per-cell `{configuration_id, test_case_id, role, expected_outcome, actual_outcome, status: passed|failed|skipped, alerts, run_id, duration_ms}` and per-configuration metrics (`attack_blocked`, `legitimate_accepted`, `false_rejections`, `wrong_credentials_denied`, `alerts_on_attack`, `alerts_on_legitimate`, `mean_duration_ms`). C0/C1 are `skipped` when the unsafe guard is off.
