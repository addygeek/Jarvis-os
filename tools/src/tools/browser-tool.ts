import type { Tool } from "../types.js";
import { execFile, openUrl } from "../utils/exec.js";
import { fail, ok, optionalString, requireString } from "../utils/result.js";
import { resolveBrowserTarget } from "../utils/paths.js";

const BROWSER_APPS: Record<string, string> = {
  chrome: "Google Chrome",
  safari: "Safari",
  firefox: "Firefox",
  arc: "Arc",
  edge: "Microsoft Edge",
};

function buildGoogleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export const browserTool: Tool = {
  name: "browser",
  description: "Open URLs, launch Chrome/Safari, or search Google in the default or specified browser.",
  parameters: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["open_url", "open_browser", "search_google"],
      },
      url: { type: "string", description: "URL to open" },
      browser: {
        type: "string",
        enum: ["chrome", "safari", "firefox", "arc", "edge"],
        description: "Browser to use with open_browser",
      },
      query: { type: "string", description: "Google search query" },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");

      switch (action) {
        case "open_url": {
          const url = requireString(params, "url");
          const normalized = url.startsWith("http") ? url : `https://${url}`;
          await openUrl(normalized);
          return ok({ url: normalized }, "Opened URL");
        }

        case "open_browser": {
          const browserKey = (optionalString(params, "browser") ?? "chrome").toLowerCase();
          const appName = BROWSER_APPS[browserKey];
          if (!appName) {
            return fail(`Unknown browser: ${browserKey}`);
          }
          const url = optionalString(params, "url");
          if (url) {
            const target = resolveBrowserTarget(url);
            await execFile("open", ["-a", appName, target]);
            return ok({ browser: appName, url: target }, "Opened browser with URL");
          }
          await execFile("open", ["-a", appName]);
          return ok({ browser: appName }, "Opened browser");
        }

        case "search_google": {
          const query = requireString(params, "query");
          const searchUrl = buildGoogleSearchUrl(query);
          const browserKey = optionalString(params, "browser");
          if (browserKey) {
            const appName = BROWSER_APPS[browserKey.toLowerCase()];
            if (!appName) {
              return fail(`Unknown browser: ${browserKey}`);
            }
            await execFile("open", ["-a", appName, searchUrl]);
            return ok({ query, url: searchUrl, browser: appName }, "Google search opened");
          }
          await openUrl(searchUrl);
          return ok({ query, url: searchUrl }, "Google search opened in default browser");
        }

        default:
          return fail(`Unknown action: ${action}`);
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
