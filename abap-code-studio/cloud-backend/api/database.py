"""Database layer for cloud backend.

Uses PostgreSQL for metadata storage.
IMPORTANT: Only metadata is stored — NEVER SAP credentials or source code.
"""
from __future__ import annotations

import os
from typing import Any, Optional

# Schema definition for initial setup
SCHEMA_SQL = """
-- Tenants (customers)
CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'starter',  -- starter | professional | enterprise
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- System registry (NO credentials — only labels and metadata)
CREATE TABLE IF NOT EXISTS sap_systems (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,           -- ecc | btp_abap_cloud
    host_label      TEXT NOT NULL,           -- human label, NOT the actual host
    client_nr       TEXT DEFAULT '100',
    basis_version   TEXT,
    agent_id        TEXT,                    -- linked agent
    last_seen_at    TIMESTAMPTZ,
    features        JSONB DEFAULT '{}',
    UNIQUE(tenant_id, name)
);

-- ABAP object catalog (names & metadata only — no source code)
CREATE TABLE IF NOT EXISTS abap_objects (
    id              TEXT PRIMARY KEY,
    system_id       TEXT NOT NULL REFERENCES sap_systems(id),
    object_type     TEXT NOT NULL,           -- PROG, CLAS, DDLS, etc.
    object_name     TEXT NOT NULL,
    package         TEXT,
    description     TEXT,
    line_count      INTEGER,
    ai_generated    BOOLEAN DEFAULT FALSE,
    review_status   TEXT DEFAULT 'none',     -- none | pending | approved | rejected
    last_modified_at TIMESTAMPTZ,
    last_modified_by TEXT,
    UNIQUE(system_id, object_type, object_name)
);

-- AI sessions (prompts, model info, diffs — but NOT full source code)
CREATE TABLE IF NOT EXISTS ai_sessions (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenants(id),
    user_id         TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    model_used      TEXT,
    confidence      FLOAT DEFAULT 0.0,
    system_target   TEXT NOT NULL,
    objects_read    TEXT[] DEFAULT '{}',
    objects_modified TEXT[] DEFAULT '{}',
    diffs           JSONB DEFAULT '[]',     -- code diffs (NOT full source)
    status          TEXT DEFAULT 'draft',    -- draft | processing | review | approved | rejected | deployed
    git_commit_sha  TEXT,
    transport_nr    TEXT,
    deployment_params JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline runs
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES ai_sessions(id),
    steps           JSONB DEFAULT '[]',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    action          TEXT NOT NULL,
    object_ref      TEXT,
    session_id      TEXT,
    git_commit_sha  TEXT,
    transport_nr    TEXT,
    details         JSONB DEFAULT '{}',
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

-- Users (minimal PII — only email for auth)
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenants(id),
    email           TEXT NOT NULL,
    role            TEXT DEFAULT 'developer',  -- admin | developer | reviewer
    sso_id          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_systems_tenant ON sap_systems(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objects_system ON abap_objects(system_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON ai_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp DESC);
"""


class Database:
    """Async database interface.

    Uses asyncpg for PostgreSQL.
    """

    def __init__(self, pool=None):
        self._pool = pool

    async def execute(self, query: str, *args) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(query, *args)

    async def fetch_one(self, query: str, *args) -> Optional[dict]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None

    async def fetch_all(self, query: str, *args) -> list[dict]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(r) for r in rows]

    async def init_schema(self) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(SCHEMA_SQL)


# Dependency injection
_db: Optional[Database] = None


async def init_db() -> Database:
    """Initialize database connection pool."""
    global _db
    import asyncpg

    dsn = os.getenv("DATABASE_URL", "postgresql://localhost:5432/abap_studio")
    pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)

    _db = Database(pool)
    await _db.init_schema()
    return _db


async def get_db() -> Database:
    """FastAPI dependency to get database."""
    if _db is None:
        return await init_db()
    return _db
