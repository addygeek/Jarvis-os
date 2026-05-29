import { AgentOrchestrator, OllamaClient } from "@jarvisos/agent";
import { MemoryStore } from "@jarvisos/memory";
import { toolRegistry } from "@jarvisos/tools";
import { appConfig } from "../config.js";

export interface AppContainer {
  memory: MemoryStore;
  ollama: OllamaClient;
  agent: AgentOrchestrator;
  tools: typeof toolRegistry;
}

let container: AppContainer | null = null;

export function getContainer(): AppContainer {
  if (!container) {
    const memory = new MemoryStore(appConfig.databasePath);
    const ollama = new OllamaClient({
      baseUrl: appConfig.ollama.baseUrl,
      model: appConfig.ollama.model,
      numGpu: appConfig.ollama.numGpu,
      flashAttn: appConfig.ollama.flashAttn,
      numCtx: appConfig.ollama.numCtx,
    });
    const agent = new AgentOrchestrator(ollama, toolRegistry, memory);

    container = { memory, ollama, agent, tools: toolRegistry };
  }
  return container;
}

export function shutdownContainer(): void {
  if (container) {
    container.memory.close();
    container = null;
  }
}
