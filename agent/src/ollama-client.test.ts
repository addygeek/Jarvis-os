import { afterEach, describe, expect, it, vi } from "vitest";
import { isOllamaModelAvailable, OllamaClient } from "./ollama-client.js";

describe("isOllamaModelAvailable", () => {
  it("matches exact base:tag names", () => {
    expect(isOllamaModelAvailable(["gemma4:e4b"], "gemma4:e4b")).toBe(true);
    expect(isOllamaModelAvailable(["gemma4:e4b"], "gemma4:2b")).toBe(false);
  });

  it("matches base-only request against any tag", () => {
    expect(isOllamaModelAvailable(["gemma4:e4b", "llama3.2"], "gemma4")).toBe(true);
  });
});

describe("OllamaClient.healthCheck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects gemma4:e4b when listed with a colon tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: "gemma4:e4b" }] }),
      }),
    );

    const client = new OllamaClient({
      baseUrl: "http://127.0.0.1:11434",
      model: "gemma4:e4b",
    });

    await expect(client.healthCheck()).resolves.toEqual({
      ok: true,
      modelAvailable: true,
    });
  });
});

describe("OllamaClient.chatWithTools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts tool_calls from a mock Ollama chat response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "gemma4:e4b",
        done: true,
        message: {
          role: "assistant",
          content: "Launching app",
          tool_calls: [
            {
              id: "call_abc",
              type: "function",
              function: {
                name: "app_launcher",
                arguments: { app: "chrome" },
              },
            },
          ],
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new OllamaClient({
      baseUrl: "http://127.0.0.1:11434",
      model: "gemma4:e4b",
      timeoutMs: 5000,
    });

    const result = await client.chatWithTools(
      [{ role: "user", content: "open chrome" }],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "app_launcher",
              description: "Launch apps",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
    );

    expect(result.content).toBe("Launching app");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.function.name).toBe("app_launcher");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
