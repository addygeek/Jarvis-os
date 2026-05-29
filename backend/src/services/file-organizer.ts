import fs from "node:fs/promises";
import path from "node:path";
import { expandPath, folderScanTool } from "@jarvisos/tools";

export interface OrganizeMove {
  from: string;
  to: string;
  category: string;
  reason: string;
}

export interface OrganizeResult {
  folder: string;
  dryRun: boolean;
  scanned: number;
  moves: OrganizeMove[];
  createdFolders: string[];
  executed: number;
  errors: string[];
}

const EXT_CATEGORIES: Record<string, string> = {
  ".jpg": "Images",
  ".jpeg": "Images",
  ".png": "Images",
  ".gif": "Images",
  ".webp": "Images",
  ".heic": "Images",
  ".svg": "Images",
  ".pdf": "Documents",
  ".doc": "Documents",
  ".docx": "Documents",
  ".txt": "Documents",
  ".md": "Documents",
  ".rtf": "Documents",
  ".ppt": "Presentations",
  ".pptx": "Presentations",
  ".key": "Presentations",
  ".mp4": "Videos",
  ".mov": "Videos",
  ".avi": "Videos",
  ".mkv": "Videos",
  ".zip": "Archives",
  ".tar": "Archives",
  ".gz": "Archives",
  ".7z": "Archives",
  ".js": "Code",
  ".ts": "Code",
  ".tsx": "Code",
  ".py": "Code",
  ".java": "Code",
  ".go": "Code",
  ".rs": "Code",
  ".json": "Code",
};

const TOPIC_PATTERNS: { category: string; pattern: RegExp; reason: string }[] = [
  { category: "Invoices", pattern: /invoice|receipt|bill/i, reason: "filename suggests invoice/receipt" },
  { category: "Research", pattern: /paper|thesis|arxiv|acl|research|study/i, reason: "filename suggests research" },
  { category: "Projects", pattern: /project|repo|src|build/i, reason: "filename suggests project work" },
];

function classifyFile(name: string, ext: string | null): { category: string; reason: string } {
  const base = path.basename(name, ext ?? "");

  for (const rule of TOPIC_PATTERNS) {
    if (rule.pattern.test(name) || rule.pattern.test(base)) {
      return { category: rule.category, reason: rule.reason };
    }
  }

  if (ext && EXT_CATEGORIES[ext]) {
    return { category: EXT_CATEGORIES[ext], reason: `extension ${ext}` };
  }

  return { category: "Other", reason: "no matching heuristic" };
}

export async function organizeFolder(options: {
  folder: string;
  dryRun?: boolean;
  maxDepth?: number;
}): Promise<OrganizeResult> {
  const dryRun = options.dryRun !== false;
  const rootPath = expandPath(options.folder);

  const scanResult = await folderScanTool.execute({
    path: rootPath,
    maxDepth: options.maxDepth ?? 1,
    includeHidden: false,
    limit: 2000,
  });

  if (!scanResult.success || !scanResult.data) {
    throw new Error(scanResult.error ?? "Folder scan failed");
  }

  const data = scanResult.data as {
    path: string;
    files: { path: string; name: string; isDirectory: boolean; extension: string | null }[];
  };

  const moves: OrganizeMove[] = [];
  const createdFolders = new Set<string>();
  const errors: string[] = [];
  let executed = 0;

  const topLevelFiles = data.files.filter(
    (f) => !f.isDirectory && path.dirname(f.path) === rootPath,
  );

  for (const file of topLevelFiles) {
    const { category, reason } = classifyFile(file.name, file.extension);
    const targetDir = path.join(rootPath, category);
    const targetPath = path.join(targetDir, file.name);

    if (file.path === targetPath) continue;

    moves.push({
      from: file.path,
      to: targetPath,
      category,
      reason,
    });

    if (!dryRun) {
      try {
        await fs.mkdir(targetDir, { recursive: true });
        createdFolders.add(targetDir);
        await fs.rename(file.path, targetPath);
        executed++;
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      createdFolders.add(targetDir);
    }
  }

  return {
    folder: rootPath,
    dryRun,
    scanned: topLevelFiles.length,
    moves,
    createdFolders: [...createdFolders],
    executed,
    errors,
  };
}
