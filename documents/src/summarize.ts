import { access } from "node:fs/promises";
import type { ExtractedDocument, SummaryResult } from "./types.js";
import { extractPdfText } from "./pdf.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e4b";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function extractDocument(path: string): Promise<ExtractedDocument> {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const text = await extractPdfText(path);
    return { path, text };
  }
  throw new Error(`Unsupported document type: ${path}. MVP supports PDF only.`);
}

function truncateForPrompt(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[... truncated ...]`;
}

function parseStructuredResponse(raw: string, sources: string[]): SummaryResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<SummaryResult>;
      return {
        summary: String(parsed.summary ?? "").trim() || raw.trim(),
        keyFindings: Array.isArray(parsed.keyFindings)
          ? parsed.keyFindings.map(String)
          : [],
        researchGaps: Array.isArray(parsed.researchGaps)
          ? parsed.researchGaps.map(String)
          : [],
        sources,
      };
    } catch {
      /* fall through */
    }
  }

  return {
    summary: raw.trim(),
    keyFindings: [],
    researchGaps: [],
    sources,
  };
}

async function summarizeWithOllama(docs: ExtractedDocument[]): Promise<SummaryResult> {
  const corpus = docs
    .map(
      (d, i) =>
        `### Document ${i + 1}: ${d.path}\n${truncateForPrompt(d.text, 8000)}`,
    )
    .join("\n\n");

  const prompt = `You are a research assistant. Analyze the following documents and respond with ONLY valid JSON (no markdown fences) in this shape:
{
  "summary": "2-4 paragraph executive summary",
  "keyFindings": ["finding 1", "finding 2"],
  "researchGaps": ["gap 1", "gap 2"]
}

Documents:
${corpus}`;

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed (${res.status}): ${await res.text()}`);
  }

  const body = (await res.json()) as { response?: string };
  return parseStructuredResponse(body.response ?? "", docs.map((d) => d.path));
}

function summarizeOffline(docs: ExtractedDocument[]): SummaryResult {
  const combined = docs.map((d) => d.text).join("\n\n");
  const words = combined.split(/\s+/).filter(Boolean);
  const preview = words.slice(0, 120).join(" ");

  return {
    summary:
      docs.length === 0
        ? "No documents provided."
        : `Offline summary (${docs.length} PDFs, ~${words.length} words): ${preview}${words.length > 120 ? "…" : ""}`,
    keyFindings: [
      `Processed ${docs.length} document(s) locally without Ollama.`,
      "Start Ollama and pull gemma4:e4b for AI-generated findings.",
    ],
    researchGaps: [
      "Run with Ollama for structured gap analysis.",
    ],
    sources: docs.map((d) => d.path),
  };
}

/**
 * Extract and summarize multiple PDF paths (research assistant output shape).
 */
export async function summarizeDocuments(paths: string[]): Promise<SummaryResult> {
  if (paths.length === 0) {
    return {
      summary: "No documents provided.",
      keyFindings: [],
      researchGaps: [],
      sources: [],
    };
  }

  const resolved: string[] = [];
  for (const p of paths) {
    if (!(await fileExists(p))) {
      throw new Error(`File not found: ${p}`);
    }
    resolved.push(p);
  }

  const docs: ExtractedDocument[] = [];
  for (const p of resolved) {
    docs.push(await extractDocument(p));
  }

  try {
    return await summarizeWithOllama(docs);
  } catch {
    return summarizeOffline(docs);
  }
}

export { extractPdfText } from "./pdf.js";
export type { SummaryResult, ExtractedDocument } from "./types.js";
