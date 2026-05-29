import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveSpecialFolder } from "@jarvisos/tools";

export interface CleanupAction {
  type: "duplicate" | "junk" | "group";
  path: string;
  detail: string;
  suggestedAction?: "delete" | "archive" | "review";
  relatedPaths?: string[];
}

export interface CleanupPlan {
  desktop: string;
  scanned: number;
  duplicates: { hash: string; files: string[]; size: number }[];
  junk: CleanupAction[];
  groups: { label: string; paths: string[] }[];
  actions: CleanupAction[];
  execute: boolean;
  executed: { deleted: string[]; errors: string[] };
}

const JUNK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\.DS_Store$/i, label: "macOS metadata" },
  { pattern: /^Thumbs\.db$/i, label: "Windows thumbnail cache" },
  { pattern: /^~\$/, label: "Office temp lock file" },
  { pattern: /\.tmp$/i, label: "temporary file" },
  { pattern: /\.download$/i, label: "incomplete download" },
  { pattern: /^\.localized$/i, label: "Finder localized strings" },
];

async function hashFile(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

function isJunk(name: string): string | null {
  for (const { pattern, label } of JUNK_PATTERNS) {
    if (pattern.test(name)) return label;
  }
  return null;
}

function groupByExtension(files: { path: string; name: string }[]): { label: string; paths: string[] }[] {
  const map = new Map<string, string[]>();
  for (const f of files) {
    const ext = path.extname(f.name).toLowerCase() || "(no extension)";
    const list = map.get(ext) ?? [];
    list.push(f.path);
    map.set(ext, list);
  }
  return [...map.entries()]
    .filter(([, paths]) => paths.length >= 2)
    .map(([ext, paths]) => ({ label: ext, paths }))
    .sort((a, b) => b.paths.length - a.paths.length);
}

export async function buildDesktopCleanupPlan(execute = false): Promise<CleanupPlan> {
  const desktop = resolveSpecialFolder("desktop");
  const entries = await fs.readdir(desktop, { withFileTypes: true });

  const files: { path: string; name: string; size: number }[] = [];
  const junk: CleanupAction[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(desktop, entry.name);
    if (!entry.isFile()) continue;

    const junkLabel = isJunk(entry.name);
    if (junkLabel) {
      junk.push({
        type: "junk",
        path: fullPath,
        detail: junkLabel,
        suggestedAction: "delete",
      });
      continue;
    }

    const stat = await fs.stat(fullPath);
    files.push({ path: fullPath, name: entry.name, size: stat.size });
  }

  const hashMap = new Map<string, string[]>();
  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) continue;
    try {
      const hash = await hashFile(file.path);
      const list = hashMap.get(hash) ?? [];
      list.push(file.path);
      hashMap.set(hash, list);
    } catch {
      // skip unreadable
    }
  }

  const duplicates = [...hashMap.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([hash, paths]) => ({
      hash,
      files: paths,
      size: files.find((f) => f.path === paths[0])?.size ?? 0,
    }));

  const duplicateActions: CleanupAction[] = duplicates.flatMap((dup) =>
    dup.files.slice(1).map((p) => ({
      type: "duplicate" as const,
      path: p,
      detail: `Duplicate of ${dup.files[0]}`,
      suggestedAction: "review" as const,
      relatedPaths: dup.files,
    })),
  );

  const groups = groupByExtension(files);
  const groupActions: CleanupAction[] = groups.map((g) => ({
    type: "group",
    path: g.paths[0]!,
    detail: `${g.paths.length} files with extension ${g.label}`,
    suggestedAction: "review",
    relatedPaths: g.paths,
  }));

  const executed = { deleted: [] as string[], errors: [] as string[] };

  if (execute) {
    for (const item of junk) {
      if (item.suggestedAction !== "delete") continue;
      try {
        await fs.unlink(item.path);
        executed.deleted.push(item.path);
      } catch (err) {
        executed.errors.push(
          `${item.path}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return {
    desktop,
    scanned: files.length + junk.length,
    duplicates,
    junk,
    groups,
    actions: [...junk, ...duplicateActions, ...groupActions],
    execute,
    executed,
  };
}
