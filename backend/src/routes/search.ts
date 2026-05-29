import { Router } from "express";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import { searchUserFiles } from "../services/search.js";

const router = Router();

async function runSearch(body: {
  query?: string;
  folders?: Array<"desktop" | "downloads" | "documents">;
  extensions?: string[];
  limit?: number;
}) {
  if (!body.query?.trim()) {
    throw new HttpError(400, "query is required", "VALIDATION_ERROR");
  }
  return searchUserFiles({
    query: body.query.trim(),
    folders: body.folders,
    extensions: body.extensions,
    limit: body.limit,
  });
}

/** GET /api/search?q=healthcare */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const result = await searchUserFiles({ query });
    res.json(result);
  }),
);

/** POST /api/search */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await runSearch(req.body as Parameters<typeof runSearch>[0]);
    res.json(result);
  }),
);

export default router;
