# Glossary

Terms used across the JarvisOS monorepo, API, and UI. Definitions reflect **current implementation** in source, not future PRD items unless noted.

---

## Product and architecture

| Term | Definition |
| ---- | ---------- |
| **JarvisOS** | The project name: a local macOS AI assistant monorepo (`jarvisos` on npm). |
| **MVP** | Version `0.1.0` scope: chat, planning, 11 tools, SQLite memory, voice API, research summarize, Electron UI. |
| **Monorepo** | Single git repo with npm workspaces: `frontend`, `backend`, `agent`, `tools`, `memory`, `voice`, `documents`. |
| **Offline-first** | Core reasoning uses local **Ollama**; no cloud LLM required for default chat/plan paths. Optional cloud STT (Deepgram) only if configured. |
| **PAD** | Internal PRD codename: “Project PAD: Local Jarvis for Mac” ([prd.md](../prd.md)). |

---

## Reasoning and agent

| Term | Definition |
| ---- | ---------- |
| **Ollama** | Local LLM server (default `http://127.0.0.1:11434`). JarvisOS calls its HTTP API for chat, planning, and summarization. |
| **`gemma4:e4b`** | Default `OLLAMA_MODEL` — Gemma 4 E4B quantized tag from `ollama pull`. |
| **Agent** | `@jarvisos/agent` package: planner, executor, and `AgentOrchestrator` coordinating Ollama + tools + memory. |
| **Planner** | Component that turns user intent into a structured **plan** (JSON steps with tool names and parameters). Uses planner system prompts from `prompts/`. |
| **Executor** | Runs plan steps sequentially via **ToolRegistry**, then may ask Ollama for a short summary. |
| **AgentOrchestrator** | High-level API used by backend routes: `chat()`, `plan()`, `execute()`, `run()`. |
| **Plan** | Object with `intent`, optional direct `response`, and `steps[]` each referencing a **tool** name and `parameters`. |
| **Heuristic routing** | Stream endpoint (`chat-stream.ts`) and orchestrator use keyword patterns to decide “actionable” vs pure Q&A messages. |

---

## Tools

| Term | Definition |
| ---- | ---------- |
| **Tool** | A named capability with JSON parameter schema and `execute()` — implements one macOS or file operation. |
| **ToolRegistry** | `tools/src/registry.ts` — registers tools, lists schemas for the planner/UI, and dispatches `execute(name, params)`. |
| **Tool result** | `{ success, data?, error?, durationMs? }` returned to the agent and UI. |

### Tool registry

Eleven tools are registered in `tools/src/registry.ts` (default export list):

| Tool name | Purpose (summary) |
| --------- | ----------------- |
| `file` | Read, move, delete, rename files under allowed paths |
| `folder_scan` | Scan and classify folder contents |
| `pdf` | PDF read/summarize via tool path |
| `app_launcher` | Open macOS applications |
| `browser` | Open URLs / browser actions |
| `terminal` | Run shell commands (safety checks in `tools/src/utils/safety.ts`) |
| `notes` | Create and search local notes |
| `system` | Volume, dark mode, Wi‑Fi settings, etc. |
| `calendar` | Calendar.app events (create/update) |
| `email` | Mail.app drafts |
| `presentation` | Generate HTML presentation decks under `~/JarvisOS/presentations/` |

List at runtime: `GET /api/tools` or `/api/health` tool section.

---

## Memory and knowledge

