"""Shared data models for ABAP Code Studio."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════

class SystemType(str, Enum):
    ECC = "ecc"
    BTP_ABAP_CLOUD = "btp_abap_cloud"


class AuthMethod(str, Enum):
    BASIC = "basic"
    JWT_XSUAA = "jwt_xsuaa"
    SNC = "snc"
    SERVICE_KEY = "service_key"


class ConnectionMethod(str, Enum):
    ADT = "adt"
    RFC = "rfc"
    GUI = "gui"


class ObjectType(str, Enum):
    PROG = "PROG"     # Report / Program
    CLAS = "CLAS"     # Class
    INTF = "INTF"     # Interface
    FUGR = "FUGR"     # Function Group
    FUNC = "FUNC"     # Function Module
    DDLS = "DDLS"     # CDS View (Data Definition)
    DDLX = "DDLX"     # Metadata Extension
    BDEF = "BDEF"     # Behavior Definition
    SRVD = "SRVD"     # Service Definition
    SRVB = "SRVB"     # Service Binding
    TABL = "TABL"     # Table
    DTEL = "DTEL"     # Data Element
    DOMA = "DOMA"     # Domain
    STRU = "STRU"     # Structure
    DCLS = "DCLS"     # Access Control
    INCL = "INCL"     # Include


class ObjectStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MODIFIED = "modified"


class ReviewStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MERGED = "merged"
    DEPLOYED = "deployed"


class PipelineStepStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARN = "warn"
    PENDING = "pending"
    BLOCKED = "blocked"
    RUNNING = "running"


class AIModel(str, Enum):
    SAP_ABAP_1 = "sap-abap-1"
    CLAUDE_OPUS = "claude-opus-4-6"
    CLAUDE_SONNET = "claude-sonnet-4-5"
    GPT4 = "gpt-4"
    MISTRAL = "mistral-large"


# ═══════════════════════════════════════════════════════════════
# SYSTEM CONFIGURATION
# ═══════════════════════════════════════════════════════════════

class RFCConfig(BaseModel):
    """RFC connection parameters (ECC only)."""
    sysnr: str = "00"
    ashost: str
    mshost: Optional[str] = None
    group: Optional[str] = None


class SystemConfig(BaseModel):
    """SAP system connection configuration — stored on the CLIENT AGENT only.
    The cloud only stores the metadata fields (name, type, host_label).
    """
    name: str
    type: SystemType
    url: str
    client: str = "100"
    auth_method: AuthMethod
    connection_primary: ConnectionMethod = ConnectionMethod.ADT
    connection_fallback: Optional[ConnectionMethod] = None
    rfc: Optional[RFCConfig] = None
    principal_propagation: bool = False

    # BTP-specific
    xsuaa_url: Optional[str] = None

    # Feature flags
    adt_activated: bool = True
    abapgit_installed: bool = False
    gcts_enabled: bool = False
    ai_sdk_available: bool = False
    min_basis_version: Optional[str] = None


class SystemMetadata(BaseModel):
    """System metadata stored in the CLOUD (no credentials!)."""
    id: str
    tenant_id: str
    name: str
    type: SystemType
    host_label: str  # e.g. "ecc-prod" — NOT the actual host/IP
    client_nr: str
    basis_version: Optional[str] = None
    agent_id: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    features: dict = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════
# ABAP OBJECTS
# ═══════════════════════════════════════════════════════════════

class ABAPObject(BaseModel):
    """An ABAP development object."""
    name: str
    type: ObjectType
    package: str
    description: Optional[str] = None
    status: ObjectStatus = ObjectStatus.ACTIVE
    system_id: str
    system_type: SystemType
    line_count: Optional[int] = None
    uri: Optional[str] = None  # ADT URI, e.g. /sap/bc/adt/oo/classes/zcl_sales

    # AI tracking
    ai_generated: bool = False
    review_status: Optional[ReviewStatus] = None
    last_modified_at: Optional[datetime] = None
    last_modified_by: Optional[str] = None


class SourceCode(BaseModel):
    """Source code of an ABAP object."""
    object_name: str
    object_type: ObjectType
    source: str
    etag: Optional[str] = None  # For optimistic locking (ADT)
    line_count: int = 0


class CodeDiff(BaseModel):
    """A diff between old and new source code."""
    object_name: str
    object_type: ObjectType
    old_source: Optional[str] = None
    new_source: str
    added_lines: int = 0
    removed_lines: int = 0


# ═══════════════════════════════════════════════════════════════
# AI SESSION
# ═══════════════════════════════════════════════════════════════

class AISession(BaseModel):
    """Tracks a single AI code generation session."""
    id: str
    tenant_id: str
    user_id: str
    prompt: str
    model_used: AIModel
    confidence: float = 0.0
    system_target: str  # system_id
    objects_read: list[str] = Field(default_factory=list)
    objects_modified: list[str] = Field(default_factory=list)
    diffs: list[CodeDiff] = Field(default_factory=list)
    review_status: ReviewStatus = ReviewStatus.DRAFT
    git_commit_sha: Optional[str] = None
    transport_nr: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
# PIPELINE
# ═══════════════════════════════════════════════════════════════

class PipelineStep(BaseModel):
    """A single step in the CI/CD pipeline."""
    name: str
    description: str
    status: PipelineStepStatus = PipelineStepStatus.PENDING
    detail: Optional[str] = None
    duration_ms: Optional[int] = None


class PipelineRun(BaseModel):
    """A complete pipeline run for an AI session."""
    session_id: str
    steps: list[PipelineStep] = Field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @property
    def passed(self) -> bool:
        return all(s.status in (PipelineStepStatus.PASS, PipelineStepStatus.WARN) for s in self.steps)


# ═══════════════════════════════════════════════════════════════
# GIT
# ═══════════════════════════════════════════════════════════════

class CommitMetadata(BaseModel):
    """Metadata attached to every AI-generated git commit."""
    sha: str
    message: str
    author: str
    timestamp: datetime
    ai_generated: bool = False
    model: Optional[AIModel] = None
    prompt: Optional[str] = None
    confidence: Optional[float] = None
    transport_nr: Optional[str] = None
    mcp_tools_used: list[str] = Field(default_factory=list)
    review_status: ReviewStatus = ReviewStatus.PENDING
    objects_changed: list[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════
# AGENT ↔ CLOUD MESSAGES (WebSocket protocol)
# ═══════════════════════════════════════════════════════════════

class AgentMessage(BaseModel):
    """Message from Client Agent → Cloud."""
    type: str  # "status", "result", "diff", "pipeline", "error"
    agent_id: str
    payload: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CloudCommand(BaseModel):
    """Command from Cloud → Client Agent."""
    type: str  # "search", "read", "write", "activate", "test", "transport"
    session_id: str
    params: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
