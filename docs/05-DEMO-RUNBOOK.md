# 05 — Demo Runbook: Attack → Defend → Retest

## Demo objective
Prove the causal difference between untrusted input **inserted into SQL syntax** and values **bound as data**, then show a repeatable test. Use one database and unchanged fixtures.

## Setup (local only)
1. Enable unsafe lab with `.env` settings `APP_ENV=local` and `LAB_ENABLE_UNSAFE=true` (only on the local development computer).
2. Launch Compose services bound to `127.0.0.1` (`docker compose --env-file .env -f infra/compose.yaml up --build`); the one-shot `lab-admin` service seeds demo identities. Reset with `docker compose --env-file .env -f infra/compose.yaml run --rm lab-admin reset`.
3. Confirm `/api/v1/health` returns success and DBeaver can inspect fake fixture data if local DB port is enabled.
4. Open `/lab/login-bypass` and optional Postman collection. Demonstrate on fake users only.
5. If the lab guard is off, show `LAB_DISABLED` instead of trying to bypass it.

## Demo A — Vulnerable Login
### A1. Baseline
- `student01` / `StudentDemo123!` => expected `authenticated=true`.
- `student01` / `incorrect` => expected `authenticated=false`.

### A2. Exploit
- Username: `admin' -- ` (trailing space preserved)
- Password: `wrong-password` (deliberately incorrect)
- Mode: `vulnerable`
- Expected: `authenticated=true`, synthetic principal `admin`.

**Mechanism:** The unsafe adapter inserts user-controlled input into a **single-line** SQL string. The apostrophe terminates the string literal and `-- ` comments out the trailing password condition. The database returns the synthetic `admin` row without checking password. The demo must verify this against actual PostgreSQL; do NOT return `true` merely because an input matches the payload text.

The vulnerable query must stay in one SQL line for comment semantics to work; avoid reformatting the executed query across newlines. Optional formatted display is explicitly labeled educational preview.

### A3. Impact visualization
- Simulated SecureDesk dashboard displays fake `admin` profile and sample tickets.
- Do NOT mint real auth/session credentials; this is a **simulation** of unauthorized authentication effect, not a login to the QueryShield control plane.
- Explain confidentiality risk in terms of **possible** exposure; don't falsely claim the demo dumped real customer data.

## Demo B — Secure Login
### B1. Identical input
- Mode: `secure`
- Same username `admin' -- ` and password `wrong-password`, no changed database rows.
- Expected: `authenticated=false`, reason `PARAMETER_BINDING`.

### B2. Verification
- Submit `student01` / `StudentDemo123!` with secure mode -> `authenticated=true` (legitimate functionality preserved).
- Compare inspector outputs: unsafe SQL concatenation vs fixed SQL template + bound parameters.
- Show Postman request/response and DBeaver fixture data. Postman cannot show the database's real executed SQL trace by itself.

## Core SQL examples (reference only)

**Secure Psycopg template**:
```python
SQL = (
    "SELECT id, username, role FROM demo.users "
    "WHERE username = %s "
    "AND password_hash = crypt(%s, password_hash) LIMIT 1"
)
cur.execute(SQL, (username, password))
```

**Intentionally insecure concept** — exclusively in lab adapter, for illustration:
```python
# Educational vulnerable lab ONLY — DO NOT USE IN PRODUCTION
sql = (
    "SELECT id, username, role FROM demo.users "
    f"WHERE username = '{username}' "
    f"AND password_hash = crypt('{password}', password_hash) LIMIT 1"
)
cur.execute(sql)
```

The unsafe query must use read-only DB access, only an exact fixed fixture table and fixed scenario, with the environment guard, statement timeout and non-public network boundary. Do not generalize to arbitrary SQL endpoints.

**Password hash detail:** Use PostgreSQL `pgcrypto` for a deliberately compact classroom example so the two adapters compare the same SQL-side authentication condition. This is **not** a recommendation for production password authentication or reason to omit application-level password verification/Argon2id in real systems.

## Evidence to capture
- Test ID, mode, sanitized input label, query structure/parameter-binding explanation, HTTP status, `authenticated`, run ID, timestamp, assertions pass/fail.
- One summary comparison: vulnerable bypass `true`; secure bypass `false` with same fixtures.
- Do not export passwords or full SQL containing plaintext password into screenshots, logs or reports.

## Presenter checklist
- [ ] Docker services running locally; `.env` is not committed.
- [ ] Seed fixtures restored; dataset version noted.
- [ ] A1 valid/invalid controls work.
- [ ] A2 real vulnerable bypass proven.
- [ ] B1 same payload denied by secure query.
- [ ] B2 valid secure login still works.
- [ ] Postman request/response and test results view accessible.
- [ ] Clearly distinguish authenticated simulated user from actual QueryShield operator privileges.

## Failure handling
- If demo cannot reproduce, show actual failure and debug fixtures/SQL/guard. Never flip booleans in UI or return a fabricated success to make presentation work.
- Keep a sanitized evidence screenshot/record from the last successful local run as an **explicitly labeled recording**, not represented as a live query.

## Web walkthrough (implemented)
Open `/demo`. Steps 1–3 are Part 1 (vulnerable baseline, wrong password, attack + link to the simulated SecureDesk admin dashboard); step 4 shows the code change; steps 5–7 are Part 2 (same payload in secure mode, valid login preserved, automated suite). Use ← → to move between steps; each "Chạy truy vấn thật" sends a real request and renders the returned run.
