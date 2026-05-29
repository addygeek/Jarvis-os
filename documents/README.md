# JarvisOS Documents Module

PDF text extraction and research-style summarization for the MVP research assistant feature.

## API

```ts
import { summarizeDocuments, extractPdfText } from "@jarvisos/documents";

const result = await summarizeDocuments([
  "/Users/you/Downloads/paper1.pdf",
  "/Users/you/Downloads/paper2.pdf",
]);

// result: { summary, keyFindings[], researchGaps[], sources[] }
```

## Output shape (research assistant)

| Field | Description |
|-------|-------------|
| `summary` | Executive summary across all PDFs |
| `keyFindings` | Bullet list of main findings |
| `researchGaps` | Open questions / gaps for future work |
| `sources` | Input file paths |

## PDF extraction

1. **Node:** `pdf-parse` (default)
2. **Python:** PyMuPDF (`pip install pymupdf`) when Node extraction is weak or unavailable

Set `PYTHON=python3` if needed.

## Ollama

Summarization calls `POST ${OLLAMA_HOST}/api/generate` with `OLLAMA_MODEL` (default `gemma4:e4b`). If Ollama is down, returns a short offline stub so dev can continue.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `gemma4:e4b` | Model for summarization |
| `PYTHON` | `python3` | Python for PyMuPDF fallback |
