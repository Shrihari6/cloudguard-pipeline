# Rules.md
> CloudGuard Pipeline — Engineering Rules & Boundaries
> Version: 1.0.0 | Last updated: July 2026

These rules exist to prevent the exact bugs that were caught during architecture review.
Every rule has a reason. Do not skip them. Do not "temporarily" break them.

---

## 1. React / Frontend Rules

### Hooks
- ✅ Call hooks only inside React function components or custom hooks
- ✅ Custom hooks start with `use` — `usePipelineStore`, `useAgentChat`, `useDragDrop`
- ❌ **Never call a hook from inside a Zustand store action** — stores run outside the React tree
- ❌ Never call `useAgentChat.clearHistory()` from `usePipelineStore.clearCanvas()` — this was the Fix 1 bug
- ✅ Instead: use `usePipelineStore.subscribe()` inside `useAgentChat`'s `useEffect` to react to store changes

### State management
- ✅ All pipeline state lives in `usePipelineStore` (Zustand) — nodes, edges, selectedNodeId, activePanelView, validationReport
- ✅ Chat state lives in `useAgentChat` — messages, isLoading
- ✅ Drag state lives in `useDragDrop` — draggedType
- ❌ Never use `useState` for pipeline nodes or edges inside a component
- ❌ Never pass pipeline state as props down more than one level — use the store selectors
- ✅ Use Zustand selectors to subscribe to slices, not the full store: `usePipelineStore(s => s.nodes)`

### React Flow
- ✅ Define `nodeTypes` object **outside** the component using `useMemo` or at module level
- ❌ Never define `nodeTypes` inline inside the JSX — causes remount on every render
- ✅ Use `onNodeDragStop` to update position and set `isManuallyPositioned: true`
- ✅ Always pass a valid `position: { x, y }` when calling `addNode()` — never undefined
- ❌ Never let `acceptSuggestion()` call `addNode()` without computing a viewport anchor first

### Node origin — preventing the chat loop
- ✅ Every node has `origin: "user" | "agent"` in its data
- ✅ `addNode()` accepts optional `origin` param, defaults to `"user"`
- ✅ `acceptSuggestion()` passes `origin: "agent"`
- ✅ `triggerOnDrop()` in `useAgentChat` skips nodes where `origin === "agent"`
- ❌ Never trigger `sendMessage()` for an AI-inserted node — infinite loop

### Layout — Dagre
- ✅ Run `layoutPipeline()` after every graph mutation (addNode, addEdge, removeNode, removeEdge, acceptSuggestion)
- ✅ Split nodes into pinned (`isManuallyPositioned: true`) and free before running Dagre
- ✅ Pass pinned nodes to Dagre with `fixed: true` so edge routing works around them
- ❌ Never run Dagre on all nodes unconditionally — overwrites user-dragged positions

### Parser — ReactFlowToBackendParser.ts
- ✅ This file exports **only** `parseForBackend()` — a pure function
- ✅ Zero imports from React, zero store access, zero side effects
- ❌ Never put UI logic (toasts, loading state, store dispatch) in this file
- ✅ `validatePipeline()` orchestrator lives in `TopBar.tsx` — not here

---

## 2. Java / Backend Rules

### Controllers
- ✅ Controllers are thin — validate input, delegate to service, return response
- ❌ Never write business logic inside a controller method
- ✅ Always annotate DTO parameters with `@Valid @RequestBody`
- ✅ All exceptions are handled by `GlobalExceptionHandler.java` — never call `response.sendError()` from a controller

### Services
- ✅ `AgentService` does only one thing: build the prompt and call LangChain4j
- ✅ `ValidationEngine` does only one thing: orchestrate graph checks and return a report
- ❌ Never call the Anthropic API from `ValidationController` or `ValidationEngine` — validation is deterministic
- ✅ `PromptBuilder` is the only class allowed to read `system-prompt.st`

### Strategy Pattern
- ✅ Adding a new AWS service = adding one new `*ValidationStrategy.java` class
- ❌ Never modify `ValidationEngine.java` to add a new service — Open-Closed Principle
- ✅ Register new strategies in `SecurityRuleRegistry.java` STRATEGY_MAP only

### DTOs
- ✅ Use Java Records or Lombok `@Data` for all DTOs
- ✅ Use `@NotBlank` on all required String fields
- ✅ Use `@Valid` on nested DTOs (pipelineState, history list)
- ✅ Use `@Size(max = 50)` on the history list — prevents token budget overflow
- ❌ Never add business logic to a DTO class
- ❌ Never expose internal entity fields through DTOs

### LangChain4j / Anthropic
- ✅ Model: always `claude-sonnet-4-6`
- ✅ Max tokens: 1000 per turn
- ✅ `nodeType` in `SuggestionDTO` must be one of the 14 lowercase keys: `s3`, `lambda`, `kinesis`, `sqs`, `glue`, `emr`, `rds`, `dynamo`, `redshift`, `iam`, `kms`, `waf`, `cloudwatch`, `guardduty`
- ✅ The system prompt **must** explicitly list valid nodeType values to prevent casing errors
- ❌ Never let the AI decide node positions — positions are always computed by Dagre on the frontend
- ❌ Never send more than 12 conversation turns to the backend — use `messages.slice(-12)` in `sendMessage()`

