# JarvisOS documentation

Architecture and system-design docs for the local macOS AI assistant monorepo.

## Gemini / local LLM (Gemma via Ollama)

| Doc | Topic |
|-----|--------|
| [01 — Overview](gemini/01-overview.md) | Gemma vs Gemini API; role in JarvisOS |
| [02 — Configuration](gemini/02-configuration.md) | `OLLAMA_*` env vars, model setup |
| [03 — Capabilities](gemini/03-capabilities.md) | Chat, streaming, tools, what is not implemented |
| [04 — Prompts & agent behavior](gemini/04-prompts-and-agent-behavior.md) | System prompts, routing, context |
| [05 — Limitations & fallbacks](gemini/05-limitations-and-fallbacks.md) | Timeouts, offline paths, STT fallbacks |

## Architecture

| Doc | Topic |
|-----|--------|
| [01 — High-level architecture](architecture/01-high-level-architecture.md) | Monorepo layout, packages, runtime & deployment |
| [02 — Request lifecycle](architecture/02-request-lifecycle.md) | Chat, plan/execute, SSE streams |
| [03 — Memory & RAG](architecture/03-memory-and-rag.md) | SQLite store, embeddings, knowledge API |
| [04 — Tools & plugins](architecture/04-tools-and-plugins.md) | Tool registry, invocation, safety, tests |
| [05 — Frontend & Electron](architecture/05-frontend-and-electron.md) | React UI, IPC, API client, packaging |
| [06 — Data models](architecture/06-data-models.md) | Types, SQLite schema, API contracts |

## Related repo docs

- [README.md](../README.md) — product overview and install
- [INTEGRATION.md](../INTEGRATION.md) — package wiring, ports, env vars, MVP checklist
- [QUICKSTART.md](../QUICKSTART.md) — 5-minute local setup
- [prd.md](../prd.md) — product requirements
