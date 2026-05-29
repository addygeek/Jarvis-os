# @jarvisos/memory

Persistent memory for JarvisOS: **SQLite** for conversations and facts; **vector store stub** for future RAG.

## SQLite (MVP — persists across restarts)

The `MemoryStore` class opens `DATABASE_PATH` (default `database/jarvisos.db`) and applies `database/schema.sql` on startup.

| Table | Purpose |
|-------|---------|
| `conversations` | Chat sessions |
| `messages` | User / assistant / tool messages |
| `tasks` | Planner runs linked to a conversation |
| `memory_entries` | Key-value facts (preferences, context) |
| `documents` | Indexed PDF paths + summaries (future indexing) |

```ts
import { MemoryStore } from "@jarvisos/memory";

const memory = new MemoryStore("./database/jarvisos.db");
const conv = memory.createConversation("Research session");
memory.addMessage({ conversationId: conv.id, role: "user", content: "Summarize my papers" });
// Restart backend — messages are still in SQLite
memory.close();
```

Initialize manually (optional; the store auto-migrates):

```bash
mkdir -p database
sqlite3 database/jarvisos.db < database/schema.sql
```

## Vector store (future RAG)

| Path | Role |
|------|------|
| `memory/src/vector-store.ts` | MVP **no-op** stub (`NoopVectorStore`) |
| `memory/rag/` | In-memory + optional LanceDB prototype (excluded from default `tsc` build) |

Swap the stub for:

| Provider | When to use |
|----------|-------------|
| **LanceDB** | Embedded local vectors, single-user Mac |
| **Qdrant** | Docker sidecar (`docker-compose.yml` stub) for larger corpora |

Planned flow:

1. `documents/` extracts PDF text → chunk → embed (Ollama / local model).
2. `vectorStore.upsert()` stores embeddings + path metadata.
3. Chat / research routes call `vectorStore.search(query)` for RAG context.

Until then, use `POST /api/research/summarize` and SQLite `documents` table for path-level recall.
