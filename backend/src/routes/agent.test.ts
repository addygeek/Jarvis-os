import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { getCapabilityCountsByCategory } from "../services/agent-capabilities.js";

const mockAgentRun = vi.fn();
const mockToolsExecute = vi.fn();

vi.mock("../services/container.js", () => ({
  getContainer: () => ({
    ollama: { healthCheck: vi.fn().mockResolvedValue({ ok: true, modelAvailable: true }) },
    tools: {
      getSchemas: vi.fn(() => []),
      list: vi.fn(() => []),
      execute: mockToolsExecute,
    },
    agent: {
      chat: vi.fn(),
      run: mockAgentRun,
    },
  }),
  shutdownContainer: vi.fn(),
}));

describe("Agent API routes", () => {
  const app = createApp();

  const samplePlan = {
    intent: "Open Chrome",
    steps: [
      {
        id: "step-1",
        description: "Open Chrome browser",
        tool: "browser",
        parameters: { action: "open_browser", browser: "chrome" },
      },
    ],
    response: "Opening Chrome.",
  };

  const sampleResults = [
    {
      stepId: "step-1",
      tool: "browser",
      success: true,
      data: { browser: "Google Chrome" },
      durationMs: 12,
    },
  ];

  beforeEach(() => {
    mockAgentRun.mockResolvedValue({
      plan: samplePlan,
      results: sampleResults,
      summary: "Opened Chrome.",
    });
    mockToolsExecute.mockResolvedValue({
      success: true,
      data: { browser: "Google Chrome" },
      durationMs: 10,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/agent/capabilities returns structured catalog with 40+ entries", async () => {
    const res = await request(app).get("/api/agent/capabilities");

    expect(res.status).toBe(200);
    expect(res.body.categories).toBeInstanceOf(Array);
    expect(res.body.categories.length).toBe(11);
    expect(res.body.toolCount).toBe(11);
    expect(res.body.capabilityCount).toBeGreaterThanOrEqual(40);

    const counts = getCapabilityCountsByCategory();
    expect(Object.keys(counts).length).toBe(11);
    for (const [categoryId, count] of Object.entries(counts)) {
      expect(count, `${categoryId} should have multiple capabilities`).toBeGreaterThanOrEqual(4);
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(res.body.capabilityCount);

    const browser = res.body.categories.find(
      (c: { id: string }) => c.id === "browser",
    );
    expect(browser).toBeDefined();
    expect(browser.capabilities.length).toBeGreaterThanOrEqual(4);
    expect(browser.examplePrompts.length).toBeGreaterThanOrEqual(3);
    expect(browser.capabilities[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      toolName: expect.any(String),
      examplePrompt: expect.any(String),
      exampleParameters: expect.any(Object),
      riskLevel: expect.stringMatching(/^(low|medium|high)$/),
    });

    const ids = new Set<string>();
    for (const cat of res.body.categories) {
      for (const cap of cat.capabilities) {
        expect(ids.has(cap.id), `duplicate id ${cap.id}`).toBe(false);
        ids.add(cap.id);
      }
    }
  });

  it("POST /api/agent/run plans and executes a task", async () => {
    const res = await request(app)
      .post("/api/agent/run")
      .send({ task: "Open Chrome", execute: true });

    expect(res.status).toBe(200);
    expect(res.body.plan.intent).toBe("Open Chrome");
    expect(res.body.steps).toHaveLength(1);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.summary).toBe("Opened Chrome.");
    expect(mockAgentRun).toHaveBeenCalledWith("Open Chrome", { execute: true });
  });

  it("POST /api/agent/run with execute=false plans only", async () => {
    mockAgentRun.mockResolvedValueOnce({
      plan: samplePlan,
      results: [],
      summary: "Planned 1 step(s); set execute=true to run.",
    });

    const res = await request(app)
      .post("/api/agent/run")
      .send({ task: "Open Chrome", execute: false });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
    expect(mockAgentRun).toHaveBeenCalledWith("Open Chrome", { execute: false });
  });

  it("POST /api/agent/run returns 400 without task", async () => {
    const res = await request(app).post("/api/agent/run").send({});

    expect(res.status).toBe(400);
    expect(mockAgentRun).not.toHaveBeenCalled();
  });

  it("POST /api/agent/execute-capability runs a tool by id", async () => {
    const res = await request(app)
      .post("/api/agent/execute-capability")
      .send({ capabilityId: "browser.open-chrome" });

    expect(res.status).toBe(200);
    expect(res.body.capabilityId).toBe("browser.open-chrome");
    expect(res.body.toolName).toBe("browser");
    expect(res.body.success).toBe(true);
    expect(mockToolsExecute).toHaveBeenCalledWith(
      "browser",
      expect.objectContaining({ action: "open_browser", browser: "chrome" }),
    );
  });

  it("POST /api/agent/execute-capability returns 404 for unknown id", async () => {
    const res = await request(app)
      .post("/api/agent/execute-capability")
      .send({ capabilityId: "unknown.cap" });

    expect(res.status).toBe(404);
    expect(mockToolsExecute).not.toHaveBeenCalled();
  });
});
