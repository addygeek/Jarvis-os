import type { ChatMessage, OllamaConfig, OllamaChatResult, OllamaToolCall } from "./types.js";

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

/** Split `model:tag` on the first colon (Ollama tag format). */
function parseModelRef(name: string): [base: string, tag: string | undefined] {
  const idx = name.indexOf(":");
  if (idx === -1) return [name, undefined];
  return [name.slice(0, idx), name.slice(idx + 1)];
}

/** True when `requested` is installed (exact tag or any tag if base-only). */
export function isOllamaModelAvailable(
  installedNames: string[],
  requested: string,
): boolean {
  const [reqBase, reqTag] = parseModelRef(requested);
  return installedNames.some((installed) => {
    const [insBase, insTag] = parseModelRef(installed);
    if (reqBase !== insBase) return false;
    if (!reqTag) return true;
    return insTag === reqTag;
  });
}

export type OllamaToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly numGpu: number;
  private readonly flashAttn: boolean;
  private readonly numCtx: number;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 120_000;
    // Apple Silicon NPU/GPU optimisations
    this.numGpu = config.numGpu ?? 99;
    this.flashAttn = config.flashAttn !== false;
    this.numCtx = config.numCtx ?? 8192;
  }

  /** Build the `options` block sent to Ollama on every request. */
  private ollamaOptions(temperature: number): Record<string, unknown> {
    return {
      temperature,
      num_gpu: this.numGpu,
      use_mlock: true,       // keep model in memory between calls
      num_ctx: this.numCtx,
      ...(this.flashAttn ? { flash_attn: true } : {}),
    };
  }

  get modelName(): string {
    return this.model;
  }

  async healthCheck(): Promise<{ ok: boolean; modelAvailable: boolean; error?: string }> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`);
      if (!res.ok) {
        return { ok: false, modelAvailable: false, error: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as OllamaTagsResponse;
      const names = data.models.map((m) => m.name);
      const modelAvailable = isOllamaModelAvailable(names, this.model);
      return { ok: true, modelAvailable };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, modelAvailable: false, error: message };
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      format?: "json";
      tools?: OllamaToolDefinition[];
    },
  ): Promise<string> {
    const result = await this.chatWithTools(messages, options);
    return result.content;
  }

  async chatWithTools(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      format?: "json";
      tools?: OllamaToolDefinition[];
    },
  ): Promise<OllamaChatResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: false,
      options: this.ollamaOptions(options?.temperature ?? 0.3),
    };

    if (options?.format === "json") {
      body.format = "json";
    }

    if (options?.tools?.length) {
      body.tools = options.tools;
    }

    const res = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    return {
      content: data.message?.content ?? "",
      toolCalls: data.message?.tool_calls ?? [],
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: { temperature?: number },
  ): AsyncGenerator<string> {
    const body = {
      model: this.model,
      messages,
      stream: true,
      options: this.ollamaOptions(options?.temperature ?? 0.5),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(`Ollama stream failed (${res.status}): ${text}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            if (data.message?.content) yield data.message.content;
            if (data.done) return;
          } catch { /* skip malformed */ }
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  async generate(prompt: string, options?: { temperature?: number }): Promise<string> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: this.ollamaOptions(options?.temperature ?? 0.3),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama generate failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { response: string };
    return data.response ?? "";
  }

  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
