import type { Plan, ExecutionResult } from "@jarvisos/agent";

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ChatRequestBody {
  message: string;
  conversationId?: string;
  executePlan?: boolean;
}

export interface ChatResponseBody {
  conversationId: string;
  response: string;
  plan?: Plan;
  execution?: ExecutionResult;
  /** Frontend-compatible assistant message shape. */
  reply?: {
    id: string;
    role: "assistant";
    content: string;
    timestamp: number;
  };
}

export interface PlanRequestBody {
  intent: string;
  context?: string;
}

export interface PlanResponseBody {
  plan: Plan;
}

export interface ExecuteRequestBody {
  plan: Plan;
}

export interface ExecuteResponseBody {
  execution: ExecutionResult;
}

export interface AgentRunRequestBody {
  task: string;
  execute?: boolean;
}

export interface AgentRunResponseBody {
  plan: Plan;
  steps: Plan["steps"];
  results: ExecutionResult["steps"];
  summary: string;
}

export interface ExecuteCapabilityRequestBody {
  capabilityId: string;
  parameters?: Record<string, unknown>;
}

export interface ExecuteCapabilityResponseBody {
  capabilityId: string;
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface HealthResponseBody {
  status: "ok" | "degraded";
  version: string;
  ollama: {
    reachable: boolean;
    model: string;
    modelAvailable: boolean;
    error?: string;
  };
  tools: {
    count: number;
    names: string[];
  };
}
