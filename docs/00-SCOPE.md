# 00 — Product Charter and Scope (v1.0)

## Product statement
**QueryShield Lab** (working name) is an interactive educational platform for demonstrating, comparing, and verifying the impact of SQL injection and parameterized-query defenses in a business-like **SecureDesk** login scenario.

## Goals
- G1: Deliver two authentic, deterministic database-backed demos: attack success in deliberately vulnerable login; same attack fails after proper parameterization.
- G2: Explain SQL query construction, user-controlled input boundary, database behavior, and outcome in the web UI.
- G3: Make evidence reproducible through seed data and test cases, with recorded outcomes.
- G4: Support a 30-minute university cybersecurity class presentation and provide foundations for a graded software security project.

## MVP in scope
1. One React web application with Overview, SecureDesk Login/Demo Dashboard, Lab Workspace, Comparison/Test Results.
2. One FastAPI service containing `labs` metadata, `login-bypass` scenario, vulnerable and secure query adapters, inspector result, and test runner.
3. One PostgreSQL 17 **database** with schema separation (`demo`, `lab`, optionally `audit`) and deterministic synthetic fixtures.
4. Deliberately vulnerable **single-line, read-only** login query inside a restricted lab-only adapter.
5. Equivalent secure login query using genuine Psycopg `%s` binding; no blacklist or client validation as primary fix.
6. SQL inspector displaying a **redacted** view of query shape and explanations; parameter values separated in secure mode.
7. Pytest API/integration tests, Postman collection, Playwright happy-path E2E after frontend, reset CLI script, local Docker Compose.
8. Simple experiment record: mode, case ID, success/failure, timestamps, duration, safe explanation; no secret-bearing raw requests.
9. A README and short demo instructions sufficient for another student to reproduce results on a local computer.

## Explicit non-goals — do not code in MVP
- No real enterprise ticket management, payment flows, customer data, real admin authentication, multi-tenant system, sign-up, production deployment, cloud hosting.
- No remote pentesting, arbitrary SQL execution endpoint, SQLMap runner, RCE, database destruction, UNION/exfiltration cases, real-world target discovery.
- No AI assistant/LLM, multi-agent orchestration, WAF/ModSecurity, ELK, SIEM, Redis, Kafka, Kubernetes.
- No comprehensive SQLi detection claim; proving one payload is blocked is **not** proving a website free of SQLi.
- No PDF export or fine-grained charts until results exist; plain HTML/JSON report suffices in MVP.

## Actors
- **Student/operator:** starts local lab, submits demo input or Postman request, interprets outcome.
- **Instructor/viewer:** watches the workflow, compares before/after and sees test evidence.
- **Developer/reviewer:** inspects source, tests, threat model and reproducibility instructions.

## Success criteria (MVP release gate)
- [ ] `docker compose -f infra/compose.yaml up --build` brings up isolated DB/API/web locally using documented commands.
- [ ] Valid seeded credentials succeed in both modes; incorrect credentials fail in both.
- [ ] The **same** `admin' -- ` input with incorrect password produces `authenticated=true` in vulnerable mode and `false` in secure mode against unchanged fixtures.
- [ ] Inspector correctly explains difference without leaking submitted password or claiming a fabricated SQL string was executed.
- [ ] Required backend tests and user-flow E2E pass; exported Postman collection is usable without secrets.
- [ ] Unsafe adapter refuses operation when flags are disabled / environment is not local; no public ports.
- [ ] Reset + rerun reproduces the same results; evidence records show actual outcomes, not canned booleans.

## Priorities
P0–P2 establish security boundaries, database and working API; P3 builds web and visual explanation; P4 automation/evidence; P5 polish/documentation. Refer to `docs/08-ROADMAP.md`.

## Constraints / assumptions
- Target: developer laptop running Docker Desktop and VS Code (Windows/macOS/Linux), current local ports 5173, 8000, and optional localhost DB port 5433.
- One database means same database and baseline dataset, **not** shared administrator privileges among adapters.
- Presentation material supplied by the team requires SQLi vulnerable login, prepared statements, and repeat of identical inputs. Details beyond that are product-design decisions, not claims taken from course files.

## Bổ sung phạm vi P6 (ADR-017)
Nghiên cứu và đánh giá hiệu quả phòng thủ nhiều lớp trước SQL Injection trên kịch bản đăng nhập SecureDesk:
- Lớp phòng thủ bật/tắt được: L1 bind tham số, L2 allow-list tên đăng nhập, L4 che chi tiết lỗi, L5 giám sát phát hiện (không chặn). L3 quyền tối thiểu được đo trực tiếp từ PostgreSQL, không bật/tắt.
- Ma trận đánh giá trên cùng bộ test và cùng fixture; chỉ số: tấn công bị chặn, chặn nhầm người dùng hợp lệ, cảnh báo đúng/sai, thời gian đo.
- Vẫn ngoài phạm vi: thêm kỹ thuật tấn công, công cụ quét tự động, WAF bên thứ ba, triển khai public.
