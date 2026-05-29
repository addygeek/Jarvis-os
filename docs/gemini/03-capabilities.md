# Capabilities

This page lists **only what is implemented** in the codebase for the local Gemma/Ollama stack. Features commonly associated with **Google Gemini API** but absent here are called out explicitly.

## Implemented

### Chat (non-streaming)

- **Route:** `POST /api/chat` → `AgentOrchestrator.chat()` (`backend/src/routes/chat.ts`, `agent/src/orchestrator.ts`).
- **Model call:** `OllamaClient.chat()` → Ollama `POST /api/chat` with `stream: false`.
- **History:** Last **20** messages from SQLite (`memory.getMessages`).
- **System prompt:** `prompts/chat.system.md` with `{{TOOLS_LIST}}` substituted.

### Chat / voice streaming (SSE)

- **Route:** `POST /api/chat/stream` (`backend/src/routes/chat-stream.ts`).
- **Events:** `token`, `plan`, `step_start`, `step_done`, `summary`, `error`, `done`.
- **Streaming:** Direct `fetch` to Ollama with `stream: true`; tokens emitted as NDJSON chunks are parsed and forwarded (does not use `OllamaClient.chatStream` in this route, but same Ollama API).
- **Actionable messages:** Same heuristic as orchestrator (`looksActionable`) → plan, execute tools, then stream a short summary.

### Agent planning

- **Route:** `POST /api/plan`, agent `run()` / `plan()` paths.
- **Planner:** `agent/src/planner.ts` loads `prompts/planner.system.md`.
- **JSON mode:** `format: "json"` on Ollama chat request.
- **Output:** Parsed `Plan` with `intent`, `steps[]`, optional `response` (`parsePlanJson`).

### Tool / function calling (Ollama native)

- **Mechanism:** Ollama `tools` array on chat request (`OllamaClient.chatWithTools`).
- **Definitions:** `ToolRegistry.getOllamaTools()` from `@jarvisos/tools` (OpenAI-style function schemas).
- **Flow:** If the model returns `tool_calls`, `Planner.executeToolCalls()` runs them via the registry; otherwise fallback to JSON plan text.
- **Not used:** Google Gemini `functionDeclarations` or parallel function calling APIs.

### Plan execution

- **Executor:** `agent/src/executor.ts` runs each plan step through `tools.execute()`, then calls Ollama `generate()` with `prompts/executor.system.md` for a 1–3 sentence summary.

### Structured generate (documents)

- **Module:** `documents/src/summarize.ts`.
- **Endpoint:** Ollama `POST /api/generate` (not chat), `stream: false`, `temperature: 0.3`.
- **Input:** Concatenated PDF text (truncated per doc).
- **Output:** JSON shape `summary`, `keyFindings`, `researchGaps` (parsed from model text).

### Health

- **`GET /api/health`:** Ollama `/api/tags`, model tag presence, tool count (`backend/src/routes/health.ts`).

## Partially implemented / stubs

| Feature | Status |
|---------|--------|
| **RAG embeddings** | `memory/rag/embeddings.ts` — deterministic 64-d hash vectors, **not** Gemma/Gemini embedding APIs |
| **Knowledge API** | Uses in-memory vector store; no external embedding service |
| **Screenshots / vision** | Mentioned in `prd.md` UX; **no** image input to Ollama or Gemini in code |

## Not implemented (Gemini API or otherwise)

| Capability | Notes |
|------------|--------|
| Google Gemini REST / SDK | No package, no API key |
| Hosted `gemini-*` models | Only local Ollama tags |
| Gemini multimodal (images, video, audio to model) | No image parts in chat messages |
| Gemini embeddings (`text-embedding-*`) | Stub hash embeddings only |
| Gemini rate limits / billing | N/A — local Ollama only |
| Google Search grounding | Browser tool opens Google in Chrome/Safari; not API grounding |
| Code execution sandbox (Gemini) | `terminal` tool runs local shell with guards |

## Ollama request options (all chat/generate paths)

From `agent/src/ollama-client.ts` and `backend/src/routes/chat-stream.ts`:

| Option | Typical value | Purpose |
|--------|---------------|---------|
| `temperature` | 0.2–0.5 (path-dependent) | Planner lower, chat higher |
| `num_gpu` | from `OLLAMA_NUM_GPU` | GPU layers |
| `num_ctx` | from `OLLAMA_NUM_CTX` | Context size |
| `use_mlock` | `true` | Keep model resident |
| `flash_attn` | when `OLLAMA_FLASH_ATTN` | Speed on supported hardware |

## Voice stack (separate from Gemma)

Speech-to-text does **not** use Gemma or Gemini for inference:

1. **Deepgram** `nova-3` if `DEEPGRAM_API_KEY` is set (`voice/src/transcribe.ts`).
2. **whisper.cpp** if CLI available.
3. **@xenova/transformers** `whisper-tiny.en` dev fallback.

Transcripts are sent to the backend chat/stream endpoints, which then call Ollama.

## API surface map

| HTTP | LLM usage |
|------|-----------|
| `POST /api/chat` | Full orchestrator chat |
| `POST /api/chat/stream` | SSE + Ollama stream |
| `POST /api/plan` | Planner only |
| `POST /api/agent/*` | Plan/execute variants |
| `POST /api/research/summarize` | `summarizeDocuments()` → Ollama generate |
| `GET /api/health` | Ollama tags check |

See [INTEGRATION.md](../../INTEGRATION.md) for the full route list.
