# Project_Requirements.md
> CloudGuard Pipeline — AI-Powered AWS Pipeline Builder
> Version: 1.0.0 | Status: Active Development | Last updated: July 2026

---

## 1. What We Are Building

CloudGuard Pipeline is a full-stack SaaS web application that gives developers, data engineers, and network engineers a **visual drag-and-drop canvas** to design AWS data pipelines — while an embedded AI agent powered by Anthropic Claude guides every step, flags security gaps in real time, and produces remediation output.

The product sits at the intersection of three domains:
- **Cloud computing** — AWS service orchestration and pipeline design
- **Cybersecurity** — IAM, encryption, and threat detection validation
- **Artificial intelligence** — a hybrid AI agent that suggests, waits for approval, then acts

---

## 2. Target Users

### Primary personas

| Persona | Who they are | What they need from this tool |
|---|---|---|
| Backend Developer | Builds APIs, microservices, event-driven systems | Design Lambda + SQS + RDS pipelines quickly without memorising AWS service connections |
| Data Engineer | Builds ETL pipelines, data lakes, warehouses | Connect Kinesis → Glue → Redshift visually and know the security posture at each step |
| Network / Cloud Engineer | Manages infrastructure, VPCs, IAM | Validate that every service in the pipeline is correctly secured before deployment |

### User context
- Works in VS Code or a browser — not a mobile-first user
- Has AWS experience — does not need explanations of what S3 is, needs help with what to connect and how to secure it
- Time-pressured — wants guidance that is fast, actionable, and skippable
- Campus placement / portfolio context — building this as a real project to demonstrate during interviews

---

## 3. Core Features

### 3.1 Visual Pipeline Canvas
- Drag AWS service components from a left sidebar palette onto a canvas
- Connect nodes by dragging from the output port (bottom) to the input port (top) of another node
- 14 AWS services supported: Kinesis, S3, SQS, Lambda, Glue ETL, EMR, RDS, DynamoDB, Redshift, IAM Role, KMS Key, WAF, CloudWatch, GuardDuty
- Nodes are grouped in the sidebar: Ingestion / Processing / Storage / Security / Observability
- Nodes can be manually repositioned — positions are preserved across layout recalculations
- Canvas shows an empty-state hint when no nodes are placed
- Dagre auto-layout fires on every graph mutation (add/remove node or edge) for free nodes

### 3.2 AI Agent — Hybrid Guidance Mode
- Agent panel on the right side of the canvas
- **Proactive:** Agent automatically suggests the next step after every node drop or edge connection
- **Waits for approval:** suggestions appear as Accept / Dismiss cards — agent does not act until user accepts
- **Reactive:** user can also type any question into the chat input and get an immediate response
- Agent uses Anthropic claude-sonnet-4-6 via a Java Spring Boot backend using LangChain4j
- Agent is context-aware — it knows the current pipeline state on every call
- Conversation history is maintained (last 12 turns sent per request to manage token budget)

### 3.3 Per-Node Security Checklist
- Every node carries a 3-layer security checklist: IAM · Encryption · Threat Detection
- Three coloured dots on each node card show check status at a glance (dim = unchecked, full colour = checked)
- Clicking a node opens its checklist in the right panel (NODE_CHECKLIST view)
- Checklist items are interactive checkboxes — user marks them as done
- Clicking empty canvas switches panel to GLOBAL_REPORT view

### 3.4 Pipeline-Wide Validation Report
- "Validate pipeline" button in the top bar triggers POST /api/validate
- Backend runs a deterministic Java security rule engine (no AI call — fast and free)
- Report shows: overall score (0–100), critical/high/medium findings, passed checks
- Score bar uses dynamic colour gradient: green (≥80) → amber (60–79) → orange (40–59) → red (0–39)
- Each finding is expandable — shows description + exact CLI/Terraform remediation command
- Three action buttons at the bottom trigger follow-up agent prompts

### 3.5 Graph Validation (DSA layer)
- Before running security checks, the backend builds an adjacency list from pipeline nodes and edges
- DFS cycle detection runs first — if a cycle is found (e.g., Lambda → SQS → Lambda), returns HTTP 422 with a clear user-facing error
- Topological sort (Kahn's algorithm) determines execution order of services
- Execution order is returned in the report as `executionSequence[]`

---

## 4. Out of Scope for MVP

These features are explicitly deferred to post-MVP:

- User authentication and accounts
- Pipeline persistence / save to database
- Multi-cloud support (GCP, Azure)
- Terraform / CloudFormation export
- Real-time collaboration
- Mobile responsive layout
- Billing / paid plans

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Agent response time | < 3 seconds for typical pipeline (< 5 nodes) |
| Validation report time | < 500ms (deterministic — no API call) |
| Rate limit | 60 agent calls / IP / hour · 20 validation calls / IP / hour |
| Browser support | Chrome 120+, Firefox 120+, Edge 120+ |
| Accessibility | Semantic HTML, keyboard navigable canvas controls |
| API key security | Anthropic key never exposed to browser — backend only |