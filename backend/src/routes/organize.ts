import { Router } from "express";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import { organizeFolder } from "../services/file-organizer.js";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { folder, dryRun, maxDepth } = req.body as {
      folder?: string;
      dryRun?: boolean;
      maxDepth?: number;
    };

    if (!folder?.trim()) {
      throw new HttpError(400, "folder is required", "VALIDATION_ERROR");
    }

    const result = await organizeFolder({
      folder,
      dryRun: dryRun !== false,
      maxDepth,
    });

    res.json(result);
  }),
);

export default router;
