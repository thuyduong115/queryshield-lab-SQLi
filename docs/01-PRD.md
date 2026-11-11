# 01 — Product Requirements Document

## Problem
A login-bypass screenshot does not explain why SQL Injection occurs or whether a patch actually works. Students need a controlled, observable, repeatable experiment comparing one flawed SQL implementation with a correctly parameterized one.

## Principal workflow
1. Open `/lab/login-bypass` and read the lesson goals and local-only safety notice.
2. Select `vulnerable` mode; try valid credentials and invalid credentials.
3. Submit demonstration payload `admin' -- ` plus an incorrect synthetic password.
4. Observe actual authentication outcome, redacted query structure, explanation, and run ID.
5. Switch to `secure` mode without changing database fixtures or input.
6. Submit identical payload; observe failure and parameter-binding explanation.
7. Open `Comparison` or `Test Results`, run all predefined cases, verify acceptance criteria.
8. Use Postman to repeat the API requests; inspect synthetic data in DBeaver if desired.

## Functional requirements
| ID | Priority | Requirement | Acceptance |
|---|---|---|---|
| FR-01 | Must | Scenario catalog | `GET /api/v1/labs` returns `login-bypass` and a concise description |
| FR-02 | Must | Real DB-backed login test | Endpoint uses PostgreSQL via Psycopg; no canned response |
| FR-03 | Must | Vulnerable adapter | One controlled unsafe query performs actual auth bypass in local lab |
| FR-04 | Must | Secure adapter | Query values bound separately; exact bypass attempt fails |
| FR-05 | Must | Inspector | Shows query template/sanitized representation and explanation tied to actual adapter path |
| FR-06 | Must | Comparison | Same input/case ID/mode results presented side-by-side |
| FR-07 | Must | Test runner | Runs predefined fixtures with assertions and records results |
| FR-08 | Must | Reset | CLI reset restores only synthetic fixtures for repeatability |
| FR-09 | Must | Local safety | Unsafe path disabled outside explicit local lab; DB account minimal privileges |
| FR-10 | Must | Postman | Exported collection for health, valid/invalid login, attack/defend, tests/results |
| FR-11 | Should | Audit | Persist test execution metadata with request/run correlation, no passwords |
| FR-12 | Should | Responsive UI | Presentation readable on projector and desktop browser |
| FR-13 | Later | PDF report | Optional after evidence model and tests stabilize |
| FR-14 | Later | Additional SQLi labs | Out of MVP without a new scope decision |

## Screens
| Route | Core content | Empty/error state |
|---|---|---|
| `/` | Purpose, flow, local-only notice, start-lab link | API offline guidance |
| `/app/login` | SecureDesk login fixture form and mode indicator | Invalid credentials; offline |
| `/app/dashboard` | Synthetic role and ticket examples based on **simulated result**, no real privileges | Not authenticated in current demo context |
| `/lab/login-bypass` | Input, mode switch, execute, query inspector, result explanation | Flag disabled, DB offline, validation error |
| `/lab/comparison` | Two results for same payload, explanation of root cause and fix | No matching comparison yet |
| `/lab/test-results` | Test cases, run button, pass/fail plus evidence IDs | Tests not run, error handling |

## User stories
- US-01: As a student I can run a valid login in both modes to establish baseline behavior.
- US-02: As a student I can reproduce an SQLi bypass in the vulnerable mode on seeded synthetic data.
- US-03: As a student I can submit the same attack in secure mode and understand why it fails.
- US-04: As an instructor I can see code/data separation without having to interpret full terminal logs.
- US-05: As a reviewer I can run tests and validate that success/failure is computed, not hardcoded.
- US-06: As an operator I can reset fixtures and repeat all steps deterministically.

## Nonfunctional requirements
- NFR-01: All services local by default; vulnerable route fails closed except controlled lab setup.
- NFR-02: No real-user PII, plaintext password storage, raw secret logging.
- NFR-03: Feedback in ordinary local runs should be quick enough for live presentation; measure and report actual timing, no fabricated SLA.
- NFR-04: Stable JSON error schema, meaningful HTTP status codes, visible request/run IDs.
- NFR-05: Modular code with tests, no duplicate entire backend for vulnerable vs secure.
- NFR-06: Design does not claim comprehensive security merely because one attack fails.

## Rejected shortcuts
- Fake results based on keyword detection instead of querying Postgres.
- Secure mode implemented by blocking single quotes or the string `OR`.
- Public reset endpoint or server switch exposing unsafe adapter publicly.
- Actual Session/Auth of application control plane derived from vulnerable login outcome.
