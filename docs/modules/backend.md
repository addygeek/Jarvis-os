# @jarvisos/backend

Express HTTP API that wires the agent, tools, memory, voice, and document packages. Default listen address: `http://127.0.0.1:3847`.

## Purpose

- REST + SSE endpoints for chat, planning, tools, files, research, memory, knowledge, voice
- Dependency injection via `services/container.ts` (singleton `MemoryStore`, `OllamaClient`, `AgentOrchestrator`, `toolRegistry`)
- Loads configuration from repo-root `.env` (`src/config.ts`)

## Key paths

| Path | Role |
|------|------|
| `src/index.ts` | Server entry, graceful shutdown |
| `src/app.ts` | Express app, route mounting |
| `src/config.ts` | `PORT`, Ollama, DB path, CORS, uploads |
| `src/services/container.ts` | App DI container |
| `src/middleware/error-handler.ts` | `asyncHandler`, `HttpError` |
| `src/routes/` | Route modules (see table below) |
| `src/services/` | Search, research, organizer, code assistant, etc. |
| `src/types/api.ts` | Request/response bodies |

### Routes (`src/routes/`)

| Mount prefix | File | Notes |
|--------------|------|-------|
| `/api/health` | `health.ts` | Ollama + tools status |
| `/api/chat` | `chat.ts` | Non-streaming chat |
| `/api/chat/stream` | `chat-stream.ts` | SSE streaming (tokens, plan, steps) |
| `/api/plan` | `plan.ts` | Plan only |
| `/api/execute` | `execute.ts` | Execute plan JSON |
| `/api/tools` | `tools.ts` | List / debug execute |
| `/api/agent` | `agent.ts` | Agent task flow |
| `/api/agent/stream` | `stream.ts` | Agent SSE |
| `/api/memory` | `memory.ts` | Conversations, tasks, KV |
| `/api/knowledge` | `knowledge.ts` | RAG ingest/query stub |
| `/api/research` | `research.ts` | PDF summarize pipeline |
| `/api/files` | `files.ts` | Multipart upload |
| `/api/search` | `search.ts` | Desktop/Downloads/Documents search |
| `/api/voice` | *(from `@jarvisos/voice/server`)* | STT |
| `/api/presentations` | `presentations.ts` | Stub outline API |
| `/api/organize`, `/api/cleanup`, `/api/code` | respective files | macOS helpers |

## Dependencies

| Package | Usage |
|---------|--------|
| `@jarvisos/agent` | `AgentOrchestrator`, `OllamaClient` |
| `@jarvisos/tools` | `toolRegistry` |
| `@jarvisos/memory` | `MemoryStore` |
| `@jarvisos/voice` | `createVoiceRouter()` |
| `@jarvisos/documents` | Research summarization |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -w @jarvisos/backend` | `tsx watch src/index.ts` |
| `npm run start -w @jarvisos/backend` | `node dist/index.js` |
| `npm run build -w @jarvisos/backend` | `tsc` |
| `npm test -w @jarvisos/backend` | Vitest (`api.test.ts`, `agent.test.ts`) |

## How to extend

1. **New route:** Add `src/routes/my-feature.ts`, register in `src/app.ts`, use `getContainer()` for agent/memory/tools.
2. **New service:** Add under `src/services/`, inject from routes; keep business logic out of route handlers when it grows.
3. **Config:** Add fields to `src/config.ts` and `.env.example` (never commit secrets).

After agent/tools/memory changes, rebuild dependencies before restarting:

```bash
npm run build:core
npm run dev:backend
```

## Related links

- [agent.md](./agent.md) — orchestration used by chat/plan routes
- [tools.md](./tools.md) — tool registry
- [memory.md](./memory.md) — SQLite persistence
- [INTEGRATION.md](../../INTEGRATION.md#api-surface-mvp) — full API table
- [../development/02-testing.md](../development/02-testing.md) — backend tests
