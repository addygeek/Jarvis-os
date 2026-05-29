/**
 * POST /api/chat/stream
 * Unified SSE endpoint for voice + chat.
 *
 * Events emitted:
 *   token     { text }                   — streamed Ollama token (chat mode)
 *   plan      { intent, steps[] }        — agent plan created
 *   step_start{ stepId, tool, description }
 *   step_done { stepId, tool, success, data, error, durationMs }
 *   summary   { text }                   — final text after tool execution
 *   error     { message }
 *   done      { conversationId? }
 *
 * Implements Ollama streaming with a direct fetch so the agent package
 * dist/cache doesn't need reloading.
 */
import { Router, type Response } from "express";
import { getContainer } from "../services/container.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";
import { appConfig } from "../config.js";
import type { ChatRequestBody } from "../types/api.js";

const router = Router();

function emit(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Stream Ollama tokens; returns the full concatenated text. */
async function streamTokens(
  res: Response,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const payload = {
    model: appConfig.ollama.model,
    messages,
    stream: true,
    options: {
      temperature: 0.5,
      num_gpu: appConfig.ollama.numGpu,
      use_mlock: true,
      num_ctx: appConfig.ollama.numCtx,
      ...(appConfig.ollama.flashAttn ? { flash_attn: true } : {}),
    },
  };

  const ollamaRes = await fetch(`${appConfig.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!ollamaRes.ok || !ollamaRes.body) {
    throw new Error(`Ollama error (${ollamaRes.status})`);
  }

  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        if (chunk.message?.content) {
          full += chunk.message.content;
          emit(res, "token", { text: chunk.message.content });
        }
        if (chunk.done) return full;
      } catch { /* skip malformed NDJSON */ }
    }
  }
  return full;
}

/** Mirror of the orchestrator's heuristic — keeps parity without importing the module. */
function looksActionable(msg: string): boolean {
  const q =
    /^(what\s+(is|are|does|do|was|were|can|will)\b|who\s+(is|are)\b|how\s+(does|do|is|are|can)\b|explain\s+|describe\s+|tell\s+me\s+(about\s+)?|define\s+|when\s+did\s+|is\s+there\s+|why\s+(is|are|do|does)\b)/i;
  if (q.test(msg.trim())) return false;

  const act =
    /\b(open|find|search|summarize|organize|clean|run|create|move|delete|navigate|launch|scan|read|email|install|show|list|get|set|write|make|build|generate|analyze|play|stop|turn|increase|decrease|check|update|send|close|quit|switch|change|start|enable|disable|save|sort|download|upload|rename|copy|go|take|clear|refresh|print|export|import|convert|share|view|edit|fix|debug|deploy|commit|push|pull|clone|schedule|remind|note|volume|mute|unmute|minimize|maximize|focus|activate)\b/i;
  return act.test(msg);
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as ChatRequestBody;
    if (!body?.message || typeof body.message !== "string") {
      throw new HttpError(400, "message is required", "VALIDATION_ERROR");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const { agent, tools, memory } = getContainer();
    const message = body.message.trim();

    try {
      const conversationId =
        body.conversationId ??
        memory.createConversation(message.slice(0, 80) || "Voice chat").id;

      memory.addMessage({ conversationId, role: "user", content: message });

      const history = memory.getMessages(conversationId, 20);
      const messages = history
        .filter(
          (m): m is typeof m & { role: "user" | "assistant" | "system" } =>
            m.role === "user" || m.role === "assistant" || m.role === "system",
        )
        .map((m) => ({ role: m.role, content: m.content }));

      let fullResponse = "";

      if (looksActionable(message)) {
        // ── Agent path: plan → execute step-by-step → stream summary ──────
        let plan;
        try {
          plan = await agent.plan(message);
        } catch (err) {
          emit(res, "error", {
            message: `Planning failed: ${err instanceof Error ? err.message : String(err)}`,
          });
          emit(res, "done", {});
          res.end();
          return;
        }

        emit(res, "plan", {
          intent: plan.intent,
          steps: plan.steps.map((s, i) => ({
            id: s.id,
            order: i + 1,
            description: s.description,
            tool: s.tool,
            status: "pending",
          })),
        });

        if (plan.steps.length === 0) {
          // Planner answered directly — stream that text
          const seed = plan.response ?? "";
          if (seed) {
            for (const ch of seed) emit(res, "token", { text: ch });
            fullResponse = seed;
          } else {
            fullResponse = await streamTokens(res, messages);
          }
        } else {
          // Execute each step and emit progress events
          for (const step of plan.steps) {
            const startedAt = Date.now();
            emit(res, "step_start", {
              stepId: step.id,
              tool: step.tool,
              description: step.description,
              startedAt,
            });
            const result = await tools.execute(step.tool, step.parameters);
            const durationMs = Date.now() - startedAt;
            emit(res, "step_done", {
              stepId: step.id,
              tool: step.tool,
              success: result.success,
              data: result.data,
              error: result.error,
              durationMs,
            });
          }

          // Stream a short summary from Ollama after execution
          const summaryPrompt = [
            ...messages,
            {
              role: "user" as const,
              content: `You just executed the task: "${plan.intent}". Summarize what was done in 1-2 sentences.`,
            },
          ];
          fullResponse = await streamTokens(res, summaryPrompt);
        }
      } else {
        // ── Pure chat path: stream tokens directly ─────────────────────────
        fullResponse = await streamTokens(res, messages);
      }

      memory.addMessage({ conversationId, role: "assistant", content: fullResponse });
      emit(res, "done", { conversationId });
    } catch (err) {
      emit(res, "error", {
        message: err instanceof Error ? err.message : "Stream error",
      });
      emit(res, "done", {});
    }

    res.end();
  }),
);

export default router;
