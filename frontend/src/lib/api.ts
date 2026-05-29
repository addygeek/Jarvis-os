import type {
  AgentCapabilitiesResponse,
  AgentCapabilityCategory,
  AgentPlan,
  AgentRunResult,
  ChatMessage,
  HealthResponse,
  ToolInfo,
  ToolResult,
} from "@/types";
import { FALLBACK_AGENT_CAPABILITIES } from "@/data/fallbackCapabilities";
import type {
  BackendChatResponse,
  BackendExecution,
  BackendHealth,
  BackendPlan,
  BackendStepExecution,
} from "./backend-types";
import { mapPlanToAgentPlan } from "./plan-mapper";

function mapAgentRunPayload(res: {
  plan?: BackendPlan;
  results?: BackendStepExecution[];
  summary?: string;
  response?: string;
  execution?: BackendExecution;
}): {
  agentPlan?: AgentPlan;
  toolResults?: ToolResult[];
  summary?: string;
  response?: string;
} {
  const execution: BackendExecution | undefined =
    res.execution ??
    (res.plan
      ? {
          plan: res.plan,
          steps: res.results ?? [],
          summary: res.summary ?? res.plan.response ?? "",
        }
      : undefined);

  const agentPlan = res.plan
    ? mapPlanToAgentPlan(
        res.plan,
        execution,
        execution?.steps.length ? "completed" : "planning",
      )
    : undefined;

  const toolResults = execution?.steps.map((s) => ({
    tool: s.tool,
    success: s.success,
    output: s.data != null ? String(s.data) : undefined,
    error: s.error,
    durationMs: s.durationMs,
  }));

  return {
    agentPlan,
    toolResults,
    summary: res.summary ?? execution?.summary ?? res.plan?.response,
    response: res.response,
  };
}

/** Avoid localhost vs 127.0.0.1 split (CORS / IPv6) in browser and Electron. */
function normalizeApiOrigin(url: string): string {
  return url
    .replace(/\/$/, "")
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1");
}

function resolveBaseUrl(): string {
  // Vite dev (browser or Electron): same-origin /api via proxy in vite.config.ts
  if (import.meta.env.DEV && import.meta.hot) {
    return "";
  }
  if (typeof window !== "undefined" && window.jarvis?.apiBaseUrl) {
    return normalizeApiOrigin(window.jarvis.apiBaseUrl);
  }
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return normalizeApiOrigin(fromEnv);
  return "http://127.0.0.1:3847";
}

const BASE_URL = resolveBaseUrl();

function displayApiBaseUrl(): string {
  if (BASE_URL) return BASE_URL;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://127.0.0.1:3847";
}

function newMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => undefined);
    }
    throw new ApiError(
      errorMessage(body, `API ${res.status}: ${path}`),
      res.status,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function mapHealth(h: BackendHealth): HealthResponse {
  const ollamaConnected =
    h.ollama.connected ??
    (h.ollama.reachable === true && h.ollama.modelAvailable === true);

  return {
    ok: h.ok ?? h.status === "ok",
    version: h.version,
    ollama: {
      connected: ollamaConnected,
      model: h.ollama.model,
      latencyMs: h.ollama.latencyMs,
      error: h.ollama.error,
    },
    tools: h.tools,
  };
}

function mapChatResponse(res: BackendChatResponse): {
  reply: ChatMessage;
  conversationId: string;
  plan?: AgentPlan;
} {
  const plan = res.plan
    ? mapPlanToAgentPlan(res.plan, res.execution)
    : undefined;

  const content =
    typeof res.response === "string"
      ? res.response
      : typeof res.reply?.content === "string"
        ? res.reply.content
        : "";

  return {
    conversationId: res.conversationId,
    reply: {
      id: res.reply?.id ?? newMessageId(),
      role: "assistant",
      content,
      timestamp: res.reply?.timestamp ?? Date.now(),
    },
    plan,
  };
}

const TOOL_DESCRIPTIONS: Record<string, { description: string; category: string }> = {
  file: { description: "Read, move, delete, rename files", category: "system" },
  browser: { description: "Open websites, search, navigate tabs", category: "apps" },
  terminal: { description: "Run shell commands, git, installs", category: "system" },
  app_launcher: { description: "Open macOS applications", category: "apps" },
  pdf: { description: "Read and summarize PDFs", category: "research" },
  notes: { description: "Create and search notes", category: "productivity" },
  folder_scan: { description: "Scan folders and list files", category: "system" },
  system: { description: "Volume, dark mode, system settings", category: "system" },
  calendar: { description: "Create and update events", category: "productivity" },
  email: { description: "Draft and search email", category: "productivity" },
  presentation: { description: "Generate presentations", category: "research" },
};

export const api = {
  baseUrl: displayApiBaseUrl(),

  async health(): Promise<HealthResponse> {
    const h = await request<BackendHealth>("/api/health");
    return mapHealth(h);
  },

  async getTools(): Promise<ToolInfo[]> {
    const h = await request<BackendHealth>("/api/health");
    return h.tools.names.map((name) => {
      const meta = TOOL_DESCRIPTIONS[name];
      return {
        name,
        description: meta?.description ?? `Tool: ${name}`,
        enabled: true,
        category: meta?.category,
      };
    });
  },

  async sendChat(
    message: string,
    options?: {
      conversationId?: string;
      executePlan?: boolean;
    },
  ): Promise<{
    reply: ChatMessage;
    conversationId: string;
    plan?: AgentPlan;
  }> {
    const res = await request<BackendChatResponse>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationId: options?.conversationId,
        executePlan: options?.executePlan,
      }),
    });
    return mapChatResponse(res);
  },

  async createPlan(
    intent: string,
    context?: string,
  ): Promise<{ plan: BackendPlan; agentPlan: AgentPlan }> {
    const res = await request<{ plan: BackendPlan }>("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, context }),
    });
    return {
      plan: res.plan,
      agentPlan: mapPlanToAgentPlan(res.plan, undefined, "planning"),
    };
  },

  async executePlan(plan: BackendPlan): Promise<{
    execution: BackendExecution;
    agentPlan: AgentPlan;
  }> {
    const res = await request<{ execution: BackendExecution }>("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    return {
      execution: res.execution,
      agentPlan: mapPlanToAgentPlan(plan, res.execution, "completed"),
    };
  },

  /** Plan → execute pipeline with live step updates (no chat memory). */
  async runPlanPipeline(
    intent: string,
    onPlan?: (plan: AgentPlan) => void,
  ): Promise<{ agentPlan: AgentPlan; summary: string }> {
    const { plan } = await this.createPlan(intent);
    onPlan?.(mapPlanToAgentPlan(plan, undefined, "executing"));
    const { agentPlan, execution } = await this.executePlan(plan);
    onPlan?.(agentPlan);
    return { agentPlan, summary: execution.summary };
  },

  /**
   * Stream a task via SSE — emits plan + per-step events in real time.
   * Callbacks fire as each event arrives so the UI can update live.
   */
  streamAgentTask(
    task: string,
    callbacks: {
      onPlan?: (plan: AgentPlan) => void;
      onStepStart?: (stepId: string, tool: string, description: string) => void;
      onStepDone?: (stepId: string, tool: string, success: boolean, data: unknown, error: string | undefined, durationMs: number) => void;
      onSummary?: (text: string) => void;
      onError?: (message: string) => void;
      onDone?: () => void;
    },
  ): AbortController {
    const controller = new AbortController();
    const url = `${BASE_URL}/api/agent/stream`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ task }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        callbacks.onError?.(`Stream failed: ${res.status}`);
        callbacks.onDone?.();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE chunks — each ends with \n\n
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const eventLine = chunk.match(/^event: (.+)/m);
          const dataLine = chunk.match(/^data: (.+)/m);
          if (!eventLine || !dataLine) continue;

          const event = eventLine[1].trim();
          let data: Record<string, unknown>;
          try { data = JSON.parse(dataLine[1]) as Record<string, unknown>; }
          catch { continue; }

          if (event === "plan" && callbacks.onPlan) {
            const steps = (data.steps as Array<{id: string; order: number; description: string; tool?: string; status: string}> ?? []).map((s) => ({
              id: s.id,
              order: s.order,
              description: s.description,
              tool: s.tool,
              status: "pending" as const,
            }));
            callbacks.onPlan({
              id: crypto.randomUUID(),
              goal: String(data.intent ?? task),
              steps,
              status: "executing",
            });
          } else if (event === "step_start") {
            callbacks.onStepStart?.(
              String(data.stepId), String(data.tool), String(data.description),
            );
          } else if (event === "step_done") {
            callbacks.onStepDone?.(
              String(data.stepId), String(data.tool),
              Boolean(data.success), data.data,
              data.error != null ? String(data.error) : undefined,
              Number(data.durationMs),
            );
          } else if (event === "summary") {
            callbacks.onSummary?.(String(data.text ?? ""));
          } else if (event === "error") {
            callbacks.onError?.(String(data.message ?? "Unknown error"));
          } else if (event === "done") {
            callbacks.onDone?.();
          }
        }
      }
      callbacks.onDone?.();
    }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      callbacks.onError?.(err instanceof Error ? err.message : String(err));
      callbacks.onDone?.();
    });

    return controller;
  },

  /**
   * Unified voice/chat stream — handles both conversational tokens and
   * full agent execution (plan → steps → summary).
   *
   * Events: token | plan | step_start | step_done | error | done
   */
  streamChatFull(
    message: string,
    callbacks: {
      onToken?: (token: string) => void;
      onPlan?: (steps: Array<{ id: string; order: number; tool: string; description: string }>) => void;
      onStepStart?: (stepId: string, tool: string, description: string) => void;
      onStepDone?: (stepId: string, tool: string, success: boolean, error?: string) => void;
      onDone?: (conversationId?: string) => void;
      onError?: (message: string) => void;
    },
    options?: { conversationId?: string },
  ): AbortController {
    const controller = new AbortController();

    fetch(`${BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId: options?.conversationId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          callbacks.onError?.(`Stream failed: ${res.status}`);
          callbacks.onDone?.();
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const chunks = buf.split("\n\n");
          buf = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const eventLine = chunk.match(/^event: (.+)/m);
            const dataLine = chunk.match(/^data: (.+)/m);
            if (!eventLine || !dataLine) continue;
            const event = eventLine[1].trim();
            let data: Record<string, unknown>;
            try { data = JSON.parse(dataLine[1]) as Record<string, unknown>; }
            catch { continue; }

            if (event === "token") {
              callbacks.onToken?.(String(data.text ?? ""));
            } else if (event === "plan") {
              const steps = (data.steps as Array<{ id: string; order: number; tool: string; description: string }> ?? []);
              callbacks.onPlan?.(steps);
            } else if (event === "step_start") {
              callbacks.onStepStart?.(String(data.stepId ?? ""), String(data.tool ?? ""), String(data.description ?? ""));
            } else if (event === "step_done") {
              callbacks.onStepDone?.(
                String(data.stepId ?? ""), String(data.tool ?? ""),
                Boolean(data.success),
                data.error != null ? String(data.error) : undefined,
              );
            } else if (event === "error") {
              callbacks.onError?.(String(data.message ?? "Unknown error"));
            } else if (event === "done") {
              callbacks.onDone?.(data.conversationId != null ? String(data.conversationId) : undefined);
            }
          }
        }
        callbacks.onDone?.();
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        callbacks.onError?.(err instanceof Error ? err.message : String(err));
        callbacks.onDone?.();
      });

    return controller;
  },

  /** Speak text via Deepgram TTS — returns a blob URL (caller must revoke). */
  async speakText(text: string): Promise<string> {
    const url = `${BASE_URL}/api/voice/speak`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { body = undefined; }
      throw new ApiError(
        errorMessage(body, `TTS failed (${res.status})`),
        res.status,
        body,
      );
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  async transcribeVoice(audio: Blob, filename = "recording.webm"): Promise<string> {
    const form = new FormData();
    form.append("audio", audio, filename);
    const url = `${BASE_URL}/api/voice/transcribe`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });

    if (res.status === 404) {
      throw new ApiError(
        "Voice route not found — restart the backend (npm run dev:backend).",
        404,
      );
    }

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      throw new ApiError(
        errorMessage(body, "Transcription failed"),
        res.status,
        body,
      );
    }

    const data = (await res.json()) as { text?: string };
    return data.text ?? "";
  },

  async uploadFiles(
    files: File[],
  ): Promise<{ name: string; path: string; size: number }[]> {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file, file.name);
    }

    const url = `${BASE_URL}/api/files/upload`;
    const res = await fetch(url, { method: "POST", body: form });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      throw new ApiError(
        errorMessage(body, `Upload failed (${res.status})`),
        res.status,
        body,
      );
    }

    const data = (await res.json()) as {
      files?: { name: string; path: string; size: number }[];
    };
    return data.files ?? [];
  },

  async searchFiles(
    query: string,
  ): Promise<{ results: { path: string; name: string }[] }> {
    return request<{ results: { path: string; name: string }[] }>(
      `/api/search?q=${encodeURIComponent(query)}`,
    );
  },

  async getCapabilities(): Promise<AgentCapabilitiesResponse> {
    try {
      const res = await request<{
        categories?: AgentCapabilityCategory[];
        capabilities?: Array<{
          id: string;
          name: string;
          description: string;
          category: string;
          examplePrompt?: string;
          example?: string;
          enabled?: boolean;
        }>;
      }>("/api/agent/capabilities");

      if (res.categories?.length) {
        return { categories: res.categories, source: "api" };
      }

      if (res.capabilities?.length) {
        const byCategory = new Map<string, AgentCapabilityCategory>();
        for (const cap of res.capabilities) {
          const catId = cap.category || "general";
          if (!byCategory.has(catId)) {
            byCategory.set(catId, {
              id: catId,
              name: catId.charAt(0).toUpperCase() + catId.slice(1),
              capabilities: [],
            });
          }
          byCategory.get(catId)!.capabilities.push({
            id: cap.id,
            name: cap.name,
            description: cap.description,
            category: cap.category,
            examplePrompt: cap.examplePrompt ?? cap.example ?? cap.description,
            enabled: cap.enabled,
          });
        }
        return { categories: [...byCategory.values()], source: "api" };
      }
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) {
        /* fall through to static */
      }
    }

    return { categories: FALLBACK_AGENT_CAPABILITIES, source: "static" };
  },

  async runAgentTask(
    task: string,
    options?: { execute?: boolean; onPlan?: (plan: AgentPlan) => void },
  ): Promise<AgentRunResult> {
    const execute = options?.execute ?? true;

    try {
      const res = await request<{
        response?: string;
        summary?: string;
        plan?: BackendPlan;
        results?: BackendStepExecution[];
        execution?: BackendExecution;
      }>("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, execute }),
      });

      const mapped = mapAgentRunPayload(res);
      if (mapped.agentPlan) options?.onPlan?.(mapped.agentPlan);

      return {
        response: mapped.response,
        summary: mapped.summary,
        plan: mapped.agentPlan,
        toolResults: mapped.toolResults,
      };
    } catch (err) {
      if (err instanceof ApiError && err.status !== 404) throw err;
    }

    const { agentPlan, summary } = await this.runPlanPipeline(task, options?.onPlan);
    const toolResults: ToolResult[] = agentPlan.steps
      .filter((s) => s.tool)
      .map((s) => ({
        tool: s.tool!,
        success: s.status === "completed",
        error: s.error,
      }));

    return { summary, plan: agentPlan, toolResults };
  },

  async executeCapability(
    capabilityId: string,
    options?: { prompt?: string; execute?: boolean; onPlan?: (plan: AgentPlan) => void },
  ): Promise<AgentRunResult> {
    const execute = options?.execute ?? true;

    try {
      const parameters =
        options?.prompt != null ? { task: options.prompt } : undefined;

      const res = await request<{
        capabilityId: string;
        toolName: string;
        success: boolean;
        result?: {
          plan?: BackendPlan;
          results?: BackendStepExecution[];
          summary?: string;
        };
        error?: string;
      }>("/api/agent/execute-capability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilityId, parameters }),
      });

      if (res.result?.plan) {
        const mapped = mapAgentRunPayload({
          plan: res.result.plan,
          results: res.result.results,
          summary: res.result.summary,
        });
        if (mapped.agentPlan) options?.onPlan?.(mapped.agentPlan);
        return {
          summary: mapped.summary ?? (res.success ? "Capability completed." : res.error),
          plan: mapped.agentPlan,
          toolResults: mapped.toolResults,
        };
      }

      return {
        summary: res.success
          ? `Ran ${res.toolName} successfully.`
          : (res.error ?? "Capability failed."),
        toolResults: [
          {
            tool: res.toolName,
            success: res.success,
            output: res.result != null ? String(res.result) : undefined,
            error: res.error,
          },
        ],
      };
    } catch (err) {
      if (err instanceof ApiError && err.status !== 404) throw err;
    }

    const staticCap = FALLBACK_AGENT_CAPABILITIES.flatMap((c) => c.capabilities).find(
      (c) => c.id === capabilityId,
    );
    const task = options?.prompt ?? staticCap?.examplePrompt;
    if (!task) {
      throw new ApiError(`Unknown capability: ${capabilityId}`, 404);
    }
    return this.runAgentTask(task, { execute, onPlan: options?.onPlan });
  },
};

export { ApiError, BASE_URL };
