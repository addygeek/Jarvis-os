/** JSON Schema subset for tool parameters (tools agent may extend). */
export type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array";

export interface JsonSchemaProperty {
  type: JsonSchemaType;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface ToolParametersSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/** Runtime tool contract used by ToolRegistry and executors. */
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  durationMs?: number;
}

export interface ToolDefinition<TParams = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
  execute: (params: TParams) => Promise<unknown>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface ToolInfo {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
}
