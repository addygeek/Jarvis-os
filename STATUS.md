# JarvisOS — Project Status

**Last verified:** 2026-05-29  
**Version:** 0.1.0 (MVP)

JarvisOS is a local, offline-first AI assistant for macOS: React/Electron UI, Express API, Ollama (`gemma4:e4b`), and macOS tool execution.

## How to run

**Prerequisites:** Node 20+, [Ollama](https://ollama.com), macOS (for tools).

```bash
# 1. Ollama
ollama serve
ollama pull gemma4:e4b

# 2. Install & build
cp .env.example .env   # OLLAMA_MODEL=gemma4:e4b is already the default
npm install
npm run build

# 3. API (port 3847)
npm run dev:backend
# or: npm run start -w @jarvisos/backend

# 4. UI (port 5173) — separate terminal
npm run dev:frontend
# or full stack: npm run dev

# 5. Smoke test
curl -s http://127.0.0.1:3847/api/health | jq .
./scripts/demo.sh
```

**Ports:** API `3847`, Vite `5173`, Ollama `11434`. See [INTEGRATION.md](INTEGRATION.md#port-conflicts) if something is already bound.

## What's done (MVP)

- **Monorepo** — 7 workspaces: frontend, backend, agent, tools, memory, voice, documents
- **Chat & planning** — Ollama `gemma4:e4b`, tool execution, SQLite conversation memory
- **11 macOS tools** — files, apps, terminal, PDF, calendar/email/presentation (local outputs)
- **Research** — PDF summarize pipeline (`/api/research/summarize`)
- **Voice API** — mounted at `/api/voice` (Deepgram or whisper.cpp)
- **Electron** — dev shell + `JarvisOS-0.1.0-arm64.dmg` (UI only; API runs separately)
- **Tests** — 38 unit tests across backend, tools, agent (`npm test`)

## Verification snapshot

| Check | Result |
|-------|--------|
| `npm run build` | Pass |
| `npm test` | Pass (38 tests) |
| `/api/health` | `gemma4:e4b`, `modelAvailable: true` |
| `/api/chat` | Returns LLM text (e.g. `"Hello from gemma4."`) |
| Demo API routes (tools, search, research, …) | HTTP 200 |
| Build fix applied | `@deepgram/sdk` v5 → `DeepgramClient` in `voice/src/transcribe.ts` |

## Top 3 next steps

1. **Streaming chat** — Add `POST /api/chat/stream` and wire the UI to SSE for responsive replies.
2. **Shippable backend** — Launcher script or small menubar helper so DMG users can start API + Ollama without Terminal.
3. **Durable RAG** — Enable LanceDB (`JARVIS_VECTOR_BACKEND=lancedb`) and ingest real document chunks for research Q&A.

## Docs

- [README.md](README.md) — overview & troubleshooting  
- [INTEGRATION.md](INTEGRATION.md) — architecture, API, MVP checklist  
- [prd.md](prd.md) — product requirements  
