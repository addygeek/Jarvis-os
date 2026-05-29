# @jarvisos/documents

PDF text extraction and batch summarization via Ollama. Used by backend research routes.

## Purpose

- Extract text from PDFs (`pdf.ts`) — `pdf-parse` plus optional Python/PyMuPDF path when configured
- Summarize one or more documents with the local LLM (`summarize.ts`)
- Powers `POST /api/research/summarize` in the backend

## Key exports

| Export | Role |
|--------|------|
| `extractPdfText` | Path → text |
| `summarizeDocuments` | Batch summarize with Ollama |
| `SummaryResult`, `ExtractedDocument` | Types |

## Key files

| Path | Role |
|------|------|
| `src/pdf.ts` | Extraction |
| `src/summarize.ts` | Ollama summarization prompts |
| `src/types.ts` | Result types |
| `src/index.ts` | Exports |

## Dependencies

- `pdf-parse` — Node PDF parsing
- Ollama — HTTP at `OLLAMA_HOST` / `OLLAMA_BASE_URL` (from env when called from backend)

## Environment

| Variable | Purpose |
|----------|---------|
| `OLLAMA_HOST` | Summarization API base |
| `PYTHON` | Optional PyMuPDF extractor (`python3`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build -w @jarvisos/documents` | `tsc` |
| `npm run documents:build` (root) | Alias |

## How to extend

1. **Better extraction:** Extend `pdf.ts` Python fallback; ensure `PYTHON` and PyMuPDF are documented in `.env.example`.
2. **Chunking for RAG:** Add chunking here or in `memory/rag`; ingest via `/api/knowledge` when wired.
3. **New formats:** Add extractors parallel to `pdf.ts`, call from `backend/src/services/research.ts`.

## Related links

- [memory.md](./memory.md) — `documents` table and future RAG
- [backend.md](./backend.md) — `/api/research`
- [tools.md](./tools.md) — `pdf` tool (agent-facing, separate from this package)
