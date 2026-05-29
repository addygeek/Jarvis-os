# Contributing to JarvisOS

Thank you for helping build a local, privacy-first macOS assistant. This repo is an npm **workspaces** monorepo; keep changes scoped to the package that owns the behavior.

## Monorepo layout

```
jarvisos/
├── frontend/     # Electron + React UI (Vite)
├── backend/      # Express API — entry: src/index.ts
├── agent/        # Planner, executor, orchestrator, Ollama client
├── tools/        # Tool interface + macOS implementations
├── memory/       # SQLite store (schema in database/)
├── voice/        # Whisper transcription
├── documents/    # PDF + summarization
├── prompts/      # *.system.md templates loaded by agent/
├── database/     # schema.sql
└── scripts/      # setup.sh, demo.sh
```

### Build order

Dependencies flow: `tools` → `memory` → `agent` → `backend`. Optional: `voice`, `documents`.

```bash
npm run build:core
npm run typecheck
```

### Running locally

```bash
npm run setup
ollama pull gemma4:e4b
npm run dev
```

## Adding a tool

1. **Implement** `Tool` in `tools/src/tools/<name>-tool.ts`:
   - `name` — stable snake_case id (e.g. `folder_scan`)
   - `description` — one line for the planner
   - `parameters` — JSON Schema object
   - `execute(params)` — return `{ success, data?, error?, message? }`

2. **Register** in `tools/src/registry.ts` (`defaultTools` array).

3. **Export** from `tools/src/index.ts` if other packages need it.

4. **Safety** — use `tools/src/utils/safety.ts` for shell commands; avoid destructive paths outside user home without clear intent.

5. **Verify**:
   ```bash
   npm run build -w @jarvisos/tools
   curl -s http://localhost:3847/api/tools | jq .
   curl -s -X POST http://localhost:3847/api/tools/execute \
     -H 'Content-Type: application/json' \
     -d '{"name":"your_tool","parameters":{}}'
   ```

6. **Prompts** — no change required if the tool is registered; `{{TOOLS_LIST}}` is filled at runtime. Update planner examples only if the tool needs non-obvious parameter patterns.

Calendar, email, and presentation tools live in `tools/src/tools/*-tool.ts` (macOS MVP integrations).

## How prompts work

| File | Loaded as | Used by |
|------|-----------|---------|
| `prompts/planner.system.md` | `loadPrompt("planner")` | `Planner.createPlan()` |
| `prompts/executor.system.md` | `loadPrompt("executor")` | `Executor` step summaries |
| `prompts/chat.system.md` | `loadPrompt("chat")` | `AgentOrchestrator.chat()` (non-actionable turns) |

Loader: `agent/src/prompts.ts` reads `prompts/<name>.system.md` from the repo root.

### Template placeholders

Replace `{{KEY}}` at runtime via `renderTemplate()`:

| Placeholder | Typical source |
|-------------|----------------|
| `{{TOOLS_LIST}}` | Registry: `- name: description` per line |
| `{{USER_INTENT}}` | User message / intent string |
| `{{CONTEXT}}` | Recent conversation or task context |
| `{{STEP_DESCRIPTION}}`, `{{TOOL_NAME}}`, `{{TOOL_RESULT}}`, `{{ERROR}}` | Executor step |

### Prompt change checklist

- Keep **Jarvis** persona: helpful, concise, offline, macOS-focused.
- Planner must output **only JSON** (no markdown fences).
- Executor and chat must **not invent tool results**.
- Use exact **tool names** from the registry (`file`, `browser`, `system`, …).
- Add or adjust **safety rules** when introducing risky capabilities.

After editing prompts, rebuild the agent and restart the backend:

```bash
npm run build -w @jarvisos/agent
npm run dev:backend
```

## Code style

- TypeScript strict mode in packages that use it
- Match existing naming and import style (`*.js` extensions in ESM imports)
- Prefer small, focused diffs — see project PRD for MVP scope

## Questions

Open an issue or refer to [prd.md](prd.md) for product intent and roadmap.
