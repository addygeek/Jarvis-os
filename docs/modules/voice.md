# @jarvisos/voice

Speech-to-text for JarvisOS. Mounted by the backend at `/api/voice` via `createVoiceRouter()`.

## Purpose

- Transcribe uploaded audio (multipart `audio` or JSON `audioPath`)
- Support multiple engines: **whisper.cpp** CLI, **Deepgram** cloud API, **@xenova/transformers** fallback
- Expose `/api/voice/health` with active engine id

## Key exports

| Export | Role |
|--------|------|
| `transcribe` | Main STT entry (`transcribe.ts`) |
| `createVoiceRouter` | Express router (`server.ts`) |
| `isDeepgramConfigured`, `isWhisperCliAvailable`, … | Capability probes |

Subpath export: `@jarvisos/voice/server` → `createVoiceRouter`.

## Key files

| Path | Role |
|------|------|
| `src/transcribe.ts` | Engine selection and transcription |
| `src/server.ts` | `/transcribe`, `/health` routes |
| `src/index.ts` | Public exports |

## Dependencies

| Package | Role |
|---------|------|
| `@deepgram/sdk` | Cloud STT when `DEEPGRAM_API_KEY` is set |
| `@xenova/transformers` | Local model fallback |
| `wavefile` | Audio format handling |
| `express`, `multer` | HTTP upload |

No dependency on `agent` or `memory`.

## Environment

| Variable | Purpose |
|----------|---------|
| `DEEPGRAM_API_KEY` | Enable Deepgram |
| `WHISPER_CLI` | Path to whisper.cpp binary (default `whisper`) |
| `WHISPER_MODEL_PATH` | Model file for `-m` |

See [.env.example](../../.env.example) and [INTEGRATION.md](../../INTEGRATION.md#voice-api--mounted).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build -w @jarvisos/voice` | `tsc` |
| `npm run voice:build` (root) | Alias for voice build |

Rebuild voice before backend when changing this package.

## How to extend

1. **New engine:** Add branch in `transcribe.ts`, extend `is*Available` helpers, document env vars in `.env.example`.
2. **New route:** Extend `server.ts`; keep mounted only from `backend/src/app.ts`.
3. **Frontend:** `frontend/src/pages/Voice.tsx` posts to `/api/voice/transcribe`.

## Related links

- [backend.md](./backend.md) — mount point
- [frontend.md](./frontend.md) — Voice page
- [../development/03-troubleshooting.md](../development/03-troubleshooting.md) — STT failures
