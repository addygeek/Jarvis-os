import type { ToolRegistry } from "@jarvisos/tools";
import { loadPrompt, renderTemplate } from "./prompts.js";
import type { OllamaClient, OllamaToolDefinition } from "./ollama-client.js";
import type {
  OllamaToolCall,
  Plan,
  PlanStep,
  PlannerOptions,
  PlannerResult,
  StepExecutionResult,
} from "./types.js";

function formatToolsList(registry: ToolRegistry): string {
  return registry.formatPlannerToolsList();
}

export function parseToolArguments(
  args: Record<string, unknown> | string,
): Record<string, unknown> {
  if (typeof args === "string") {
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return args ?? {};
}

export function parsePlanJson(raw: string, fallbackIntent: string): Plan {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(text) as {
    intent?: string;
    steps?: PlanStep[];
    response?: string;
  };

  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    return {
      intent: parsed.intent ?? fallbackIntent,
      steps: [
        {
          id: "step-1",
          description: "Notify user that planning could not produce tool steps",
          tool: "system",
          parameters: {
            action: "get_volume",
          },
        },
      ],
      response: parsed.response,
    };
  }

  const steps: PlanStep[] = parsed.steps.map((s, i) => ({
    id: s.id ?? `step-${i + 1}`,
    description: s.description ?? `Step ${i + 1}`,
    tool: s.tool,
    parameters: s.parameters ?? {},
  }));

  return {
    intent: parsed.intent ?? fallbackIntent,
    steps,
    response: parsed.response,
  };
}

export class Planner {
  constructor(
    private readonly ollama: OllamaClient,
    private readonly tools: ToolRegistry,
  ) {}

  async createPlan(options: PlannerOptions): Promise<PlannerResult> {
    const template = loadPrompt("planner");
    const systemPrompt = renderTemplate(template, {
      TOOLS_LIST: options.toolsList ?? formatToolsList(this.tools),
      CONTEXT: options.context ?? "(none)",
      USER_INTENT: options.intent,
    });

    const ollamaTools: OllamaToolDefinition[] = this.tools
      .getOllamaTools()
      .map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters as Record<string, unknown>,
        },
      }));
    const result = await this.ollama.chatWithTools(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: options.intent },
      ],
      { format: "json", temperature: 0.2, tools: ollamaTools },
    );

    if (result.toolCalls.length > 0) {
      const ollamaToolResults = await this.executeToolCalls(result.toolCalls);
      const plan: Plan = {
        intent: options.intent,
        steps: result.toolCalls.map((call, i) => ({
          id: call.id ?? `step-${i + 1}`,
          description: `Execute ${call.function.name}`,
          tool: call.function.name,
          parameters: parseToolArguments(call.function.arguments),
        })),
        response: result.content || undefined,
      };
      return { plan, ollamaToolResults };
    }

    try {
      return { plan: parsePlanJson(result.content, options.intent) };
    } catch {
      return {
        plan: {
          intent: options.intent,
          steps: [
            {
              id: "step-1",
              description: "Fallback system check",
              tool: "system",
              parameters: { action: "get_volume" },
            },
          ],
          response:
            result.content ||
            "I had trouble parsing a structured plan; using a fallback step.",
        },
      };
    }
  }

  /** Execute native Ollama tool_calls via the shared registry. */
  async executeToolCalls(
    toolCalls: OllamaToolCall[],
  ): Promise<StepExecutionResult[]> {
    const results: StepExecutionResult[] = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const toolName = call.function.name;
      const parameters = parseToolArguments(call.function.arguments);
      const stepId = call.id ?? `tool-call-${i + 1}`;

      const result = await this.tools.execute(toolName, parameters);
      results.push({
        stepId,
        tool: toolName,
        success: result.success,
        data: result.data,
        error: result.error,
        durationMs: result.durationMs ?? 0,
      });
    }

    return results;
  }
}
