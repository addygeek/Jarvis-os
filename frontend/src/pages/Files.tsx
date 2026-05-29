import { useState } from "react";
import { Search } from "lucide-react";
import { FileDropZone } from "@/components/FileDropZone";
import { ApiError, api } from "@/lib/api";
import { useBackend } from "@/hooks/useBackend";

export function Files() {
  const { online } = useBackend();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ path: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    if (!online) {
      setError("Start the backend (npm run dev) to search your Mac.");
      setResults([]);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await api.searchFiles(query.trim());
      setResults(res.results ?? []);
      if ((res.results ?? []).length === 0) {
        setError("No matches — try another query.");
      }
    } catch (err) {
      setResults([]);
      const msg =
        err instanceof ApiError
          ? err.message
          : "Search failed — check that the API is running.";
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-jarvis-text">Files</h1>
        <p className="text-sm text-jarvis-muted">
          Upload to the backend or search Desktop, Downloads, and Documents
        </p>
      </header>

      <FileDropZone className="mb-8 max-w-2xl" />

      <div className="glass-panel max-w-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-jarvis-text">
          Desktop search
        </h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input
            className="input-field flex-1"
            placeholder='e.g. "report" or "AACL paper"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!online}
          />
          <button
            type="submit"
            className="btn-primary shrink-0"
            disabled={searching || !online}
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
        {!online && (
          <p className="mt-2 text-xs text-jarvis-warning">
            Backend offline — run <code className="font-mono">npm run dev</code>{" "}
            from the repo root.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-jarvis-danger">{error}</p>}
        {results.length > 0 && (
          <ul className="mt-4 space-y-1">
            {results.map((r) => (
              <li
                key={r.path}
                className="rounded-lg px-2 py-1.5 font-mono text-xs text-jarvis-subtle hover:bg-jarvis-elevated"
              >
                {r.name}
                <span className="ml-2 text-jarvis-muted">{r.path}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
