# prompts/

System prompt templates for the agent layer. Not an npm workspace — loaded at runtime from the repo root.

## Purpose

| File | Loaded as | Used by |
|------|-----------|---------|
| `planner.system.md` | `loadPrompt("planner")` | `Planner.createPlan()` |
| `executor.system.md` | `loadPrompt("executor")` | `Executor` step summaries |
| `chat.system.md` | `loadPrompt("chat")` | `AgentOrchestrator.chat()` (non-action turns) |
| `research-assistant.md` | *(reference / future)* | Research flows |

Loader: [`agent/src/prompts.ts`](../../agent/src/prompts.ts) reads `prompts/<name>.system.md`.

## Template placeholders

Replaced via `renderTemplate()` in the agent:

| Placeholder | Typical source |
|-------------|----------------|
| `{{TOOLS_LIST}}` | `ToolRegistry.formatPlannerToolsList()` |
| `{{USER_INTENT}}` | User message |
| `{{CONTEXT}}` | Recent conversation |
| `{{STEP_DESCRIPTION}}`, `{{TOOL_NAME}}`, `{{TOOL_RESULT}}`, `{{ERROR}}` | Executor step |

## Dependencies

- **Consumed by:** `@jarvisos/agent` only
- **No build step** — edit markdown and restart backend (rebuild agent if loader code changes)

## How to extend

1. Add `prompts/my-feature.system.md`.
2. Call `loadPrompt("my-feature")` from agent code and `renderTemplate()` with your keys.
3. Keep planner output **JSON only** (no markdown fences).
4. Use exact tool `name` values from [tools.md](./tools.md).

See [CONTRIBUTING.md](../../CONTRIBUTING.md#how-prompts-work) and [../development/01-contributing.md](../development/01-contributing.md#prompts).

## Related links

- [agent.md](./agent.md)
- [prompts/README.md](../../prompts/README.md)
