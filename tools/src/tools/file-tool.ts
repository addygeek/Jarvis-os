import fs from "node:fs/promises";
import path from "node:path";
import type { Tool } from "../types.js";
import { expandPath, resolveSpecialFolder } from "../utils/paths.js";
import { fail, ok, optionalString, requireString } from "../utils/result.js";

const MAX_READ_BYTES = 512 * 1024;

async function listDirectory(dirPath: string): Promise<{ name: string; path: string; isDirectory: boolean }[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    isDirectory: entry.isDirectory(),
  }));
}

async function scanFolderShallow(dirPath: string, pattern?: string): Promise<unknown[]> {
  const entries = await listDirectory(dirPath);
  if (!pattern) {
    return entries;
  }
  const re = new RegExp(pattern, "i");
  return entries.filter((e) => re.test(e.name));
}

export const fileTool: Tool = {
  name: "file",
  description:
    "Read, move, delete, rename, list, or scan files in user folders (Downloads, Desktop, Documents) or absolute paths.",
  parameters: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["read", "move", "delete", "rename", "list", "scan"],
        description: "Operation to perform",
      },
      path: { type: "string", description: "File or directory path, or special folder name" },
      source: { type: "string", description: "Source path for move/rename" },
      destination: { type: "string", description: "Destination path for move/rename" },
      newName: { type: "string", description: "New filename for rename" },
      pattern: { type: "string", description: "Regex pattern for scan filter" },
      encoding: { type: "string", enum: ["utf8", "base64"], default: "utf8" },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");

      switch (action) {
        case "read": {
          const filePath = expandPath(requireString(params, "path"));
          const stat = await fs.stat(filePath);
          if (stat.size > MAX_READ_BYTES) {
            return fail(`File too large (${stat.size} bytes). Max ${MAX_READ_BYTES} bytes.`);
          }
          const encoding = optionalString(params, "encoding") ?? "utf8";
          if (encoding === "base64") {
            const buf = await fs.readFile(filePath);
            return ok({ path: filePath, content: buf.toString("base64"), encoding: "base64" });
          }
          const content = await fs.readFile(filePath, "utf8");
          return ok({ path: filePath, content, encoding: "utf8" });
        }

        case "list": {
          const folder = params.path ? expandPath(String(params.path)) : resolveSpecialFolder("downloads");
          const entries = await listDirectory(folder);
          return ok({ path: folder, entries });
        }

        case "scan": {
          const folder = params.path ? expandPath(String(params.path)) : resolveSpecialFolder("downloads");
          const pattern = optionalString(params, "pattern");
          const matches = await scanFolderShallow(folder, pattern);
          return ok({ path: folder, matches, count: matches.length });
        }

        case "move": {
          const source = expandPath(requireString(params, "source"));
          const destination = expandPath(requireString(params, "destination"));
          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.rename(source, destination);
          return ok({ source, destination }, "File moved");
        }

        case "rename": {
          const source = expandPath(requireString(params, "source"));
          const newName = requireString(params, "newName");
          const destination = path.join(path.dirname(source), newName);
          await fs.rename(source, destination);
          return ok({ source, destination }, "File renamed");
        }

        case "delete": {
          const target = expandPath(requireString(params, "path"));
          const stat = await fs.stat(target);
          if (stat.isDirectory()) {
            await fs.rm(target, { recursive: true });
          } else {
            await fs.unlink(target);
          }
          return ok({ path: target }, "Deleted");
        }

        default:
          return fail(`Unknown action: ${action}`);
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
