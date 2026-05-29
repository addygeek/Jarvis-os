# JarvisOS — Integration Guide

End-to-end map of the monorepo: how packages connect, how to run the stack locally, and known MVP limitations.

## Architecture

```mermaid
flowchart LR
  subgraph ui [frontend]
    Vite[Vite React UI :5173]
    Electron[Electron shell optional]
  end

  subgraph api [backend :3847]
    Express[Express API]
  end

  subgraph core [packages]
    Agent[@jarvisos/agent]
    Tools[@jarvisos/tools]
    Memory[@jarvisos/memory]
    Docs[@jarvisos/documents]
    Voice[@jarvisos/voice]
  end

  subgraph external [local services]
    Ollama[Ollama :11434 gemma4:e4b]
    Whisper[whisper.cpp optional]
  end

  Vite --> Express
  Electron --> Express
  Express --> Agent
  Agent --> Ollama
  Agent --> Tools
  Agent --> Memory
  Express --> Docs
  Express --> Voice
  Voice --> Whisper
  Tools --> macOS[macOS APIs]
  Memory --> SQLite[(database/jarvisos.db)]
```

**Request flow (chat):** UI `POST /api/chat` → `AgentOrchestrator.chat()` → optional plan + tool execution → SQLite message persistence → JSON response.

**Request flow (action):** User message with action verbs → planner (Ollama JSON plan) → `Executor` runs tools via `ToolRegistry` → summary returned.

## Package map

| Workspace | NPM name | Purpose | Build output |
|-----------|----------|---------|--------------|
| `frontend/` | `@jarvisos/frontend` | React dashboard, chat, voice UI | `frontend/dist/` + `frontend/dist-electron/` |
| `backend/` | `@jarvisos/backend` | HTTP API, DI container | `backend/dist/` |
| `agent/` | `@jarvisos/agent` | Planner, executor, Ollama client | `agent/dist/` |
| `tools/` | `@jarvisos/tools` | macOS tool registry (11 tools) | `tools/dist/` |
| `memory/` | `@jarvisos/memory` | SQLite store + RAG stubs | `memory/dist/src/`, `memory/dist/rag/` |
| `voice/` | `@jarvisos/voice` | Whisper / transformers STT | `voice/dist/` |
| `documents/` | `@jarvisos/documents` | PDF parse + summarize | `documents/dist/` |
| `prompts/` | — | `*.system.md` templates | — |
| `database/` | — | `schema.sql`, migrations | — |
| `models/` | — | Ollama setup docs | — |
| `scripts/` | — | `setup.sh`, `demo.sh` | — |

## Default model and ports

| Setting | Value |
|---------|--------|
| **Ollama model** | `gemma4:e4b` (`OLLAMA_MODEL` in `.env`) |
| **Ollama API** | `http://127.0.0.1:11434` |
| **JarvisOS API** | `http://127.0.0.1:3847` (`PORT`) |
| **Vite dev UI** | `http://localhost:5173` (proxies `/api` → `:3847`) |

Pull the model once:

```bash
ollama pull gemma4:e4b
```

## Environment variables

Copy `.env.example` to `.env` at the repo root (loaded by `backend/src/config.ts`).

| Variable | Default | Used by |
|----------|---------|---------|
| `PORT` | `3847` | Backend listen port (`backend/src/config.ts`) |
| `NODE_ENV` | `development` | Backend logging |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Agent Ollama client |
| `OLLAMA_MODEL` | `gemma4:e4b` | Chat / planner / executor |
| `DATABASE_PATH` | `./database/jarvisos.db` | SQLite file |
| `UPLOADS_DIR` | `./data/uploads` | `POST /api/files/upload` destination |
| `CORS_ORIGINS` | localhost Vite ports | Backend CORS |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | `@jarvisos/documents` summarize |
| `PYTHON` | `python3` | PDF extraction fallback |
| `WHISPER_CLI` | `whisper` | `@jarvisos/voice` (optional) |
| `WHISPER_MODEL_PATH` | — | whisper.cpp `-m` model path |
| `VITE_API_URL` | `http://localhost:3847` | Frontend API base (production Electron build) |
| `JARVIS_API_URL` | — | Electron main health check override |
| `JARVIS_SPAWN_BACKEND` | — | Dev only: `1` = Electron spawns `dev:backend` child |

