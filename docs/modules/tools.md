# @jarvisos/tools

macOS tool layer: JSON-schema tools executed by the agent and exposed via `/api/tools`.

## Purpose

- Define the `Tool` interface and `ToolRegistry`
- Register **11 default tools** for files, browser, terminal, apps, PDF, notes, folder scan, system info, calendar, email, presentations
- Safety helpers for shell commands (`utils/safety.ts`)
- Jarvis home paths under `~/JarvisOS/`

## Default tools (`defaultTools` in `registry.ts`)

| `name` | File | Summary |
|--------|------|---------|
| `file` | `file-tool.ts` | Read/write/list files |
| `browser` | `browser-tool.ts` | Open URLs |
| `terminal` | `terminal-tool.ts` | Shell commands (allowlisted) |
| `app_launcher` | `app-launcher-tool.ts` | Open macOS apps |
| `pdf` | `pdf-tool.ts` | PDF text extraction |
| `notes` | `notes-tool.ts` | Notes under `~/JarvisOS/notes` |
| `folder_scan` | `folder-scan-tool.ts` | Scan user folders |
| `system` | `system-tool.ts` | System / environment info |
| `calendar` | `calendar-tool.ts` | Calendar.app integration |
| `email` | `email-tool.ts` | Mail draft helpers |
| `presentation` | `presentation-tool.ts` | HTML decks under `~/JarvisOS/presentations` |

## Key exports (`src/index.ts`)

| Export | Role |
|--------|------|
| `Tool`, `ToolResult` | Types |
| `ToolRegistry`, `defaultTools`, `toolRegistry` | Registry |
| Individual `*Tool` exports | Direct access / tests |
| `validateTerminalCommand`, `DEFAULT_ALLOWLIST` | Safety |
| `JARVIS_HOME`, `JARVIS_*_DIR`, `expandPath` | Paths |

## Key files

| Path | Role |
|------|------|
| `src/types.ts` | `Tool`, `ToolParametersSchema`, `ToolResult` |
| `src/registry.ts` | Registration, `execute`, `formatPlannerToolsList`, `getOllamaTools` |
| `src/tools/*.ts` | Tool implementations |
| `src/utils/safety.ts` | Terminal allowlist / validation |
| `src/utils/paths.ts` | `~/JarvisOS` layout |
| `src/utils/exec.ts` | Child process helpers |
| `src/utils/result.ts` | Result helpers |

## Dependencies

- `better-sqlite3` — used by `notes-tool` (local notes DB)
- `pdf-parse` — PDF text in `pdf-tool`

No dependency on `agent` or `backend` (bottom of the stack).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build -w @jarvisos/tools` | `tsc` |
| `npm test -w @jarvisos/tools` | Vitest (safety, file, terminal, app-launcher, calendar, email, presentation) |
| `npm run test:coverage -w @jarvisos/tools` | Coverage report → `tools/coverage/` |

## How to extend

1. Create `tools/src/tools/my-tool.ts` implementing `Tool` (`name`, `description`, `parameters`, `execute`).
2. Add to `defaultTools` in `registry.ts`.
3. Export from `index.ts` if needed elsewhere.
4. Use `validateTerminalCommand` for any shell execution; avoid destructive paths outside user home without clear intent.
5. Rebuild and verify:

```bash
npm run build -w @jarvisos/tools
curl -s http://127.0.0.1:3847/api/tools | jq .
```

Planner prompts pick up new tools automatically via `{{TOOLS_LIST}}` at runtime.

See [../development/01-contributing.md](../development/01-contributing.md#adding-a-tool).

## Related links

- [agent.md](./agent.md) — planner/executor consumer
- [CONTRIBUTING.md](../../CONTRIBUTING.md#adding-a-tool)
- [../development/02-testing.md](../development/02-testing.md) — tools test & coverage
