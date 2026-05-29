# Troubleshooting

Common issues when running JarvisOS locally. Sources: [QUICKSTART.md](../../QUICKSTART.md), [STATUS.md](../../STATUS.md), [README.md](../../README.md), [INTEGRATION.md](../../INTEGRATION.md).

## Prerequisites checklist

| Requirement | Check |
|-------------|--------|
| macOS | Primary target for tools and Electron |
| Node.js 20+ | `node -v` |
| Ollama running | `curl -s http://127.0.0.1:11434/api/tags` |
| Model pulled | `ollama pull gemma4:e4b` |
| Dependencies built | `npm run build` or `npm run build:core` |
| `.env` present | `cp .env.example .env` |

## Backend offline / UI banner

**Symptom:** Offline banner in Vite or Electron dialog on launch.

**Fix:**

```bash
npm run dev              # API + UI
# or
npm run dev:backend      # API only on :3847
```

Electron dev auto-start (optional):

```bash
JARVIS_SPAWN_BACKEND=1 npm run electron:dev -w @jarvisos/frontend
```

Verify:

```bash
curl -s http://127.0.0.1:3847/api/health | head
```

## Ollama disconnected or no model

**Symptom:** Health shows model unavailable; chat returns errors or fallbacks.

**Fix:**

```bash
ollama serve
ollama pull gemma4:e4b
```

Set in `.env`:

```env
OLLAMA_MODEL=gemma4:e4b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## Wrong API port

**Symptom:** UI cannot reach API; connection refused.

Default API port is **3847**. Align:

| Variable | Purpose |
|----------|---------|
| `PORT` | Backend listen port |
| `VITE_API_URL` | Frontend production/Electron build |
| `JARVIS_API_URL` | Electron health check |

If port 3847 is in use, pick a free port and set all three consistently. See [INTEGRATION.md](../../INTEGRATION.md#port-conflicts).

## CORS errors from Vite

**Symptom:** Browser blocks `/api` requests from `localhost:5173`.

**Fix:** Add your dev origin to `CORS_ORIGINS` in `.env` (see `.env.example`).

## Voice transcription fails

**Symptom:** `/api/voice/transcribe` errors or `health` shows `none`.

**Fix (pick one):**

1. **Deepgram:** Set `DEEPGRAM_API_KEY` in `.env`
2. **whisper.cpp:** Install [whisper.cpp](https://github.com/ggerganov/whisper.cpp), set `WHISPER_CLI` and `WHISPER_MODEL_PATH`

```bash
npm run voice:build
npm run dev:backend
curl -s http://127.0.0.1:3847/api/voice/health | jq .
```

Details: [INTEGRATION.md](../../INTEGRATION.md#voice-api--mounted), [../modules/voice.md](../modules/voice.md).

## PDF extraction weak

**Symptom:** Research summarize returns little text.

**Fix:**

```bash
pip install pymupdf
```

Ensure `PYTHON=python3` in `.env`. See [../modules/documents.md](../modules/documents.md).

## `better-sqlite3` Node version mismatch

**Symptom:** Backend fails loading native module.

**Fix:**

```bash
npm rebuild better-sqlite3
```

Root `postinstall` also runs this rebuild.

## Tool permission errors (macOS)

**Symptom:** Calendar, Mail, Terminal, or Automation failures.

**Fix:** **System Settings → Privacy & Security** — grant Terminal / your IDE / JarvisOS automation and file access as prompted.

## Electron DMG opens but chat does not work

The DMG bundles **UI only**. Start separately:

```bash
ollama serve
npm run start -w @jarvisos/backend
```

Unsigned app first launch: right-click → **Open**, or allow in Privacy & Security.

## Plan or chat very slow

Cold Ollama loads can take ~30s for first `/api/plan`. Keep `ollama serve` running and model pulled.

## Streaming vs non-streaming chat

- **Non-streaming:** `POST /api/chat` — primary UI path
- **SSE:** `POST /api/chat/stream` exists in backend; UI may not use it yet — see [../modules/backend.md](../modules/backend.md)

## Still stuck?

1. Run demo: `./scripts/demo.sh` or `npm run demo`
2. Check [STATUS.md](../../STATUS.md) verification table
3. Review [INTEGRATION.md](../../INTEGRATION.md#remaining-gaps-honest) for known MVP gaps

## Related links

- [QUICKSTART.md](../../QUICKSTART.md)
- [02-testing.md](./02-testing.md)
- [../modules/README.md](../modules/README.md)
