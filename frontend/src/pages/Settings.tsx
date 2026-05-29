import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Loader2, RefreshCw, Trash2, Zap } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import { useBackend } from "@/hooks/useBackend";

const DEFAULT_MODEL = "gemma4:e4b";

interface CacheStats { size: number; keys: string[] }

export function Settings() {
  const { health, ollama, online, loading, refresh } = useBackend();
  const [cache, setCache] = useState<CacheStats | null>(null);
  const [clearing, setClearing] = useState(false);
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const modelFromHealth = ollama.model ?? DEFAULT_MODEL;
  const displayApiUrl =
    window.jarvis?.apiBaseUrl ??
    import.meta.env.VITE_API_URL ??
    (BASE_URL || "(Vite proxy → :3847)");

  const fetchCache = async () => {
    if (!online) return;
    try {
      const res = await fetch("/api/agent/cache");
      setCache((await res.json()) as CacheStats);
    } catch { /* ok */ }
  };

  useEffect(() => { void fetchCache(); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearCache = async () => {
    setClearing(true);
    try {
      await fetch("/api/agent/cache", { method: "DELETE" });
      setCache({ size: 0, keys: [] });
      setCacheMsg("Cache cleared.");
      setTimeout(() => setCacheMsg(null), 3000);
    } catch { setCacheMsg("Failed to clear cache."); }
    finally { setClearing(false); }
  };

  const openQuickstart = () => {
    if (window.jarvis?.openDoc) { void window.jarvis.openDoc("QUICKSTART.md"); return; }
    void navigator.clipboard?.writeText("QUICKSTART.md at the repository root");
  };

  return (
    <div className="mx-auto max-w-xl overflow-y-auto pb-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-jarvis-text">Settings</h1>
        <p className="text-sm text-jarvis-muted">Connection, model, and performance</p>
      </header>

      <div className="space-y-4">
        {/* Backend */}
        <section className="glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-jarvis-text">Backend</h2>
          <label className="text-xs text-jarvis-muted">API URL</label>
          <input className="input-field mt-1 font-mono text-xs" value={displayApiUrl} readOnly />
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-xs ${online ? "text-emerald-400" : "text-red-400"}`}>
              {loading ? "Checking…" : online ? "Connected" : "Disconnected"}
            </span>
            <button type="button" className="btn-ghost !py-1 text-xs" onClick={() => void refresh()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refresh
            </button>
          </div>
        </section>

        {/* Ollama */}
        <section className="glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-jarvis-text">Ollama</h2>
          <dl className="space-y-2 text-xs">
            <Row label="Status" value={!online ? "Unknown (backend offline)" : ollama.connected ? "Connected · model ready" : "Unreachable or model missing"}
              colour={!online ? "text-jarvis-muted" : ollama.connected ? "text-emerald-400" : "text-yellow-400"} />
            <Row label="Model" value={online ? modelFromHealth : "—"} mono />
            {ollama.latencyMs != null && online && <Row label="Latency" value={`${ollama.latencyMs}ms`} mono />}
            {ollama.error && <Row label="Error" value={ollama.error} colour="text-red-400" />}
          </dl>
          <p className="mt-3 text-xs text-jarvis-muted">
            Pull model:{" "}
            <code className="rounded bg-jarvis-elevated px-1 font-mono">ollama pull {DEFAULT_MODEL}</code>
          </p>
        </section>

        {/* Apple Silicon / NPU */}
        <section className="glass-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-jarvis-accent" />
            <h2 className="text-sm font-semibold text-jarvis-text">Apple Silicon performance</h2>
          </div>
          <dl className="space-y-2 text-xs">
            <Row label="GPU layers" value="99 (all on Metal)" mono />
            <Row label="Flash-attention" value="Enabled" colour="text-emerald-400" />
            <Row label="Context window" value="8192 tokens" mono />
            <Row label="Memory lock" value="Enabled (use_mlock)" colour="text-emerald-400" />
          </dl>
          <p className="mt-3 text-xs text-jarvis-muted">
            Override in <code className="rounded bg-jarvis-elevated px-1 font-mono">.env</code>:{" "}
            <code className="font-mono">OLLAMA_NUM_GPU</code>,{" "}
            <code className="font-mono">OLLAMA_NUM_CTX</code>,{" "}
            <code className="font-mono">OLLAMA_FLASH_ATTN</code>.
          </p>
          <p className="mt-2 text-xs text-jarvis-muted">
            Best quantization for M5: <code className="rounded bg-jarvis-elevated px-1 font-mono">gemma4:e4b</code>{" "}
            (4-bit int4 via Ollama's GGUF Q4_K_M — best speed/quality balance on Neural Engine).
            For max quality: <code className="rounded bg-jarvis-elevated px-1 font-mono">gemma4:27b-it-q8_0</code> (needs ~30GB RAM).
          </p>
        </section>

        {/* Plan cache */}
        <section className="glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-jarvis-text">Plan cache</h2>
          <dl className="space-y-2 text-xs">
            <Row label="Cached plans" value={cache != null ? `${cache.size}` : online ? "loading…" : "—"} mono />
            <Row label="TTL" value="10 minutes" />
            <Row label="Max entries" value="200" />
          </dl>
          {cache != null && cache.keys.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-jarvis-muted">Cached tasks:</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {cache.keys.map((k) => (
                  <li key={k} className="truncate rounded bg-jarvis-elevated px-2 py-1 font-mono text-[11px] text-jarvis-subtle">{k}</li>
                ))}
              </ul>
            </div>
          )}
          {cacheMsg && <p className="mt-2 text-xs text-emerald-400">{cacheMsg}</p>}
          <button
            type="button"
            className="btn-ghost mt-3 !py-1.5 text-xs"
            onClick={() => void clearCache()}
            disabled={clearing || !online || cache?.size === 0}
          >
            {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Clear cache
          </button>
        </section>

        {/* About */}
        <section className="glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-jarvis-text">About</h2>
          <dl className="space-y-2 text-xs">
            <Row label="Product" value="JarvisOS" />
            {health?.version && <Row label="API version" value={health.version} mono />}
            {health?.tools && <Row label="Tools" value={`${health.tools.count} registered`} />}
            {window.jarvis && <Row label="Electron" value={window.jarvis.versions.electron} mono />}
            <Row label="Runtime" value="100% local · no cloud required" colour="text-emerald-400" />
          </dl>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={openQuickstart}>
              {window.jarvis ? <ExternalLink className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              {window.jarvis ? "Open QUICKSTART.md" : "Copy guide path"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, colour, mono }: { label: string; value: string; colour?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-jarvis-muted">{label}</dt>
      <dd className={`text-right ${mono ? "font-mono" : ""} ${colour ?? "text-jarvis-text"}`}>{value}</dd>
    </div>
  );
}
