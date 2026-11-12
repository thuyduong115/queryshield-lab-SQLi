# 07 — Verification and Test Strategy

## Principles
- Assert *observed* result, not presence/absence of SQL keywords.
- Use one Postgres fixture dataset in comparable conditions; test resets before a suite.
- Before/after scenarios differ only in query construction and safe value binding.
- Keep distinct verification layers: unit, DB integration, REST API (Postman), browser E2E (Playwright), security hardening.

## Core acceptance matrix
| ID | Input | Vulnerable expected | Secure expected | Purpose |
|---|---|---:|---:|---|
| T01 | `student01` / `StudentDemo123!` | true | true | Valid login preserved |
| T02 | `student01` / wrong password | false | false | Wrong password denied |
| T03 | `admin' -- ` / `wrong-password` | **true** | **false** | Exploit vs defense |
| T04 | nonexistent user / any password | false | false | Negative control |
| T05 | `O'Connor` / random password | false or documented DB syntax error | false | Quote treated as data in secure mode |
| T06 | Unicode username / wrong password | false or documented DB syntax outcome | false | Unicode handling |
| T07 | Too-long input (129+ chars) | HTTP 422 | HTTP 422 | Schema validation |
| T08 | Empty username | HTTP 422 | HTTP 422 | Schema validation |
| T09 | Vulnerable mode while guard off | HTTP 403 | N/A | Lab boundary |
| T10 | Run response metadata / audit | redacted | redacted | No password leakage |

For T05/T06, the vulnerable version may return a sanitized 4xx/5xx error depending on SQL parsing. Document actual behavior, never force it to fake `false` without evidence. For MVP gating, T01–T04 and T09–T10 are nonnegotiable.

## Test levels
**Unit (Pytest)**
- Pydantic mode/input validation, enabled-mode guards, safe redaction, mapping between mode and adapter.
- Query inspector must label sanitized previews correctly and never return raw passwords.

**Integration (Pytest + isolated Postgres)**
- Real `pgcrypto` hashing, seed user IDs and permissions.
- Real vulnerable bypass T03, real secure non-bypass T03.
- Both modes correct for T01/T02/T04; unsafe adapter cannot write into fixtures.
- Runtime readonly principal cannot access `lab`/`audit` admin tables.

**API (Pytest HTTPX / Postman)**
- JSON schema and error status; `run_id` reproducibility record; no actual auth cookie or token.
- Postman collection tests for valid, invalid, vulnerable and secure modes, with a sanitized local environment export.

**Browser E2E (Playwright)**
- User selects mode, submits input, sees observed backend result and SQL explanation.
- Compare same input before and after, no fabricated success state.
- Guard-disabled error visible and not represented as authentication denial.

**Security/Regression**
- Scan logs/result DTO against raw plaintext submitted password.
- Static search for string interpolation in SQL outside explicit unsafe adapter.
- No public Docker port bindings; reset script cannot target remote DB.
- CI must run with safe defaults; unsafe integration tests execute only in ephemeral isolated CI database, with clear environment marker and no external ingress.

## Test report fields
`scenario_id`, `test_case_id`, `dataset_version`, `mode`, `expected_authenticated`, `actual_authenticated`, `passed`, `duration_ms`, `run_id`, timestamp, optional sanitized error. All actual values come from a real run. If a test was skipped, represent `skipped` not `passed`.

## Presentation evidence checklist
- [ ] Baseline valid login succeeds in both modes.
- [ ] Invalid password fails in both modes.
- [ ] Identical SQLi payload succeeds vulnerable and fails secure.
- [ ] Captured query preview is clearly labeled derived/redacted, not falsely labeled raw SQL trace.
- [ ] Postman rerun agrees with UI and Pytest.
- [ ] Reset/rerun yields identical expected outcomes.
- [ ] Security guard checks pass with lab disabled.

## Definition of tested
A file or feature is not "tested" merely because code looks right. Only report commands actually executed, pass/fail counts, and environment/dependency limitations. Keep evidence in `harness/STATUS.md`.

## P6 — Ma trận đánh giá phòng thủ (ADR-017)
| ID | Input | Vai trò trong đánh giá |
|---|---|---|
| T01 | `student01` / đúng | Người dùng hợp lệ |
| T02 | `student01` / sai | Từ chối đúng |
| T03 | `admin' -- ` / sai | Tấn công |
| T04 | `ghost_user` / bất kỳ | Từ chối đúng |
| T11 | `o'connor` / đúng | Người dùng hợp lệ có dấu nháy (đo chặn nhầm) |

Cấu hình: C0 nối chuỗi; C1 nối chuỗi + L2; C2 bind tham số; C3 bind tham số + L2. L5 quan sát ở mọi cấu hình.
Kỳ vọng được ghi trước trong mã (`modules/evaluation/matrix.py`) và so với kết quả đo; không suy ra kỳ vọng từ kết quả.
