# 06 — Threat Model and Laboratory Safety Boundary

> Ngoại lệ P7 đã duyệt ngày 2026-11-13: vulnerable.py được dùng cho login, tìm sản phẩm và báo cáo đơn second-order, chỉ trên fixture giả local. Role qs_lab_query có SELECT trên demo.users/products/orders, không có quyền ghi hay đọc lab; role app chỉ INSERT hồ sơ và bằng chứng, không đọc password. Mật khẩu fixture dạng thô chỉ xuất hiện trong database snapshot có guard local + unsafe; mật khẩu đã nhập không vào lịch sử. Bằng chứng SQL luôn che mật khẩu và ghi rõ là diễn giải. Các ranh giới khác giữ nguyên. [Chi tiết P7](12-SHOP-DEMO.md) thay thế các phát biểu single-fixture cũ.

## Boundary statement
QueryShield Lab deliberately includes one SQL-injection-vulnerable adapter **solely** for local education. No public deployment of this adapter. The threat model must protect the development laptop, real credentials and other local services from that deliberate flaw.

## Assets
- A1: Developer machine and Docker environment.
- A2: Real user accounts/tokens/secrets (never present in fixture DB).
- A3: Separation between lab experiment result and real application control-plane authorization.
- A4: Experiment integrity and reproducibility.
- A5: Audit evidence without secret leakage.

## Data flow trust boundaries
1. Browser/Postman request -> FastAPI (untrusted input).
2. Lab service -> guarded vulnerable or secure adapter (only fixed `login-bypass` scenario).
3. Adapter -> least-privileged PostgreSQL role (private lab fixture DB).
4. Result -> sanitized inspector/experiment log -> browser (no raw secrets).
5. Local operator CLI -> reset/migration role (not callable over HTTP).

## Primary risks and mitigations
| Risk | Control | Test/evidence |
|---|---|---|
| R01 Unsafe route exposed outside local lab | `APP_ENV=local` AND `LAB_ENABLE_UNSAFE=true` required; defaults fail-closed; bind ports to `127.0.0.1` | API responds 403 when flag off or APP_ENV != local |
| R02 SQLi reads/writes other tables | Read-only PostgreSQL role limited to synthetic `demo.users`; no access to lab/audit schema; read-only transaction + statement timeout | DB privilege regression tests |
| R03 SQLi bypass grants genuine admin permissions | No access/session token issued by lab run; simulated dashboard only | Verify no Set-Cookie/Authorization token and no privileged control endpoint |
| R04 Disclosure via inspector/log | Password and request-body redaction; never store raw unsafe SQL; no stack traces in API response | Log scan tests; response snapshots |
| R05 Unbounded queries / resource exhaustion | Fixed scenario, bounds on length, statement_timeout, connection limits and local isolation | Timeout and failure behavior tests |
| R06 Unintended reset/destruction | Local-only CLI reset confined to lab DB; explicit DB URL safety checks; no HTTP reset route | Script refuses unknown DB name/host |
| R07 Supply chain / dependency issues | Lock dependencies, update and scan, no secrets committed | CI lint/test/security scan |
| R08 Misleading scientific results | Real PostgreSQL execution, same fixtures/inputs, no canned auth booleans, linked run IDs | Independent Pytest/Postman checks |

## Hard constraints
- Never allow user-supplied SQL text, table/column identifiers, arbitrary connection strings, arbitrary URLs, file paths, or destructive commands through the lab API.
- SQLi payload `admin' -- ` can be demonstrated against the **known synthetic users fixture**. Do not expand to data extraction, table changes, time-based load or OS execution without a separate reviewed scope and sandbox.
- The deliberately vulnerable source file should carry a clear warning and be excluded from deployment artifacts that do not enable lab mode (best: do not ship unsafe module in public artifact at all).
- All service binds local; Docker networking is not a guarantee of isolation if host ports or internet deployment are misconfigured.
- Lab data may be educationally insecure; developer machine and control plane must not be.

## Fail closed rules
- Missing `APP_ENV` -> treat as nonlocal.
- Missing `LAB_ENABLE_UNSAFE` -> disabled.
- `APP_ENV=production` -> disable the vulnerable adapter regardless of other settings.
- `LAB_ENABLE_UNSAFE=false` -> secure-only operations may still run; vulnerable comparative test must be rejected/marked skipped, **not** fake-passed.
- No seed/migration DB credentials in normal API runtime.

## Scope of security assertions
Valid statement: "The test SQLi payload bypassed the intentionally vulnerable login but did not bypass the parameterized version under these fixtures."
Invalid statement: "The whole site is fully secure from all SQL Injection attacks."

## References
See OWASP and PostgreSQL/Psycopg official references in `docs/11-REFERENCES.md`.
