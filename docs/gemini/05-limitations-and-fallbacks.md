# Limitations and fallbacks

JarvisOS does not implement Google Gemini API **rate limits**, **quota**, or **safety settings**—those apply only if you add a hosted Gemini client in the future. Below are the limits and fallbacks **as implemented** for the Ollama/Gemma stack and adjacent services.

## Ollama availability

### Health gate (chat-only path)

Before a non-actionable `ollama.chat()`, `orchestrator.chat()` calls `ollama.healthCheck()` (`agent/src/orchestrator.ts`):

| Condition | User-facing response |
|-----------|---------------------|
| Ollama unreachable | “Start it with `ollama serve`…” |
| Model not in `ollama list` | “Run: `ollama pull <model>`” |
| Chat request throws | “Sorry, I could not reach Ollama: …” |

`/api/health` returns `status: "degraded"` when Ollama is down or the model tag is missing (`backend/src/routes/health.ts`). The API still serves non-LLM routes.

### Request timeout

- **Default:** 120 seconds per Ollama HTTP call (`OllamaClient`, `agent/src/ollama-client.ts`).
- **On abort:** `Ollama request timed out after 120000ms`.
- No automatic retry or exponential backoff in the agent client.

### Streaming errors

`POST /api/chat/stream` emits SSE `error` + `done` on planning failure or uncaught exceptions (`backend/src/routes/chat-stream.ts`). Partial tokens may already have been sent.

## Planning fallbacks

| Failure | Behavior |
|---------|----------|
| Invalid / empty JSON plan | `parsePlanJson` inserts a `system` / `get_volume` fallback step (`agent/src/planner.ts`) |
| JSON parse exception | Same fallback + `response` explains parsing trouble |
| Planner throws in stream route | SSE `error` event; stream ends |
| Step execution error in chat | Task marked `failed`; message includes error string |

There is **no** fallback to a second LLM provider (e.g. Gemini API or OpenAI).

## Document summarization

`documents/src/summarize.ts`:

1. **Primary:** `summarizeWithOllama()` via `/api/generate`.
2. **On any error:** `summarizeOffline()` — word-count preview, no AI findings, hints to start Ollama.

Truncation: **12_000** chars total prompt budget helper; **8_000** chars per document in the corpus.

## Embeddings / RAG

- **Not** Gemini embedding models.
- `memory/rag/embeddings.ts` — 64-dimensional deterministic vectors for local dev/stub search.
- `STATUS.md` lists durable LanceDB RAG as a future step; not enabled in MVP.

## Voice (STT) fallbacks

Order in `voice/src/transcribe.ts` (conceptually):

1. Deepgram (`nova-3`) if `DEEPGRAM_API_KEY` set — **cloud**, not Gemini.
2. whisper.cpp CLI (`WHISPER_CLI`, `WHISPER_MODEL_PATH`).
3. Xenova transformers tiny model (WAV-oriented dev fallback).

If Deepgram is unset, `voice/src/server.ts` can return **503** for routes that require it.

## Frontend / API fallbacks (non-LLM)

| Area | Fallback |
|------|----------|
| Capabilities UI | `frontend/src/data/fallbackCapabilities.ts` when API catalog fails |
| Tools page | Hardcoded tool list in `frontend/src/pages/Tools.tsx` |
| Agent examples | `QUICK_AGENT_EXAMPLES` from fallback capabilities |

These do not change the LLM backend; they keep the UI usable offline.

## Rate limits

- **Ollama:** No client-side throttling. Throughput is limited by local CPU/GPU and a single concurrent model instance.
- **Gemini API:** N/A — not integrated.
- **Deepgram:** Subject to Deepgram account limits when `DEEPGRAM_API_KEY` is used; JarvisOS does not implement retry/backoff for transcription.

## Security and safety

Prompt-level refusals (malware, credential theft) are described in `prompts/*.system.md`. There is no separate Gemini `safetySettings` block.

`terminal` tool supports `confirmDangerous` for risky shell commands (`tools/`). Planner prompt discourages destructive `rm -rf`-style commands.

## Operational limits (product / PRD)

From `prd.md` and `STATUS.md` (not enforced in code as hard caps):

- MVP targets **local-only** reasoning; cloud LLM is out of scope.
- Screenshot/multimodal input is aspirational—not wired to Gemma chat.
- Electron DMG does not bundle Ollama; user must run `ollama serve` separately.

## Adding Google Gemini later

To integrate the real Gemini API you would need net-new work: SDK dependency, API key env vars, a provider abstraction (or replacement for `OllamaClient`), and prompt/tool schema mapping. None of that exists today; this doc set describes the **Ollama + Gemma** path only.
