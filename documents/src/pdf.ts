import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function extractWithPdfParse(filePath: string): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (
    buffer: Buffer,
  ) => Promise<{ text?: string }>;
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return (data.text ?? "").trim();
}

async function extractWithPyMuPDF(filePath: string): Promise<string> {
  const python = process.env.PYTHON ?? "python3";
  const script = `
import sys
import fitz
path = sys.argv[1]
doc = fitz.open(path)
parts = []
for page in doc:
    parts.append(page.get_text())
print("\\n".join(parts))
`;
  const { stdout } = await execFileAsync(python, ["-c", script, filePath], {
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout.trim();
}

async function isPyMuPDFAvailable(): Promise<boolean> {
  const python = process.env.PYTHON ?? "python3";
  try {
    await execFileAsync(python, ["-c", "import fitz"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract plain text from a PDF file.
 * Tries pdf-parse (Node) first; falls back to PyMuPDF subprocess when available.
 */
export async function extractPdfText(filePath: string): Promise<string> {
  try {
    const text = await extractWithPdfParse(filePath);
    if (text.length > 50) return text;
  } catch {
    /* try pymupdf */
  }

  if (await isPyMuPDFAvailable()) {
    return extractWithPyMuPDF(filePath);
  }

  throw new Error(
    `Could not extract text from ${filePath}. Install pymupdf (pip install pymupdf) or ensure pdf-parse can read the file.`,
  );
}
