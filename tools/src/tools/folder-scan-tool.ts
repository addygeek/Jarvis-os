import fs from "node:fs/promises";
import path from "node:path";
import type { Tool } from "../types.js";
import { expandPath, resolveSpecialFolder } from "../utils/paths.js";
import { fail, ok, optionalBoolean, optionalNumber, optionalString } from "../utils/result.js";

export interface FileMetadata {
  path: string;
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  createdAt: string;
  modifiedAt: string;
  extension: string | null;
}

async function scanRecursive(
  rootPath: string,
  options: {
    maxDepth: number;
    includeHidden: boolean;
    extensions?: string[];
  },
  currentDepth = 0,
  relative = "",
): Promise<FileMetadata[]> {
  if (currentDepth > options.maxDepth) {
    return [];
  }

  const results: FileMetadata[] = [];
  let entries;

  try {
    entries = await fs.readdir(path.join(rootPath, relative), { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!options.includeHidden && entry.name.startsWith(".")) {
      continue;
    }

    const rel = relative ? path.join(relative, entry.name) : entry.name;
    const fullPath = path.join(rootPath, rel);

    let stat;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      continue;
    }

    const ext = entry.isFile() ? path.extname(entry.name).toLowerCase() || null : null;

    if (options.extensions?.length && entry.isFile()) {
      if (!ext || !options.extensions.includes(ext)) {
        continue;
      }
    }

    results.push({
      path: fullPath,
      name: entry.name,
      relativePath: rel,
      isDirectory: entry.isDirectory(),
      size: stat.size,
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: stat.mtime.toISOString(),
      extension: ext,
    });

    if (entry.isDirectory()) {
      const nested = await scanRecursive(rootPath, options, currentDepth + 1, rel);
      results.push(...nested);
    }
  }

  return results;
}

interface FolderScanCacheEntry {
  data: any;
  timestamp: number;
}
const folderScanCache = new Map<string, FolderScanCacheEntry>();
const FOLDER_SCAN_TTL = 15 * 1000; // 15 seconds

export const folderScanTool: Tool = {
  name: "folder_scan",
  description:
    "Recursively scan a folder with file metadata (size, dates, extension). Supports Downloads, Desktop, Documents.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Folder path or special name (downloads, desktop, documents)" },
      maxDepth: { type: "number", default: 5 },
      includeHidden: { type: "boolean", default: false },
      extensions: {
        type: "array",
        items: { type: "string" },
        description: "Filter by extensions e.g. [\".pdf\", \".docx\"]",
      },
      limit: { type: "number", default: 500 },
    },
  },
  async execute(params) {
    try {
      const folderInput = optionalString(params, "path") ?? "downloads";
      const rootPath =
        folderInput.toLowerCase() in { downloads: 1, desktop: 1, documents: 1, home: 1 }
          ? resolveSpecialFolder(folderInput)
          : expandPath(folderInput);

      const maxDepth = optionalNumber(params, "maxDepth") ?? 5;
      const includeHidden = optionalBoolean(params, "includeHidden") ?? false;
      const limit = optionalNumber(params, "limit") ?? 500;

      const extensions = Array.isArray(params.extensions)
        ? params.extensions
            .filter((v): v is string => typeof v === "string")
            .map((e) => (e.startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`))
        : undefined;

      // Create a cache key using serialization of parameters
      const cacheKey = JSON.stringify({
        rootPath,
        maxDepth,
        includeHidden,
        limit,
        extensions,
      });

      const cached = folderScanCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < FOLDER_SCAN_TTL)) {
        return cached.data;
      }

      const all = await scanRecursive(rootPath, { maxDepth, includeHidden, extensions });
      const truncated = all.length > limit;
      const files = all.slice(0, limit);

      const summary = {
        totalFiles: files.filter((f) => !f.isDirectory).length,
        totalDirectories: files.filter((f) => f.isDirectory).length,
        totalSize: files.filter((f) => !f.isDirectory).reduce((sum, f) => sum + f.size, 0),
      };

      const result = ok({
        path: rootPath,
        files,
        count: files.length,
        truncated,
        summary,
      });

      folderScanCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
