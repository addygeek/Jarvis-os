import fs from "node:fs/promises";
import path from "node:path";
import { summarizeDocuments } from "@jarvisos/documents";
import { expandPath } from "@jarvisos/tools";
import type { SummaryResult } from "@jarvisos/documents";

export interface ResearchSummarizeInput {
  paths?: string[];
  folder?: string;
  maxPdfs?: number;
}

async function collectPdfsRecursive(
  dirPath: string,
  maxDepth: number,
  depth = 0,
  acc: string[] = [],
): Promise<string[]> {
  if (depth > maxDepth) return acc;

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectPdfsRecursive(fullPath, maxDepth, depth + 1, acc);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      acc.push(fullPath);
    }
  }

  return acc;
}

export async function researchSummarize(
  input: ResearchSummarizeInput,
): Promise<SummaryResult> {
  const maxPdfs = input.maxPdfs ?? 25;
  const pdfPaths: string[] = [];

  if (input.paths?.length) {
    for (const p of input.paths) {
      const resolved = expandPath(p);
      const stat = await fs.stat(resolved);
      if (stat.isDirectory()) {
        const fromDir = await collectPdfsRecursive(resolved, 5);
        pdfPaths.push(...fromDir);
      } else if (resolved.toLowerCase().endsWith(".pdf")) {
        pdfPaths.push(resolved);
      }
    }
  }

  if (input.folder) {
    const folderPath = expandPath(input.folder);
    const fromFolder = await collectPdfsRecursive(folderPath, 5);
    pdfPaths.push(...fromFolder);
  }

  const unique = [...new Set(pdfPaths)].slice(0, maxPdfs);

  const result = await summarizeDocuments(unique);

  return {
    summary: result.summary,
    keyFindings: result.keyFindings,
    researchGaps: result.researchGaps,
    sources: result.sources,
  };
}
