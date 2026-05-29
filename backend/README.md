# JarvisOS Backend API

Node.js + Express + TypeScript server for the JarvisOS local AI assistant. Wires the **agent** planner/executor, **Ollama** (Gemma), **SQLite memory**, and the shared **tool registry**.

## Prerequisites

- Node.js 20+
- [Ollama](https://ollama.com) running locally
- A Gemma model pulled, e.g.:

```bash
ollama pull gemma4:e4b
```

## Configuration

Copy the root `.env.example` to `.env` at the project root:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3847` | HTTP listen port |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama API |
| `OLLAMA_MODEL` | `gemma4:e4b` | Model name (`gemma4:e4b`, etc.) |
| `DATABASE_PATH` | `./database/jarvisos.db` | SQLite file |
| `CORS_ORIGINS` | Electron dev URLs | Comma-separated origins |

## Run

From the **project root**:

```bash
cp .env.example .env
npm install
npm run build:core   # tools → memory → agent → backend
npm run dev:backend  # watch mode on PORT 3847
# or from backend/
npm run start        # node dist/index.js
```

From **backend/** only:

```bash
npm install
npm run build
npm run dev
```

## API Routes

Base URL: `http://127.0.0.1:3847`

### `GET /api/health`

Service and Ollama status.

```json
{
  "ok": true,
  "status": "ok",
  "version": "0.1.0",
  "ollama": {
    "connected": true,
    "model": "gemma4:e4b",
    "modelAvailable": true,
    "latencyMs": 12
  },
  "tools": { "count": 11, "names": ["file", "browser", "..."] }
}
```

### `POST /api/chat`

Full chat turn with optional plan + execute.

**Body**

```json
{
  "message": "Open Chrome and go to ACL Anthology",
  "conversationId": "optional-uuid",
  "executePlan": true
}
```

**Response**

```json
{
  "conversationId": "...",
  "response": "...",
  "plan": { "intent": "...", "steps": [...] },
  "execution": { "plan": {}, "steps": [], "summary": "..." }
}
```

### `POST /api/plan`

Plan only (no execution).

**Body:** `{ "intent": "Organize Downloads", "context": "optional" }`

**Response:** `{ "plan": { "intent", "steps", "response?" } }`

### `POST /api/execute`

Execute a plan via the tool registry.

**Body:** `{ "plan": { "intent", "steps": [...] } }`

**Response:** `{ "execution": { "plan", "steps", "summary" } }`

### `GET /api/memory/conversations`

List recent conversations.

### `GET /api/memory/conversations/:id`

Conversation + messages.

### `GET /api/memory/tasks`

List agent tasks.

### `GET /api/memory/kv?category=`

List key-value memory entries.

### `POST /api/memory/kv`

**Body:** `{ "key", "value", "category?" }`

### `DELETE /api/memory/kv/:key`

Delete a memory entry.

## Architecture

```
backend/src
  app.ts          Express + CORS + routes
  config.ts       env loading
  routes/         /api/*
  services/       DI container (agent, memory, tools)
agent/            Planner → Executor → toolRegistry
memory/           SQLite (conversations, messages, tasks, kv)
tools/            ToolRegistry contract (implementations added by tools agent)
prompts/          System prompts for planner, executor, chat
database/         schema.sql
```

## CORS

Configured for Electron/Vite dev servers on `localhost:5173` and `localhost:3000`. Add origins via `CORS_ORIGINS`.
