import { describe, expect, it, vi } from "vitest";
import type { ToolRegistry } from "@jarvisos/tools";
import { Planner, parsePlanJson, parseToolArguments } from "./planner.js";
import type { OllamaClient } from "./ollama-client.js";
import type { OllamaToolCall } from "./types.js";

describe("parsePlanJson", () => {
  it("parses fenced JSON plans", () => {
    const raw = `\`\`\`json
{
  "intent": "Open browser",
  "steps": [
    {
      "id": "s1",
      "description": "Launch Chrome",
      "tool": "app_launcher",
      "parameters": { "app": "chrome" }
    }
  ],
  "response": "Opening Chrome"
}
\`\`\``;

    const plan = parsePlanJson(raw, "fallback");
    expect(plan.intent).toBe("Open browser");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      id: "s1",
      tool: "app_launcher",
      parameters: { app: "chrome" },
    });
    expect(plan.response).toBe("Opening Chrome");
  });

  it("returns fallback step when steps array is empty", () => {
    const plan = parsePlanJson(
      JSON.stringify({ intent: "test", steps: [] }),
      "user intent",
    );
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.tool).toBe("system");
  });
});

describe("parseToolArguments", () => {
  it("parses JSON string arguments", () => {
    expect(parseToolArguments('{"app":"chrome"}')).toEqual({ app: "chrome" });
  });

  it("returns empty object for invalid JSON strings", () => {
    expect(parseToolArguments("not-json")).toEqual({});
  });
});

describe("Planner.executeToolCalls", () => {
  it("executes tool calls from mock Ollama responses", async () => {
    const execute = vi.fn().mockResolvedValue({
      success: true,
      data: { launched: true },
      durationMs: 5,
    });

    const tools = {
      execute,
      getOllamaTools: vi.fn().mockReturnValue([]),
      formatPlannerToolsList: vi.fn().mockReturnValue("- app_launcher: Launch apps"),
      list: vi.fn().mockReturnValue([]),
    } as unknown as ToolRegistry;

    const ollama = {
      chatWithTools: vi.fn(),
    } as unknown as OllamaClient;

    const planner = new Planner(ollama, tools);
    const toolCalls: OllamaToolCall[] = [
      {
        id: "call-1",
        function: {
          name: "app_launcher",
          arguments: JSON.stringify({ app: "chrome" }),
        },
      },
    ];

    const results = await planner.executeToolCalls(toolCalls);

    expect(execute).toHaveBeenCalledWith("app_launcher", { app: "chrome" });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      stepId: "call-1",
      tool: "app_launcher",
      success: true,
    });
  });
});

describe("Planner.createPlan", () => {
  it("prefers native tool_calls over JSON plan content", async () => {
    const tools = {
      execute: vi.fn().mockResolvedValue({ success: true, durationMs: 1 }),
      getOllamaTools: vi.fn().mockReturnValue([]),
      formatPlannerToolsList: vi.fn().mockReturnValue("- terminal: Run shell"),
      list: vi.fn().mockReturnValue([]),
    } as unknown as ToolRegistry;

    const ollama = {
      chatWithTools: vi.fn().mockResolvedValue({
        content: "",
        toolCalls: [
          {
            id: "tc-1",
            function: {
              name: "terminal",
              arguments: { command: "echo hi" },
            },
          },
        ],
      }),
    } as unknown as OllamaClient;

    const planner = new Planner(ollama, tools);
    const { plan, ollamaToolResults } = await planner.createPlan({ intent: "say hi" });

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.tool).toBe("terminal");
    expect(tools.execute).toHaveBeenCalledWith("terminal", { command: "echo hi" });
    expect(ollamaToolResults).toHaveLength(1);
  });
});
