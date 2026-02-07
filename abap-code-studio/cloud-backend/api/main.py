"""ABAP Code Studio — Cloud Backend.

FastAPI application that provides:
  - REST API for the Web UI
  - WebSocket endpoint for Client Agent communication
  - AI orchestration (prompt building, model routing)
  - Metadata storage (PostgreSQL)
  - Git integration (GitHub/GitLab PR management)
  - Audit logging

IMPORTANT: This server NEVER stores SAP credentials or source code.
Only metadata, diffs, and AI session data.
"""
from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .auth_middleware import get_current_tenant, TenantContext
from .database import get_db, Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("abap-studio-cloud")


# ═══════════════════════════════════════════════════════════════
# APP LIFECYCLE
# ═══════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown."""
    logger.info("ABAP Code Studio Cloud starting...")
    yield
    logger.info("ABAP Code Studio Cloud shutting down...")


app = FastAPI(
    title="ABAP Code Studio API",
    version="1.0.0",
    description="Cloud API for AI-powered ABAP development",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active agent WebSocket connections: agent_id → WebSocket
_agent_connections: dict[str, WebSocket] = {}


# ═══════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════

class SystemRegisterRequest(BaseModel):
    name: str
    type: str  # "ecc" | "btp_abap_cloud"
    host_label: str
    client_nr: str = "100"
    basis_version: Optional[str] = None
    features: dict = {}


class AISessionRequest(BaseModel):
    prompt: str
    target_system: str
    model_preference: Optional[str] = None  # "sap-abap-1", "claude", "auto"


class AISessionResponse(BaseModel):
    session_id: str
    status: str
    model_used: Optional[str] = None
    objects_read: list[str] = []
    objects_modified: list[str] = []
    diffs: list[dict] = []
    confidence: float = 0.0
    pipeline_status: Optional[dict] = None


class ReviewAction(BaseModel):
    action: str  # "approve" | "reject" | "comment"
    comment: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# SYSTEM MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@app.post("/api/systems")
async def register_system(
    req: SystemRegisterRequest,
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """Register a SAP system (metadata only — no credentials!)."""
    system_id = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO sap_systems (id, tenant_id, name, type, host_label, client_nr, basis_version, features)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
        system_id, tenant.tenant_id, req.name, req.type, req.host_label,
        req.client_nr, req.basis_version, json.dumps(req.features),
    )
    return {"id": system_id, "name": req.name, "agent_token": _generate_agent_token(system_id)}


@app.get("/api/systems")
async def list_systems(
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """List all registered systems for the current tenant."""
    rows = await db.fetch_all(
        "SELECT * FROM sap_systems WHERE tenant_id = $1",
        tenant.tenant_id,
    )
    systems = []
    for row in rows:
        agent_id = row.get("agent_id")
        systems.append({
            **row,
            "agent_connected": agent_id in _agent_connections,
        })
    return systems


# ═══════════════════════════════════════════════════════════════
# AI SESSIONS
# ═══════════════════════════════════════════════════════════════

@app.post("/api/sessions", response_model=AISessionResponse)
async def create_ai_session(
    req: AISessionRequest,
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """Create a new AI code generation session.

    1. Receives prompt from Web UI
    2. Sends search/read commands to Client Agent via WebSocket
    3. Builds context for AI model
    4. Generates code
    5. Returns diff (NOT full source) to UI for review
    """
    session_id = str(uuid.uuid4())

    # Find the agent for the target system
    system = await db.fetch_one(
        "SELECT * FROM sap_systems WHERE tenant_id = $1 AND name = $2",
        tenant.tenant_id, req.target_system,
    )
    if not system:
        raise HTTPException(404, f"System '{req.target_system}' not found")

    agent_id = system.get("agent_id")
    if agent_id not in _agent_connections:
        raise HTTPException(503, f"Agent for '{req.target_system}' is offline")

    ws = _agent_connections[agent_id]

    # Step 1: Search for relevant objects
    await ws.send_json({
        "type": "search",
        "session_id": session_id,
        "params": {"query": _extract_object_hints(req.prompt), "system": req.target_system},
    })

    # Store session (initial state)
    await db.execute(
        """INSERT INTO ai_sessions (id, tenant_id, user_id, prompt, system_target, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'processing', $6)""",
        session_id, tenant.tenant_id, tenant.user_id, req.prompt,
        req.target_system, datetime.utcnow(),
    )

    return AISessionResponse(
        session_id=session_id,
        status="processing",
        model_used=req.model_preference or "auto",
    )


@app.get("/api/sessions/{session_id}")
async def get_session(
    session_id: str,
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """Get AI session status and results."""
    session = await db.fetch_one(
        "SELECT * FROM ai_sessions WHERE id = $1 AND tenant_id = $2",
        session_id, tenant.tenant_id,
    )
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@app.post("/api/sessions/{session_id}/review")
async def review_session(
    session_id: str,
    review: ReviewAction,
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """Approve or reject AI-generated changes."""
    new_status = "approved" if review.action == "approve" else "rejected"

    await db.execute(
        "UPDATE ai_sessions SET status = $1 WHERE id = $2 AND tenant_id = $3",
        new_status, session_id, tenant.tenant_id,
    )

    # If approved, tell agent to deploy
    if review.action == "approve":
        session = await db.fetch_one(
            "SELECT * FROM ai_sessions WHERE id = $1", session_id
        )
        system = await db.fetch_one(
            "SELECT * FROM sap_systems WHERE name = $1 AND tenant_id = $2",
            session["system_target"], tenant.tenant_id,
        )
        agent_id = system.get("agent_id")
        if agent_id in _agent_connections:
            ws = _agent_connections[agent_id]
            await ws.send_json({
                "type": "deploy",
                "session_id": session_id,
                "params": session.get("deployment_params", {}),
            })

    # Audit log
    await db.execute(
        """INSERT INTO audit_log (id, tenant_id, user_id, action, session_id, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        str(uuid.uuid4()), tenant.tenant_id, tenant.user_id,
        f"review_{review.action}", session_id, datetime.utcnow(),
    )

    return {"status": new_status, "session_id": session_id}


# ═══════════════════════════════════════════════════════════════
# OBJECT CATALOG (metadata only)
# ═══════════════════════════════════════════════════════════════

@app.get("/api/objects")
async def list_objects(
    system: Optional[str] = None,
    object_type: Optional[str] = None,
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """List known ABAP objects (metadata only — no source code)."""
    query = "SELECT * FROM abap_objects WHERE system_id IN (SELECT id FROM sap_systems WHERE tenant_id = $1)"
    params = [tenant.tenant_id]

    if system:
        query += " AND system_id = (SELECT id FROM sap_systems WHERE name = $2 AND tenant_id = $1)"
        params.append(system)

    rows = await db.fetch_all(query, *params)
    return rows


# ═══════════════════════════════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════════════════════════════

@app.get("/api/audit")
async def get_audit_log(
    limit: int = Query(50, le=500),
    tenant: TenantContext = Depends(get_current_tenant),
    db: Database = Depends(get_db),
):
    """Get audit log for the current tenant."""
    rows = await db.fetch_all(
        "SELECT * FROM audit_log WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT $2",
        tenant.tenant_id, limit,
    )
    return rows


# ═══════════════════════════════════════════════════════════════
# AGENT WEBSOCKET
# ═══════════════════════════════════════════════════════════════

@app.websocket("/agent/ws")
async def agent_websocket(ws: WebSocket):
    """WebSocket endpoint for Client Agent communication.

    Protocol:
    - Agent connects with Bearer token (agent_token)
    - Agent sends: status updates, command results, diffs
    - Cloud sends: search/read/write/deploy commands

    IMPORTANT: Only metadata and diffs transit this connection.
    Full source code stays on the agent side.
    """
    await ws.accept()

    # Authenticate agent
    token = ws.headers.get("authorization", "").replace("Bearer ", "")
    agent_id = await _validate_agent_token(token)
    if not agent_id:
        await ws.close(code=4001, reason="Invalid agent token")
        return

    _agent_connections[agent_id] = ws
    logger.info(f"Agent connected: {agent_id}")

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "agent_status":
                # Agent reports its connected systems
                logger.info(f"Agent {agent_id} status: {data.get('systems', [])}")

            elif msg_type == "result":
                # Agent returns result of a command
                session_id = data.get("session_id")
                result_data = data.get("data")
                await _process_agent_result(session_id, result_data)

            elif msg_type == "diff":
                # Agent sends a code diff for review
                session_id = data.get("session_id")
                diff = data.get("diff")
                await _store_diff(session_id, diff)

            elif msg_type == "pipeline":
                # Agent reports pipeline step completion
                session_id = data.get("session_id")
                step = data.get("step")
                await _update_pipeline(session_id, step)

            elif msg_type == "error":
                logger.error(f"Agent error: {data.get('error')}")

    except WebSocketDisconnect:
        logger.info(f"Agent disconnected: {agent_id}")
    finally:
        _agent_connections.pop(agent_id, None)


# ═══════════════════════════════════════════════════════════════
# AI ORCHESTRATION
# ═══════════════════════════════════════════════════════════════

@app.post("/api/ai/generate")
async def generate_code(
    req: AISessionRequest,
    tenant: TenantContext = Depends(get_current_tenant),
):
    """Generate ABAP code using AI.

    Model routing:
    - SAP-ABAP-1: ABAP-specific code generation (via customer's AI Core)
    - Claude: Complex reasoning, architecture decisions
    - Auto: Selects based on task complexity
    """
    model = req.model_preference or "auto"

    if model == "auto":
        # Simple heuristic — can be made much smarter
        if any(kw in req.prompt.lower() for kw in ["architektur", "design", "refactor", "explain"]):
            model = "claude"
        else:
            model = "sap-abap-1"

    return {
        "model_selected": model,
        "note": "Code generation happens via the Client Agent's AI Core connection "
                "or the cloud LLM, depending on the tenant's configuration."
    }


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _generate_agent_token(system_id: str) -> str:
    """Generate a unique agent token for a system."""
    import secrets
    return f"acs_{secrets.token_urlsafe(32)}"


async def _validate_agent_token(token: str) -> Optional[str]:
    """Validate agent token, return agent_id if valid."""
    if not token or not token.startswith("acs_"):
        return None
    # In production: lookup in DB
    return f"agent_{token[:16]}"


def _extract_object_hints(prompt: str) -> str:
    """Extract object name hints from a natural language prompt."""
    import re
    # Look for Z* or Y* names (custom namespace)
    matches = re.findall(r'\b[ZY][A-Z_0-9]{2,30}\b', prompt.upper())
    return matches[0] if matches else "Z*"


async def _process_agent_result(session_id: str, result: str):
    """Process a result returned from the agent."""
    logger.info(f"Session {session_id}: result received ({len(result)} chars)")


async def _store_diff(session_id: str, diff: dict):
    """Store a code diff from the agent."""
    logger.info(f"Session {session_id}: diff stored")


async def _update_pipeline(session_id: str, step: dict):
    """Update pipeline status for a session."""
    logger.info(f"Session {session_id}: pipeline step {step.get('name')}: {step.get('status')}")


# ═══════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "agents_connected": len(_agent_connections),
        "version": "1.0.0",
    }
