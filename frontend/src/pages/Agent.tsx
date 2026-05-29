import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  QUICK_AGENT_EXAMPLES,
  countCapabilities,
  filterCapabilities,
} from "@/data/fallbackCapabilities";
import { useCapabilities } from "@/hooks/useCapabilities";
import { usePendingChatMessage } from "@/context/PendingChatMessageContext";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PlanStepsPanel } from "@/components/PlanStepsPanel";
import { ToolResultChips } from "@/components/ToolResultChips";
import type { AgentCapability, AgentCapabilityCategory, AgentPlan, ToolResult } from "@/types";

// ── category accent colours ───────────────────────────────────────────────────
const CAT_COLOURS: Record<string, string> = {
  browser:       "bg-blue-500/15   text-blue-300   border-blue-500/30",
  files:         "bg-amber-500/15  text-amber-300  border-amber-500/30",
  apps:          "bg-purple-500/15 text-purple-300 border-purple-500/30",
  system:        "bg-cyan-500/15   text-cyan-300   border-cyan-500/30",
  research:      "bg-red-500/15    text-red-300    border-red-500/30",
  calendar:      "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  email:         "bg-pink-500/15   text-pink-300   border-pink-500/30",
  presentations: "bg-teal-500/15   text-teal-300   border-teal-500/30",
  terminal:      "bg-green-500/15  text-green-300  border-green-500/30",
  knowledge:     "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  tasks:         "bg-orange-500/15 text-orange-300 border-orange-500/30",
};
const CAT_DEFAULT = "bg-jarvis-elevated text-jarvis-muted border-jarvis-border/40";

