import { Router } from "express";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import { researchSummarize } from "../services/research.js";

const router = Router();

/** POST /api/research/summarize */
router.post(
  "/summarize",
  asyncHandler(async (req, res) => {
    const { paths, folder, maxPdfs } = req.body as {
      paths?: string[];
      folder?: string;
      maxPdfs?: number;
    };

    if (!paths?.length && !folder) {
      throw new HttpError(
        400,
        "Provide paths and/or folder (e.g. downloads, ~/Downloads)",
        "VALIDATION_ERROR",
      );
    }

    const result = await researchSummarize({ paths, folder, maxPdfs });

    res.json({
      summary: result.summary,
      keyFindings: result.keyFindings,
      researchGaps: result.researchGaps,
      sources: result.sources,
    });
  }),
);

export default router;
