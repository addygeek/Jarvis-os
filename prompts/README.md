# JarvisOS prompts

System prompt templates for the agent layer. Loaded at runtime from this directory by `agent/src/prompts.ts`.

| File | Role |
|------|------|
| `chat.system.md` | Conversational replies (no direct tool calls) |
| `planner.system.md` | JSON execution plans |
| `executor.system.md` | Per-step status after tool runs |

Placeholders like `{{TOOLS_LIST}}` are replaced via `renderTemplate()` in the agent package. See [CONTRIBUTING.md](../CONTRIBUTING.md#how-prompts-work).