export function Agent() {
  const navigate = useNavigate();
  const { setActivePlan } = useApp();
  const { setPendingChatMessage } = usePendingChatMessage();
  const { pushToast } = useToast();

  const { categories: allCategories, source, loading: loadingCaps } = useCapabilities();
  const [filter, setFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const byFilter = filterCapabilities(allCategories, filter);
    if (!activeCategory) return byFilter;
    return byFilter.filter((c) => c.id === activeCategory);
  }, [allCategories, filter, activeCategory]);

  const exampleCount = useMemo(() => countCapabilities(allCategories), [allCategories]);

  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendToChat = useCallback(
    (message: string) => {
      setPendingChatMessage({ text: message });
      navigate("/chat", { state: { prefill: message } });
    },
    [navigate, setPendingChatMessage],
  );

  const fillTask = useCallback((prompt: string) => {
    setTask(prompt);
    setPlan(null);
    setSummary(null);
    setToolResults([]);
  }, []);

  const copyPrompt = useCallback(
    async (cap: AgentCapability) => {
      try {
        await navigator.clipboard.writeText(cap.examplePrompt);
        setCopiedId(cap.id);
        pushToast("success", "Copied");
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        pushToast("error", "Could not copy");
      }
    },
    [pushToast],
  );

  const runTask = useCallback(
    (intent: string) => {
      const text = intent.trim();
      if (!text || running) return;

      // cancel any in-flight stream
      abortRef.current?.abort();

      setRunning(true);
      setPlan(null);
      setSummary(null);
      setToolResults([]);
      setActivePlan(null);

      const ctrl = api.streamAgentTask(text, {
        onPlan: (p) => {
          setPlan(p);
          setActivePlan(p);
        },

        onStepStart: (stepId) => {
          setPlan((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: "executing",
              steps: prev.steps.map((s) =>
                s.id === stepId ? { ...s, status: "running", startedAt: Date.now() } : s,
              ),
            };
          });
        },

        onStepDone: (stepId, tool, success, _data, error, durationMs) => {
          const completedAt = Date.now();
          setPlan((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              steps: prev.steps.map((s) =>
                s.id === stepId
                  ? {
                      ...s,
                      status: success ? "completed" : "failed",
                      completedAt,
                      error,
                    }
                  : s,
              ),
            };
          });
          setToolResults((prev) => [
            ...prev,
            { tool, success, error, durationMs },
          ]);
        },

        onSummary: (text) => {
          setSummary(text);
          setPlan((prev) =>
            prev ? { ...prev, status: "completed" } : prev,
          );
          setActivePlan((prev: AgentPlan | null) =>
            prev ? { ...prev, status: "completed" } : prev,
          );
          pushToast("success", "Task finished");
        },

        onError: (msg) => {
          setSummary(msg);
          setPlan((prev) => prev ? { ...prev, status: "failed" } : prev);
          pushToast("error", msg);
        },

        onDone: () => {
          setRunning(false);
        },
      });

      abortRef.current = ctrl;
    },
    [running, setActivePlan, pushToast],
  );

  const hasSidebar = running || plan || summary || toolResults.length > 0;

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* ── Left: capabilities + task composer ─────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-600/10 ring-1 ring-jarvis-accent/30">
              <Bot className="h-4 w-4 text-jarvis-accent" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-jarvis-text">Agent</h1>
              <p className="text-xs text-jarvis-muted">
                {loadingCaps ? "Loading…" : `${exampleCount} automations`}
                {!loadingCaps && source === "static" && " · offline catalog"}
              </p>
            </div>
          </div>
        </header>

        {/* Quick examples */}
        <section className="mb-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AGENT_EXAMPLES.map(({ label, prompt }) => (
              <button
                key={label}
                type="button"
                onClick={() => fillTask(prompt)}
                className="inline-flex items-center gap-1.5 rounded-full border border-jarvis-border/50 bg-jarvis-elevated px-3 py-1.5 text-xs text-jarvis-subtle transition hover:border-jarvis-accent/40 hover:text-jarvis-text"
              >
                <Sparkles className="h-3 w-3 text-jarvis-accent/70" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Search + category filter row */}
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-jarvis-muted" />
            <input
              type="search"
              className="input-field !py-1.5 pl-8 text-xs"
              placeholder="Search capabilities…"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setActiveCategory(null); }}
            />
          </div>
        </div>

        {/* Category pill tabs */}
        {!loadingCaps && (
          <div className="mb-2 flex shrink-0 gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                !activeCategory
                  ? "border-jarvis-accent/50 bg-jarvis-accent/10 text-jarvis-accent"
                  : "border-jarvis-border/40 bg-jarvis-elevated text-jarvis-muted hover:text-jarvis-text"
              }`}
            >
              All
            </button>
            {allCategories.map((cat) => {
              const col = CAT_COLOURS[cat.id] ?? CAT_DEFAULT;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : cat.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    active ? col : "border-jarvis-border/40 bg-jarvis-elevated text-jarvis-muted hover:text-jarvis-text"
                  }`}
                >
                  {cat.name}
                  <span className="ml-1 opacity-60">{cat.capabilities.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Capabilities grid */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          {loadingCaps ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-jarvis-accent" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-jarvis-muted">No results for "{filter}"</p>
          ) : (
            <div className="space-y-2 pb-3">
              {filteredCategories.map((cat) => (
                <CategoryBlock
                  key={cat.id}
                  category={cat}
                  copiedId={copiedId}
                  onCopy={copyPrompt}
                  onFill={fillTask}
                  onRun={(cap) => void runTask(cap.examplePrompt)}
                  onChat={sendToChat}
                />
              ))}
            </div>
          )}
        </div>

        {/* Task composer */}
        <form
          className="glass-panel mt-2 shrink-0 border-jarvis-accent/20 p-3"
          onSubmit={(e) => { e.preventDefault(); void runTask(task); }}
        >
          <textarea
            className="input-field min-h-[72px] resize-none text-sm"
            placeholder="Describe a task — Jarvis plans and runs tools on your Mac…"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={running}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void runTask(task);
              }
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="submit" className="btn-primary !py-1.5 text-xs" disabled={running || !task.trim()}>
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run
            </button>
            <button
              type="button"
              className="btn-ghost !py-1.5 text-xs"
              disabled={!task.trim()}
              onClick={() => sendToChat(task.trim())}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <span className="ml-auto font-mono text-[10px] text-jarvis-muted">⌘↵ to run</span>
          </div>
        </form>

        {/* Mobile: sidebar content below composer */}
        {hasSidebar && (
          <div className="mt-3 shrink-0 space-y-3 lg:hidden">
            <PlanStepsPanel plan={plan} loading={running} />
            <SummaryAndResults toolResults={toolResults} summary={summary} />
          </div>
        )}
      </div>

      {/* ── Right sidebar: always present, shows activity ─────────────────── */}
      <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto xl:w-80 lg:flex">
        <PlanStepsPanel plan={plan} loading={running} />
        {(toolResults.length > 0 || summary) && (
          <SummaryAndResults toolResults={toolResults} summary={summary} />
        )}
      </aside>
    </div>
  );
}

