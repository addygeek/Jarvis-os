import { Router } from "express";
import { ingestDocument, queryKnowledge } from "@jarvisos/memory/rag";
import { getContainer } from "../services/container.js";
import {
  findCapabilityById,
  getAgentCapabilities,
} from "../services/agent-capabilities.js";
import { getCached, setCached, cacheStats, clearCache } from "../services/plan-cache.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import type {
  AgentRunRequestBody,
  AgentRunResponseBody,
  ExecuteCapabilityRequestBody,
  ExecuteCapabilityResponseBody,
} from "../types/api.js";

const router = Router();

router.get(
  "/capabilities",
  asyncHandler(async (_req, res) => {
    res.json(getAgentCapabilities());
  }),
);

router.get(
  "/cache",
  asyncHandler(async (_req, res) => { res.json(cacheStats()); }),
);

router.delete(
  "/cache",
  asyncHandler(async (_req, res) => {
    clearCache();
    const { agent } = getContainer();
    agent.clearCache();
    res.status(204).send();
  }),
);

router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const body = req.body as AgentRunRequestBody;

    if (!body?.task || typeof body.task !== "string" || !body.task.trim()) {
      throw new HttpError(400, "task is required", "VALIDATION_ERROR");
    }

    const execute = body.execute !== false;
    const task = body.task.trim();

    // Return cached result for identical tasks (10-min TTL)
    if (execute) {
      const cached = getCached(task);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.json({ ...cached, cached: true });
        return;
      }
    }

    const { agent } = getContainer();
    const result = await agent.run(task, { execute });

    if (execute) {
      setCached(task, result.plan, result.results, result.summary);
    }

    const response: AgentRunResponseBody = {
      plan: result.plan,
      steps: result.plan.steps,
      results: result.results,
      summary: result.summary,
    };
    res.json(response);
  }),
);

router.post(
  "/execute-capability",
  asyncHandler(async (req, res) => {
    const body = req.body as ExecuteCapabilityRequestBody;

    if (!body?.capabilityId || typeof body.capabilityId !== "string") {
      throw new HttpError(400, "capabilityId is required", "VALIDATION_ERROR");
    }

    const capability = findCapabilityById(body.capabilityId);
    if (!capability) {
      throw new HttpError(404, `Unknown capability: ${body.capabilityId}`, "NOT_FOUND");
    }

    if (capability.toolName === "_agent_run") {
      const task =
        typeof body.parameters?.task === "string"
          ? body.parameters.task
          : capability.exampleParameters.task;
      if (typeof task !== "string" || !task.trim()) {
        throw new HttpError(400, "parameters.task is required for tasks.agent-run", "VALIDATION_ERROR");
      }
      const { agent } = getContainer();
      const result = await agent.run(task.trim(), { execute: true });
      const response: ExecuteCapabilityResponseBody = {
        capabilityId: capability.id,
        toolName: capability.toolName,
        success: result.results.every((r) => r.success),
        result: {
          plan: result.plan,
          results: result.results,
          summary: result.summary,
        },
      };
      res.json(response);
      return;
    }

    if (capability.toolName === "_knowledge_ingest") {
      const parameters = {
        ...capability.exampleParameters,
        ...(body.parameters ?? {}),
      };
      const text = typeof parameters.text === "string" ? parameters.text : "";
      if (!text.trim()) {
        throw new HttpError(400, "parameters.text is required for knowledge.ingest-rag", "VALIDATION_ERROR");
      }
      const tags = Array.isArray(parameters.tags)
        ? parameters.tags.filter((t): t is string => typeof t === "string")
        : typeof parameters.tags === "string"
          ? parameters.tags.split(",").map((t) => t.trim())
          : undefined;
      const result = await ingestDocument({
        text: text.trim(),
        source: typeof parameters.source === "string" ? parameters.source : undefined,
        title: typeof parameters.title === "string" ? parameters.title : undefined,
        tags,
      });
      const response: ExecuteCapabilityResponseBody = {
        capabilityId: capability.id,
        toolName: capability.toolName,
        success: true,
        result,
      };
      res.status(201).json(response);
      return;
    }

    if (capability.toolName === "_knowledge_query") {
      const parameters = {
        ...capability.exampleParameters,
        ...(body.parameters ?? {}),
      };
      const query = typeof parameters.query === "string" ? parameters.query : "";
      if (!query.trim()) {
        throw new HttpError(400, "parameters.query is required for knowledge.query-rag", "VALIDATION_ERROR");
      }
      const limit =
        typeof parameters.limit === "number" && parameters.limit > 0
          ? Math.min(parameters.limit, 20)
          : 5;
      const result = await queryKnowledge(query.trim(), limit);
      const response: ExecuteCapabilityResponseBody = {
        capabilityId: capability.id,
        toolName: capability.toolName,
        success: true,
        result,
      };
      res.json(response);
      return;
    }

    const parameters = {
      ...capability.exampleParameters,
      ...(body.parameters ?? {}),
    };

    const { tools } = getContainer();
    const toolResult = await tools.execute(capability.toolName, parameters);

    const response: ExecuteCapabilityResponseBody = {
      capabilityId: capability.id,
      toolName: capability.toolName,
      success: toolResult.success,
      result: toolResult.data,
      error: toolResult.error,
      durationMs: toolResult.durationMs,
    };
    res.json(response);
  }),
);

export default router;
