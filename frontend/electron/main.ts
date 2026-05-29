import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRepoEnv, REPO_ROOT, resolveApiBase } from "./load-env.js";

loadRepoEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ??
  process.env.ELECTRON_RENDERER_URL ??
  "http://127.0.0.1:5173";

const API_BASE = resolveApiBase();
const HEALTH_URL = `${API_BASE}/api/health`;

let backendChild: ChildProcess | null = null;

async function checkBackendHealth(timeoutMs = 4000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(
  maxAttempts = 20,
  intervalMs = 1000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkBackendHealth()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

/**
 * Dev-only: start `@jarvisos/backend` as a child process.
 * Opt in with `JARVIS_SPAWN_BACKEND=1` when running `electron:dev`.
 * Never runs in packaged builds.
 */
function maybeSpawnBackendDev(): void {
  if (!isDev || process.env.JARVIS_SPAWN_BACKEND !== "1") return;

  backendChild = spawn("npm", ["run", "dev", "-w", "@jarvisos/backend"], {
    cwd: REPO_ROOT,
    stdio: "pipe",
    shell: true,
    env: { ...process.env },
  });

  backendChild.on("error", (err) => {
    console.error("[jarvisos] Backend spawn failed:", err.message);
  });
}

async function showBackendDownDialog(): Promise<boolean> {
  const { response } = await dialog.showMessageBox({
    type: "warning",
    title: "JarvisOS — Backend offline",
    message: "Cannot reach the JarvisOS API",
    detail: [
      `Health check: ${HEALTH_URL}`,
      "",
      "From the repo root:",
      "  npm run dev          # API + Vite UI",
      "  npm run dev:backend  # API only",
      "",
      "When the API is up you get chat, file upload/search, and voice transcription.",
      "",
      "For local reasoning:",
      "  ollama serve",
      "  ollama pull gemma4:e4b",
      "",
      "Voice needs DEEPGRAM_API_KEY or whisper.cpp in .env (see QUICKSTART.md).",
      "",
      isDev
        ? "Dev only: JARVIS_SPAWN_BACKEND=1 npm run electron:dev -w @jarvisos/frontend"
        : "The DMG does not bundle the API — start the backend before opening the app.",
    ].join("\n"),
    buttons: ["Continue anyway", "Quit"],
    defaultId: 0,
    cancelId: 1,
  });
  return response === 0;
}

function registerIpc(): void {
  ipcMain.handle("jarvis:open-doc", async (_event, relativePath: string) => {
    const safe = path.basename(relativePath);
    const full = path.join(REPO_ROOT, safe);
    const err = await shell.openPath(full);
    return err || null;
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: "#0a0c0f",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

function killSpawnedBackend(): void {
  if (backendChild && !backendChild.killed) {
    backendChild.kill("SIGTERM");
    backendChild = null;
  }
}

app.whenReady().then(async () => {
  registerIpc();
  maybeSpawnBackendDev();

  const online =
    backendChild !== null
      ? await waitForBackend()
      : await checkBackendHealth();

  if (!online) {
    const continueAnyway = await showBackendDownDialog();
    if (!continueAnyway) {
      killSpawnedBackend();
      app.quit();
      return;
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  killSpawnedBackend();
});
