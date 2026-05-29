# JarvisOS — Local Models (Ollama)

JarvisOS runs the **reasoning layer** locally via [Ollama](https://ollama.com). The default is **Gemma 4 E4B** (`gemma4:e4b`).

## Install Ollama

```bash
# macOS
brew install ollama
# or download from https://ollama.com

ollama serve   # runs API on http://localhost:11434
```

## Pull recommended model

```bash
# Primary (matches OLLAMA_MODEL default in .env.example)
ollama pull gemma4:e4b
```

### Alternatives

```bash
# Smaller / faster for dev machines
ollama pull gemma2:2b

# Other families
ollama pull llama3.2
ollama pull mistral
```

If you use a different tag, set in `.env`:

```env
OLLAMA_MODEL=<your-ollama-tag>
```

## Verify

```bash
ollama list
ollama run gemma4:e4b "Hello Jarvis"
curl http://localhost:11434/api/tags
```

## Used by

| Module | Usage |
|--------|--------|
| `agent/` | Intent, planning, tool selection |
| `documents/` | `summarizeDocuments()` structured research output |
| `backend/` | Chat / agent API routes |

## Environment

| Variable | Default |
|----------|---------|
| `OLLAMA_HOST` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `gemma4:e4b` |

## Hardware notes

- **8 GB RAM:** `gemma2:2b` or other quantized variants (set `OLLAMA_MODEL` accordingly)
- **16 GB+:** `gemma4:e4b` (default)
- GPU acceleration is automatic on Apple Silicon when supported by Ollama

## Future

- Native Gemma audio (replace Whisper for STT)
- LanceDB / Qdrant embeddings for personal RAG (see root `docker-compose.yml` stub)
