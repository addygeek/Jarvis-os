/** Shapes returned by the JarvisOS backend (see backend/src/types/api.ts). */

export interface BackendPlanStep {
  id: string;
  description: string;
  tool: string;
  parameters: Record<string, unknown>;
}

export interface BackendPlan {
  intent: string;
  steps: BackendPlanStep[];
  response?: string;
}

export interface BackendStepExecution {
  stepId: string;
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface BackendExecution {
  plan: BackendPlan;
  steps: BackendStepExecution[];
  summary: string;
}

export interface BackendHealth {
  ok?: boolean;
  status: "ok" | "degraded";
  version: string;
  ollama: {
    connected?: boolean;
    reachable?: boolean;
    model: string;
    modelAvailable?: boolean;
    latencyMs?: number;
    error?: string;
  };
  tools: {
    count: number;
    names: string[];
  };
}

export interface BackendChatResponse {
  conversationId: string;
  response: string;
  plan?: BackendPlan;
  execution?: BackendExecution;
  reply?: {
    id: string;
    role: "assistant";
    content: string;
    timestamp: number;
  };
}
