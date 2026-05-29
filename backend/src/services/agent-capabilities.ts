import { CAPABILITIES_CATALOG } from "../data/capabilities-catalog.js";

export type RiskLevel = "low" | "medium" | "high";

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  toolName: string;
  examplePrompt: string;
  exampleParameters: Record<string, unknown>;
  riskLevel: RiskLevel;
}

export interface AgentCapabilityCategory {
  id: string;
  name: string;
  examplePrompts: string[];
  capabilities: AgentCapability[];
}

export interface AgentCapabilitiesResponse {
  categories: AgentCapabilityCategory[];
  toolCount: number;
  capabilityCount: number;
}

const CATALOG: AgentCapabilityCategory[] = CAPABILITIES_CATALOG;

const capabilityById = new Map<string, AgentCapability>();

for (const category of CATALOG) {
  for (const cap of category.capabilities) {
    capabilityById.set(cap.id, cap);
  }
}

export function getAgentCapabilities(): AgentCapabilitiesResponse {
  const capabilityCount = CATALOG.reduce((n, c) => n + c.capabilities.length, 0);
  return {
    categories: CATALOG,
    toolCount: 11,
    capabilityCount,
  };
}

export function getCapabilityCountsByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const category of CATALOG) {
    counts[category.id] = category.capabilities.length;
  }
  return counts;
}

export function findCapabilityById(id: string): AgentCapability | undefined {
  return capabilityById.get(id);
}
