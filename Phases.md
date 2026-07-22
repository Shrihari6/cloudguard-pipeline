# Phases.md
> CloudGuard Pipeline — Development Phases & Progress Tracker
> Version: 1.0.0 | Last updated: July 2026

Track your progress by checking off tasks. Each phase has a clear exit criterion — do not move to the next phase until it is fully met.

---

## Phase 0 — Project Scaffold
**Goal:** Both apps start without errors. Nothing works yet — just the skeleton.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create `cloudguard-pipeline/` root folder
- [ ] `git init` in root, create `.gitignore` (covers `.env.local`, `application-local.yml`, `target/`, `node_modules/`, `*.jar`)
- [ ] Create GitHub repo `cloudguard-pipeline` (private), push initial commit
- [ ] Scaffold Next.js 14 into `frontend/` via `npx create-next-app@latest frontend` — TypeScript YES, ESLint YES, Tailwind NO, src/ YES, App Router YES
- [ ] Install frontend dependencies: `npm install reactflow zustand dagre @types/dagre`
- [ ] Scaffold Spring Boot into `backend/` via `start.spring.io` — Java 21, Maven, Spring Web, Validation, DevTools
- [ ] Add LangChain4j Anthropic dependency to `pom.xml`
- [ ] Add Bucket4j and Lombok to `pom.xml`
- [ ] Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8080`
- [ ] Create `backend/src/main/resources/application-local.yml` with API key and CORS origin
- [ ] Create `backend/src/main/resources/application.yml` with server port 8080
- [ ] Verify: `cd frontend && npm run dev` → Next.js default page on localhost:3000
- [ ] Verify: `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local` → Spring starts on localhost:8080
- [ ] Commit: `git commit -m "Phase 0: project scaffold"`

### Exit criterion
Both apps start. `node --version` shows 20.x, `java --version` shows 21.x, `mvn --version` shows 3.9.x.

---

## Phase 1 — Design System & Layout Shell
**Goal:** The visual layout matches the design doc. No interactivity yet — pure HTML/CSS.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create `frontend/src/styles/globals.css` with all CSS custom properties (see `Design.md`)
- [ ] Apply font import (Inter via Google Fonts) in `app/layout.tsx`
- [ ] Build `TopBar.tsx` — title, badge, two placeholder buttons (no handlers yet)
- [ ] Build `Button.tsx` — `default` and `primary` variants, `disabled` prop
- [ ] Build `Badge.tsx` — pill with `color` and `bg` props
- [ ] Build `ComponentSidebar.tsx` — grouped AWS service list using `nodeRegistry.ts` data, no drag yet
- [ ] Build `PaletteItem.tsx` — styled card, draggable=false for now
- [ ] Build `AgentPanel.tsx` shell — header with pulse dot, empty chat area, empty input
- [ ] Build `AgentHeader.tsx` — name, role subtitle, animated green dot
- [ ] Create `builder/page.tsx` with 3-column CSS grid layout: sidebar | canvas placeholder | agent panel
- [ ] Verify layout renders correctly in light mode and dark mode (check OS preference)
- [ ] Commit: `git commit -m "Phase 1: design system and layout shell"`

### Exit criterion
Opening `localhost:3000/builder` shows the correct 3-column layout with TopBar, grouped sidebar, agent panel header — matching the design spec colours and typography.

---

## Phase 2 — Pipeline Canvas (Drag, Drop, Connect)
**Goal:** Nodes can be dragged from palette to canvas, repositioned, and connected.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create `frontend/src/lib/nodeRegistry.ts` — `NODE_REGISTRY` and `getSidebarGroups()`
- [ ] Create `frontend/src/lib/securityRules.ts` — `SECURITY_RULES` and `getChecksForNode()`
- [ ] Create `frontend/src/types/index.ts` — all TypeScript interfaces (NodeType, PipelineNodeData, SecurityCheck, ChatMessage, AgentRequest/Response, ValidationReport, Finding, SuggestionDTO)
- [ ] Create `frontend/src/hooks/usePipelineStore.ts` — full Zustand store with: nodes, edges, selectedNodeId, activePanelView, connectingFromId, validationReport — and actions: addNode, addEdge, selectNode, updateNodePosition, removeNode, removeEdge, clearCanvas, setConnectingFrom, setValidationReport, acceptSuggestion, toggleSecurityCheck — and selectors: getSelectedNode, getSecuritySummary
- [ ] Create `frontend/src/hooks/useDragDrop.ts` — onDragStart, onDragEnd, onDrop, onDragOver
- [ ] Build `PipelineCanvas.tsx` — React Flow wrapper with: custom nodeTypes map (memoised), onConnect, onPaneClick, onNodeDragStop, onEdgesDelete, onInit (stores reactFlowInstance ref), Background, Controls, MiniMap
- [ ] Build `PipelineNode.tsx` — custom RF node: NodeIcon, NodeLabel, NodeDesc, delete button, two Handles (top = target, bottom = source)
- [ ] Wire `PaletteItem.tsx` with `useDragDrop` — `onDragStart`, `onDragEnd`
- [ ] Wire `PipelineCanvas.tsx` with `useDragDrop` — `onDrop`, `onDragOver`
- [ ] Build `EmptyHint.tsx` — shown when `nodes.length === 0`
- [ ] Verify: drag S3 from palette → drops on canvas as a node card
- [ ] Verify: drag node on canvas → repositions freely
- [ ] Verify: drag from bottom handle to top handle of another node → edge renders
- [ ] Verify: × button on node → removes node and all connected edges
- [ ] Commit: `git commit -m "Phase 2: pipeline canvas drag drop connect"`

### Exit criterion
User can drag services from the sidebar onto the canvas, connect them with edges, reposition nodes, and delete nodes.

---

## Phase 3 — Dagre Auto-Layout
**Goal:** Every graph mutation automatically positions nodes cleanly. Manual positions are preserved.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create `frontend/src/lib/layoutPipeline.ts` — `layoutPipeline()`, `buildDagreGraph()`, `applyDagrePositions()`
- [ ] `layoutPipeline()` must split nodes into pinned (`isManuallyPositioned: true`) and free
- [ ] Pinned nodes passed to Dagre with `fixed: true` — Dagre routes edges around them without moving them
- [ ] Wire `layoutPipeline()` into store: called after addNode, addEdge, removeNode, removeEdge, acceptSuggestion
- [ ] `updateNodePosition()` sets `isManuallyPositioned: true` on the node
- [ ] Verify: drop 4 nodes → they arrange top-to-bottom cleanly
- [ ] Verify: connect nodes → layout reflows without disconnecting edges
- [ ] Verify: drag a node manually → position preserved when another node is dropped
- [ ] Verify: accept AI suggestion → new node appears in a clean position, manually-dragged nodes stay put
- [ ] Commit: `git commit -m "Phase 3: Dagre auto-layout with pinned node support"`

### Exit criterion
Auto-layout fires on every mutation. Manually repositioned nodes never snap back.

---

## Phase 4 — Security Layer (Checklists + Panel State)
**Goal:** Every node has a working security checklist. Panel switches correctly between node view and report view.
**Status:** `[ ] Not started`

### Tasks
- [ ] Build `SecurityStrip.tsx` — 3 dots (IAM / Enc / Detect), opacity driven by `checks[i].checked`
- [ ] Wire `SecurityStrip` into `PipelineNode.tsx`
- [ ] Build `SecurityPanel.tsx` — reads `getSelectedNode`, groups checks by category, renders `SecurityItem` list
- [ ] Build `SecurityItem.tsx` — checkbox + label + `Badge` (IAM/Enc/Detect), calls `toggleSecurityCheck()` on change
- [ ] Build `ValidationReport.tsx` — reads `validationReport` from store, renders 3 `ScoreCard`s + `FindingRow` list + passed rows
- [ ] Build `FindingRow.tsx` — expandable card: severity badge, title, category, chevron, expandable description + remediation code block
- [ ] Build `ScoreCard.tsx` — large number, sub-label, coloured fill bar using `getScoreMeta(score)`
- [ ] Create `getScoreMeta()` utility in `ValidationReport.tsx` — BANDS array: ≥80 green, ≥60 amber, ≥40 orange, 0+ red
- [ ] Update `AgentPanel.tsx` to render `SecurityPanel` or `ValidationReport` based on `activePanelView`
- [ ] Verify: click a node → right panel shows that node's checklist
- [ ] Verify: click empty canvas → right panel shows GLOBAL_REPORT (empty state)
- [ ] Verify: tick a checkbox → dot on node changes colour
- [ ] Commit: `git commit -m "Phase 4: security checklists and panel state machine"`

### Exit criterion
Panel switches correctly. Every node's checklist is accurate. Dots reflect check state.

---

## Phase 5 — Backend Scaffold (Java Spring Boot)
**Goal:** Backend starts, accepts requests, returns mock responses. No real AI yet.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create all 11 DTO classes in `dto/` package with Bean Validation annotations
- [ ] Create `CorsConfig.java` — reads `app.frontend-url` from yml
- [ ] Create `GlobalExceptionHandler.java` — handles `MethodArgumentNotValidException` (400), `InvalidPipelineTopologyException` (422), generic `Exception` (500)
- [ ] Create `InvalidPipelineTopologyException.java` — custom exception class
- [ ] Create `RateLimitFilter.java` — Bucket4j, reads `X-Forwarded-For`, 60/hr for /api/agent, 20/hr for /api/validate, returns 429 with `Retry-After: 60`
- [ ] Create `AgentController.java` — POST /api/agent, returns hardcoded mock `AgentResponseDTO`
- [ ] Create `ValidationController.java` — POST /api/validate, returns hardcoded mock `ValidationReportDTO`
- [ ] Enable virtual threads in `application.yml`: `spring.threads.virtual.enabled: true`
- [ ] Create `frontend/src/lib/api.ts` — `postAgent()`, `postValidate()`, `handleResponse()`, `ApiError` class
- [ ] Create `frontend/src/lib/ReactFlowToBackendParser.ts` — pure `parseForBackend()` function
- [ ] Create `frontend/src/hooks/useAgentChat.ts` — `sendMessage()`, `appendMessage()`, `clearHistory()`, `buildDropPrompt()`, store subscriptions (with origin check), sliding window `messages.slice(-12)`
- [ ] Wire `ChatArea.tsx`, `ChatMessage.tsx`, `SuggestionCard.tsx`, `ChatInput.tsx` to `useAgentChat`
- [ ] Wire `TopBar.tsx` `validatePipeline()` handler to `postValidate()`
- [ ] Verify: drop a node → frontend POSTs to `/api/agent` → mock reply appears in chat
- [ ] Verify: click Validate → frontend POSTs to `/api/validate` → mock report renders
- [ ] Verify: 61st request to `/api/agent` → returns 429 → toast appears in UI
- [ ] Commit: `git commit -m "Phase 5: backend scaffold with mock responses"`

### Exit criterion
Frontend and backend communicate. Mock responses render correctly in the UI. Rate limiting works.

---

## Phase 6 — LangChain4j Agent (Real AI)
**Goal:** Dropping a node returns a real, context-aware AI response.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create `LangChain4jConfig.java` — `@Bean` for `AnthropicChatModel` (reads `ANTHROPIC_API_KEY`) and `CloudGuardAiService` proxy
- [ ] Create `CloudGuardAiService.java` — LangChain4j `@AiService` interface with `@SystemMessage(fromResource)` and `@UserMessage` template
- [ ] Create `prompts/system-prompt.st` — full system prompt including: role context, pipeline JSON placeholder, response format instruction (JSON with reply/suggestion/securityFlags), valid nodeType list, instruction to use lowercase keys only
- [ ] Create `PromptBuilder.java` — `buildSystemContext()` and `serializePipeline()`
- [ ] Create `AgentService.java` — `processChat()` and `parseAgentResponse()` with JSON fallback
- [ ] Wire `AgentController` to `AgentService`
- [ ] Test with Postman / Thunder Client: POST `/api/agent` with a real pipeline JSON → verify real Claude response
- [ ] Verify: drop Kinesis → agent replies with contextual next-step suggestion
- [ ] Verify: drop Lambda → agent suggests connecting to SQS or Kinesis
- [ ] Verify: accept suggestion → new node appears on canvas
- [ ] Verify: AI-inserted node does NOT trigger another agent message (origin check works)
- [ ] Commit: `git commit -m "Phase 6: LangChain4j agent with real Anthropic responses"`

### Exit criterion
Dropping any of the 14 AWS nodes returns a contextual AI response. Suggestions work. No chat loops.

---

## Phase 7 — Validation Engine (Real Security Checks)
**Goal:** Validate button returns a real scored report with actual security findings.
**Status:** `[ ] Not started`

### Tasks
- [ ] Create `SecurityValidationStrategy.java` interface
- [ ] Create all 14 `*ValidationStrategy.java` classes in `engine/strategies/` — each checks 3 rules (IAM, Encryption, Threat) using the edge list for connectivity checks
- [ ] Create `SecurityRuleRegistry.java` — static `STRATEGY_MAP` with all 14 services registered
- [ ] Create `CycleDetector.java` — `hasCycle()` and `dfsCycleCheck()` using DFS with visited + inStack sets
- [ ] Create `TopologicalSorter.java` — `sort()` using Kahn's BFS algorithm and `buildInDegreeMap()`
- [ ] Create `ScoreEngine.java` — `compute()` with Critical −15, High −8, Medium −3 weights, floor 0
- [ ] Create `ValidationEngine.java` — full orchestration: adjacency list → cycle check → topo sort → strategy dispatch → group findings → score
- [ ] Wire `ValidationController` to `ValidationEngine`
- [ ] Test: pipeline with S3 + Lambda + no KMS → should show Critical finding "S3 bucket has no KMS encryption"
- [ ] Test: pipeline with a cycle (Lambda → SQS → Lambda) → should return 422
- [ ] Test: full pipeline (Kinesis → Lambda → S3 → Glue → Redshift + KMS + GuardDuty + CloudWatch) → score should be ≥ 80
- [ ] Verify: score colour changes correctly — green/amber/orange/red
- [ ] Verify: each finding expands to show description and remediation command
- [ ] Commit: `git commit -m "Phase 7: validation engine with real security rules"`

### Exit criterion
Validation returns real findings. Cycle detection throws 422. Score colours are correct.

---

## Phase 8 — Polish, Error States & Deploy
**Goal:** The app handles all edge cases gracefully and is live on the internet.
**Status:** `[ ] Not started`

### Tasks

**Polish**
- [ ] Add loading spinner to "Validate pipeline" button during API call
- [ ] Add `TypingIndicator` (animated dots) in chat while `isLoading === true`
- [ ] Add rate-limit toast (429) with retry countdown
- [ ] Add network error toast (connection failed)
- [ ] Add empty state for ValidationReport when `validationReport === null` — "Run validation to see your pipeline security score"
- [ ] Add toast when cycle detected (422) — "Cycle detected in your pipeline — remove the loop before validating"
- [ ] Test keyboard navigation: Tab through TopBar buttons, Enter to activate
- [ ] Test light mode and dark mode — all tokens correct

**Deploy**
- [ ] Add `Procfile` or Railway config to `backend/` for JAR deployment
- [ ] Add `ANTHROPIC_API_KEY` and `APP_FRONTEND_URL` to Railway environment variables
- [ ] Deploy backend to Railway — verify `/api/agent` returns 200 from the public URL
- [ ] Connect GitHub repo to Vercel — auto-deploy on push to `main`
- [ ] Add `NEXT_PUBLIC_API_URL` (Railway URL) to Vercel environment variables
- [ ] Verify end-to-end: drag → agent responds → validate → report renders — on the production URL
- [ ] Write `README.md` — project description, screenshot/GIF, tech stack, local dev instructions
- [ ] Commit: `git commit -m "Phase 8: polish, error states, deployed"`

### Exit criterion
Public URL works end-to-end. All error states handled. README has a demo GIF.

---

## Quick Reference — Phase Summary

| Phase | What gets built | Exit criterion |
|---|---|---|
| 0 | Root folder, Git, Next.js scaffold, Spring Boot scaffold | Both apps start |
| 1 | CSS tokens, layout grid, all UI shells | Visual layout matches design |
| 2 | Drag-drop, React Flow canvas, Zustand store, node connections | Nodes drag, connect, delete |
| 3 | Dagre auto-layout, pinned node flag | Auto-layout fires; manual positions preserved |
| 4 | Security checklists, panel state machine, ValidationReport UI | Panel switches; checklists work |
| 5 | All Java DTOs, controllers (mock), rate limiter, frontend API layer | Frontend-backend communication works |
| 6 | LangChain4j config, AI service, system prompt, real responses | Real Claude responses in chat |
| 7 | Cycle detection, topo sort, 14 strategies, scoring engine | Real validation report with correct findings |
| 8 | Loading states, toasts, deploy to Vercel + Railway | Live on internet, all errors handled |