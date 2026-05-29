# @jarvisos/agent

Planner, executor, and chat orchestration over Ollama. Consumes the tool registry and persists messages via `@jarvisos/memory`.

## Purpose

- **Planner** — turns user intent into JSON execution plans (`planner.ts` + `prompts/planner.system.md`)
- **Executor** — runs plan steps through `ToolRegistry`, summarizes step results (`executor.ts`)
- **AgentOrchestrator** — `chat()`, `plan()`, `execute()`, `run()`; decides when to plan vs. conversational reply
- **OllamaClient** — chat completions, optional native tool definitions (`ollama-client.ts`)

## Key exports (`src/index.ts`)

| Export | Role |
|--------|------|
| `AgentOrchestrator` | Main façade |
| `Planner`, `parsePlanJson`, `parseToolArguments` | Planning |
| `Executor` | Step execution |
| `OllamaClient` | Ollama HTTP API |
| `loadPrompt`, `renderTemplate` | Prompt files from `prompts/` |
| Types | `Plan`, `ChatResult`, `ExecutionResult`, `OllamaConfig`, … |

## Key files

| File | Role |
|------|------|
| `src/orchestrator.ts` | Chat + plan + execute coordination |
| `src/planner.ts` | LLM → JSON plan |
| `src/executor.ts` | Tool calls per step |
| `src/ollama-client.ts` | Ollama `/api/chat`, tool schema helpers |
| `src/prompts.ts` | Loads `prompts/<name>.system.md` from repo root |
| `src/types.ts` | Shared types |

## Dependencies

| Package | Usage |
|---------|--------|
| `@jarvisos/tools` | `ToolRegistry`, tool execution |
| `@jarvisos/memory` | `MemoryStore` for conversation messages |

Configured by backend via `OllamaClient` options (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, GPU/context options from `backend/src/config.ts`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build -w @jarvisos/agent` | `tsc` → `agent/dist/` |
| `npm test -w @jarvisos/agent` | Vitest: planner, orchestrator, ollama-client |

## How to extend

1. **Orchestration behavior:** Edit `orchestrator.ts` (e.g. when to call planner vs. chat-only).
2. **Plan format:** Update `types.ts`, `planner.ts`, and `prompts/planner.system.md` together; keep JSON-only planner output.
3. **New prompt placeholders:** Add keys in prompt markdown, replace in `renderTemplate()` call sites.
4. **Ollama options:** Extend `OllamaConfig` and `OllamaClient` payload; wire from backend config.

Prompt changes do not require agent code changes if only markdown text changes — restart backend after edits.

## Related links

- [prompts.md](./prompts.md) — system prompt templates
- [tools.md](./tools.md) — tools exposed to planner/executor
- [CONTRIBUTING.md](../../CONTRIBUTING.md#how-prompts-work)
- [models.md](./models.md) — default `gemma4:e4b`
