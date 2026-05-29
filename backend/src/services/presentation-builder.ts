export interface PresentationGenerateInput {
  sources?: string[];
  topic?: string;
  slideCount?: number;
}

export interface PresentationGenerateResult {
  status: "stub";
  placeholderPath: string;
  slideCount: number;
  instructions: string[];
  outline: string[];
}

export function generatePresentationStub(
  input: PresentationGenerateInput = {},
): PresentationGenerateResult {
  const slideCount = input.slideCount ?? 20;
  const topic = input.topic ?? "Untitled presentation";
  const sources = input.sources ?? [];

  return {
    status: "stub",
    placeholderPath: "~/JarvisOS/output/presentations/draft.pptx",
    slideCount,
    instructions: [
      "Install python-pptx or use Keynote automation for full generation.",
      "Ingest source PDFs via POST /api/knowledge/ingest, then query themes.",
      "Wire presentationTool in @jarvisos/tools when PyMuPDF + template pipeline is ready.",
      sources.length
        ? `Provided ${sources.length} source path(s) — not processed in stub mode.`
        : "Provide sources[] (PDF paths) for future multi-doc summarization.",
    ],
    outline: [
      `1. Title — ${topic}`,
      "2. Agenda",
      "3–5. Key findings from sources",
      "6–10. Deep dives by theme",
      "11–15. Data and visuals",
      "16–18. Recommendations",
      "19. Q&A",
      "20. Thank you",
    ],
  };
}
