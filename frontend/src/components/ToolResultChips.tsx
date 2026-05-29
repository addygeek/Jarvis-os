import { CheckCircle2, XCircle, Wrench } from "lucide-react";
import type { ToolResult } from "@/types";

export function ToolResultChips({ results }: { results: ToolResult[] }) {
  if (!results.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {results.map((tr, i) => (
        <span
          key={`${tr.tool}-${i}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
            tr.success
              ? "border-jarvis-success/40 bg-jarvis-success/10 text-jarvis-success"
              : "border-jarvis-danger/40 bg-jarvis-danger/10 text-jarvis-danger"
          }`}
          title={tr.error ?? tr.output}
        >
          {tr.success ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          ) : (
            <XCircle className="h-3 w-3 shrink-0" />
          )}
          <Wrench className="h-2.5 w-2.5 shrink-0 opacity-60" />
          {tr.tool}
        </span>
      ))}
    </div>
  );
}

export function toolResultsFromPlan(
  steps: { tool?: string; status: string; error?: string }[],
): ToolResult[] {
  return steps
    .filter((s) => s.tool)
    .map((s) => ({
      tool: s.tool!,
      success: s.status === "completed",
      error: s.error,
    }));
}
