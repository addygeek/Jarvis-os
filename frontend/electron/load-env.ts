import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (`jarvisos/`), two levels above `frontend/electron/`. */
export const REPO_ROOT = path.resolve(__dirname, "../..");

/**
 * Load repo-root `.env` into `process.env` without overwriting existing vars.
 * Mirrors backend `config.ts` so Electron health checks use the same PORT/API URL.
 */
export function loadRepoEnv(): void {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Match backend bind address and avoid browser localhost/IPv6 quirks. */
function normalizeApiOrigin(url: string): string {
  return stripTrailingSlash(url).replace(
    /^http:\/\/localhost(?=[:/]|$)/i,
    "http://127.0.0.1",
  );
}

/** API origin for health checks and preload (honours JARVIS_API_URL, VITE_API_URL, PORT). */
export function resolveApiBase(): string {
  loadRepoEnv();

  const explicit =
    process.env.JARVIS_API_URL?.trim() || process.env.VITE_API_URL?.trim();
  if (explicit) return normalizeApiOrigin(explicit);

  const port = process.env.PORT?.trim() || "3847";
  return `http://127.0.0.1:${port}`;
}
