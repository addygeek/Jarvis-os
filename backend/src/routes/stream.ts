/**
 * POST /api/agent/stream
 * Server-Sent Events — streams plan + per-step results in real time.
 *
 * Events: plan | step_start | step_done | summary | error | done
 */
import type { Request, Response } from "express";
import { Router } from "express";
import { getContainer } from "../services/container.js";
import type { Plan } from "@jarvisos/agent";

const router = Router();

function emit(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as { task?: string };

  if (!body?.task?.trim()) {
    res.status(400).json({ error: "task is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const { agent, tools } = getContainer();

  try {
    // 1 — Plan
    let plan: Plan;
    try {
      plan = await agent.plan(body.task.trim());
    } catch (err) {
      emit(res, "error", { message: err instanceof Error ? err.message : String(err) });
      emit(res, "done", {});
      res.end();
      return;
    }

    emit(res, "plan", {
      intent: plan.intent,
      response: plan.response,
      steps: plan.steps.map((s, i) => ({
        id: s.id,
        order: i + 1,
        description: s.description,
        tool: s.tool,
        status: "pending",
      })),
    });

    if (plan.steps.length === 0) {
      emit(res, "summary", { text: plan.response ?? "No tool steps to execute." });
      emit(res, "done", {});
      res.end();
      return;
    }

    // 2 — Execute step by step
    const stepResults: Array<{
      stepId: string; tool: string; success: boolean;
      data?: unknown; error?: string; durationMs: number;
    }> = [];

    for (const step of plan.steps) {
      const startedAt = Date.now();
      emit(res, "step_start", {
        stepId: step.id, tool: step.tool, description: step.description, startedAt,
      });

      const result = await tools.execute(step.tool, step.parameters);
      const durationMs = Date.now() - startedAt;

      stepResults.push({
        stepId: step.id, tool: step.tool,
        success: result.success, data: result.data,
        error: result.error, durationMs,
      });

      emit(res, "step_done", {
        stepId: step.id, tool: step.tool,
        success: result.success, data: result.data,
        error: result.error, durationMs, completedAt: Date.now(),
      });
    }

    // 3 — Summary via Ollama
    try {
      const execution = await agent.execute(plan);
      emit(res, "summary", { text: execution.summary });
    } catch {
      const ok = stepResults.filter((r) => r.success).length;
      emit(res, "summary", { text: `Executed ${stepResults.length} step(s); ${ok} succeeded.` });
    }

    emit(res, "done", {});
    res.end();
  } catch (err) {
    emit(res, "error", { message: err instanceof Error ? err.message : "Stream error" });
    emit(res, "done", {});
    res.end();
  }
});

export default router;
