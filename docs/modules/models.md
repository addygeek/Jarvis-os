# models/ and scripts/

Supporting directories at the repo root (not npm workspaces).

## models/

Ollama setup and model selection documentation for the **reasoning layer**.

| File | Role |
|------|------|
| `README.md` | Install Ollama, pull `gemma4:e4b`, alternatives, verify |

Default model matches root `.env.example`:

```env
OLLAMA_MODEL=gemma4:e4b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

**Consumed by:** `@jarvisos/agent` (via backend config), `@jarvisos/documents` (summarization).

See [models/README.md](../../models/README.md) for pull commands and GPU notes.

## scripts/

| Script | Role |
|--------|------|
| `setup.sh` | Create `.env`, `npm install`, workspace builds |
| `demo.sh` | Smoke test: health, tools, plan, chat, sample tool call |
| `dev-urls.mjs` | Prints dev URLs when running `npm run dev` |

Root `package.json` scripts:

| Script | Calls |
|--------|--------|
| `npm run setup` | `bash scripts/setup.sh` |
| `npm run demo` | `bash scripts/demo.sh` |
| `npm run dev` | `dev-urls.mjs` + concurrently backend + frontend |

## Related links

- [agent.md](./agent.md) — Ollama client
- [QUICKSTART.md](../../QUICKSTART.md)
- [INTEGRATION.md](../../INTEGRATION.md#default-model-and-ports)
