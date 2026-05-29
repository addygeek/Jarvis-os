import { toolRegistry } from "@jarvisos/tools";

export interface SearchHit {
  path: string;
  name: string;
  folder: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
}

export interface DesktopSearchInput {
  query: string;
  folders?: Array<"desktop" | "downloads" | "documents">;
  extensions?: string[];
  limit?: number;
}

interface FolderScanFile {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  extension: string | null;
}

function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q);
}

export async function searchUserFiles(
  input: DesktopSearchInput,
): Promise<{ query: string; results: SearchHit[]; count: number }> {
  const folders = input.folders ?? ["desktop", "downloads", "documents"];
  const limit = input.limit ?? 100;
  const query = input.query.trim();

  if (!query) {
    return { query, results: [], count: 0 };
  }

  const hits: SearchHit[] = [];

  for (const folder of folders) {
    const scanResult = await toolRegistry.execute("folder_scan", {
      path: folder,
      maxDepth: 4,
      limit: 500,
      extensions: input.extensions,
    });

    if (!scanResult.success || !scanResult.data) continue;

    const data = scanResult.data as {
      path: string;
      files: FolderScanFile[];
    };

    for (const file of data.files) {
      if (file.isDirectory) continue;
      if (!matchesQuery(file.name, query)) continue;

      hits.push({
        path: file.path,
        name: file.name,
        folder,
        isDirectory: false,
        size: file.size,
        modifiedAt: file.modifiedAt,
      });
    }
  }

  hits.sort((a, b) => a.name.localeCompare(b.name));
  const results = hits.slice(0, limit);

  return { query, results, count: results.length };
}
