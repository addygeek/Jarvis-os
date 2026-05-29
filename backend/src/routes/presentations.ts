import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler.js";
import { getContainer } from "../services/container.js";

const router = Router();

/** POST /api/presentations/generate — generate real HTML deck via the presentation tool */
router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const { topic, title, slides, slideCount, action } = req.body as {
      topic?: string;
      title?: string;
      slides?: Array<{ title: string; bullets?: string[]; content?: string }>;
      slideCount?: number;
      action?: "generate_html" | "generate_outline";
    };

    const presentationTitle = title ?? topic ?? "Untitled Presentation";
    const toolAction = action ?? "generate_html";

    // Build default slides if none provided
    const resolvedSlides = slides?.length
      ? slides
      : buildDefaultSlides(presentationTitle, slideCount ?? 5);

    const { tools } = getContainer();
    const result = await tools.execute("presentation", {
      action: toolAction,
      title: presentationTitle,
      slides: resolvedSlides,
    });

    if (!result.success) {
      res.status(500).json({ error: result.error ?? "Presentation generation failed" });
      return;
    }

    res.json(result.data);
  }),
);

/** GET /api/presentations — list saved presentations */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { tools } = getContainer();
    const result = await tools.execute("presentation", { action: "list" });
    res.json(result.success ? result.data : { presentations: [], count: 0 });
  }),
);

function buildDefaultSlides(
  title: string,
  count: number,
): Array<{ title: string; bullets: string[] }> {
  const templates = [
    { title: "Introduction", bullets: [`Overview of ${title}`, "Goals and motivation"] },
    { title: "Key Points", bullets: ["Main finding 1", "Main finding 2", "Main finding 3"] },
    { title: "Details", bullets: ["Supporting evidence", "Data and analysis", "Examples"] },
    { title: "Methodology", bullets: ["Approach", "Tools used", "Process"] },
    { title: "Results", bullets: ["Outcome 1", "Outcome 2", "Impact"] },
    { title: "Discussion", bullets: ["Implications", "Limitations", "Future work"] },
    { title: "Conclusion", bullets: [`Summary of ${title}`, "Next steps", "Questions?"] },
  ];

  const slides = [];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    slides.push(templates[i]!);
  }
  return slides;
}

export default router;
