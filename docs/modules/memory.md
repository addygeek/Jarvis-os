# @jarvisos/memory

Persistent **SQLite** store for conversations, messages, tasks, and memory facts. Optional **RAG** submodule under `memory/rag/`.

## Purpose

- `MemoryStore` — CRUD for chats and agent tasks; applies `database/schema.sql` on open
- MVP vector stub — `NoopVectorStore` in `src/vector-store.ts` (no-op search)
- RAG prototype — `memory/rag/` with in-memory and optional LanceDB backends (separate export path)

## Key exports

### Main package (`@jarvisos/memory`)

| Export | Role |
|--------|------|
| `MemoryStore` | SQLite access (`src/store.ts`) |
| `NoopVectorStore`, `vectorStore` | Stub vector search |
| Types | `Conversation`, `Message`, `Task`, `MemoryEntry`, … |

### RAG subpath (`@jarvisos/memory/rag`)

| Export | Role |
|--------|------|
| `createVectorStore`, `InMemoryVectorStore` | Vector backends |
| `embedText`, `cosineSimilarity` | Hash-based embedding stub |
| `ingestDocument`, `queryKnowledge` | Knowledge base API |

Set `JARVIS_VECTOR_BACKEND=lancedb` for LanceDB when wired through backend knowledge routes (see [INTEGRATION.md](../../INTEGRATION.md)).

## Key files

| Path | Role |
|------|------|
| `src/store.ts` | SQLite implementation |
| `src/types.ts` | Domain types |
| `src/vector-store.ts` | No-op stub for MVP |
| `src/index.ts` | Public exports |
| `rag/vector-store.ts` | In-memory / LanceDB vector store |
| `rag/knowledge-base.ts` | Ingest + query |
| `rag/embeddings.ts` | Embedding helpers |
| `rag/index.ts` | RAG public API |

Schema lives in repo-root [`database/schema.sql`](../../database/schema.sql).

## Dependencies

- `better-sqlite3` — SQLite driver (rebuild after Node version changes: `npm rebuild better-sqlite3`)

Used by `@jarvisos/agent` and `@jarvisos/backend`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build -w @jarvisos/memory` | `tsc` → `dist/src/`, `dist/rag/` |
| `npm run dev -w @jarvisos/memory` | `tsc --watch` |

No test script in package.json (backend tests cover integration).

## How to extend

1. **New persisted entity:** Extend `database/schema.sql`, then `MemoryStore` methods and backend `/api/memory` routes.
2. **RAG:** Implement or swap `VectorStore` in `rag/vector-store.ts`; connect ingest in backend `routes/knowledge.ts` and `documents` pipeline.
3. **Replace noop stub:** Swap `vectorStore` in `src/vector-store.ts` or route knowledge API to `@jarvisos/memory/rag`.

Default DB path: `DATABASE_PATH` → `./database/jarvisos.db`.

## Related links

- [database.md](./database.md) — schema tables
- [documents.md](./documents.md) — PDF text for future indexing
- [memory/README.md](../../memory/README.md) — package README
- [INTEGRATION.md](../../INTEGRATION.md#mvp-checklist-verified-2026-05-29) — RAG status
