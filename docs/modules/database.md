# database/

SQLite schema and migrations for JarvisOS. Not an npm workspace.

## Purpose

- Single source of truth for tables used by `@jarvisos/memory` (`MemoryStore`)
- Default database file: `database/jarvisos.db` (override with `DATABASE_PATH`)

## Key files

| File | Role |
|------|------|
| `schema.sql` | Tables, indexes, constraints |

## Tables (MVP)

| Table | Purpose |
|-------|---------|
| `conversations` | Chat sessions |
| `messages` | user / assistant / system / tool messages |
| `memory_facts` | Key-value long-term facts |
| `documents` | Indexed PDF paths + summaries |
| `tool_runs` | Tool execution audit log |
| `tasks` | Planner runs linked to conversations |

`MemoryStore` applies `schema.sql` automatically on first open.

Manual init (optional):

```bash
mkdir -p database
sqlite3 database/jarvisos.db < database/schema.sql
```

## Dependencies

- **Used by:** `@jarvisos/memory`, indirectly `@jarvisos/backend` and `@jarvisos/agent`
- Driver: `better-sqlite3` (rebuild with `npm rebuild better-sqlite3` if Node version changes)

## How to extend

1. Add migration SQL or append to `schema.sql` with care for existing installs.
2. Update `memory/src/store.ts` and backend `/api/memory` routes for new columns/tables.
3. Document new fields in [memory.md](./memory.md).

## Related links

- [memory.md](./memory.md)
- [memory/README.md](../../memory/README.md)
