# Getting started

This guide walks through prerequisites, installation, environment configuration, and running the JarvisOS stack in development — including the optional Electron shell.

For the shortest path, use [QUICKSTART.md](../QUICKSTART.md) first, then return here for scripts and configuration detail.

---

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **macOS** | Primary target; tools use AppleScript, `open`, and user home folders |
| **Node.js 20+** | Required by root `package.json` `engines` |
| **Ollama** | Local LLM server; default model **`gemma4:e4b`** |
| **whisper.cpp** (optional) | Local STT when `DEEPGRAM_API_KEY` is not set |
| **Python 3 + PyMuPDF** (optional) | Stronger PDF text extraction in `@jarvisos/documents` |

Install Ollama from [ollama.com](https://ollama.com) or `brew install ollama`.

---

## Install

### Option A — setup script (recommended)

```bash
git clone <your-repo-url> jarvisos
cd jarvisos
chmod +x scripts/setup.sh scripts/demo.sh
./scripts/setup.sh
```

`setup.sh` runs `npm install`, creates `.env` from `.env.example` if missing, and builds workspaces.

### Option B — manual

```bash
cp .env.example .env
npm install
npm run build
```

`postinstall` rebuilds `better-sqlite3` for your Node version. If the backend fails with a native module version mismatch:

```bash
npm rebuild better-sqlite3
```

### Pull the default Ollama model

In a separate terminal:

```bash
ollama serve          # if not already running
ollama pull gemma4:e4b
ollama list | grep gemma4
```

Model options: [models/README.md](../models/README.md).

On first backend start, SQLite applies `database/schema.sql` to `database/jarvisos.db` (path configurable via `DATABASE_PATH`).

---

## Environment variables

Copy [.env.example](../.env.example) to `.env` at the **repo root**. The backend loads it via `backend/src/config.ts` (`dotenv`).

**Never commit `.env` or paste real API keys into documentation.**

### Backend and Ollama

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `3847` | Express API listen port |
| `NODE_ENV` | `development` | Runtime mode |
| `DATABASE_PATH` | `./database/jarvisos.db` | SQLite file for conversations and memory |
| `UPLOADS_DIR` | `./data/uploads` | Destination for `POST /api/files/upload` |
| `CORS_ORIGINS` | localhost Vite ports | Comma-separated allowed origins (optional) |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama API (agent / backend) |
| `OLLAMA_MODEL` | `gemma4:e4b` | Model tag from `ollama pull` |
| `OLLAMA_NUM_GPU` | `99` | GPU layers for Apple Silicon (via Ollama options) |
| `OLLAMA_NUM_CTX` | `8192` | Context window size |
| `OLLAMA_FLASH_ATTN` | enabled unless `false` | Flash attention for M-series |

### Voice (speech-to-text)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DEEPGRAM_API_KEY` | empty | Cloud STT when set ([Deepgram](https://console.deepgram.com)) |
| `WHISPER_CLI` | `whisper` | whisper.cpp binary name or path (fallback) |
| `WHISPER_MODEL_PATH` | — | GGML model path for whisper.cpp `-m` |

### Documents (PDF)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Used by `@jarvisos/documents` summarize |
| `PYTHON` | `python3` | PyMuPDF extraction fallback |

### Frontend / Electron

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `VITE_API_URL` | `http://127.0.0.1:3847` | API base for production / packaged UI builds |
| `JARVIS_API_URL` | — | Override for Electron health checks and `demo.sh` |
| `JARVIS_SPAWN_BACKEND` | — | Dev only: set to `1` so Electron spawns `dev:backend` |

### RAG (optional)

| Variable | Effect |
| -------- | ------ |
| `JARVIS_VECTOR_BACKEND=lancedb` | Requests LanceDB; **currently falls back to in-memory** with a console warning (see `memory/rag/vector-store.ts`) |

---

## npm scripts (root)

Defined in root [package.json](../package.json):

| Script | Command | Purpose |
| ------ | ------- | ------- |
| `setup` | `bash scripts/setup.sh` | Install + env + build |
| `dev` | concurrent API + Vite | **Recommended** full stack |
| `dev:backend` | `@jarvisos/backend` dev | API only on `:3847` |
| `dev:frontend` | `@jarvisos/frontend` dev | Vite only on `:5173` |
| `build` | all workspaces | TypeScript + Vite + Electron compile |
| `build:core` | tools, memory, agent, backend | API stack without frontend |
| `typecheck` | `build:core` + workspace typecheck | CI-style check |
| `test` | all workspace tests | Vitest across packages |
| `demo` | `scripts/demo.sh` | Health, tools, plan, chat smoke test |
| `electron:dev` | frontend workspace | Electron + Vite (see below) |
| `voice:build` | `@jarvisos/voice` | Rebuild voice package |
| `documents:build` | `@jarvisos/documents` | Rebuild documents package |

---

## Run development stack

### 1. Start Ollama

```bash
ollama serve
```

Verify:

```bash
curl -s http://127.0.0.1:11434/api/tags | head
```

### 2. Start API + browser UI

From repo root:

```bash
npm run dev
```

| Service | URL |
| ------- | --- |
| Backend API | `http://127.0.0.1:3847` |
| Vite UI | `http://localhost:5173` (proxies `/api` → backend) |

Health check:

```bash
curl -s http://127.0.0.1:3847/api/health
```

### 3. Split terminals (optional)

```bash
npm run dev:backend    # terminal 1
npm run dev:frontend   # terminal 2
```

### 4. First chat

1. Open [http://localhost:5173](http://localhost:5173).
2. Go to **Chat** in the sidebar.
3. Send a message, e.g. `What tools do you have?`

---

## Electron desktop shell

The frontend workspace runs Vite and Electron together:

```bash
npm run electron:dev -w @jarvisos/frontend
# or from repo root:
npm run electron:dev
```

**Behavior:**

- Electron main process calls `GET /api/health` on port **3847** before showing the window.
- If the API is down, a native dialog explains how to start the backend.

**Auto-start API in dev only:**

```bash
JARVIS_SPAWN_BACKEND=1 npm run electron:dev -w @jarvisos/frontend
```

Align ports if you change `PORT`:

```env
PORT=3847
VITE_API_URL=http://127.0.0.1:3847
# JARVIS_API_URL=http://127.0.0.1:3847
```

The packaged `.app` / DMG does **not** bundle or start the Node API — run the backend separately (see [04-roadmap-and-status.md](./04-roadmap-and-status.md)).

---

## Production-oriented commands

### Run API only (after build)

```bash
npm run build:core
npm run start -w @jarvisos/backend
```

### Build macOS DMG (UI only)

```bash
npm run build:core
cd frontend
npm run package
```

Output: `frontend/release/JarvisOS-<version>-arm64.dmg` on Apple Silicon.

Set `VITE_API_URL` before packaging so the built UI points at your API. Unsigned builds: right-click the app → **Open** the first time.

---

## Demo and smoke tests

With the backend running:

```bash
npm run demo
# or
./scripts/demo.sh
```

The script checks `/api/health`, lists tools, exercises plan/chat routes, and runs a sample tool call.

---

## Troubleshooting

| Symptom | What to try |
| ------- | ----------- |
| Ollama unreachable | `ollama serve`; `curl http://127.0.0.1:11434/api/tags` |
| Model missing | `ollama pull gemma4:e4b`; set `OLLAMA_MODEL` in `.env` |
| Wrong API port | Default **3847** — align `PORT`, `VITE_API_URL`, `JARVIS_API_URL` |
| CORS from Vite | Add your origin to `CORS_ORIGINS` |
| Electron “backend offline” | `npm run dev` or `npm run dev:backend`; optional `JARVIS_SPAWN_BACKEND=1` |
| Voice transcription fails | Set `DEEPGRAM_API_KEY` or install whisper.cpp (`WHISPER_CLI`, `WHISPER_MODEL_PATH`) |
| PDF extraction weak | `pip install pymupdf`; ensure `PYTHON=python3` |
| Tool permission errors | **System Settings → Privacy & Security** — automation / files for Terminal or the app |
| Port already in use | Change `PORT` and all URL env vars (see [INTEGRATION.md](../INTEGRATION.md#port-conflicts)) |

More detail: [README.md](../README.md#troubleshooting).

---

## See also

- [01-project-overview.md](./01-project-overview.md) — architecture and scope  
- [03-glossary.md](./03-glossary.md) — API and domain terms  
- [INTEGRATION.md](../INTEGRATION.md) — full API table and package map
