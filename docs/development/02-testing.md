# Testing

How to run tests and coverage in the JarvisOS monorepo.

## Run all workspace tests

From repo root:

```bash
npm test
```

Runs `vitest run` in each workspace that defines a `test` script: **backend**, **tools**, **agent**. Frontend, memory, voice, and documents have no test script in `package.json`.

## Per-package commands

| Package | Command | Test files |
|---------|---------|------------|
| `@jarvisos/backend` | `npm test -w @jarvisos/backend` | `src/api.test.ts`, `src/routes/agent.test.ts` |
| `@jarvisos/tools` | `npm test -w @jarvisos/tools` | `src/**/*.test.ts` (safety, file, terminal, app-launcher, calendar, email, presentation) |
| `@jarvisos/agent` | `npm test -w @jarvisos/agent` | `ollama-client`, `planner`, `orchestrator` tests |

### Coverage

Backend and tools support coverage via Vitest v8:

```bash
npm run test:coverage -w @jarvisos/backend
npm run test:coverage -w @jarvisos/tools
npm run test:coverage -w @jarvisos/agent
```

**Tools coverage artifact:** [`tools/coverage/coverage-summary.json`](../../tools/coverage/coverage-summary.json) — last run reported ~23% line coverage overall (higher on `safety.ts`, `app-launcher-tool`, partial `file-tool` / `terminal-tool`). Regenerate after changes:

```bash
npm run test:coverage -w @jarvisos/tools
```

Coverage output directory: `tools/coverage/` (HTML/lcov depending on Vitest config).

## Test stack

- **Runner:** [Vitest](https://vitest.dev) v3
- **HTTP:** [supertest](https://github.com/ladjs/supertest) in backend tests
- **Agent/tools:** unit tests with mocked or local Ollama behavior where applicable

## Typical workflow before a PR

```bash
npm run build:core
npm test
npm run typecheck    # optional full typecheck
```

## Integration / manual smoke

With Ollama running:

```bash
npm run dev:backend
./scripts/demo.sh
# or
npm run demo
```

Health check:

```bash
curl -s http://127.0.0.1:3847/api/health | jq .
```

## Adding tests

| Area | Where to add |
|------|----------------|
| Tool behavior | `tools/src/tools/<tool>.test.ts` or `tools/src/utils/*.test.ts` |
| Agent parsing / orchestration | `agent/src/*.test.ts` |
| HTTP routes | `backend/src/api.test.ts` or `backend/src/routes/*.test.ts` |

Follow existing Vitest patterns (`describe`, `it`, `expect`). Prefer testing pure functions and route handlers with supertest over live Ollama when possible.

## Test counts (reference)

Approximate totals when all three packages pass (run `npm test` to verify current count):

| Workspace | Tests |
|-----------|-------|
| backend | 15 |
| tools | 22 |
| agent | 12 |
| **Total** | **49** |

[STATUS.md](../../STATUS.md) may list older counts; trust `npm test` output.

## Related links

- [01-contributing.md](./01-contributing.md)
- [../modules/tools.md](../modules/tools.md)
- [../modules/backend.md](../modules/backend.md)
