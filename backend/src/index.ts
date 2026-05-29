import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.js";
import { appConfig } from "./config.js";
import { getContainer, shutdownContainer } from "./services/container.js";

mkdirSync(dirname(appConfig.databasePath), { recursive: true });
mkdirSync(appConfig.uploadsDir, { recursive: true });

const app = createApp();

// Warm up singletons (DB migrate, registry) — does not require Ollama to be running
const { ollama } = getContainer();

const server = app.listen(appConfig.port, () => {
  console.log(
    `[jarvisos] API listening on http://127.0.0.1:${appConfig.port}`,
  );
  console.log(`[jarvisos] Ollama model: ${appConfig.ollama.model}`);
  console.log(`[jarvisos] Database: ${appConfig.databasePath}`);

  void ollama.healthCheck().then((check) => {
    if (check.ok && check.modelAvailable) {
      console.log("[jarvisos] Ollama: connected, model available");
    } else if (check.ok) {
      console.warn(
        `[jarvisos] Ollama: reachable but model "${appConfig.ollama.model}" not found — run: ollama pull ${appConfig.ollama.model}`,
      );
    } else {
      console.warn(
        `[jarvisos] Ollama: not reachable (${check.error ?? "unknown"}) — API will run; chat/plan need Ollama later`,
      );
    }
  });
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[jarvisos] Port ${appConfig.port} is already in use. Stop the other process or set PORT in .env`,
    );
  } else {
    console.error("[jarvisos] Server failed to start:", err.message);
  }
  process.exit(1);
});

function shutdown(signal: string): void {
  console.log(`[jarvisos] ${signal} received, shutting down`);
  server.close(() => {
    shutdownContainer();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
