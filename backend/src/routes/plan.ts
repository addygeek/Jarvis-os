import { Router } from "express";
import { getContainer } from "../services/container.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import type { PlanRequestBody, PlanResponseBody } from "../types/api.js";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as PlanRequestBody;

    if (!body?.intent || typeof body.intent !== "string") {
      throw new HttpError(400, "intent is required", "VALIDATION_ERROR");
    }

    const { agent } = getContainer();
    const plan = await agent.plan(body.intent, body.context);

    const response: PlanResponseBody = { plan };
    res.json(response);
  }),
);

export default router;
