import { Router } from "express";
import { appConfig } from "../config.js";
import { getContainer } from "../services/container.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const started = Date.now();
    const { ollama, tools } = getContainer();
    const check = await ollama.healthCheck();
    const latencyMs = Date.now() - started;
    const toolList = tools.list();

    const ok = check.ok && check.modelAvailable;

    res.json({
      ok,
      version: "0.1.0",
      status: ok ? "ok" : "degraded",
      ollama: {
        reachable: check.ok,
        connected: check.ok,
        model: appConfig.ollama.model,
        modelAvailable: check.modelAvailable,
        latencyMs,
        error: check.error,
      },
      tools: {
        count: toolList.length,
        names: toolList.map((t) => t.name),
      },
    });
  }),
);

export { router as healthRouter };
export default router;