## Startup order

1. **Ollama** (required for real LLM replies):
   ```bash
   ollama serve
   ollama pull gemma4:e4b
   ```

2. **Install & build** (from repo root):
   ```bash
   ./scripts/setup.sh
   # or: npm install && npm run build
   ```

3. **Full stack** (recommended):
   ```bash
   npm run dev
   ```

4. **Split terminals** (optional):
   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

5. **Electron** (optional):
   ```bash
   npm run electron:dev -w @jarvisos/frontend
   ```

   Electron calls `GET http://127.0.0.1:3847/api/health` before showing the window. If the API is down, a native dialog explains how to start it.

   **Dev-only auto-start API** (optional, not default):
   ```bash
   JARVIS_SPAWN_BACKEND=1 npm run electron:dev -w @jarvisos/frontend
   ```

### Smoke tests

```bash
curl -s http://127.0.0.1:3847/api/health | jq .
curl -s -X POST http://127.0.0.1:3847/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","executePlan":false}' | jq .
```

## API surface (MVP)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Ollama + tool registry status |
| POST | `/api/chat` | Chat with optional plan execution (**no SSE stream**) |
| POST | `/api/plan` | Generate plan only |
| POST | `/api/execute` | Execute a plan |
| POST | `/api/voice/transcribe` | Speech-to-text (multipart `audio`) |
| GET | `/api/voice/health` | Voice engine status |
| GET | `/api/search?q=` | Desktop/Downloads/Documents file search |
| GET | `/api/files/search?q=` | Same as `/api/search` (alias for Files UI) |
| POST | `/api/files/upload` | Multipart upload (`files` field) → `UPLOADS_DIR` |
| GET | `/api/tools` | Tool list for UI |
| POST | `/api/research/summarize` | PDF batch summarization |
| POST | `/api/presentations/generate` | Stub outline only (use `presentation` tool for real decks) |
| GET/POST | `/api/memory/*` | Conversations, tasks, KV memory |
| POST | `/api/knowledge/*` | RAG ingest/query (in-memory stub) |

### Voice API — mounted

`backend/src/app.ts` mounts `@jarvisos/voice` at `/api/voice`:

```ts
app.use("/api/voice", createVoiceRouter());
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/voice/transcribe` | Multipart field `audio` (WebM/WAV) or JSON `{ "audioPath" }` → `{ "text" }` |
| GET | `/api/voice/health` | Engine: `whisper-cli`, `deepgram`, or `none` |

