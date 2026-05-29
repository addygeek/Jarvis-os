import { Router, type Request, type Response } from "express";
import { APP_LAUNCHER_APPS } from "@jarvisos/tools";
import { getContainer } from "../services/container.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";

const router = Router();

/** GET /api/tools — list tools (frontend compatibility). */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { tools } = getContainer();
    const list = tools.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      enabled: true,
      category: tool.name.split(".")[0],
      parameters: tool.parameters,
    }));
    res.json(list);
  }),
);

/** GET|POST /api/tools/list — full tool schemas. */
async function listToolSchemas(_req: Request, res: Response): Promise<void> {
  const { tools } = getContainer();
  res.json({ tools: tools.getSchemas() });
}

router.get("/list", asyncHandler(listToolSchemas));
router.post("/list", asyncHandler(listToolSchemas));

/** POST /api/tools/execute — debug: run a single tool. */
router.post(
  "/execute",
  asyncHandler(async (req, res) => {
    const body = req.body as {
      name?: string;
      tool?: string;
      parameters?: Record<string, unknown>;
    };

    const toolName = body.name ?? body.tool;
    if (!toolName || typeof toolName !== "string") {
      throw new HttpError(400, "name or tool is required", "VALIDATION_ERROR");
    }

    const { tools } = getContainer();
    const result = await tools.execute(
      toolName,
      body.parameters ?? {},
    );

    res.json({ name: toolName, result });
  }),
);

/** GET /api/tools/app_launcher/apps — known app aliases for the Tools UI. */
router.get(
  "/app_launcher/apps",
  asyncHandler(async (_req, res) => {
    const apps = Object.entries(APP_LAUNCHER_APPS).map(([alias, displayName]) => ({
      alias,
      displayName,
    }));
    res.json({ apps });
  }),
);

/** POST /api/tools/demo/apps — launch Chrome, VS Code, Safari (PRD demo). */
router.post(
  "/demo/apps",
  asyncHandler(async (_req, res) => {
    const { tools } = getContainer();
    const apps = ["chrome", "vscode", "safari"] as const;
    const results = [];

    for (const app of apps) {
      const result = await tools.execute("app_launcher", { app });
      results.push({ app, ...result });
    }

    res.json({ ok: true, results });
  }),
);

export default router;
