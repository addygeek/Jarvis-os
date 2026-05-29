# JarvisOS — 5-minute quickstart

Get chat working locally with **Gemma 4 E4B** (`gemma4:e4b`) via Ollama.

## 1. Prerequisites

| Tool | Install |
|------|---------|
| **macOS** | Primary target for tools and Electron |
| **Node.js 20+** | [nodejs.org](https://nodejs.org) or `brew install node` |
| **Ollama** | [ollama.com](https://ollama.com) or `brew install ollama` |

## 2. Clone and install

```bash
git clone <your-repo-url> jarvisos
cd jarvisos
chmod +x scripts/setup.sh
./scripts/setup.sh
```

`setup.sh` creates `.env`, runs `npm install`, and builds workspaces.

## 3. Pull the default model

```bash
ollama serve          # separate terminal if not already running
ollama pull gemma4:e4b
```

Verify:

```bash
ollama list | grep gemma4
```

## 4. Start the stack

From the repo root:

```bash
npm run dev
```

This starts:

- **Backend API** — `http://127.0.0.1:3847`
- **Vite UI** — `http://localhost:5173` (proxies `/api` → `:3847`)

## 5. Open the UI

**Browser (fastest):** open [http://localhost:5173](http://localhost:5173)

**Electron shell (optional):**

```bash
npm run electron:dev -w @jarvisos/frontend
```

If the API is not running, Electron shows a dialog with start instructions.

**Auto-start the API in dev** (Electron only — spawns `dev:backend` as a child process):

```bash
JARVIS_SPAWN_BACKEND=1 npm run electron:dev -w @jarvisos/frontend
```

Set `JARVIS_API_URL` or `VITE_API_URL` in `.env` if your API is not on port **3847**.

## 6. First chat

1. Open **Chat** in the sidebar.
2. Type a message, e.g. `What tools do you have?`
3. Send — you should get a reply when Ollama and `gemma4:e4b` are available.

Health check:

```bash
curl -s http://127.0.0.1:3847/api/health | head
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend offline banner | Run `npm run dev` or `npm run dev:backend` |
| Ollama disconnected | `ollama serve` and `ollama pull gemma4:e4b` |
| Wrong port | Default API port is **3847** — set `PORT`, `VITE_API_URL` in `.env` |
| Voice transcription fails | Set `DEEPGRAM_API_KEY` in `.env`, or install whisper.cpp (`WHISPER_CLI` / `WHISPER_MODEL_PATH`); see [INTEGRATION.md](INTEGRATION.md) |

## Next steps

- Full architecture: [README.md](README.md)
- Package map and gaps: [INTEGRATION.md](INTEGRATION.md)
- Demo script: `npm run demo` or `./scripts/demo.sh`
- Model options: [models/README.md](models/README.md)
