import { Router } from "express";
import { getContainer } from "../services/container.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import type { ExecuteRequestBody, ExecuteResponseBody } from "../types/api.js";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as ExecuteRequestBody;

    if (!body?.plan || !Array.isArray(body.plan.steps)) {
      throw new HttpError(
        400,
        "plan with steps array is required",
        "VALIDATION_ERROR",
      );
    }

    const { agent } = getContainer();
    const execution = await agent.execute(body.plan);

    const response: ExecuteResponseBody = { execution };
    res.json(response);
  }),
);

export default router;
