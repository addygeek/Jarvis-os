import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { Tool } from "../types.js";
import { execFile } from "../utils/exec.js";
import { fail, ok, optionalString, requireString } from "../utils/result.js";
import { BROWSER_APP_NAMES, resolveBrowserTarget } from "../utils/paths.js";

/** Alias → macOS application name (for UI pickers and docs). */
export const APP_LAUNCHER_APPS: Record<string, string> = {
  chrome: "Google Chrome",
  safari: "Safari",
  firefox: "Firefox",
  vscode: "Visual Studio Code",
  "vs code": "Visual Studio Code",
  code: "Visual Studio Code",
  slack: "Slack",
  spotify: "Spotify",
  notes: "Notes",
  mail: "Mail",
  calendar: "Calendar",
  finder: "Finder",
  terminal: "Terminal",
  iterm: "iTerm",
  xcode: "Xcode",
  preview: "Preview",
  messages: "Messages",
  zoom: "zoom.us",
  discord: "Discord",
  notion: "Notion",
  figma: "Figma",
  arc: "Arc",
};

function resolveAppName(input: string): string {
  const key = input.toLowerCase().trim();
  return APP_LAUNCHER_APPS[key] ?? input;
}

export const appLauncherTool: Tool = {
  name: "app_launcher",
  description: "Launch macOS applications via `open -a` (Chrome, Safari, VS Code, Slack, etc.).",
  parameters: {
    type: "object",
    required: ["app"],
    properties: {
      app: { type: "string", description: "App name or alias (chrome, vscode, slack, ...)" },
      path: { type: "string", description: "Optional file or URL to open with the app" },
    },
  },
  async execute(params) {
    try {
      const appInput = requireString(params, "app");
      const appName = resolveAppName(appInput);
      const openPath = optionalString(params, "path");

      if (openPath) {
        let target = openPath;
        if (BROWSER_APP_NAMES.has(appName.toLowerCase().trim())) {
          target = resolveBrowserTarget(openPath);
        } else if (!openPath.startsWith("http")) {
          // Expand ~ and resolve relative paths against home directory
          const expanded = openPath.startsWith("~")
            ? openPath.replace(/^~/, homedir())
            : openPath;
          if (isAbsolute(expanded)) {
            target = expanded;
          } else {
            // Try home dir first, then cwd
            const fromHome = join(homedir(), expanded);
            target = existsSync(fromHome) ? fromHome : resolve(expanded);
          }
        }
        await execFile("open", ["-a", appName, target]);
        return ok({ app: appName, path: target }, `Opened ${appName} at ${target}`);
      }

      await execFile("open", ["-a", appName]);
      return ok({ app: appName }, `Launched ${appName}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
