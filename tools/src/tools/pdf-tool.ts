import fs from "node:fs/promises";
import type { Tool } from "../types.js";
import { expandPath } from "../utils/paths.js";
import { fail, ok, optionalNumber, requireString } from "../utils/result.js";

interface PdfParseResult {
  text: string;
  numpages: number;
  info?: Record<string, unknown>;
}

async function extractPdfText(filePath: string): Promise<PdfParseResult> {
  const buffer = await fs.readFile(filePath);
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return {
    text: result.text,
    numpages: result.numpages,
    info: result.info as Record<string, unknown> | undefined,
  };
}

function summarizeText(text: string, maxSentences = 8): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "(No extractable text in PDF)";
  }

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  if (sentences.length <= maxSentences) {
    return cleaned.slice(0, 4000);
  }

  const head = sentences.slice(0, Math.ceil(maxSentences * 0.6));
  const tail = sentences.slice(-Math.floor(maxSentences * 0.3));
  return [...head, "...", ...tail].join(" ").slice(0, 4000);
}

export const pdfTool: Tool = {
  name: "pdf",
  description: "Read and summarize PDF files using pdf-parse.",
  parameters: {
    type: "object",
    required: ["action", "path"],
    properties: {
      action: { type: "string", enum: ["read", "summarize"] },
      path: { type: "string", description: "Path to PDF file" },
      maxSentences: { type: "number", description: "Max sentences in summary", default: 8 },
      maxChars: { type: "number", description: "Max characters returned for read", default: 50000 },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");
      const filePath = expandPath(requireString(params, "path"));

      if (!filePath.toLowerCase().endsWith(".pdf")) {
        return fail("Path must be a .pdf file");
      }

      const { text, numpages, info } = await extractPdfText(filePath);
      const maxChars = optionalNumber(params, "maxChars") ?? 50_000;

      switch (action) {
        case "read": {
          const content = text.slice(0, maxChars);
          return ok({
            path: filePath,
            pages: numpages,
            info,
            text: content,
            truncated: text.length > maxChars,
            charCount: text.length,
          });
        }

        case "summarize": {
          const maxSentences = optionalNumber(params, "maxSentences") ?? 8;
          const summary = summarizeText(text, maxSentences);
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          return ok({
            path: filePath,
            pages: numpages,
            summary,
            wordCount,
            charCount: text.length,
          }, "PDF summarized");
        }

        default:
          return fail(`Unknown action: ${action}`);
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
