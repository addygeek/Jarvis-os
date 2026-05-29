export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  parameters: Record<string, unknown>;
}

export interface Plan {
  intent: string;
  steps: PlanStep[];
  response?: string;
}

export interface StepExecutionResult {
  stepId: string;
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface ExecutionResult {
  plan: Plan;
  steps: StepExecutionResult[];
  summary: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  conversationId?: string;
  contextMessages?: ChatMessage[];
  executePlan?: boolean;
}

export interface ChatResult {
  conversationId: string;
  response: string;
  plan?: Plan;
  execution?: ExecutionResult;
}

export interface AgentRunOptions {
  execute?: boolean;
}

export interface AgentRunResult {
  plan: Plan;
  results: StepExecutionResult[];
  summary: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  /** Apple Silicon: number of GPU layers to offload (99 = all). Default 99. */
  numGpu?: number;
  /** Enable flash-attention (faster on M-series). Default true. */
  flashAttn?: boolean;
  /** Context window size. Default 8192. */
  numCtx?: number;
}

export interface PlannerOptions {
  intent: string;
  context?: string;
  toolsList?: string;
}

export interface PlannerResult {
  plan: Plan;
  /** Populated when Ollama returned native tool_calls and they were executed. */
  ollamaToolResults?: StepExecutionResult[];
}

export interface OllamaToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
}

export interface OllamaChatResult {
  content: string;
  toolCalls: OllamaToolCall[];
}
