import { Router } from "express";
import { getContainer } from "../services/container.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import type { ChatRequestBody, ChatResponseBody } from "../types/api.js";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as ChatRequestBody & {
      history?: Array<{ role: string; content: string }>;
    };

    if (!body?.message || typeof body.message !== "string") {
      throw new HttpError(400, "message is required", "VALIDATION_ERROR");
    }

    const { agent } = getContainer();
    const result = await agent.chat(body.message, {
      conversationId: body.conversationId,
      executePlan: body.executePlan,
    });

    const response: ChatResponseBody = {
      conversationId: result.conversationId,
      response: result.response,
      plan: result.plan,
      execution: result.execution,
      reply: {
        id: result.conversationId,
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
      },
    };

    res.json(response);
  }),
);

export { router as chatRouter };
export default router;
