# JarvisOS Voice Module

Speech-to-text for JarvisOS. Engine priority:

1. **Deepgram** (`DEEPGRAM_API_KEY`) — accepts browser WebM/OGG directly (recommended for production).
2. **whisper.cpp CLI** (`WHISPER_CLI`) — local; WebM should be converted first (see ffmpeg).
3. **@xenova/transformers** (`Xenova/whisper-tiny.en`) — dev fallback; needs **16 kHz mono WAV** (use ffmpeg to convert WebM).

## API

```ts
import { transcribe } from "@jarvisos/voice";

const text = await transcribe("/path/to/audio.wav");
// or
const text2 = await transcribe(audioBuffer, "audio/webm");
```

## Backend mount

Mounted in `backend/src/app.ts`:

```ts
import { createVoiceRouter } from "@jarvisos/voice/server";

app.use("/api/voice", createVoiceRouter());
```

**POST** `/api/voice/transcribe`

| Input | Body |
|--------|------|
| Upload | `multipart/form-data`, field `audio` |
| Local path | `{ "audioPath": "/absolute/path.wav" }` |

**Response:** `{ "text": "..." }`

**GET** `/api/voice/health` — reports `engine`, `deepgram`, `whisper`, `ffmpeg`, `transformers`.

## Browser recording (WebM)

The Voice UI uses `MediaRecorder` (typically `audio/webm`). Without Deepgram:

| Setup | WebM from browser |
|--------|-------------------|
| `DEEPGRAM_API_KEY` set | Works |
| `ffmpeg` on PATH | Converted to 16 kHz mono WAV automatically |
| whisper.cpp only, no ffmpeg | Likely fails on raw WebM |
| transformers only, no ffmpeg | Error with install hint |

Install ffmpeg on macOS:

```bash
brew install ffmpeg
ffmpeg -version
```

For reliable local dev **without** cloud STT, you can also record/upload **16 kHz mono WAV** (Audacity, `sox`, etc.).

## Frontend flow

1. User taps record → `getUserMedia` + `MediaRecorder`.
2. On stop → `POST /api/voice/transcribe` with `FormData` field `audio`.
3. Optional: **Send transcript to chat** → `POST /api/chat` with the transcribed text.

## macOS microphone permissions

JarvisOS (Electron) or the browser needs mic access:

1. **System Settings → Privacy & Security → Microphone**
2. Enable the app you use to run JarvisOS:
   - **JarvisOS.app** (packaged Electron)
   - **Google Chrome** / **Safari** (if using the web UI)
   - **Cursor** or **Terminal** only if you run a dev server that opens a browser from that context — the permission applies to the app that actually captures audio (usually the browser or Electron shell).

If permission was denied earlier:

- Remove the app from the list (or toggle off/on), quit the app fully, reopen, and trigger recording again so macOS shows the prompt.

**TCC reset (last resort, requires admin):**

```bash
# Replace bundle id / app name as appropriate for your build
tccutil reset Microphone com.jarvisos.app
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `400` — no audio field | Empty recording or wrong form field | Use field name `audio`; record ≥ ~0.5 s |
| `404` on transcribe | Voice router not mounted | Rebuild backend; confirm `app.use("/api/voice", …)` |
| `500` — ffmpeg / WebM | Local path without Deepgram | `brew install ffmpeg` or set `DEEPGRAM_API_KEY` |
| `500` — no engine | No Deepgram, whisper, or transformers | Set API key or install whisper.cpp |
| Empty transcript | Silence or very short clip | Speak clearly; check mic input level |
| Mic works in other apps, not Jarvis | Wrong app in Privacy settings | Enable mic for browser/Electron, not only Terminal |
| First transformers call slow | Model download | Wait; cache under `node_modules/@xenova/transformers/.cache` |
| whisper.cpp errors on WebM | CLI expects WAV | Install ffmpeg or use Deepgram |

## whisper.cpp (optional, faster local)

```bash
# Build from https://github.com/ggerganov/whisper.cpp
export WHISPER_CLI=/path/to/whisper
export WHISPER_MODEL_PATH=/path/to/ggml-base.en.bin
```

## Environment

| Variable | Description |
|----------|-------------|
| `DEEPGRAM_API_KEY` | Deepgram API key (primary; WebM OK) |
| `WHISPER_CLI` | whisper.cpp binary name or path (default: `whisper`) |
| `WHISPER_MODEL_PATH` | Optional `-m` model for whisper.cpp |
| `WHISPER_TRANSFORMERS_MODEL` | Hugging Face id for transformers fallback (default: `Xenova/whisper-tiny.en`) |

## Build

```bash
npm run voice:build
# from repo root
npm run build
```
