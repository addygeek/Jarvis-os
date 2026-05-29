# Contributing to JarvisOS

Development conventions derived from the codebase and [CONTRIBUTING.md](../../CONTRIBUTING.md). For package layout, see [../modules/README.md](../modules/README.md).

## Monorepo conventions

- **Node 20+** required (`engines` in root `package.json`)
- **ESM** packages: `"type": "module"`, TypeScript imports use `.js` extensions
- **Workspaces:** seven packages under root `package.json`; shared deps hoisted to root `node_modules`
- **Build order:** `tools` → `memory` → `agent` → `backend`; then `voice`, `documents`, `frontend` as needed

```bash
npm run setup          # scripts/setup.sh
npm run build:core     # tools, memory, agent, backend
npm run typecheck      # build:core + workspace typecheck
npm run dev            # API :3847 + Vite :5173
```

## Adding a tool

Full detail: [tools.md](../modules/tools.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md#adding-a-tool).

1. Implement `Tool` in `tools/src/tools/<name>-tool.ts`:
   - `name` — stable snake_case id
   - `description` — one line for the planner
   - `parameters` — JSON Schema object
   - `execute(params)` → `{ success, data?, error?, message? }`

2. Register in `tools/src/registry.ts` (`defaultTools`).

3. Export from `tools/src/index.ts` if other packages need it.

4. Use `tools/src/utils/safety.ts` for shell commands.

5. Verify:

```bash
npm run build -w @jarvisos/tools
npm run dev:backend
curl -s http://127.0.0.1:3847/api/tools | jq .
curl -s -X POST http://127.0.0.1:3847/api/tools/execute \
  -H 'Content-Type: application/json' \
  -d '{"name":"your_tool","parameters":{}}'
```

Planner prompts receive new tools via `{{TOOLS_LIST}}` at runtime — no prompt edit required unless parameters need examples.

## Adding backend routes

1. Add `backend/src/routes/<feature>.ts` using `asyncHandler` and `getContainer()` where needed.
2. Mount in `backend/src/app.ts`.
3. Add request types to `backend/src/types/api.ts`.
4. Extend `frontend/src/lib/api.ts` if the UI should call it.
5. Add tests in `backend/src/api.test.ts` or `backend/src/routes/*.test.ts`.

## Prompts

| File | Consumer |
|------|----------|
| `prompts/planner.system.md` | Planner JSON plans |
| `prompts/executor.system.md` | Step summaries |
| `prompts/chat.system.md` | Conversational replies |

After prompt edits:

```bash
npm run build -w @jarvisos/agent   # only if agent code changed
npm run dev:backend
```

Rules: planner outputs **JSON only**; do not invent tool results in executor/chat; use exact registry tool names.

See [../modules/prompts.md](../modules/prompts.md).

## Code style

- TypeScript strict mode in packages that enable it
- Match existing naming and file layout in the package you touch
- Prefer small, focused diffs aligned with [prd.md](../../prd.md) MVP scope
- No inline imports (keep imports at top of file)
- Exhaustive `switch` on TypeScript unions where the codebase already does

## Secrets and env

- Copy [.env.example](../../.env.example) to `.env` — never commit `.env`
- Document new vars in `.env.example` only (no real API keys in docs or commits)

## Related links

- [02-testing.md](./02-testing.md)
- [03-troubleshooting.md](./03-troubleshooting.md)
- [INTEGRATION.md](../../INTEGRATION.md)
- [prd.md](../../prd.md)
