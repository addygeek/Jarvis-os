import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentRoot = join(__dirname, "..");
const PROMPTS_DIR = join(agentRoot, "..", "prompts");

const cache = new Map<string, string>();

export function loadPrompt(name: "planner" | "executor" | "chat"): string {
  const key = `${name}.system.md`;
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  const content = readFileSync(join(PROMPTS_DIR, key), "utf-8");
  cache.set(key, content);
  return content;
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
