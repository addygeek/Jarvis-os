import { homedir } from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";

export const JARVIS_HOME = path.join(homedir(), "JarvisOS");
export const JARVIS_NOTES_DIR = path.join(JARVIS_HOME, "notes");
export const JARVIS_NOTES_DB = path.join(JARVIS_NOTES_DIR, "notes.db");
export const JARVIS_CALENDAR_DIR = path.join(JARVIS_HOME, "calendar");
export const JARVIS_EMAIL_DIR = path.join(JARVIS_HOME, "email");
export const JARVIS_EMAIL_DRAFTS_DIR = path.join(JARVIS_EMAIL_DIR, "drafts");
export const JARVIS_PRESENTATIONS_DIR = path.join(JARVIS_HOME, "presentations");

const SPECIAL_FOLDERS: Record<string, string> = {
  downloads: "Downloads",
  desktop: "Desktop",
  documents: "Documents",
  home: "",
};

export const BROWSER_APP_NAMES = new Set([
  "google chrome",
  "safari",
  "firefox",
  "arc",
  "microsoft edge",
  "chrome",
  "edge",
]);

export function resolveSpecialFolder(name: string): string {
  const key = name.toLowerCase().replace(/^~/, "").replace(/^\//, "");
  const folder = SPECIAL_FOLDERS[key];
  if (folder === undefined) {
    if (path.isAbsolute(name) || name.startsWith("~")) {
      return name.startsWith("~") ? path.join(homedir(), name.slice(1)) : name;
    }
    return path.resolve(name);
  }
  if (folder === "") {
    return homedir();
  }
  return path.join(homedir(), folder);
}

export function expandPath(input: string): string {
  if (input.startsWith("~/") || input === "~") {
    return path.join(homedir(), input.slice(1));
  }
  const lower = input.toLowerCase();
  if (lower in SPECIAL_FOLDERS) {
    return resolveSpecialFolder(lower);
  }
  return path.resolve(input);
}

export function resolveBrowserTarget(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Check if it exists on disk
  const expanded = trimmed.startsWith("~")
    ? trimmed.replace(/^~/, homedir())
    : trimmed;
  const absolutePath = path.isAbsolute(expanded) ? expanded : path.resolve(expanded);
  if (existsSync(absolutePath)) {
    return absolutePath;
  }

  // Check if it is URL-like
  const isUrlLike = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i.test(trimmed) ||
                    /^[a-z0-9.-]+:\d+/i.test(trimmed) ||
                    trimmed === "localhost" ||
                    trimmed.startsWith("localhost/");

  if (isUrlLike) {
    return `https://${trimmed}`;
  }

  // Fallback to Google Search
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
