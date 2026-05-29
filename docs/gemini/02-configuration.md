# Configuration

JarvisOS configures the local LLM through **Ollama environment variables**. There is no Gemini API key or Google AI Studio setup in this repository.

## Environment variables

Loaded from the repo root `.env` by `backend/src/config.ts` (via `dotenv`). See `.env.example` for the canonical list.

### Ollama (reasoning)

| Variable | Default | Used by |
|----------|---------|---------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | `backend/src/config.ts` → `OllamaClient` in `agent/` |
| `OLLAMA_MODEL` | `gemma4:e4b` | Chat, planner, executor, health check |
| `OLLAMA_NUM_GPU` | `99` | Passed as `num_gpu` in Ollama `options` (Apple Silicon) |
| `OLLAMA_FLASH_ATTN` | enabled (`!== "false"`) | Sets `flash_attn: true` when enabled |
| `OLLAMA_NUM_CTX` | `8192` | Context window in Ollama `options` |

`documents/src/summarize.ts` reads **`OLLAMA_HOST`** (same default host) and **`OLLAMA_MODEL`** for PDF summarization—not `OLLAMA_BASE_URL`. Keep both host vars aligned in `.env`:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma4:e4b
```

### Not LLM-related (same `.env`)

These appear in `.env.example` but are unrelated to Gemma/Gemini:

| Variable | Purpose |
|----------|---------|
| `PORT`, `NODE_ENV`, `DATABASE_PATH`, `UPLOADS_DIR`, `CORS_ORIGINS` | Backend API |
| `DEEPGRAM_API_KEY`, `WHISPER_*` | Voice STT (`@jarvisos/voice`) |
| `PYTHON` | PDF extraction fallback |
| `VITE_API_URL`, `JARVIS_*` | Frontend / Electron |

## API setup (Ollama)

1. Install Ollama: https://ollama.com (or `brew install ollama` on macOS).
2. Start the server: `ollama serve` (listens on port **11434**).
3. Pull the default model: `ollama pull gemma4:e4b`.
4. Verify: `curl http://127.0.0.1:11434/api/tags` or `ollama list`.

See `models/README.md` for alternative tags (`gemma2:2b`, `llama3.2`, etc.) and RAM guidance.

## Model selection

**Runtime:** set `OLLAMA_MODEL` to any tag returned by `ollama list` (e.g. `gemma2:2b` on 8 GB machines).

**Code default:** `backend/src/config.ts` and `documents/src/summarize.ts` both default to `gemma4:e4b` if the env var is unset.

**Availability check:** `agent/src/ollama-client.ts` implements `isOllamaModelAvailable()` and `healthCheck()` against `GET /api/tags`, matching base name and optional tag (e.g. `gemma4` vs `gemma4:e4b`).

## Dependency injection

`backend/src/services/container.ts` constructs a single `OllamaClient` and `AgentOrchestrator` at startup:

```typescript
const ollama = new OllamaClient({
  baseUrl: appConfig.ollama.baseUrl,
  model: appConfig.ollama.model,
  numGpu: appConfig.ollama.numGpu,
  flashAttn: appConfig.ollama.flashAttn,
  numCtx: appConfig.ollama.numCtx,
});
```

No alternate provider (OpenAI, Anthropic, Gemini API) is registered in the container.

## Client timeouts

`OllamaClient` uses a default **120_000 ms** request timeout (`agent/src/ollama-client.ts`). Aborted requests throw `Ollama request timed out after …ms`. This is independent of Gemini API quotas.

## Frontend dev proxy

Vite proxies `/api` to the backend (`frontend/vite.config.ts`, 300 s timeout for long Ollama runs). Production Electron builds use `VITE_API_URL` (default `http://127.0.0.1:3847`).

## Future / planned (not implemented)

From `models/README.md` and `STATUS.md`:

- Native Gemma audio (replace Whisper for STT)
- LanceDB / Qdrant for real embeddings (`JARVIS_VECTOR_BACKEND=lancedb` mentioned in STATUS; stub only today)

None of these add a Google Gemini API client.
