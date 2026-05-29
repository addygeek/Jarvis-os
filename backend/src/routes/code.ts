import { Router } from "express";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import { generateReadmeStub, openProject } from "../services/code-assistant.js";

const router = Router();

router.post(
  "/project-open",
  asyncHandler(async (req, res) => {
    const { path: projectPath } = req.body as { path?: string };

    if (!projectPath?.trim()) {
      throw new HttpError(400, "path is required", "VALIDATION_ERROR");
    }

    const result = await openProject(projectPath);
    res.json(result);
  }),
);

router.post(
  "/readme-stub",
  asyncHandler(async (req, res) => {
    const { path: projectPath } = req.body as { path?: string };

    if (!projectPath?.trim()) {
      throw new HttpError(400, "path is required", "VALIDATION_ERROR");
    }

    const result = await generateReadmeStub(projectPath);
    res.json(result);
  }),
);

export default router;
