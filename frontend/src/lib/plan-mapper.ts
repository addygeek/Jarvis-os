import type { AgentPlan, PlanStepStatus } from "@/types";
import type { BackendExecution, BackendPlan } from "./backend-types";

export function mapPlanToAgentPlan(
  plan: BackendPlan,
  execution?: BackendExecution,
  statusOverride?: AgentPlan["status"],
): AgentPlan {
  const execByStep = new Map(
    execution?.steps.map((s) => [s.stepId, s]) ?? [],
  );

  const steps = plan.steps.map((step, index) => {
    const exec = execByStep.get(step.id);
    let status: PlanStepStatus = "pending";
    if (exec) {
      status = exec.success ? "completed" : "failed";
    } else if (statusOverride === "executing") {
      status = "running";
    }

    return {
      id: step.id,
      order: index + 1,
      description: step.description,
      tool: step.tool,
      status,
      error: exec?.error,
      completedAt: exec ? Date.now() : undefined,
    };
  });

  let status: AgentPlan["status"] = statusOverride ?? "idle";
  if (!statusOverride) {
    if (execution) {
      status = execution.steps.some((s) => !s.success) ? "failed" : "completed";
    } else if (plan.steps.length > 0) {
      status = "planning";
    }
  }

  return {
    id: plan.intent.slice(0, 32) || crypto.randomUUID(),
    goal: plan.intent,
    steps,
    status,
  };
}
