import { Router } from "express";
import { ingestDocument, queryKnowledge } from "@jarvisos/memory/rag";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";

const router = Router();

router.post(
  "/ingest",
  asyncHandler(async (req, res) => {
    const { text, source, title, tags } = req.body as {
      text?: string;
      source?: string;
      title?: string;
      tags?: string[];
    };

    if (!text?.trim()) {
      throw new HttpError(400, "text is required", "VALIDATION_ERROR");
    }

    const result = await ingestDocument({ text, source, title, tags });
    res.status(201).json(result);
  }),
);

router.post(
  "/query",
  asyncHandler(async (req, res) => {
    const { query, limit } = req.body as { query?: string; limit?: number };

    if (!query?.trim()) {
      throw new HttpError(400, "query is required", "VALIDATION_ERROR");
    }

    const result = await queryKnowledge(query, limit ?? 5);
    res.json(result);
  }),
);

export default router;
