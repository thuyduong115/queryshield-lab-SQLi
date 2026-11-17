"""Idempotent schema DDL for the lab database. Executed only by the local admin CLI."""

DATASET_VERSION = "fixtures-v3-shop"

QUERY_ROLE = "qs_lab_query"
APP_ROLE = "qs_lab_app"

SCHEMA_DDL = """
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS demo;
CREATE SCHEMA IF NOT EXISTS lab;

CREATE TABLE IF NOT EXISTS demo.users (
    id            BIGINT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password      TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'student')),
    display_name  TEXT NOT NULL,
    department    TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo.tickets (
    id         BIGINT PRIMARY KEY,
    owner_id   BIGINT NOT NULL REFERENCES demo.users (id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
    priority   TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
    visibility TEXT NOT NULL CHECK (visibility IN ('owner', 'internal')),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS lab.dataset (
    singleton  BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
    version    TEXT NOT NULL,
    seeded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab.scenarios (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS lab.test_cases (
    id                  TEXT PRIMARY KEY,
    scenario_id         TEXT NOT NULL REFERENCES lab.scenarios (id),
    title               TEXT NOT NULL,
    input_ref           TEXT NOT NULL,
    expected_vulnerable TEXT NOT NULL,
    expected_secure     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lab.runs (
    id                    UUID PRIMARY KEY,
    scenario_id           TEXT NOT NULL REFERENCES lab.scenarios (id),
    mode                  TEXT NOT NULL CHECK (mode IN ('vulnerable', 'secure')),
    test_case_id          TEXT NULL,
    suite_id              UUID NULL,
    authenticated         BOOLEAN NOT NULL,
    simulated_user        TEXT NULL,
    simulated_role        TEXT NULL,
    rows_returned         INT NULL,
    result_code           TEXT NOT NULL,
    sqlstate              TEXT NULL,
    expected_result       TEXT NULL,
    passed                BOOLEAN NULL,
    duration_ms           INT NOT NULL,
    dataset_version       TEXT NOT NULL,
    request_id            TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additive migrations for databases created by fixtures-v1.
ALTER TABLE lab.runs ADD COLUMN IF NOT EXISTS layers TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE lab.runs DROP CONSTRAINT IF EXISTS runs_result_code_check;
ALTER TABLE lab.runs ADD CONSTRAINT runs_result_code_check CHECK (result_code IN (
    'AUTHENTICATED', 'DENIED', 'QUERY_ERROR', 'LAB_DISABLED', 'VALIDATION_ERROR',
    'REJECTED_BY_VALIDATION'));

-- L5 monitoring: rule IDs only, never the submitted input.
CREATE TABLE IF NOT EXISTS lab.security_events (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id     UUID NOT NULL REFERENCES lab.runs (id) ON DELETE CASCADE,
    rule_id    TEXT NOT NULL CHECK (rule_id IN ('QUOTE', 'COMMENT', 'SEPARATOR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runs_created_at_idx ON lab.runs (created_at DESC);
CREATE INDEX IF NOT EXISTS runs_suite_idx ON lab.runs (suite_id);

-- Migrate the old hashed classroom fixture; the version change triggers a reseed.
ALTER TABLE demo.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE demo.users DROP COLUMN IF EXISTS password_hash;

CREATE TABLE IF NOT EXISTS demo.products (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INT NOT NULL CHECK (price >= 0),
    published BOOLEAN NOT NULL
);
CREATE TABLE IF NOT EXISTS demo.orders (
    id BIGINT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    item TEXT NOT NULL,
    total INT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'internal'))
);
CREATE TABLE IF NOT EXISTS demo.profiles (
    id UUID PRIMARY KEY,
    customer_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lab.observations (
    id UUID PRIMARY KEY,
    operation TEXT NOT NULL,
    mode TEXT NOT NULL,
    outcome TEXT NOT NULL,
    detail JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS observations_created_idx ON lab.observations (created_at DESC);
"""

# {db} and role identifiers are composed with psycopg.sql.Identifier by the admin CLI.
PRIVILEGES_DDL = """
REVOKE ALL ON DATABASE {db} FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA demo, lab FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA demo, lab FROM {query_role}, {app_role};

GRANT CONNECT ON DATABASE {db} TO {query_role}, {app_role};

-- Read-only adapters: only the approved synthetic login, search and order fixtures.
GRANT USAGE ON SCHEMA demo TO {query_role};
GRANT SELECT ON demo.users, demo.products, demo.orders TO {query_role};

-- Application role: evidence persistence, metadata and the simulated dashboard.
-- No access to demo.users.password.
GRANT USAGE ON SCHEMA demo, lab TO {app_role};
GRANT SELECT (id, username, role, display_name, department) ON demo.users TO {app_role};
GRANT SELECT ON demo.tickets TO {app_role};
GRANT SELECT ON lab.dataset, lab.scenarios, lab.test_cases TO {app_role};
GRANT SELECT, INSERT ON lab.runs, lab.security_events TO {app_role};
GRANT SELECT ON demo.products, demo.orders TO {app_role};
GRANT SELECT, INSERT ON demo.profiles, lab.observations TO {app_role};
"""
