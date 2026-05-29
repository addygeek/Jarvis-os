import type { ToolRegistry } from "@jarvisos/tools";
import { loadPrompt, renderTemplate } from "./prompts.js";
import type { OllamaClient } from "./ollama-client.js";
import type {
  ExecutionResult,
  Plan,
  StepExecutionResult,
} from "./types.js";

export class Executor {
  constructor(
    private readonly ollama: OllamaClient,
    private readonly tools: ToolRegistry,
  ) {}

  private areStepsIdentical(
    a: StepExecutionResult[],
    b: StepExecutionResult[],
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const sa = a[i]!;
      const sb = b[i]!;
      if (sa.tool !== sb.tool) return false;
      if (sa.success !== sb.success) return false;
      if (sa.error !== sb.error) return false;
      if (JSON.stringify(sa.data) !== JSON.stringify(sb.data)) return false;
    }
    return true;
  }

  async executePlan(
    plan: Plan,
    cachedSteps?: StepExecutionResult[],
    cachedSummary?: string,
  ): Promise<ExecutionResult> {
    const steps: StepExecutionResult[] = [];

    if (plan.steps.length === 0) {
      return {
        plan,
        steps,
        summary: plan.response ?? "No tool steps to execute.",
      };
    }

    for (const step of plan.steps) {
      const started = Date.now();
      const result = await this.tools.execute(step.tool, step.parameters);
      steps.push({
        stepId: step.id,
        tool: step.tool,
        success: result.success,
        data: result.data,
        error: result.error,
        durationMs: Date.now() - started,
      });
    }

    let summary: string;
    if (cachedSteps && cachedSummary && this.areStepsIdentical(steps, cachedSteps)) {
      console.log("[jarvisos] Tool execution result matches cache. Reusing summary.");
      summary = cachedSummary;
    } else {
      summary = await this.summarize(plan, steps);
    }

    return { plan, steps, summary };
  }

  private async summarize(
    plan: Plan,
    steps: StepExecutionResult[],
  ): Promise<string> {
    if (steps.length === 0) return plan.response ?? "No steps executed.";

    const template = loadPrompt("executor");

    // Build a combined result string covering ALL steps
    const allResults = steps
      .map((step, i) => {
        const planStep = plan.steps.find((s) => s.id === step.stepId);
        const label = planStep?.description ?? step.tool;
        const outcome = step.success
          ? `OK — ${JSON.stringify(step.data ?? null)}`
          : `FAILED — ${step.error ?? "unknown error"}`;
        return `Step ${i + 1} [${step.tool}] ${label}: ${outcome}`;
      })
      .join("\n");

    const errors = steps
      .filter((s) => !s.success)
      .map((s) => s.error ?? "unknown")
      .join("; ");

    const last = steps[steps.length - 1]!;
    const prompt = renderTemplate(template, {
      STEP_DESCRIPTION:
        steps.length > 1
          ? `Multi-step task: ${plan.intent}`
          : (plan.steps.find((s) => s.id === last.stepId)?.description ?? ""),
      TOOL_NAME: steps.length > 1 ? `${steps.length} tools` : last.tool,
      TOOL_RESULT: allResults,
      ERROR: errors,
    });

    try {
      return await this.ollama.generate(prompt, { temperature: 0.4 });
    } catch {
      const ok = steps.filter((s) => s.success).length;
      return `Executed ${steps.length} step(s); ${ok} succeeded.`;
    }
  }
}
