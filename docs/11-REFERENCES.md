# 11 — Source References and Technical Basis

## Official references (verified during starter drafting)
1. OpenAI Codex AGENTS.md guidance — project instruction discovery and working agreements:
   - https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
   - https://learn.chatgpt.com/docs/agent-configuration/agents-md
2. OWASP SQL Injection Prevention Cheat Sheet — parameterized queries, allow-lists, least privilege:
   - https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet
3. OWASP Query Parameterization Cheat Sheet:
   - https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet
4. PostgreSQL 17 pgcrypto documentation — `crypt()` and `gen_salt()`:
   - https://www.postgresql.org/docs/17/pgcrypto.html
5. Psycopg 3 — passing parameters through `execute(SQL, params)`:
   - https://www.psycopg.org/psycopg3/docs/basic/params.html

## Course basis / scope origin
The team's original SQL Injection presentation draft specifies:
- Theoretical explanation of SQL Injection, mechanisms, CIA impact, prevention.
- Demo of a vulnerable login with successful injection, followed by a patched login using Prepared Statements and repeat of identical inputs.
- One website and one database for both stages.

Other product decisions (QueryShield Lab, SecureDesk, Experiment Engine, test runner, monorepo and technology stack) were **agreed design choices**, not requirements asserted by the Cisco materials or the university's official grading rubric.

## Claims to avoid
- Do not claim the app is broadly secure because one test input failed.
- Do not claim demo response has been executed if tests have not been run.
- Do not call a generated/redacted SQL preview a true PostgreSQL execution log.
- Do not imply third-party/student examples are official VKU grading standards.
