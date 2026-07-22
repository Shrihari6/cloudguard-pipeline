# Memory.md
> CloudGuard Pipeline — Project Memory & Decision Log
> Version: 1.0.0 | Last updated: July 2026

This file is the single source of truth for every decision made during design and development.
When you return to this project after a break, read this file first.
When you make a new decision, log it here immediately.

---

## Project Identity

```
Project name:    CloudGuard Pipeline
Tagline:         AI-Powered AWS Pipeline Builder
Domain:          Cloud computing × Cybersecurity × AI
Purpose:         Campus placement portfolio project + real usable tool
Started:         July 2026
Status:          Phase 0 — not started
```

---

## Tech Stack Decisions

| Decision | Choice | Reason | Date |
|---|---|---|---|
| Frontend framework | Next.js 14 (App Router) | Vercel-native, TypeScript-first, industry standard | July 2026 |
| State management | Zustand | Minimal boilerplate vs Redux, simpler than Context | July 2026 |
| Canvas library | React Flow | Industry standard for node-based editors (n8n, Langflow use it) | July 2026 |
| Graph layout | Dagre | Sugiyama layered graph — correct algorithm for top-down DAGs | July 2026 |
| Styling | CSS Custom Properties | No Tailwind (we control the design system), no CSS-in-JS (runtime cost) | July 2026 |
| Backend language | Java 21 | Enterprise adoption, LangChain4j, Virtual Threads, type safety | July 2026 |
| Backend framework | Spring Boot 3.3 | Auto-config, Bean Validation, Embedded Tomcat, mature ecosystem | July 2026 |
| Build tool | Maven 3.9 | Standard Java build tool, pom.xml is well-documented | July 2026 |
| AI integration | LangChain4j @AiService | Cleanest Java LLM pattern — generates proxy at runtime, no boilerplate | July 2026 |
| AI model | claude-sonnet-4-6 | Best balance of intelligence and cost for agent workloads | July 2026 |
| Rate limiting | Bucket4j | Token-bucket algorithm, no Redis needed for MVP, in-memory | July 2026 |
| Frontend deploy | Vercel | Free hobby plan, auto-SSL, Next.js native | July 2026 |
| Backend deploy | Railway | Managed Java runtime, free $5/month credit, env var secrets | July 2026 |

---

## Architecture Decisions

| Decision | What was decided | Why | Date |
|---|---|---|---|
| Database | None in MVP | Stateless backend is simpler to deploy and scale horizontally | July 2026 |
| Auth | None in MVP | Reduces Phase 0 complexity — deferred to post-MVP | July 2026 |
| Monorepo structure | Two decoupled apps (not pnpm workspace) | Java backend cannot participate in a JS monorepo natively | July 2026 |
| Shared types | Mirrored manually (Java DTOs + TypeScript interfaces) | No shared package without pnpm workspace — manual mirror is acceptable for MVP | July 2026 |
| Panel state | `activePanelView: "NODE_CHECKLIST" \| "GLOBAL_REPORT"` in Zustand | Clean state machine — one selector drives all conditional rendering in AgentPanel | July 2026 |
| Canvas state stripping | `ReactFlowToBackendParser.ts` strips all RF UI fields | React Flow node objects contain dozens of UI-only fields that pollute the AI context | July 2026 |
| History window | `messages.slice(-12)` per request | Balance between AI context quality and token budget | July 2026 |
| Score colours | ≥80 green / ≥60 amber / ≥40 orange / 0+ red | Standard security traffic-light pattern — green = safe to deploy | July 2026 |
| Score weights | Critical −15, High −8, Medium −3, floor 0 | Critical findings should block deployment on their own (≥7 criticals → score 0) | July 2026 |

---

## Bugs Fixed During Design (Before Coding)

These bugs were caught during architecture review. They are already fixed in the design docs. **Do not reintroduce them.**

| Bug ID | Where | What it was | How it was fixed |
|---|---|---|---|
| FIX-1 | `usePipelineStore.ts` / `useAgentChat.ts` | `clearCanvas()` directly called `useAgentChat.clearHistory()` — illegal hook call outside React tree | `useAgentChat` self-subscribes to Zustand store and clears its own state when `nodes.length === 0 && edges.length === 0` |
| FIX-2 | `useAgentChat.ts` / `usePipelineStore.ts` | `triggerOnDrop()` watched all node additions — AI-accepted nodes triggered new agent requests → infinite loop | Added `origin: "user" \| "agent"` to `PipelineNodeData`. `acceptSuggestion()` passes `"agent"`. `triggerOnDrop()` skips `origin === "agent"` nodes |
| FIX-3 | `usePipelineStore.ts` / `SuggestionCard.tsx` | `acceptSuggestion()` called `addNode()` without a position — Dagre threw bounding errors before layout ran | `acceptSuggestion()` reads `reactFlowInstance.getViewport()` and passes viewport-centre as initial position before Dagre runs |
| FIX-4 | `layoutPipeline.ts` / `usePipelineStore.ts` | `layoutPipeline()` re-ran Dagre on all nodes — snapped user-dragged positions back to auto-layout | Added `isManuallyPositioned: boolean` to node data. `updateNodePosition()` sets it true. `layoutPipeline()` skips pinned nodes |
| FIX-5 | `ReactFlowToBackendParser.ts` / `TopBar.tsx` | `validatePipeline()` UI orchestration (toasts, state dispatch) lived inside the parser file | Parser exports only `parseForBackend()` — pure function. `validatePipeline()` lives in `TopBar.tsx` where UI logic belongs |

