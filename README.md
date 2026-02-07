# ABAP Code Studio

AI-powered ABAP development platform with a Hybrid SaaS + Client Agent architecture. Built for SAP developers who work across legacy ECC 6.0 and modern BTP ABAP Cloud environments.

Developers describe requirements in natural language. The platform analyzes SAP objects, generates ABAP code, manages code review, handles transport requests, and synchronizes with Git — all while keeping SAP credentials and source code on-premise.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKSTATION                         │
│                                                                      │
│          Claude Code  /  VS Code  /  Browser UI                      │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               │  MCP Protocol
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    CLOUD  PLATFORM  (SaaS)                           │
│                  AWS  /  Azure  /  Hetzner EU                        │
│                                                                      │
│   ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐         │
│   │  Next.js    │  │  FastAPI     │  │  PostgreSQL        │         │
│   │  Frontend   │──│  Backend     │──│  (metadata only)   │         │
│   │  (React 19) │  │  + WebSocket │  │                    │         │
│   └─────────────┘  └──────┬───────┘  └────────────────────┘         │
│                           │                                          │
│   ┌───────────────────────┼──────────────────────────┐              │
│   │  AI Orchestration     │   Git Integration        │              │
│   │  ┌───────────┐        │   ┌──────────┐           │              │
│   │  │ SAP       │        │   │ GitHub / │           │              │
│   │  │ ABAP-1    │        │   │ GitLab   │           │              │
│   │  ├───────────┤        │   └──────────┘           │              │
│   │  │ Claude    │        │                          │              │
│   │  ├───────────┤        │   Audit & Analytics      │              │
│   │  │ GPT-4     │        │                          │              │
│   │  └───────────┘        │                          │              │
│   └───────────────────────┴──────────────────────────┘              │
│                                                                      │
│   ✔ No SAP credentials stored    ✔ No full source code stored       │
│   ✔ Only metadata + diffs        ✔ Tenant-isolated                  │
│                                                                      │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               │  WebSocket / SSE  (TLS 1.3)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                  CLIENT  AGENT  (On-Premise)                         │
│                     Docker Container                                 │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │  MCP Server                                              │      │
│   │                                                          │      │
│   │   Tools exposed:                                         │      │
│   │   ├── sap_search    Find objects in SAP                  │      │
│   │   ├── sap_read      Read source code                     │      │
│   │   ├── sap_write     Create / modify objects              │      │
│   │   ├── adt_compile   Syntax check                         │      │
│   │   ├── transport_create   Create transport requests       │      │
│   │   ├── abapgit_push  Git synchronization                  │      │
│   │   └── atp_run       Execute tests                        │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ✔ SAP credentials stay here    ✔ Full source code stays here      │
│   ✔ Business data never leaves   ✔ RFC connections stay local       │
│                                                                      │
└──────────┬──────────────────────────────┬────────────────────────────┘
           │                              │
           │  ADT REST + RFC              │  ADT REST + JWT/XSUAA
           ▼                              ▼
   ┌───────────────┐            ┌──────────────────┐
   │               │            │                  │
   │  SAP ECC 6.0  │            │  BTP ABAP Cloud  │
   │               │            │                  │
   │  ► Reports    │            │  ► CDS Views     │
   │  ► Classes    │            │  ► RAP / BDEF    │
   │  ► FMs / BAPIs│            │  ► Classes       │
   │  ► CDS Views  │            │  ► Service Binds │
   │  ► Tables     │            │  ► Tables        │
   │  ► BADIs      │            │  ► BADIs         │
   │               │            │                  │
   └───────────────┘            └──────────────────┘
```

### Data Flow Summary

```
                    Cloud                          On-Premise
              ┌────────────────┐             ┌────────────────────┐
  Stored:     │  Object names  │             │  SAP credentials   │
              │  AI prompts    │             │  Full source code  │
              │  Code diffs    │             │  Business data     │
              │  Pipeline logs │             │  Transport reqs    │
              │  Audit trail   │             │  RFC connections   │
              └────────────────┘             └────────────────────┘
```

---

## Development Workflow

The platform follows a four-phase pipeline for every code change:

```
  ┌───────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────────┐
  │ 1. ANALYSE│────▶│ 2. GENERATE  │────▶│ 3. DEPLOY│────▶│ 4. VALIDATE  │
  └───────────┘     └──────────────┘     └──────────┘     └──────────────┘
   Natural lang.     AI code gen.         Git commit        ATC checks
   Object search     Syntax check         SAP write         Unit tests
   Dependency         Diff preview         Activate          Review gate
    analysis                               Transport         Release
