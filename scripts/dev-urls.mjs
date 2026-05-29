#!/usr/bin/env node
/**
 * Print dev server URLs (reads repo-root .env for PORT).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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

const port = process.env.PORT?.trim() || "3847";
const api = (
  process.env.JARVIS_API_URL?.trim() ||
  process.env.VITE_API_URL?.trim() ||
  `http://127.0.0.1:${port}`
).replace(/\/$/, "");

console.log(`
\x1b[1mJarvisOS dev\x1b[0m
  API   ${api}/api/health
  UI    http://localhost:5173
  Model gemma4:e4b (ollama pull gemma4:e4b)
`);