---

## Configuration Warnings

These warnings came from post-architecture review. Watch for them during implementation.

| Warning | Risk | Mitigation |
|---|---|---|
| Token budget overflow | `@Size(max=50)` history + large pipeline JSON can exceed `maxTokens(1000)` | Frontend sends only `messages.slice(-12)` per request |
| NodeType casing mismatch | `SuggestionDTO.nodeType` from Claude might not match `NODE_REGISTRY` keys | (1) System prompt explicitly lists 14 valid lowercase keys. (2) `acceptSuggestion()` validates against `NODE_REGISTRY` before calling `addNode()` — logs warning and returns if unknown |

---

## Open Questions / Post-MVP Backlog

| Item | Decision | When |
|---|---|---|
| User auth | Clerk or Spring Security + JWT | Post-MVP v2 |
| Pipeline persistence | PostgreSQL + Spring Data JPA | Post-MVP v2 |
| Multi-cloud (GCP, Azure) | New node types + cloud-scoped SecurityRuleRegistry | Post-MVP v3 |
| Terraform export | New GET /api/export endpoint + file download | Post-MVP v2 |
| Role switcher | Persona-aware system prompt + filtered palette | Post-MVP v2 |
| Real-time collaboration | Yjs + WebSocket (Spring WebFlux) | Post-MVP v4 |
| ScoreCard dynamic colours | ≥80 green / ≥60 amber / ≥40 orange / 0+ red — decided | DONE — Phase 4 |

---

## Key File Locations

| What | Path |
|---|---|
| Design tokens (CSS) | `frontend/src/styles/globals.css` |
| Zustand store | `frontend/src/hooks/usePipelineStore.ts` |
| Agent chat hook | `frontend/src/hooks/useAgentChat.ts` |
| Drag drop hook | `frontend/src/hooks/useDragDrop.ts` |
| Canvas parser (pure) | `frontend/src/lib/ReactFlowToBackendParser.ts` |
| Dagre layout utility | `frontend/src/lib/layoutPipeline.ts` |
| Node registry | `frontend/src/lib/nodeRegistry.ts` |
| Security rules (client) | `frontend/src/lib/securityRules.ts` |
| All TypeScript types | `frontend/src/types/index.ts` |
| Spring Boot entry | `backend/src/main/java/com/cloudguard/pipeline/CloudGuardApplication.java` |
| System prompt template | `backend/src/main/resources/prompts/system-prompt.st` |
| Local dev config (secret) | `backend/src/main/resources/application-local.yml` |
| LangChain4j AI service | `backend/src/main/java/com/cloudguard/pipeline/ai/CloudGuardAiService.java` |
| Validation engine | `backend/src/main/java/com/cloudguard/pipeline/service/ValidationEngine.java` |
| Cycle detector | `backend/src/main/java/com/cloudguard/pipeline/engine/CycleDetector.java` |
| Topological sorter | `backend/src/main/java/com/cloudguard/pipeline/engine/TopologicalSorter.java` |
| Rate limit filter | `backend/src/main/java/com/cloudguard/pipeline/middleware/RateLimitFilter.java` |

---

## Daily Development Workflow

```bash
# Start both apps (two terminal panes in VS Code)

# Terminal 1 — Frontend
cd frontend && npm run dev
# → http://localhost:3000

# Terminal 2 — Backend
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local
# → http://localhost:8080

# End of session
git add .
git commit -m "Phase X: [what you built]"
git push
```

---

## Interview Talking Points (Quick Reference)

When an interviewer asks about this project, anchor every answer to a specific file or decision.

| Question | File to reference | Keywords |
|---|---|---|
| Graph algorithm? | `CycleDetector.java` | DFS, back edge, HashSet visited + inStack, O(V+E) |
| Topological sort? | `TopologicalSorter.java` | Kahn's algorithm, BFS, in-degree, execution order |
| Design pattern? | `SecurityValidationStrategy.java` + 14 impls | Strategy Pattern, Open-Closed Principle, polymorphism |
| SOLID? | `ValidationEngine.java` + strategy classes | Single Responsibility, Open-Closed — adding a service = one new class |
| Java 21 feature? | `application.yml` — `spring.threads.virtual.enabled: true` | Project Loom, virtual threads, I/O-bound blocking, carrier thread |
| Concurrency? | `RateLimitFilter.java` — `ConcurrentHashMap` | Race condition, thread-safe, lock striping, CAS |
| CORS? | `CorsConfig.java` | Same-Origin Policy, OPTIONS pre-flight, `Access-Control-Allow-Origin` |
| Rate limiting? | `RateLimitFilter.java` + Bucket4j | Token bucket algorithm, HTTP 429, DoS mitigation |
| Database schema? | Post-MVP design | 3NF, `ON DELETE CASCADE`, `@OneToMany(cascade = CascadeType.ALL)` |
| Why stateless? | Architecture decision log above | Horizontal scaling, no shared state, stateless REST constraint |
| Why no AI for validation? | `ValidationEngine.java` | Deterministic, auditable, fast, free — AI is non-deterministic |