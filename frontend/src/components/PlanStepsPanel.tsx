import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Terminal, XCircle, Zap } from "lucide-react";
import type { AgentPlan, PlanStepStatus } from "@/types";

const TOOL_COLOURS: Record<string, string> = {
  browser:      "text-blue-400   bg-blue-400/10   border-blue-400/30",
  file:         "text-amber-400  bg-amber-400/10  border-amber-400/30",
  terminal:     "text-green-400  bg-green-400/10  border-green-400/30",
  app_launcher: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  pdf:          "text-red-400    bg-red-400/10    border-red-400/30",
  notes:        "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  folder_scan:  "text-orange-400 bg-orange-400/10 border-orange-400/30",
  system:       "text-cyan-400   bg-cyan-400/10   border-cyan-400/30",
  calendar:     "text-indigo-400 bg-indigo-400/10 border-indigo-400/30",
  email:        "text-pink-400   bg-pink-400/10   border-pink-400/30",
  presentation: "text-teal-400   bg-teal-400/10   border-teal-400/30",
};

const PLANNING_PHRASES = [
  "Analyzing intent…",
  "Selecting tools…",
  "Building execution plan…",
  "Reasoning with Gemma…",
  "Mapping steps…",
];

function StepIcon({ status }: { status: PlanStepStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (status === "failed")
    return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
  if (status === "running")
    return (
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-400" />
      </span>
    );
  return <span className="h-4 w-4 shrink-0 rounded-full border border-jarvis-border/60" />;
}

function stepBg(status: PlanStepStatus) {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/5";
  if (status === "failed")    return "border-red-500/30    bg-red-500/5";
  if (status === "running")   return "border-cyan-500/40   bg-cyan-500/5 shadow-[0_0_10px_rgba(34,211,238,0.07)]";
  return "border-jarvis-border/30 bg-jarvis-bg/30";
}

function ThinkingPanel() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const p = setInterval(() => setPhraseIdx((i) => (i + 1) % PLANNING_PHRASES.length), 1800);
    const d = setInterval(() => setDots((n) => (n + 1) % 4), 420);
    return () => { clearInterval(p); clearInterval(d); };
  }, []);

  return (
    <div className="glass-panel flex flex-col items-center gap-5 px-6 py-8">
      {/* Spinning orb */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute h-20 w-20 rounded-full border border-t-cyan-400/70 border-cyan-500/15 animate-[spin_4s_linear_infinite]" />
        <span className="absolute h-14 w-14 rounded-full border border-t-cyan-300/60 border-cyan-400/10 animate-[spin_2.5s_linear_infinite_reverse]" />
        <span className="absolute h-10 w-10 animate-ping rounded-full bg-cyan-400/10" style={{ animationDuration: "2s" }} />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-cyan-600/20 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
          <Zap className="h-4 w-4 text-cyan-300" />
        </span>
      </div>

      {/* Scan line */}
      <div className="relative h-px w-full overflow-hidden rounded-full bg-jarvis-border/30">
        <span className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
          style={{ animation: "scanline 2s ease-in-out infinite" }} />
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium text-jarvis-accent">
          {PLANNING_PHRASES[phraseIdx]}
          <span className="ml-0.5 inline-block w-5 text-left">{".".repeat(dots)}</span>
        </p>
        <p className="mt-1 text-xs text-jarvis-muted">gemma4:e4b · local</p>
      </div>

      {/* Activity bars */}
      <div className="flex w-full items-end gap-1" style={{ height: 28 }}>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="flex-1 rounded-sm bg-cyan-400/40"
            style={{ animation: `barbeat 1.2s ease-in-out ${(i * 0.09).toFixed(2)}s infinite alternate`, minHeight: 4 }} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  plan: AgentPlan | null;
  loading?: boolean;
}

export function PlanStepsPanel({ plan, loading }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevPlanId = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!plan || plan.steps.length === 0) return;
    if (plan.id === prevPlanId.current) return;
    prevPlanId.current = plan.id;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisibleCount(0);
    plan.steps.forEach((_, i) => {
      timers.current.push(setTimeout(() => setVisibleCount(i + 1), i * 240 + 80));
    });
  }, [plan]);

  if (loading && (!plan || plan.steps.length === 0)) return <ThinkingPanel />;

  if (!plan || plan.steps.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-jarvis-elevated ring-1 ring-jarvis-border/40">
          <Zap className="h-5 w-5 text-jarvis-muted" />
        </div>
        <p className="text-xs text-jarvis-muted">Run a task to see the plan here.</p>
      </div>
    );
  }

  const done = plan.steps.filter((s) => s.status === "completed" || s.status === "failed").length;
  const pct = plan.steps.length > 0 ? Math.round((done / plan.steps.length) * 100) : 0;
  const failed = plan.steps.filter((s) => s.status === "failed").length;

  return (
    <div className="glass-panel animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-jarvis-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-jarvis-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-jarvis-subtle">Agent plan</span>
        </div>
        <StatusBadge status={plan.status} loading={loading} />
      </div>

      {/* Goal */}
      <div className="border-b border-jarvis-border/30 px-4 py-2.5">
        <p className="line-clamp-2 text-xs font-medium text-jarvis-text">{plan.goal}</p>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 flex justify-between">
          <span className="text-[10px] text-jarvis-muted">{done}/{plan.steps.length} steps</span>
          <div className="flex items-center gap-2">
            {elapsed(plan) && (
              <span className="flex items-center gap-1 text-[10px] text-jarvis-muted">
                <Clock className="h-2.5 w-2.5" />{elapsed(plan)}
              </span>
            )}
            <span className="text-[10px] text-jarvis-muted">{pct}%</span>
          </div>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-jarvis-elevated">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              failed > 0
                ? "bg-gradient-to-r from-cyan-400 to-red-400"
                : "bg-gradient-to-r from-cyan-500 to-cyan-300"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-2 px-3 py-3">
        {plan.steps.map((step, idx) => {
          const visible = idx < visibleCount;
          const col = TOOL_COLOURS[step.tool ?? ""] ?? "text-jarvis-accent bg-jarvis-accent/10 border-jarvis-accent/30";
          return (
            <li
              key={step.id}
              className={`rounded-lg border px-3 py-2.5 transition-all duration-300 ${stepBg(step.status)} ${
                visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5"><StepIcon status={step.status} /></div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${step.status === "pending" ? "text-jarvis-muted" : "text-jarvis-text"}`}>
                    {step.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {step.tool && (
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${col}`}>
                        {step.tool}
                      </span>
                    )}
                    {step.status === "running" && (
                      <span className="animate-pulse text-[10px] text-cyan-400">executing…</span>
                    )}
                    {step.status === "failed" && step.error && (
                      <span className="max-w-[160px] truncate text-[10px] text-red-400">{step.error}</span>
                    )}
                    {step.completedAt && step.startedAt && (
                      <span className="ml-auto tabular-nums text-[10px] text-jarvis-muted">
                        {step.completedAt - step.startedAt}ms
                      </span>
                    )}
                  </div>
                </div>
                <span className="mt-0.5 font-mono text-[10px] text-jarvis-muted/50">{step.order}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Still-running pulse */}
      {loading && (
        <div className="border-t border-jarvis-border/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            <span className="text-[11px] text-jarvis-muted">Processing…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function elapsed(plan: AgentPlan): string | null {
  const start = plan.steps.find((s) => s.startedAt)?.startedAt;
  const end = [...plan.steps].reverse().find((s) => s.completedAt)?.completedAt;
  if (!start || !end) return null;
  return `${((end - start) / 1000).toFixed(1)}s`;
}

function StatusBadge({ status, loading }: { status: AgentPlan["status"]; loading?: boolean }) {
  if (loading && (status === "planning" || status === "executing" || status === "idle"))
    return (
      <span className="flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
        {status === "planning" ? "planning" : "executing"}
      </span>
    );
  if (status === "completed")
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">done</span>;
  if (status === "failed")
    return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">failed</span>;
  return <span className="rounded-full bg-jarvis-elevated px-2 py-0.5 text-[10px] text-jarvis-muted">{status}</span>;
}
