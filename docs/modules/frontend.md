# @jarvisos/frontend

Electron + React desktop UI for JarvisOS. Vite dev server on port **5173**; production build outputs static assets and an Electron main/preload bundle.

## Purpose

- Dashboard, chat, agent task UI, voice capture, file upload/search, tools browser, settings
- Optional **Electron** shell with API health check on port **3847**
- Proxies `/api` to the backend during Vite dev (`vite.config.ts`)

## Key paths

| Path | Role |
|------|------|
| `src/main.tsx` | React entry |
| `src/App.tsx` | Routes: `/`, `/chat`, `/agent`, `/voice`, `/files`, `/tools`, `/settings` |
| `src/lib/api.ts` | HTTP client for backend routes |
| `src/lib/backend-types.ts` | Shared API types |
| `src/context/BackendContext.tsx` | Health polling, offline state |
| `src/hooks/useBackend.ts` | Backend connectivity hook |
| `src/pages/*.tsx` | Feature pages |
| `src/components/` | Layout, sidebar, plan panel, file drop, Ollama status |
| `electron/main.ts` | Electron main process, health check, optional backend spawn |
| `electron/preload.ts` | Preload bridge |
| `electron/load-env.ts` | Loads repo `.env` for Electron |
| `vite.config.ts` | Dev server, `/api` proxy, aliases (`@/`) |

## Dependencies

| Depends on | How |
|------------|-----|
| `@jarvisos/backend` | Runtime HTTP only (not an npm dependency) |
| Ollama | Indirect via backend `/api/health` |

No workspace npm dependencies on `agent`, `tools`, or `memory`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -w @jarvisos/frontend` | Vite only (`:5173`) |
| `npm run electron:dev -w @jarvisos/frontend` | Vite + Electron |
| `npm run build -w @jarvisos/frontend` | `tsc`, Vite build, Electron compile |
| `npm run package` (from `frontend/`) | `electron-builder` → `frontend/release/*.dmg` |

Environment (build/runtime):

- `VITE_API_URL` — API base for production builds (default `http://localhost:3847`)
- `JARVIS_API_URL` — Electron health-check override
- `JARVIS_SPAWN_BACKEND=1` — Dev only: spawn `dev:backend` from Electron main

## How to extend

1. **New page:** Add `src/pages/MyPage.tsx`, route in `App.tsx`, nav link in `Sidebar.tsx`.
2. **New API call:** Extend `src/lib/api.ts` and types in `backend-types.ts`.
3. **Shared UI state:** Use existing contexts (`AppContext`, `ToastContext`, `PendingChatMessageContext`) or add a focused context under `src/context/`.
4. **Electron behavior:** Edit `electron/main.ts` (health URL, spawn logic).

Rebuild Electron after main/preload changes:

```bash
npm run electron:build -w @jarvisos/frontend
```

## Related links

- [backend.md](./backend.md) — API routes the UI calls
- [INTEGRATION.md](../../INTEGRATION.md#electron-production) — DMG packaging
- [../development/03-troubleshooting.md](../development/03-troubleshooting.md) — offline banner, ports
