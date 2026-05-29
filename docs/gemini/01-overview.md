# Gemini / LLM overview

JarvisOS runs its **reasoning layer locally** through [Ollama](https://ollama.com) and the **Gemma** model family (default: `gemma4:e4b`). The product vision in `prd.md` names **Gemma 4 E4B** as the on-device brain and explicitly targets **no cloud APIs** for the MVP.

## What this repo does *not* use

A full codebase search shows **no Google Gemini API integration**:

| Expected for Gemini API | In JarvisOS |
|-------------------------|-------------|
| `@google/generative-ai` or `@google/genai` | Not in any workspace `package.json` |
| `GoogleGenerativeAI` client | Not present |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` env vars | Not in `.env.example` or `backend/src/config.ts` |
| Hosted models (`gemini-2.0-flash`, etc.) | Not called |

The workspace directory name `google gemini` is **not** wired to the Gemini REST API. Treat it as a project folder label only.

## What JarvisOS actually uses

```mermaid
flowchart LR
  UI[frontend / Electron]
  API[backend Express]
  Agent[@jarvisos/agent]
  Ollama[Ollama :11434]
  Gemma[gemma4:e4b local weights]

  UI --> API
  API --> Agent
  Agent --> Ollama
  Ollama --> Gemma
```

| Layer | Package / file | Role |
|-------|----------------|------|
| HTTP API | `backend/` | Routes chat, plan, stream, health |
| Orchestration | `agent/src/orchestrator.ts` | Chat vs plan/execute routing |
| LLM client | `agent/src/ollama-client.ts` | Ollama `/api/chat`, `/api/generate`, streaming |
| Planning | `agent/src/planner.ts` | JSON plans + Ollama native `tools` |
| Execution | `agent/src/executor.ts` | Runs tool registry, summarizes results |
| PDF research | `documents/src/summarize.ts` | Direct Ollama `generate` for summaries |
| Config | `backend/src/config.ts` | `OLLAMA_*` settings |
| Prompts | `prompts/*.system.md` | Planner, executor, chat system text |

**Gemma** is Google’s open model line; **Gemini** is Google’s hosted multimodal API. JarvisOS uses the former **via Ollama on localhost**, not the latter.

## Relationship to “Gemini” in docs and deps

- **`prd.md`** lists “Gemini” among *competitor* assistants (Siri, ChatGPT, etc.), and “GeminiOS Local” as an alternative product name—not as an integration target.
- **`@deepgram/sdk`** (voice) defines Gemini model IDs for Deepgram’s *Agent* product; JarvisOS voice uses Deepgram **Nova-3** for transcription (`voice/src/transcribe.ts`), not Gemini think models.
- **Browser tool** can open `google.com` or Scholar; that is macOS automation, not the Gemini API.

## Default model

| Setting | Default | Docs |
|---------|---------|------|
| `OLLAMA_MODEL` | `gemma4:e4b` | `models/README.md`, `.env.example` |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | `backend/src/config.ts` |

Pull once: `ollama pull gemma4:e4b`.

## Health and degradation

`GET /api/health` (`backend/src/routes/health.ts`) reports Ollama reachability and whether the configured model tag is installed. Overall status is `ok` only when both are true; otherwise `degraded`.

## Further reading

- [02 — Configuration](02-configuration.md)
- [03 — Capabilities](03-capabilities.md)
- [04 — Prompts and agent behavior](04-prompts-and-agent-behavior.md)
- [05 — Limitations and fallbacks](05-limitations-and-fallbacks.md)
- [INTEGRATION.md](../../INTEGRATION.md) — ports, env table, request flows
