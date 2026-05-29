export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  streaming?: boolean;
  toolResults?: ToolResult[];
}

export type PlanStepStatus = "pending" | "running" | "completed" | "failed";

export interface PlanStep {
  id: string;
  order: number;
  description: string;
  tool?: string;
  status: PlanStepStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: "idle" | "planning" | "executing" | "completed" | "failed";
}

export interface OllamaStatus {
  connected: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface HealthResponse {
  ok: boolean;
  ollama?: OllamaStatus;
  version?: string;
  tools?: {
    count: number;
    names: string[];
  };
}

export interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
}

export interface ToastMessage {
  id: string;
  type: "error" | "success" | "info";
  text: string;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  examplePrompt: string;
  enabled?: boolean;
}

export interface AgentCapabilityCategory {
  id: string;
  name: string;
  capabilities: AgentCapability[];
}

export interface AgentCapabilitiesResponse {
  categories: AgentCapabilityCategory[];
  source?: "api" | "static";
}

export interface AgentRunResult {
  response?: string;
  summary?: string;
  plan?: AgentPlan;
  toolResults?: ToolResult[];
}
