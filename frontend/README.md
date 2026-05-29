# JarvisOS Frontend

Electron + React + TypeScript desktop UI for **JarvisOS** — a local, privacy-first AI operating system layer for macOS (per [PRD](../prd.md)).

## Stack

- **Electron** — native shell, secure preload (`contextBridge`)
- **React 19** + **TypeScript**
- **Vite** — dev server and production build
- **Tailwind CSS** — dark, macOS-native aesthetic
- **React Router** — Dashboard, Chat, Voice, Files, Tools, Settings

## Backend

The UI expects the JarvisOS API at **`http://localhost:3847`** (override with `VITE_API_URL`).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Backend + Ollama status |
| `POST /api/chat` | Send message (non-streaming) |
| `POST /api/chat/stream` | SSE streaming chat |
| `POST /api/voice` | Voice activation (Whisper on backend) |
| `GET /api/tools` | Tool registry status |
| `POST /api/files/upload` | Drag-and-drop uploads |
| `GET /api/files/search?q=` | File search |

## Quick start

From the repo root (npm workspaces):

```bash
npm install
```

Or only the frontend workspace:

```bash
npm install -w @jarvisos/frontend
```

### Web only (Vite)

```bash
cd frontend && npm run dev
# or from root:
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). API calls go to `localhost:3847`; start the backend separately.

### Electron (recommended on macOS)

```bash
cd frontend && npm run electron:dev
```

This compiles `electron/`, starts Vite, then launches Electron with `hiddenInset` title bar and traffic lights.

### Production build

```bash
npm run build          # Vite + electron TypeScript
npm run electron:build # Package with electron-builder (stub config in package.json)
```

## Project layout

```
frontend/
├── electron/
│   ├── main.ts       # BrowserWindow, macOS chrome
│   └── preload.ts    # contextBridge → window.jarvis
├── src/
│   ├── lib/api.ts    # Backend client
│   ├── types/        # ChatMessage, PlanStep, ToolResult, …
│   ├── components/   # Sidebar, FileDropZone, PlanStepsPanel, …
│   └── pages/        # Dashboard, Chat, Voice, Files, Tools, Settings
├── index.html
└── tailwind.config.js
```

## Features

- **Dashboard** — system status, quick actions, demo prompts
- **Chat** — message history, optional SSE streaming, agent plan sidebar
- **Voice** — activation button → `POST /api/voice` (UI stub until backend ready)
- **Files** — drag-and-drop upload + search
- **Tools** — tool grid with live/fallback status
- **Settings** — API URL, health refresh, Electron version

## Environment

```bash
# optional
VITE_API_URL=http://localhost:3847
```

## Notes

- Voice and Whisper run on the **backend**; this repo only implements the UI trigger.
- Ollama connection indicator polls `/api/health` every 10s.
- CSP in `index.html` allows connections to `localhost:3847`.