### Rate limiting
- ✅ `/api/agent` — 60 requests / IP / hour
- ✅ `/api/validate` — 20 requests / IP / hour
- ✅ Use `X-Forwarded-For` header first, fall back to `request.getRemoteAddr()`
- ✅ Return HTTP 429 with `Retry-After: 60` header on limit exceeded

---

## 3. Security Boundaries

### API key
- ✅ `ANTHROPIC_API_KEY` lives in `application-local.yml` (local) and Railway env vars (prod)
- ❌ Never hardcode the API key anywhere in source code
- ❌ Never return the API key in any HTTP response
- ❌ Never log the API key
- ❌ Never put the API key in `application.yml` (committed to git) — only in `application-local.yml` (gitignored)

### CORS
- ✅ `CorsConfig.java` allows only `FRONTEND_URL` env var — no wildcards in production
- ❌ Never set `allowedOrigins("*")` in production

### Input validation
- ✅ All request bodies validated with `@Valid` before service methods run
- ✅ `parseForBackend()` is the only code that touches React Flow internals — never send raw RF nodes to the backend
- ❌ Never trust `suggestion.nodeType` from the AI without checking it against `NODE_REGISTRY`

### `.gitignore` — must include
```
frontend/.env.local
backend/src/main/resources/application-local.yml
backend/target/
node_modules/
*.jar
.DS_Store
```

---

## 4. Libraries — Use / Avoid

### Frontend — use these
| Library | Use for |
|---|---|
| `reactflow` | Canvas, custom nodes, handles, edges |
| `zustand` | Global state — pipeline, chat, UI view |
| `dagre` | Auto-layout — Sugiyama layered graph |
| CSS Custom Properties | All theming — no Tailwind, no CSS-in-JS |

### Frontend — do not use
| Library | Why not |
|---|---|
| `redux` / `redux-toolkit` | Overkill — Zustand is cleaner for this use case |
| `tailwindcss` | We use custom CSS properties for the design system |
| `styled-components` / `emotion` | CSS-in-JS adds complexity and runtime cost |
| `axios` | Fetch is sufficient — no need for an extra HTTP library |
| `react-query` | No server state caching needed in MVP — simple fetch is enough |
| `d3` | Dagre handles layout — D3 is not needed for this canvas |
| `socket.io` | Real-time collaboration is post-MVP |

### Backend — use these
| Library | Use for |
|---|---|
| `langchain4j-anthropic` | Anthropic API proxy via `@AiService` |
| `spring-boot-starter-validation` | `@Valid`, `@NotBlank`, `@Size` on DTOs |
| `bucket4j-core` | Token-bucket rate limiting |
| `lombok` | `@Data`, `@Builder`, `@Slf4j` on DTOs and services |
| `jackson-databind` | JSON serialisation (included via Spring Web) |

### Backend — do not use
| Library | Why not |
|---|---|
| `openai-java` | Wrong provider — we use Anthropic |
| `spring-data-jpa` | No database in MVP |
| `spring-security` | No auth in MVP — rate limiting via Bucket4j is sufficient |
| `flyway` / `liquibase` | No database in MVP |
| `redis` / `lettuce` | Rate limiting is in-memory for MVP |
| `webflux` | Reactive stack adds complexity — Virtual Threads handle concurrency |

---

## 5. Error Handling Rules

### Frontend
- ✅ `postAgent()` and `postValidate()` throw `ApiError` on non-2xx
- ✅ Catch 429 specifically in `sendMessage()` — show "Rate limit reached. Try again in a minute." toast
- ✅ Catch network errors — show "Connection failed. Is the backend running?" toast
- ✅ `acceptSuggestion()` checks `NODE_REGISTRY[suggestion.nodeType]` — logs warning and returns if unknown type
- ❌ Never let an error silently swallow — always log to console in development

### Backend
- ✅ `GlobalExceptionHandler` handles: `MethodArgumentNotValidException` → 400, `InvalidPipelineTopologyException` → 422, all others → 500
- ✅ 500 responses never expose stack traces — generic message only
- ✅ `AgentService.parseAgentResponse()` falls back to plain text reply if JSON parsing fails — never throws to the controller
- ❌ Never return Java exception class names to the frontend

---

## 6. AI Agent Behaviour Rules

These rules govern what the agent is allowed to do.

| Rule | Boundary |
|---|---|
| Suggestion nodeType | Must be one of 14 valid lowercase AWS service keys |
| Suggestion action | Can only suggest adding a node or adding an edge — never removing |
| History window | Maximum 12 turns sent per request |
| Pipeline JSON | Stripped of all UI fields by `parseForBackend()` before sending |
| Auto-trigger | Only fires for `origin === "user"` nodes — not AI-inserted ones |
| Acceptance | Agent never acts autonomously — every suggestion requires explicit user Accept |
| Validation | Never calls Anthropic API during validation — deterministic only |