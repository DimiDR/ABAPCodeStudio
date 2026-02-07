# ABAP Code Studio

**AI-powered ABAP development platform — Hybrid SaaS + Client Agent architecture.**

Supports SAP ECC 6.0 (On-Premise) and BTP ABAP Cloud in a unified workflow.

## Architecture

```
Developer (Claude Code / VS Code / Custom UI)
    │ MCP Protocol
    ▼
┌─────────────────────────────────────────────┐
│  CLOUD PLATFORM (SaaS — your infrastructure)│
│  ├─ Web UI (React)                          │
│  ├─ AI Orchestration (Prompt + Model Route) │
│  ├─ Workflow Engine (Review Gates)          │
│  ├─ Metadata Store (PostgreSQL)             │
│  ├─ Git Integration (GitHub/GitLab PRs)     │
│  └─ Audit & Analytics                       │
└──────────────────┬──────────────────────────┘
                   │ WebSocket / SSE (TLS 1.3)
                   │ Only metadata + diffs
┌──────────────────▼──────────────────────────┐
│  CLIENT AGENT (customer infrastructure)      │
│  ├─ Local MCP Server (FastMCP)              │
│  ├─ ADT REST Client (ECC + BTP)            │
│  ├─ RFC Client (PyRFC — ECC only)          │
│  ├─ Transport Management (CTS / gCTS)       │
│  ├─ ATC + Unit Test Runner                  │
│  ├─ abapGit Sync                            │
│  └─ AI Core Proxy (optional)                │
└──────────────────┬──────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
SAP ECC 6.0    BTP ABAP Cloud  SAP AI Core
(ADT+RFC)      (ADT+JWT)       (GenAI Hub)
```

## Key Principle

> The cloud product **never** sees SAP credentials or source code.  
> All SAP connections run **exclusively on the client agent** in the customer's network.

## Project Structure

```
abap-code-studio/
├── cloud-backend/          # SaaS Cloud Platform (Python FastAPI)
│   ├── api/                # REST + WebSocket endpoints
│   ├── auth/               # Tenant authentication (OAuth 2.0)
│   ├── orchestrator/       # AI workflow engine
│   ├── metadata/           # System & object registry
│   ├── git_integration/    # GitHub/GitLab PR management
│   └── analytics/          # Usage tracking & metrics
│
├── agent-sdk/              # Client Agent (installed at customer)
│   ├── connectors/         # SAP ADT, RFC, GUI connectors
│   ├── tools/              # MCP tool implementations
│   ├── auth/               # Credential management
│   ├── agent.py            # Main agent process
│   └── tunnel.py           # WebSocket tunnel to cloud
│
├── shared/                 # Shared models & types
│   └── models/             # Pydantic models
│
├── infra/                  # Deployment configs
│   ├── docker-compose.yml
│   └── Dockerfile.*
│
└── docs/                   # Documentation
```

## Quick Start

### Cloud Backend
```bash
cd cloud-backend
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Client Agent
```bash
pip install abap-studio-agent
abap-studio-agent init --token <your-tenant-token>
abap-studio-agent start
```

## License

Proprietary — All rights reserved.
