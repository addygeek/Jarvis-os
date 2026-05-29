import type { MemoryStore } from "@jarvisos/memory";
import type { ToolRegistry } from "@jarvisos/tools";
import type { OllamaClient } from "./ollama-client.js";
import { Executor } from "./executor.js";
import { Planner } from "./planner.js";
import { loadPrompt, renderTemplate } from "./prompts.js";
import type {
  AgentRunOptions,
  AgentRunResult,
  ChatOptions,
  ChatResult,
  ExecutionResult,
  Plan,
} from "./types.js";

function formatToolsList(registry: ToolRegistry): string {
  return registry.formatPlannerToolsList();
}

export class AgentOrchestrator {
  private readonly planner: Planner;
  private readonly executor: Executor;
  private readonly planCache = new Map<
    string,
    {
      plan: Plan;
      timestamp: number;
      steps?: any[];
      summary?: string;
    }
  >();
  private readonly PLAN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly ollama: OllamaClient,
    private readonly tools: ToolRegistry,
    private readonly memory: MemoryStore,
  ) {
    this.planner = new Planner(ollama, tools);
    this.executor = new Executor(ollama, tools);
  }

  private normalizeIntent(intent: string): string {
    return intent.trim().toLowerCase().replace(/\s+/g, " ");
  }

  clearCache(): void {
    this.planCache.clear();
  }

  async plan(intent: string, context?: string): Promise<Plan> {
    const { plan } = await this.planner.createPlan({ intent, context });
    return plan;
  }

  async execute(plan: Plan): Promise<ExecutionResult> {
    return this.executor.executePlan(plan);
  }

  /** Plan (and optionally execute) a written task for the task-writing flow. */
  async run(task: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    const execute = options.execute !== false;
    const cacheKey = this.normalizeIntent(task);
    const cached = this.planCache.get(cacheKey);

    let plan: Plan;
    let ollamaToolResults: any[] | undefined;
    let cachedSteps: any[] | undefined = cached?.steps;
    let cachedSummary: string | undefined = cached?.summary;

    if (cached && Date.now() - cached.timestamp < this.PLAN_CACHE_TTL) {
      console.log(`[jarvisos] Plan cache HIT for task: "${task}"`);
      plan = cached.plan;
    } else {
      const plannerResult = await this.planner.createPlan({ intent: task });
      plan = plannerResult.plan;
      ollamaToolResults = plannerResult.ollamaToolResults;
    }

    if (!execute) {
      this.planCache.set(cacheKey, { plan, timestamp: Date.now() });
      return {
        plan,
        results: [],
        summary:
          plan.response ??
          `Planned ${plan.steps.length} step(s); set execute=true to run.`,
      };
    }

    if (ollamaToolResults?.length) {
      this.planCache.set(cacheKey, {
        plan,
        timestamp: Date.now(),
        steps: ollamaToolResults,
        summary: plan.response ?? `Executed ${ollamaToolResults.length} tool call(s).`,
      });
      const ok = ollamaToolResults.filter((s) => s.success).length;
      return {
        plan,
        results: ollamaToolResults,
        summary:
          plan.response ??
          `Executed ${ollamaToolResults.length} tool call(s); ${ok} succeeded.`,
      };
    }

    const execution = cachedSteps && cachedSummary
      ? await this.executor.executePlan(plan, cachedSteps, cachedSummary)
      : await this.executor.executePlan(plan);
    this.planCache.set(cacheKey, {
      plan,
      timestamp: Date.now(),
      steps: execution.steps,
      summary: execution.summary,
    });
    return {
      plan: execution.plan,
      results: execution.steps,
      summary: execution.summary,
    };
  }

  async chat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
    const conversationId =
      options.conversationId ??
      this.memory
          .createConversation(message.slice(0, 80) || "New chat")
          .id;

    this.memory.addMessage({
      conversationId,
      role: "user",
      content: message,
    });

    const history = this.memory.getMessages(conversationId, 20);
    const contextMessages = history
      .filter(
        (m): m is typeof m & { role: "user" | "assistant" | "system" } =>
          m.role === "user" || m.role === "assistant" || m.role === "system",
      )
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const template = loadPrompt("chat");
    const systemContent = renderTemplate(template, {
      TOOLS_LIST: formatToolsList(this.tools),
    });

    let plan: Plan | undefined;
    let execution: ExecutionResult | undefined;
    let response: string;

    const shouldExecute = options.executePlan !== false;

    if (shouldExecute && this.looksActionable(message)) {
      const cacheKey = this.normalizeIntent(message);
      const cached = this.planCache.get(cacheKey);
      let ollamaToolResults: any[] | undefined;
      let cachedSteps: any[] | undefined = cached?.steps;
      let cachedSummary: string | undefined = cached?.summary;

      if (cached && Date.now() - cached.timestamp < this.PLAN_CACHE_TTL) {
        console.log(`[jarvisos] Plan cache HIT for chat: "${message}"`);
        plan = cached.plan;
      } else {
        const plannerResult = await this.planner.createPlan({
          intent: message,
          context: this.buildContext(contextMessages),
        });
        plan = plannerResult.plan;
        ollamaToolResults = plannerResult.ollamaToolResults;
      }

      const task = this.memory.createTask({
        conversationId,
        intent: plan.intent,
        planJson: JSON.stringify(plan),
        status: "running",
      });

      try {
        if (ollamaToolResults?.length) {
          const ok = ollamaToolResults.filter((s) => s.success).length;
          execution = {
            plan,
            steps: ollamaToolResults,
            summary:
              plan.response ??
              `Executed ${ollamaToolResults.length} Ollama tool call(s); ${ok} succeeded.`,
          };
        } else {
          execution = cachedSteps && cachedSummary
            ? await this.executor.executePlan(plan, cachedSteps, cachedSummary)
            : await this.executor.executePlan(plan);
        }
        this.planCache.set(cacheKey, {
          plan,
          timestamp: Date.now(),
          steps: execution.steps,
          summary: execution.summary,
        });
        this.memory.updateTask(task.id, {
          status: "completed",
          resultJson: JSON.stringify(execution),
        });
        response = plan.response
          ? `${plan.response}\n\n${execution.summary}`
          : execution.summary;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.memory.updateTask(task.id, { status: "failed", error });
        response = `I encountered an error while executing the plan: ${error}`;
      }
    } else {
      const messages = [
        { role: "system" as const, content: systemContent },
        ...contextMessages,
      ];

      const ollamaHealth = await this.ollama.healthCheck();
      if (!ollamaHealth.ok) {
        response =
          "Ollama is not reachable. Start it with `ollama serve`, then pull a model (see models/README.md).";
      } else if (!ollamaHealth.modelAvailable) {
        response = `Ollama is running but model "${this.ollama.modelName}" is not installed. Run: ollama pull ${this.ollama.modelName}`;
      } else {
        try {
          response = await this.ollama.chat(messages, { temperature: 0.5 });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          response = `Sorry, I could not reach Ollama: ${error}`;
        }
      }
    }

    this.memory.addMessage({
      conversationId,
      role: "assistant",
      content: response,
      metadata: plan ? { plan, execution } : undefined,
    });

    return {
      conversationId,
      response,
      plan,
      execution,
    };
  }

  private looksActionable(message: string): boolean {
    // Skip planning only for clearly conversational/informational questions
    const pureQuestion =
      /^(what\s+(is|are|does|do|was|were|can|will)\b|who\s+(is|are)\b|how\s+(does|do|is|are|can)\b|explain\s+|describe\s+|tell\s+me\s+about\s+[^(how|what|where|when|who)]+$|define\s+|when\s+did\s+|is\s+there\s+|why\s+(is|are|do|does)\b)/i;
    if (pureQuestion.test(message.trim())) return false;

    // Broad action verb match — covers virtually all Mac commands
    const actionVerb =
      /\b(open|find|search|summarize|organize|clean|run|create|move|delete|navigate|launch|scan|read|email|install|show|list|get|set|write|make|build|generate|analyze|play|stop|turn|increase|decrease|check|update|send|close|quit|switch|change|start|enable|disable|save|sort|download|upload|rename|copy|go|take|clear|refresh|print|export|import|convert|share|view|edit|fix|debug|deploy|commit|push|pull|clone|schedule|remind|note|volume|mute|unmute|minimize|maximize|focus|activate|type|press|drag|click|scroll|resize|reboot|restart|sleep|wake|lock|unlock|zip|unzip|compress|extract|record|screenshot|capture|monitor|kill|terminate|install|uninstall|upgrade|downgrade|move|rename|duplicate|merge|split|combine|connect|disconnect|sync|backup|restore|reset|revert|publish|archive|pin|unpin|tag|label|filter|sort|group|hide|unhide|reveal|preview|read|write|append|insert|remove|add|drop|update|replace)\b/i;
    return actionVerb.test(message);
  }

  private buildContext(
    messages: Array<{ role: string; content: string }>,
  ): string {
    return messages
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
  }
}
