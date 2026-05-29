import type { Tool } from "../types.js";
import { execFile, runOsascript } from "../utils/exec.js";
import { fail, ok, optionalBoolean, optionalNumber, requireString } from "../utils/result.js";

async function setVolume(level: number): Promise<number> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  await runOsascript(`set volume output volume ${clamped}`);
  const current = await runOsascript("output volume of (get volume settings)");
  return Number.parseInt(current, 10);
}

async function getVolume(): Promise<number> {
  const current = await runOsascript("output volume of (get volume settings)");
  return Number.parseInt(current, 10);
}

async function setDarkMode(enabled: boolean): Promise<boolean> {
  const value = enabled ? "true" : "false";
  await runOsascript(`tell application "System Events" to tell appearance preferences to set dark mode to ${value}`);
  return enabled;
}

async function getDarkMode(): Promise<boolean> {
  const result = await runOsascript(
    `tell application "System Events" to tell appearance preferences to return dark mode`,
  );
  return result === "true";
}

export const systemTool: Tool = {
  name: "system",
  description: "macOS system actions: volume control, dark mode, open WiFi/network settings.",
  parameters: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["set_volume", "get_volume", "set_dark_mode", "get_dark_mode", "open_wifi_settings"],
      },
      level: { type: "number", description: "Volume 0-100 for set_volume" },
      enabled: { type: "boolean", description: "Dark mode on/off for set_dark_mode" },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");

      switch (action) {
        case "set_volume": {
          const level = optionalNumber(params, "level");
          if (level === undefined) {
            return fail("Missing required parameter: level (0-100)");
          }
          const volume = await setVolume(level);
          return ok({ volume }, `Volume set to ${volume}`);
        }

        case "get_volume": {
          const volume = await getVolume();
          return ok({ volume });
        }

        case "set_dark_mode": {
          const enabled = optionalBoolean(params, "enabled");
          if (enabled === undefined) {
            return fail("Missing required parameter: enabled (boolean)");
          }
          await setDarkMode(enabled);
          return ok({ darkMode: enabled }, `Dark mode ${enabled ? "enabled" : "disabled"}`);
        }

        case "get_dark_mode": {
          const darkMode = await getDarkMode();
          return ok({ darkMode });
        }

        case "open_wifi_settings": {
          await execFile("open", [
            "x-apple.systempreferences:com.apple.preference.network?Wi-Fi",
          ]);
          return ok({}, "Opened WiFi settings");
        }

        default:
          return fail(`Unknown action: ${action}`);
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
