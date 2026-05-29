import type { Tool, ToolParametersSchema, ToolResult } from "./types.js";
import { appLauncherTool } from "./tools/app-launcher-tool.js";
import { browserTool } from "./tools/browser-tool.js";
import { calendarTool } from "./tools/calendar-tool.js";
import { emailTool } from "./tools/email-tool.js";
import { presentationTool } from "./tools/presentation-tool.js";
import { fileTool } from "./tools/file-tool.js";
import { folderScanTool } from "./tools/folder-scan-tool.js";
import { notesTool } from "./tools/notes-tool.js";
import { pdfTool } from "./tools/pdf-tool.js";
import { systemTool } from "./tools/system-tool.js";
import { terminalTool } from "./tools/terminal-tool.js";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: Tool[] = defaultTools) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  getSchemas(): { name: string; description: string; parameters: ToolParametersSchema }[] {
    return this.list().map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` };
    }
    const started = Date.now();
    const result = await tool.execute(params);
    return { ...result, durationMs: Date.now() - started };
  }

  /** Human- and LLM-readable tool list for planner prompts (names + actions). */
  formatPlannerToolsList(): string {
    return this.list()
      .map((tool) => {
        const actions = extractActionEnums(tool.parameters);
        const actionLine =
          actions.length > 0 ? `\n  actions: ${actions.join(", ")}` : "";
        const required = tool.parameters.required?.length
          ? `\n  required params: ${tool.parameters.required.join(", ")}`
          : "";
        return `- ${tool.name}: ${tool.description}${actionLine}${required}`;
      })
      .join("\n");
  }

  /** Ollama-compatible tool definitions for native tool calling. */
  getOllamaTools(): Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.list().map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: normalizeOllamaParameters(tool.parameters),
      },
    }));
  }
}

function extractActionEnums(schema: ToolParametersSchema): string[] {
  const actionProp = schema.properties.action;
  if (actionProp?.enum?.length) {
    return actionProp.enum;
  }
  return [];
}

function normalizeOllamaParameters(
  schema: ToolParametersSchema,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    properties[key] = {
      ...prop,
      ...(prop.enum ? { enum: prop.enum } : {}),
    };
  }
  return {
    type: "object",
    properties,
    ...(schema.required?.length ? { required: schema.required } : {}),
    additionalProperties: false,
  };
}

export const defaultTools: Tool[] = [
  fileTool,
  browserTool,
  terminalTool,
  appLauncherTool,
  pdfTool,
  notesTool,
  folderScanTool,
  systemTool,
  calendarTool,
  emailTool,
  presentationTool,
];

export const toolRegistry = new ToolRegistry();
