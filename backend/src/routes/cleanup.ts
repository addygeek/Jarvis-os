import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler.js";
import { buildDesktopCleanupPlan } from "../services/desktop-cleanup.js";

const router = Router();

router.post(
  "/desktop",
  asyncHandler(async (req, res) => {
    const { execute } = req.body as { execute?: boolean };
    const plan = await buildDesktopCleanupPlan(execute === true);
    res.json(plan);
  }),
);

export default router;