**Runtime:** Install [whisper.cpp](https://github.com/ggerganov/whisper.cpp) and set `WHISPER_CLI` / `WHISPER_MODEL_PATH`, or set `DEEPGRAM_API_KEY` for cloud STT. Build voice before backend if you change the package: `npm run voice:build`.

## Electron production

| Behavior | Details |
|----------|---------|
| Health check | Main process fetches `/api/health` on port **3847** before first window |
| Offline dialog | Native warning with `npm run dev` / `npm run dev:backend` instructions |
| React fallback | `OfflineBanner` in the UI if API goes away later |
| Dev spawn | `JARVIS_SPAWN_BACKEND=1` starts `npm run dev -w @jarvisos/backend` (dev only) |
| Packaged app | Does **not** bundle or start the API — backend is a separate process |

## macOS DMG packaging

From repo root:

```bash
npm run build:core
cd frontend
npm run package
```

Output: `frontend/release/JarvisOS-<version>-arm64.dmg` on Apple Silicon (via `electron-builder`, `directories.output` = `release`).

**Prerequisites:**

- macOS host (dmg target is mac-only in `frontend/package.json`)
- `npm run build:core` so agent/tools/memory/backend compile before UI build
- `frontend/build/icon.icns` — required by electron-builder (placeholder included; swap for production)
- `electronVersion` pinned in `frontend/package.json` `"build"` (npm workspaces hoist `electron` to the repo root)
- First open of unsigned app: **Open** from context menu or allow in System Settings
- Set `VITE_API_URL=http://127.0.0.1:3847` in `.env` before `npm run package` so the built UI points at the local API

**Verified output:** `frontend/release/JarvisOS-0.1.0-arm64.dmg` (ad-hoc signed, not notarized).

**Not included in DMG:** Node backend, Ollama, SQLite DB, or whisper models.

## PRD folder structure

Required directories from [prd.md](prd.md):

```
frontend/ backend/ agent/ tools/ memory/ voice/ documents/ models/ database/ prompts/
```

All are present. Supporting dirs: `scripts/`, `data/` (runtime), `node_modules/` (hoisted workspaces).

## Port conflicts

| Port | Service | Fix |
|------|---------|-----|
| **3847** | JarvisOS API (`PORT`) | Change `PORT` in `.env`; set `VITE_API_URL` and `JARVIS_API_URL` to match |
| **5173** | Vite dev UI | Change in `frontend/vite.config.ts`; add origin to `CORS_ORIGINS` |
| **11434** | Ollama | Set `OLLAMA_BASE_URL` / `OLLAMA_HOST` if using a non-default host |

If another process holds **3847**, the backend fails at listen — pick a free port and align all URL env vars.

## MVP checklist (verified 2026-05-29)

| Item | Status | Notes |
|------|--------|-------|
| Monorepo build (`npm run build`) | ✅ | All workspaces compile |
| Unit tests (`npm test`) | ✅ | backend (6), tools (22), agent (10) |
| Ollama `gemma4:e4b` in `.env` | ✅ | `OLLAMA_MODEL=gemma4:e4b` |
| `/api/health` + model available | ✅ | When `ollama serve` is running |
| `/api/chat` LLM reply | ✅ | Assistant text from Ollama |
| `/api/plan` | ✅ | ~30s on cold load; keep Ollama warm |
| Tool registry (11 tools) | ✅ | Listed in health |
| Desktop search, research, memory | ✅ | Demo steps 6–7, 12 |
| Voice router `/api/voice` | ✅ | STT needs `DEEPGRAM_API_KEY` or whisper.cpp |
| `scripts/demo.sh` | ✅ | Preflight health + 120s timeout on LLM steps |
| Electron DMG | ✅ | UI-only artifact in `frontend/release/` |
| Streaming chat | ❌ | No `/api/chat/stream` |
| Production RAG (LanceDB) | ❌ | In-memory stub unless `JARVIS_VECTOR_BACKEND=lancedb` |
| DMG bundles backend/Ollama | ❌ | Run API + Ollama separately |
| Code signing / notarization | ❌ | Ad-hoc local build |

## Remaining gaps (honest)

1. **Model** — Default `gemma4:e4b`; chat degrades gracefully if Ollama is off or the model is missing.
2. **RAG** — `memory/rag` is in-memory by default; LanceDB is opt-in via `JARVIS_VECTOR_BACKEND=lancedb`.
3. **Packaged distribution** — DMG ships UI only; no installer for backend/Ollama; no code signing.
4. **Streaming** — No `POST /api/chat/stream`; Ollama client uses `stream: false`. UI uses `POST /api/chat` only.
5. **Presentations API** — `POST /api/presentations/generate` is a stub; use the `presentation` **tool** for HTML decks under `~/JarvisOS/presentations/`.
6. **Security** — Terminal/file tools can modify the system — local dev / trusted machine only.

**Implemented (no longer gaps):** Voice API mount, `POST /api/files/upload`, and macOS tools `calendar` / `email` / `presentation` (Calendar.app, Mail drafts, local HTML decks).

## Build commands reference

```bash
# All workspaces that define a build script
npm run build

# API + agent stack (no frontend)
npm run build:core

# Individual packages
npm run build -w @jarvisos/backend
npm run build -w @jarvisos/frontend
npm run voice:build
npm run documents:build

# macOS DMG
cd frontend && npm run package
```

Node **20+** required (`engines` in root `package.json`).

If the backend fails with `better_sqlite3.node was compiled against a different Node.js version`, run:

```bash
npm rebuild better-sqlite3
```