| Term | Definition |
| ---- | ---------- |
| **MemoryStore** | `@jarvisos/memory` SQLite layer: conversations, messages, tasks, KV **memory facts**. |
| **Conversation** | A chat session row in SQLite; messages linked by `conversation_id`. |
| **Memory fact** | Key-value long-term fact in `memory_facts` table. |
| **RAG** | Retrieval-augmented generation: `memory/rag/` ingests text chunks and answers queries via vector similarity. |
| **Knowledge base** | `ingestDocument()` / `queryKnowledge()` in `memory/rag/knowledge-base.ts`, exposed as `POST /api/knowledge/*`. |
| **Vector store** | Abstraction in `memory/rag/vector-store.ts`; default **`InMemoryVectorStore`** (`backend: "memory"`). |
| **Embeddings** | Local embedding vectors in `memory/rag/embeddings.ts` used for cosine similarity search (stub-quality, not external API). |
| **Chunk** | Text segment (~800 chars) created on ingest for RAG indexing. |
| **`JARVIS_VECTOR_BACKEND`** | Env flag; `lancedb` is recognized but currently **falls back to in-memory** with a warning. |

---

## Voice and documents

| Term | Definition |
| ---- | ---------- |
| **STT** | Speech-to-text; `@jarvisos/voice` via `POST /api/voice/transcribe`. |
| **Deepgram** | Optional cloud STT when `DEEPGRAM_API_KEY` is set. |
| **whisper.cpp** | Optional local STT fallback (`WHISPER_CLI`, `WHISPER_MODEL_PATH`). |
| **Documents package** | `@jarvisos/documents` — PDF text extraction and batch summarization for research routes. |
| **Research summarize** | `POST /api/research/summarize` — PDF batch pipeline through documents + Ollama. |

---

## API and UI

| Term | Definition |
| ---- | ---------- |
| **Backend / API** | `@jarvisos/backend` Express app; default port **3847**. |
| **`/api/health`** | Ollama connectivity, model availability, tool registry snapshot. |
| **`POST /api/chat`** | Non-streaming chat with optional plan execution; used by the main **Chat** page. |
| **`POST /api/chat/stream`** | SSE stream: events `token`, `plan`, `step_start`, `step_done`, `error`, `done`. Used by **Voice** UI (`api.streamChatFull`). |
| **`POST /api/plan`** | Plan-only (no execution). |
| **`POST /api/execute`** | Execute a provided plan object. |
| **`POST /api/agent/stream`** | Agent task streaming (Agent page). |
| **Vite** | Dev server for React UI on **5173**; proxies `/api` to the backend. |
| **Electron** | Desktop shell in `frontend/dist-electron/`; packages to DMG via `electron-builder`. |
| **OfflineBanner** | UI component when API health check fails after load. |

---

## Files and paths

| Term | Definition |
| ---- | ---------- |
| **`database/jarvisos.db`** | Default SQLite path (`DATABASE_PATH`). |
| **`database/schema.sql`** | Tables: conversations, messages, memory_facts, documents, tasks, etc. |
| **`data/uploads/`** | Multipart upload target (`UPLOADS_DIR`). |
| **`~/JarvisOS/`** | User-facing output root for presentations and some tool artifacts. |
| **`prompts/`** | `*.system.md` templates loaded by the agent (`loadPrompt`, `renderTemplate`). |

---

## Packaging and ops

| Term | Definition |
| ---- | ---------- |
| **`build:core`** | Build tools, memory, agent, backend — skip frontend. |
| **DMG** | macOS disk image from `frontend/npm run package`; **UI only**, no bundled API/Ollama. |
| **`demo.sh`** | Smoke script: health, tools, plan, chat, sample tool execution. |
| **Ad-hoc signing** | Local Electron build without Apple notarization; first launch may require **Open** from Finder. |

---

## PRD / future (not fully implemented)

| Term | Definition |
| ---- | ---------- |
| **LanceDB** | Planned durable vector backend (PRD + env hook; adapter not shipped). |
| **Qdrant** | Mentioned in PRD as future vector store option. |
| **Multi-agent OS** | PRD Version 5+ vision — not in MVP codebase. |
| **`POST /api/presentations/generate`** | HTTP stub outline; use **`presentation` tool** for real output. |

---

## See also

- [01-project-overview.md](./01-project-overview.md)  
- [02-getting-started.md](./02-getting-started.md)  
- [04-roadmap-and-status.md](./04-roadmap-and-status.md)