```

---

## Features

- **AI Chat Interface** — Describe requirements in natural language; the AI analyzes, generates, and explains ABAP code with confidence scoring
- **SAP Object Explorer** — Browse ABAP objects across ECC and BTP systems with source code preview and change tracking
- **Code Diff View** — Line-by-line diff visualization with approval/rejection workflow and transport association
- **Git Integration** — Full commit history, branch tracking, distinction between AI-generated and manual commits
- **CI/CD Pipeline** — Automated syntax check, ATC, unit tests, review gate, and transport release in a visual pipeline
- **Dual-System Support** — Simultaneous connections to SAP ECC 6.0 (ADT + RFC) and BTP ABAP Cloud (ADT + JWT)
- **Zero Trust Security** — SAP credentials and source code never leave the customer network; only metadata travels to the cloud
- **Multi-Tenant SaaS** — Tenant isolation, per-tenant admin, subscription billing, and usage tracking

---

## Tech Stack

| Layer           | Technology                                         |
|-----------------|----------------------------------------------------|
| Frontend        | Next.js 16, React 19, TypeScript 5                 |
| Styling         | Tailwind CSS 4, JetBrains Mono, Plus Jakarta Sans  |
| Backend         | Python FastAPI, WebSocket / SSE                    |
| Database        | PostgreSQL (metadata only)                         |
| Client Agent    | MCP Server, ADT REST APIs, RFC (PyRFC)             |
| AI Models       | SAP ABAP-1, Claude Opus 4.6, GPT-4                |
| Auth            | Basic Auth (ECC), JWT / XSUAA (BTP)                |
| Version Control | Git (GitHub / GitLab), abapGit                     |
| Hosting         | AWS ECS/Fargate, Azure AKS, or Hetzner EU          |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                Main page & view router
│   ├── layout.tsx              Root layout with metadata
│   └── globals.css             Global styles & theme
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx          Top bar, system status, branch info
│   │   ├── Sidebar.tsx         Collapsible navigation
│   │   └── StatusBar.tsx       Connection status footer
│   │
│   ├── ui/
│   │   ├── Badge.tsx           Colored label badges
│   │   ├── Box.tsx             Bordered container
│   │   ├── Dot.tsx             Status indicator dot
│   │   └── Lbl.tsx             Section labels
│   │
│   └── views/
│       ├── ChatView.tsx        AI conversational interface
│       ├── ExplorerView.tsx    SAP object browser
│       ├── DiffView.tsx        Code change visualization
│       ├── GitView.tsx         Git history & timeline
│       ├── PipelineView.tsx    CI/CD pipeline status
│       ├── DocArchView.tsx     Architecture documentation
│       ├── DocConnectView.tsx  Connection setup guide
│       ├── DocHostingView.tsx  Deployment options
│       ├── PricingView.tsx     Subscription tiers
│       └── SecurityView.tsx    Security & compliance
│
└── lib/
    ├── theme.ts                Color palette & font definitions
    └── nav.ts                  Navigation structure
```

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Available Scripts

| Command          | Description               |
|------------------|---------------------------|
| `npm run dev`    | Start development server  |
| `npm run build`  | Build for production      |
| `npm start`      | Start production server   |
| `npm run lint`   | Run ESLint                |

---

## Supported SAP Object Types

| Object Type              | ECC 6.0     | BTP Cloud |
|--------------------------|:-----------:|:---------:|
| Reports / Programs       |      +      |     +     |
| Classes / Interfaces     |      +      |     +     |
| Function Modules / BAPIs |      +      |     -     |
| CDS Views                | + (>=7.40)  |     +     |
| RAP (BDEF / Service)     |      -      |     +     |
| BADIs                    |      +      |     +     |
| Data Elements / Domains  |      +      |     +     |
| Tables / Structures      |      +      |     +     |

---

## Deployment Options

| Provider   | Services                          | Estimated Cost    |
|------------|-----------------------------------|-------------------|
| AWS        | ECS/Fargate, RDS, CloudFront      | ~$200 - 600/mo    |
| Azure      | AKS, Managed Postgres, Front Door | ~$250 - 700/mo    |
| Hetzner EU | Dedicated/Cloud, self-managed PG  | ~$50 - 150/mo     |

The client agent can be deployed as a Docker container (recommended), a Python package, or a Windows Service.

---

## Security

- **Zero Trust** — SAP credentials and full source code never leave the customer network
- **TLS 1.3** — All cloud-to-agent communication is encrypted
- **Tenant Isolation** — Strict separation between customer environments
- **DSGVO / GDPR** — EU data residency, no business data in the cloud
- **SAP Authorization** — Respects existing S_DEVELOP and S_RFC permission objects
- **Audit Logging** — Every action is logged with timestamp, user, and object reference

---

## License

Proprietary. All rights reserved.
