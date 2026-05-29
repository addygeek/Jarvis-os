import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  FolderSearch,
  Mic,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import { useBackend } from "@/hooks/useBackend";
import { OllamaStatus } from "@/components/OllamaStatus";

const quickActions = [
  { title: "Voice",  desc: "Speak to Jarvis",            to: "/voice",   icon: Mic,         colour: "from-cyan-400/20   to-cyan-600/10"   },
  { title: "Chat",   desc: "Reason with Gemma 4 E4B",    to: "/chat",    icon: Brain,       colour: "from-blue-400/20   to-blue-600/10"   },
  { title: "Agent",  desc: "58 automations, run tasks",  to: "/agent",   icon: Bot,         colour: "from-purple-400/20 to-purple-600/10" },
  { title: "Files",  desc: "Search across your Mac",     to: "/files",   icon: FolderSearch, colour: "from-amber-400/20  to-amber-600/10"  },
  { title: "Tools",  desc: "Test 11 live tools",         to: "/tools",   icon: Terminal,    colour: "from-green-400/20  to-green-600/10"  },
] as const;

interface RecentTask {
  id: string;
  intent: string;
  status: string;
  createdAt: string;
}

interface CacheStats {
  size: number;
  keys: string[];
}

export function Dashboard() {
  const { ollama, online, health } = useBackend();
  const [tasks, setTasks] = useState<RecentTask[]>([]);
  const [cache, setCache] = useState<CacheStats | null>(null);

  useEffect(() => {
    if (!online) return;
    void (async () => {
      try {
        const res = await fetch("/api/memory/tasks?limit=5");
        const d = (await res.json()) as { tasks?: RecentTask[] };
        setTasks(d.tasks ?? []);
      } catch { /* ok */ }
    })();
    void (async () => {
      try {
        const res = await fetch("/api/agent/cache");
        setCache((await res.json()) as CacheStats);
      } catch { /* ok */ }
    })();
  }, [online]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Greeting */}
      <header className="mb-6 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-jarvis-accent">
          Private · Offline · Local
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-jarvis-text">
          {getGreeting()}, welcome back
        </h1>
        <p className="mt-1 text-sm text-jarvis-subtle">
          JarvisOS on macOS · gemma4:e4b · all inference on-device
        </p>
      </header>

      {/* Quick action cards */}
      <div className="mb-5 grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map(({ title, desc, to, icon: Icon, colour }) => (
          <Link
            key={to}
            to={to}
            className="glass-panel group flex flex-col p-4 transition hover:border-jarvis-accent/30 hover:shadow-glow"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ring-white/5 ${colour}`}>
              <Icon className="h-4 w-4 text-white/80" />
            </div>
            <h2 className="mt-3 text-sm font-medium text-jarvis-text">{title}</h2>
            <p className="mt-0.5 flex-1 text-xs text-jarvis-muted">{desc}</p>
            <ArrowRight className="mt-3 h-3.5 w-3.5 text-jarvis-muted transition group-hover:translate-x-0.5 group-hover:text-jarvis-accent" />
          </Link>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        {/* System status */}
        <div className="glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-jarvis-subtle">System</h2>
            <Zap className="h-3.5 w-3.5 text-jarvis-accent" />
          </div>
          <dl className="space-y-2.5 text-xs">
            <StatusRow label="Backend" value={!online ? "Offline" : health?.ok ? "Healthy" : "Degraded"}
              colour={!online ? "text-red-400" : health?.ok ? "text-emerald-400" : "text-yellow-400"} />
            <div className="flex items-center justify-between gap-2">
              <dt className="text-jarvis-muted">Ollama</dt>
              <dd><OllamaStatus status={ollama} backendOnline={online} compact /></dd>
            </div>
            <StatusRow label="Model" value={online ? (ollama.model ?? "—") : "—"} mono />
            {ollama.latencyMs != null && online && (
              <StatusRow label="Latency" value={`${ollama.latencyMs}ms`} mono />
            )}
            {health?.tools && (
              <StatusRow label="Tools" value={`${health.tools.count} registered`} />
            )}
            {cache != null && (
              <StatusRow label="Plan cache" value={`${cache.size} entries`} />
            )}
          </dl>
        </div>

        {/* Recent tasks */}
        <div className="glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-jarvis-subtle">Recent tasks</h2>
            <Clock className="h-3.5 w-3.5 text-jarvis-muted" />
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-jarvis-muted">
              {online ? "No tasks yet — run one in Agent." : "Backend offline."}
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 rounded-lg border border-jarvis-border/30 bg-jarvis-bg/40 px-2.5 py-2">
                  {t.status === "completed"
                    ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    : t.status === "failed"
                    ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                    : <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jarvis-muted" />
                  }
                  <div className="min-w-0">
                    <p className="truncate text-xs text-jarvis-text">{t.intent}</p>
                    <p className="text-[10px] text-jarvis-muted">{formatAge(t.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Try saying */}
        <div className="glass-panel p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-jarvis-subtle">Try saying</h2>
          <ul className="space-y-2">
            {[
              "Open Chrome and go to ACL Anthology",
              "Summarize everything in Downloads",
              "Set volume to 50",
              "Turn on dark mode",
              "Find all PDF files on my Desktop",
            ].map((cmd) => (
              <li key={cmd}>
                <Link
                  to="/agent"
                  state={{ prefill: cmd }}
                  className="block rounded-lg border border-jarvis-border/30 bg-jarvis-bg/50 px-3 py-2 font-mono text-[11px] text-jarvis-subtle transition hover:border-jarvis-accent/30 hover:text-jarvis-text"
                >
                  &ldquo;{cmd}&rdquo;
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, colour, mono }: { label: string; value: string; colour?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-jarvis-muted">{label}</dt>
      <dd className={`${mono ? "font-mono" : ""} ${colour ?? "text-jarvis-text"} text-right`}>{value}</dd>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatAge(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch { return ""; }
}
