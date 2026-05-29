import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Mail,
  Monitor,
  Play,
  Presentation,
  StickyNote,
  Terminal,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AppLauncherTestPanel } from "@/components/AppLauncherTestPanel";
import { api } from "@/lib/api";
import type { ToolInfo } from "@/types";

// ── per-tool metadata ────────────────────────────────────────────────────────
const TOOL_META: Record<string, {
  icon: typeof Terminal;
  colour: string;
  actions: string[];
  exampleParams: Record<string, unknown>;
}> = {
  file:         { icon: FileText,     colour: "text-amber-400  bg-amber-400/10  border-amber-400/30",    actions: ["read","list","scan","move","delete","rename"], exampleParams: { action: "list", path: "downloads" } },
  browser:      { icon: Globe,        colour: "text-blue-400   bg-blue-400/10   border-blue-400/30",     actions: ["open_url","open_browser","search_google"],     exampleParams: { action: "open_browser", browser: "chrome" } },
  terminal:     { icon: Terminal,     colour: "text-green-400  bg-green-400/10  border-green-400/30",    actions: ["command"],                                      exampleParams: { command: "node --version" } },
  app_launcher: { icon: Bot,          colour: "text-purple-400 bg-purple-400/10 border-purple-400/30",   actions: ["app"],                                          exampleParams: { app: "safari" } },
  pdf:          { icon: FileText,     colour: "text-red-400    bg-red-400/10    border-red-400/30",      actions: ["read","summarize"],                             exampleParams: { action: "summarize", path: "~/Downloads/paper.pdf" } },
  notes:        { icon: StickyNote,   colour: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",  actions: ["create","search","list","get","update"],        exampleParams: { action: "list" } },
  folder_scan:  { icon: FolderOpen,   colour: "text-orange-400 bg-orange-400/10 border-orange-400/30",  actions: ["path","maxDepth","extensions"],                 exampleParams: { path: "downloads", maxDepth: 1, limit: 10 } },
  system:       { icon: Monitor,      colour: "text-cyan-400   bg-cyan-400/10   border-cyan-400/30",     actions: ["get_volume","set_volume","set_dark_mode","get_dark_mode","open_wifi_settings"], exampleParams: { action: "get_volume" } },
  calendar:     { icon: Calendar,     colour: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30",  actions: ["create_event","list_ics"],                      exampleParams: { action: "list_ics" } },
  email:        { icon: Mail,         colour: "text-pink-400   bg-pink-400/10   border-pink-400/30",     actions: ["draft_eml","compose","list_drafts"],            exampleParams: { action: "list_drafts" } },
  presentation: { icon: Presentation, colour: "text-teal-400   bg-teal-400/10   border-teal-400/30",    actions: ["generate_html","generate_outline","list"],      exampleParams: { action: "list" } },
};

interface TrialState {
  loading: boolean;
  success?: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
}

export function Tools() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [trials, setTrials] = useState<Record<string, TrialState>>({});
  const [paramEdits, setParamEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const list = await api.getTools();
        setTools(list.length > 0 ? list : fallback);
      } catch {
        setTools(fallback);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
    setParamEdits((prev) => {
      if (prev[name] !== undefined) return prev;
      const meta = TOOL_META[name];
      return { ...prev, [name]: JSON.stringify(meta?.exampleParams ?? {}, null, 2) };
    });
  }, []);

  const executeTool = useCallback(async (name: string, params: Record<string, unknown>) => {
    setTrials((p) => ({ ...p, [name]: { loading: true } }));
    const started = Date.now();
    try {
      const res = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parameters: params }),
      });
      let data: { result?: { success?: boolean; data?: unknown; error?: string }; error?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(res.ok ? "Invalid response from server" : `Backend error ${res.status} — is the server running?`);
      }
      const r = data.result;
      setTrials((p) => ({
        ...p,
        [name]: {
          loading: false,
          success: r?.success ?? false,
          output: r?.data != null ? JSON.stringify(r.data, null, 2) : undefined,
          error: r?.error ?? data.error,
          durationMs: Date.now() - started,
        },
      }));
    } catch (err) {
      setTrials((p) => ({
        ...p,
        [name]: { loading: false, success: false, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - started },
      }));
    }
  }, []);

  const runTool = useCallback(async (name: string) => {
    let params: Record<string, unknown> = {};
    try {
      params = JSON.parse(paramEdits[name] ?? "{}") as Record<string, unknown>;
    } catch {
      setTrials((p) => ({ ...p, [name]: { loading: false, success: false, error: "Invalid JSON in params" } }));
      return;
    }
    await executeTool(name, params);
  }, [paramEdits, executeTool]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-600/10 ring-1 ring-jarvis-accent/30">
            <Zap className="h-4 w-4 text-jarvis-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-jarvis-text">Tools</h1>
            <p className="text-xs text-jarvis-muted">
              {loading ? "Loading…" : `${tools.length} tools registered · click to test live`}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-jarvis-accent" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-0.5">
          {tools.map((tool) => {
            const meta = TOOL_META[tool.name];
            const Icon = meta?.icon ?? Terminal;
            const col = meta?.colour ?? "text-jarvis-accent bg-jarvis-accent/10 border-jarvis-accent/30";
            const isOpen = expanded[tool.name] ?? false;
            const trial = trials[tool.name];

            return (
              <div key={tool.name} className="glass-panel overflow-hidden">
                {/* Header row */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-jarvis-elevated/30"
                  onClick={() => toggleExpand(tool.name)}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${col}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-jarvis-text">{tool.name}</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">ready</span>
                      {tool.category && (
                        <span className="text-[10px] uppercase tracking-wider text-jarvis-muted">{tool.category}</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-jarvis-muted">{tool.description}</p>
                  </div>
                  {meta?.actions && (
                    <div className="hidden shrink-0 gap-1 sm:flex">
                      {meta.actions.slice(0, 3).map((a) => (
                        <span key={a} className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${col}`}>{a}</span>
                      ))}
                      {meta.actions.length > 3 && (
                        <span className="rounded border border-jarvis-border/40 px-1.5 py-0.5 font-mono text-[10px] text-jarvis-muted">
                          +{meta.actions.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-jarvis-muted" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-jarvis-muted" />
                  }
                </button>

                {/* Expanded: live test panel */}
                {isOpen && (
                  <div className="border-t border-jarvis-border/40 px-4 py-3">
                    {tool.name === "app_launcher" ? (
                      <AppLauncherTestPanel
                        trial={trial}
                        onRun={(params) => void executeTool("app_launcher", params)}
                      />
                    ) : (
                      <>
                        <p className="mb-2 text-xs font-medium text-jarvis-subtle">Test parameters (JSON)</p>
                        <textarea
                          className="input-field min-h-[80px] resize-y font-mono text-xs"
                          value={paramEdits[tool.name] ?? JSON.stringify(meta?.exampleParams ?? {}, null, 2)}
                          onChange={(e) => setParamEdits((p) => ({ ...p, [tool.name]: e.target.value }))}
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="btn-primary mt-2 !py-1.5 text-xs"
                          onClick={() => void runTool(tool.name)}
                          disabled={trial?.loading}
                        >
                          {trial?.loading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Play className="h-3.5 w-3.5" />
                          }
                          Run tool
                        </button>
                      </>
                    )}

                    {trial && !trial.loading && (
                      <div className={`mt-3 rounded-lg border p-3 ${trial.success ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                        <div className="flex items-center gap-2">
                          {trial.success
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            : <XCircle className="h-4 w-4 text-red-400" />
                          }
                          <span className={`text-xs font-medium ${trial.success ? "text-emerald-400" : "text-red-400"}`}>
                            {trial.success ? "Success" : "Failed"}
                          </span>
                          {trial.durationMs != null && (
                            <span className="ml-auto text-[10px] text-jarvis-muted">{trial.durationMs}ms</span>
                          )}
                        </div>
                        {trial.output && (
                          <pre className="mt-2 max-h-40 overflow-y-auto rounded bg-jarvis-bg/60 p-2 font-mono text-[11px] text-jarvis-text">
                            {trial.output.length > 800 ? trial.output.slice(0, 800) + "\n…" : trial.output}
                          </pre>
                        )}
                        {trial.error && (
                          <p className="mt-1 text-xs text-red-400">{trial.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Fallback (all enabled) when backend is offline
const fallback: ToolInfo[] = Object.keys(TOOL_META).map((name) => ({
  name,
  description: `${name} tool`,
  enabled: true,
  category: ["file","folder_scan","terminal"].includes(name) ? "system" : ["browser","app_launcher"].includes(name) ? "apps" : "productivity",
}));
