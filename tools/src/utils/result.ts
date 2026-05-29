import type { ToolResult } from "../types.js";

export function ok(data: unknown, message?: string): ToolResult {
  return { success: true, data, message };
}

export function fail(error: string): ToolResult {
  return { success: false, error };
}

export function requireString(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing or invalid required parameter: ${key}`);
  }
  return value;
}

export function optionalString(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

export function optionalNumber(params: Record<string, unknown>, key: string): number | undefined {
  const value = params[key];
  return typeof value === "number" ? value : undefined;
}

export function optionalBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
  const value = params[key];
  return typeof value === "boolean" ? value : undefined;
}
