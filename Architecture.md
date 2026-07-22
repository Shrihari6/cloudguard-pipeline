# Architecture.md
> CloudGuard Pipeline — System Architecture
> Version: 1.0.0 | Last updated: July 2026

---

## 1. System Overview

CloudGuard Pipeline is a **decoupled two-app architecture** — a Next.js frontend and a Java Spring Boot backend, deployed independently, communicating over HTTP REST.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 — Vercel)                              │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ Sidebar  │   │   Canvas     │   │   Agent Panel      │  │
│  │ Palette  │──▶│ (React Flow) │──▶│ (Chat + Security)  │  │
│  └──────────┘   └──────────────┘   └────────────────────┘  │
│                        │                    │               │
│                 Zustand Store        useAgentChat           │
│                        │                    │               │
│              ReactFlowToBackendParser────────┘              │
│                        │                                    │
└────────────────────────┼────────────────────────────────────┘
                         │ HTTP POST (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Java Spring Boot 3 (Railway)                               │
│                                                             │
│  RateLimitFilter → CorsConfig → Controllers                 │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │  AgentController│    │  ValidationController        │   │
│  │  /api/agent     │    │  /api/validate               │   │
│  └────────┬────────┘    └──────────────┬───────────────┘   │
│           │                            │                    │
│  AgentService                ValidationEngine              │
│  PromptBuilder               CycleDetector                 │
│           │                  TopologicalSorter             │
│  LangChain4j                 SecurityRuleRegistry          │
│           │                  14× Strategy classes          │
│           ▼                                                 │
│  Anthropic claude-sonnet-4-6 API                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. App Flow

### 2.1 Node Drop → Agent Response
1. User drags palette item → `onDrop` fires in `PipelineCanvas.tsx`
2. `useDragDrop.onDrop()` reads NodeType from DataTransfer, converts coordinates via `reactFlowInstance.screenToFlowPosition()`
3. `usePipelineStore.addNode(type, position, "user")` creates the node with `origin: "user"`
4. `layoutPipeline()` runs Dagre on free nodes, updates positions
5. Zustand subscription in `useAgentChat` detects new node with `origin === "user"`
6. `triggerOnDrop()` calls `sendMessage()` after 300ms debounce
7. `sendMessage()` calls `parseForBackend()` → strips UI fields → POSTs to `/api/agent`
8. `RateLimitFilter` checks token bucket → passes
9. `AgentController.chat()` validates DTO → delegates to `AgentService.processChat()`
10. `PromptBuilder` serialises pipeline to JSON, fills `system-prompt.st`
11. `CloudGuardAiService.chat()` (LangChain4j proxy) calls Anthropic API
12. `AgentService.parseAgentResponse()` parses JSON reply into `AgentResponseDTO`
13. Response returns to frontend → `appendMessage()` adds agent reply
14. If `suggestion` is present → `SuggestionCard` renders with Accept / Dismiss

### 2.2 Validate Pipeline → Report
1. User clicks "Validate pipeline" → `validatePipeline()` in `TopBar.tsx`
2. `parseForBackend()` strips UI fields → POSTs to `/api/validate`
3. `ValidationEngine.validate()` runs:
   - `buildAdjacencyList()` — O(V+E) graph construction
   - `CycleDetector.hasCycle()` — DFS, throws 422 if cycle found
   - `TopologicalSorter.sort()` — Kahn's BFS, returns execution order
   - For each node: `SecurityRuleRegistry.getStrategy(type).validate()` — 0–3 findings per node
   - `ScoreEngine.compute()` — weighted scoring (Critical −15, High −8, Medium −3)
4. `ValidationReportDTO` returned → stored in Zustand → panel switches to GLOBAL_REPORT
5. `ValidationReport.tsx` renders score cards + expandable findings

### 2.3 Accept AI Suggestion → Node Added
1. User clicks Accept on `SuggestionCard`
2. `usePipelineStore.acceptSuggestion(suggestion, reactFlowInstance)` fires
3. Reads viewport centre via `reactFlowInstance.getViewport()` for spatial anchor
4. Validates `suggestion.nodeType` against `NODE_REGISTRY` — bails out gracefully if unknown
5. `addNode(type, viewportCentre, "agent")` — `origin: "agent"` prevents chat loop
6. `addEdge(suggestion.edge)` if connection included
7. `layoutPipeline()` re-runs — new node gets clean Dagre position
8. Zustand subscription in `useAgentChat` detects new node but skips it (`origin === "agent"`)

---

## 3. Tech Stack — Detailed

### Frontend

| Technology | Version | Why |
|---|---|---|
| Next.js | 14.x | App Router, server components, Vercel-native deployment |
| TypeScript | 5.x | Type safety across all components, hooks, and API contracts |
| React Flow | 11.x | Node-based canvas, custom nodes, handles, edge rendering |
| Zustand | 4.x | Minimal global state — no boilerplate, no context hell |
| Dagre | 0.8.x | Sugiyama layered graph layout for auto-positioning nodes |
| CSS Custom Properties | — | Design tokens for light/dark mode — no Tailwind, no CSS-in-JS |

### Backend

| Technology | Version | Why |
|---|---|---|
| Java | 21 | Virtual threads (Project Loom), records, modern language features |
| Spring Boot | 3.3.x | Auto-configuration, embedded Tomcat, Bean Validation, DevTools |
| Maven | 3.9.x | Dependency management, build lifecycle |
| LangChain4j | 0.32.x | `@AiService` proxy pattern — cleanest Java LLM integration |
| LangChain4j Anthropic | 0.32.x | Anthropic Claude provider for LangChain4j |
| Bucket4j | 8.x | Token-bucket rate limiting per IP — no Redis needed for MVP |
| Lombok | 1.18.x | `@Data`, `@Builder`, `@Slf4j` — reduce DTO boilerplate |
| Jackson | 2.17.x | JSON serialisation / deserialisation |

### Infrastructure

| Service | What it hosts | Cost |
|---|---|---|
| Vercel | Next.js frontend | Free hobby plan |
| Railway | Spring Boot JAR | Free $5/month credit |
| Anthropic API | claude-sonnet-4-6 | Pay-per-token (~$3/1M input tokens) |

---

## 4. Folder & File Structure

```
cloudguard-pipeline/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout — fonts, CSS vars, metadata
│   │   │   ├── page.tsx                # / → redirect to /builder
│   │   │   └── builder/
│   │   │       └── page.tsx            # Main builder route — grid layout shell
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── PipelineCanvas.tsx  # React Flow wrapper, all RF event handlers
│   │   │   │   ├── PipelineNode.tsx    # Custom node card renderer
│   │   │   │   ├── SecurityStrip.tsx   # 3 coloured dots on each node
│   │   │   │   └── EmptyHint.tsx       # "Drag components here" placeholder
│   │   │   ├── sidebar/
│   │   │   │   ├── ComponentSidebar.tsx# Left panel — grouped palette
│   │   │   │   └── PaletteItem.tsx     # Draggable service card
│   │   │   ├── agent/
│   │   │   │   ├── AgentPanel.tsx      # Right panel shell — view switcher
│   │   │   │   ├── ChatArea.tsx        # Scrollable message list
│   │   │   │   ├── ChatMessage.tsx     # Single message bubble
│   │   │   │   ├── SuggestionCard.tsx  # Accept / Dismiss AI suggestion
│   │   │   │   └── ChatInput.tsx       # Text input + send button
│   │   │   ├── security/
│   │   │   │   ├── SecurityPanel.tsx   # Per-node checklist (NODE_CHECKLIST view)
│   │   │   │   ├── SecurityItem.tsx    # Single checklist row
│   │   │   │   └── ValidationReport.tsx# Full report (GLOBAL_REPORT view)
│   │   │   └── ui/
│   │   │       ├── TopBar.tsx          # Nav bar — title, validate, clear buttons
│   │   │       ├── Button.tsx          # Reusable button (default | primary)
│   │   │       └── Badge.tsx           # Pill badge (severity, category labels)
│   │   ├── hooks/
│   │   │   ├── usePipelineStore.ts     # Zustand store — all pipeline state + actions
│   │   │   ├── useAgentChat.ts         # Chat history, store subscriptions, API calls
│   │   │   └── useDragDrop.ts          # Palette drag state management
│   │   ├── lib/
│   │   │   ├── api.ts                  # fetch wrappers — postAgent, postValidate
│   │   │   ├── layoutPipeline.ts       # Dagre auto-layout utility
│   │   │   ├── nodeRegistry.ts         # 14 AWS service definitions + sidebar groups
│   │   │   ├── securityRules.ts        # Client-side rule reference (display only)
│   │   │   └── ReactFlowToBackendParser.ts # Pure function — strips UI fields
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript interfaces mirroring Java DTOs
│   │   └── styles/
│   │       └── globals.css             # CSS custom properties — design tokens
│   ├── .env.local                      # NEXT_PUBLIC_API_URL — never commit
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── src/main/java/com/cloudguard/pipeline/
│   │   ├── CloudGuardApplication.java  # @SpringBootApplication entry point
│   │   ├── config/
│   │   │   ├── CorsConfig.java         # WebMvcConfigurer — CORS from FRONTEND_URL
│   │   │   └── LangChain4jConfig.java  # @Bean — AnthropicChatModel + AiService proxy
│   │   ├── controller/
│   │   │   ├── AgentController.java    # POST /api/agent
│   │   │   └── ValidationController.java# POST /api/validate
│   │   ├── dto/
│   │   │   ├── AgentRequestDTO.java
│   │   │   ├── AgentResponseDTO.java
│   │   │   ├── PipelineStateDTO.java
│   │   │   ├── PipelineNodeDTO.java
│   │   │   ├── PipelineEdgeDTO.java
│   │   │   ├── ChatMessageDTO.java
│   │   │   ├── SuggestionDTO.java
│   │   │   ├── ValidationRequestDTO.java
│   │   │   ├── ValidationReportDTO.java
│   │   │   ├── FindingDTO.java
│   │   │   └── ErrorResponseDTO.java
│   │   ├── service/
│   │   │   ├── AgentService.java       # processChat — prompt build + LangChain4j call
│   │   │   ├── PromptBuilder.java      # buildSystemContext, serializePipeline
│   │   │   ├── ValidationEngine.java   # validate — orchestrates graph + rule checks
│   │   │   └── ScoreEngine.java        # compute — weighted 0-100 scoring
│   │   ├── ai/
│   │   │   └── CloudGuardAiService.java# LangChain4j @AiService interface
│   │   ├── engine/
│   │   │   ├── CycleDetector.java      # DFS cycle detection
│   │   │   ├── TopologicalSorter.java  # Kahn's BFS topological sort
│   │   │   ├── SecurityRuleRegistry.java# NodeType → Strategy dispatch map
│   │   │   ├── SecurityValidationStrategy.java # Interface
│   │   │   └── strategies/
│   │   │       ├── S3ValidationStrategy.java
│   │   │       ├── LambdaValidationStrategy.java
│   │   │       ├── KinesisValidationStrategy.java
│   │   │       ├── SqsValidationStrategy.java
│   │   │       ├── GlueValidationStrategy.java
│   │   │       ├── EmrValidationStrategy.java
│   │   │       ├── RdsValidationStrategy.java
│   │   │       ├── DynamoValidationStrategy.java
│   │   │       ├── RedshiftValidationStrategy.java
│   │   │       ├── IamValidationStrategy.java
│   │   │       ├── KmsValidationStrategy.java
│   │   │       ├── WafValidationStrategy.java
│   │   │       ├── CloudWatchValidationStrategy.java
│   │   │       └── GuardDutyValidationStrategy.java
│   │   └── middleware/
│   │       ├── RateLimitFilter.java    # Bucket4j token bucket per IP
│   │       └── GlobalExceptionHandler.java # @ControllerAdvice — 400/422/500
│   ├── src/main/resources/
│   │   ├── application.yml             # Server port, logging, spring config
│   │   ├── application-local.yml       # Local dev secrets — never commit
│   │   └── prompts/
│   │       └── system-prompt.st        # LangChain4j StringTemplate system prompt
│   └── pom.xml
│
├── .gitignore
└── README.md
```

---

## 5. Data Flow Contracts

### API endpoints

```
POST /api/agent
Request:  { message: string, pipelineState: { nodes[], edges[] }, history: ChatMessage[] }
Response: { reply: string, suggestion?: { title, body, accept, nodeType?, edge? }, securityFlags: string[] }

POST /api/validate
Request:  { nodes: PipelineNodeDTO[], edges: PipelineEdgeDTO[] }
Response: { score: int, critical: Finding[], high: Finding[], medium: Finding[], passed: string[], executionSequence: string[] }
```

### Key type contracts

```typescript
// Frontend — PipelineNode (React Flow node data)
interface PipelineNodeData {
  type: NodeType
  label: string
  desc: string
  color: string
  abbrev: string
  checks: SecurityCheck[]
  origin: 'user' | 'agent'          // prevents chat trigger loop
  isManuallyPositioned: boolean      // prevents Dagre overwrite
}

// Shared — what crosses the wire (after parseForBackend strips UI fields)
interface PipelineNodeDTO {
  id: string
  type: string   // lowercase: "s3" | "lambda" | "kinesis" | ...
  label: string
  desc: string
  // NO x, y, width, height, selected, dragging, origin, isManuallyPositioned
}
```