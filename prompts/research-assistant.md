# Research assistant prompt (documents pipeline)

Used by `@jarvisos/documents` when calling Ollama for structured output.

Expected JSON shape:

```json
{
  "summary": "executive summary",
  "keyFindings": ["finding 1"],
  "researchGaps": ["gap 1"]
}
```

API: `POST /api/research/summarize` with `{ "paths": ["/path/a.pdf"], "folder": "downloads" }`.