// ── Compact capability block ──────────────────────────────────────────────────
function CategoryBlock({
  category,
  copiedId,
  onCopy,
  onFill,
  onRun,
  onChat,
}: {
  category: AgentCapabilityCategory;
  copiedId: string | null;
  onCopy: (cap: AgentCapability) => void;
  onFill: (prompt: string) => void;
  onRun: (cap: AgentCapability) => void;
  onChat: (msg: string) => void;
}) {
  const col = CAT_COLOURS[category.id] ?? CAT_DEFAULT;
  return (
    <section>
      <div className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${col}`}>
        {category.name}
        <span className="opacity-60">{category.capabilities.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {category.capabilities.map((cap) => (
          <CapRow
            key={cap.id}
            cap={cap}
            copied={copiedId === cap.id}
            onCopy={() => onCopy(cap)}
            onFill={() => onFill(cap.examplePrompt)}
            onRun={() => onRun(cap)}
            onChat={() => onChat(cap.examplePrompt)}
          />
        ))}
      </div>
    </section>
  );
}

function CapRow({
  cap,
  copied,
  onCopy,
  onFill,
  onRun,
  onChat,
}: {
  cap: AgentCapability;
  copied: boolean;
  onCopy: () => void;
  onFill: () => void;
  onRun: () => void;
  onChat: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-jarvis-border/40 bg-jarvis-bg/30 px-3 py-2 transition hover:border-jarvis-border/70 hover:bg-jarvis-elevated/30">
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onFill}>
        <p className="truncate text-xs font-medium text-jarvis-text group-hover:text-jarvis-accent">
          {cap.name}
        </p>
        <p className="truncate font-mono text-[10px] text-jarvis-muted">{cap.examplePrompt}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          title="Copy prompt"
          onClick={onCopy}
          className="rounded p-1 text-jarvis-muted hover:bg-jarvis-elevated hover:text-jarvis-text"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
        <button
          type="button"
          title="Send to Chat"
          onClick={onChat}
          className="rounded p-1 text-jarvis-muted hover:bg-jarvis-elevated hover:text-jarvis-text"
        >
          <MessageSquare className="h-3 w-3" />
        </button>
        <button
          type="button"
          title="Run now"
          onClick={onRun}
          disabled={cap.enabled === false}
          className="rounded bg-jarvis-accent/10 p-1 text-jarvis-accent hover:bg-jarvis-accent/20 disabled:opacity-40"
        >
          <Zap className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Summary + tool results ────────────────────────────────────────────────────
function SummaryAndResults({
  toolResults,
  summary,
}: {
  toolResults: ToolResult[];
  summary: string | null;
}) {
  return (
    <>
      {toolResults.length > 0 && (
        <div className="glass-panel animate-fade-in p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-jarvis-subtle">
            Tool results
          </h3>
          <ToolResultChips results={toolResults} />
          <ul className="mt-3 space-y-1.5">
            {toolResults.map((tr, i) => (
              <li
                key={`${tr.tool}-${i}`}
                className="rounded-lg border border-jarvis-border/40 bg-jarvis-bg/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-jarvis-accent">{tr.tool}</span>
                  <span className={`text-[10px] font-medium uppercase ${tr.success ? "text-emerald-400" : "text-red-400"}`}>
                    {tr.success ? "ok" : "failed"}
                  </span>
                </div>
                {tr.output && (
                  <p className="mt-1 line-clamp-3 font-mono text-[11px] text-jarvis-muted">{tr.output}</p>
                )}
                {tr.error && <p className="mt-1 text-xs text-red-400">{tr.error}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary && (
        <div className="glass-panel animate-fade-in p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-jarvis-subtle">Result</h3>
          <p className="whitespace-pre-wrap text-sm text-jarvis-text">{summary}</p>
        </div>
      )}
    </>
  );
}
