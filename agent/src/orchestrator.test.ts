import { describe, expect, it, vi } from "vitest";
import { AgentOrchestrator } from "./orchestrator.js";
import type { Plan } from "./types.js";

const samplePlan: Plan = {
  intent: "Open Chrome",
  steps: [
    {
      id: "step-1",
      description: "Open Chrome",
      tool: "browser",
      parameters: { action: "open_browser", browser: "chrome" },
    },
  ],
  response: "Opening Chrome.",
};

describe("AgentOrchestrator.run", () => {
  it("exposes run() and returns plan-only when execute is false", async () => {
    const planner = {
      createPlan: vi.fn().mockResolvedValue({ plan: samplePlan }),
    };
    const executor = {
      executePlan: vi.fn(),
    };

    const agent = new AgentOrchestrator(
      { healthCheck: vi.fn(), chat: vi.fn(), modelName: "test" } as never,
      { formatPlannerToolsList: () => "" } as never,
      {
        createConversation: vi.fn(),
        addMessage: vi.fn(),
        getMessages: vi.fn(() => []),
        createTask: vi.fn(),
        updateTask: vi.fn(),
      } as never,
    );

    Object.assign(agent, { planner, executor });

    const result = await agent.run("Open Chrome", { execute: false });

    expect(typeof agent.run).toBe("function");
    expect(result.plan.intent).toBe("Open Chrome");
    expect(result.results).toHaveLength(0);
    expect(executor.executePlan).not.toHaveBeenCalled();
  });

  it("executes the plan when execute is true", async () => {
    const planner = {
      createPlan: vi.fn().mockResolvedValue({ plan: samplePlan }),
    };
    const executor = {
      executePlan: vi.fn().mockResolvedValue({
        plan: samplePlan,
        steps: [
          {
            stepId: "step-1",
            tool: "browser",
            success: true,
            durationMs: 5,
          },
        ],
        summary: "Done.",
      }),
    };

    const agent = new AgentOrchestrator(
      { healthCheck: vi.fn(), chat: vi.fn(), modelName: "test" } as never,
      { formatPlannerToolsList: () => "" } as never,
      {
        createConversation: vi.fn(),
        addMessage: vi.fn(),
        getMessages: vi.fn(() => []),
        createTask: vi.fn(),
        updateTask: vi.fn(),
      } as never,
    );

    Object.assign(agent, { planner, executor });

    const result = await agent.run("Open Chrome", { execute: true });

    expect(executor.executePlan).toHaveBeenCalledWith(samplePlan);
    expect(result.results).toHaveLength(1);
    expect(result.summary).toBe("Done.");
  });
});
