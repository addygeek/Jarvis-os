import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Sparkles } from "lucide-react";
import {
  QUICK_AGENT_EXAMPLES,
  countCapabilities,
  filterCapabilities,
} from "@/data/fallbackCapabilities";
import type { AgentCapabilityCategory } from "@/types";

interface CapabilityExamplesPanelProps {
  categories: AgentCapabilityCategory[];
  loading?: boolean;
  compact?: boolean;
  onSelect: (prompt: string, options?: { autoSend?: boolean }) => void;
}

export function CapabilityExamplesPanel({
  categories,
  loading,
  compact,
  onSelect,
}: CapabilityExamplesPanelProps) {
  const [open, setOpen] = useState(!compact);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () => filterCapabilities(categories, filter),
    [categories, filter],
  );
  const totalCount = useMemo(() => countCapabilities(categories), [categories]);
  const visibleCount = useMemo(() => countCapabilities(filtered), [filtered]);

  return (
    <div className="glass-panel shrink-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-jarvis-elevated/40"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-jarvis-accent" />
        ) : (
          <ChevronRight className="h-4 w-4 text-jarvis-muted" />
        )}
        <Sparkles className="h-4 w-4 text-jarvis-accent" />
        <span className="text-sm font-medium text-jarvis-text">Examples</span>
        <span className="ml-auto text-xs text-jarvis-muted">
          {loading ? "…" : `${totalCount} prompts`}
        </span>
      </button>

      {open && (
        <div className="border-t border-jarvis-border/50 p-3">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-jarvis-accent" />
            </div>
          ) : (
            <>
              <input
                type="search"
                className="input-field mb-2 !py-1.5 text-xs"
                placeholder="Filter examples…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />

              <div className="mb-3 flex flex-wrap gap-1">
                {QUICK_AGENT_EXAMPLES.slice(0, compact ? 8 : 12).map(({ label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-full border border-jarvis-border/60 bg-jarvis-bg/60 px-2 py-0.5 text-[10px] text-jarvis-subtle transition hover:border-jarvis-accent/40 hover:text-jarvis-accent"
                    onClick={() => onSelect(prompt)}
                    onDoubleClick={() => onSelect(prompt, { autoSend: true })}
                    title="Click to fill · double-click to send"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-[10px] text-jarvis-muted">
                {visibleCount} of {totalCount} · click fills input · double-click sends
              </p>

              <div className={`space-y-2 overflow-y-auto pr-0.5 ${compact ? "max-h-48" : "max-h-64"}`}>
                {filtered.map((cat) => {
                  const catOpen = expanded[cat.id] ?? compact;
                  return (
                    <div key={cat.id} className="rounded-lg border border-jarvis-border/40">
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-jarvis-text hover:bg-jarvis-elevated/50"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [cat.id]: !catOpen }))
                        }
                      >
                        {catOpen ? (
                          <ChevronDown className="h-3 w-3 text-jarvis-accent" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-jarvis-muted" />
                        )}
                        {cat.name}
                        <span className="ml-auto text-[10px] text-jarvis-muted">
                          {cat.capabilities.length}
                        </span>
                      </button>
                      {catOpen && (
                        <ul className="border-t border-jarvis-border/30 pb-1">
                          {cat.capabilities.map((cap) => (
                            <li key={cap.id}>
                              <button
                                type="button"
                                className="w-full px-2 py-1.5 text-left text-[11px] text-jarvis-muted transition hover:bg-jarvis-accent/5 hover:text-jarvis-text"
                                onClick={() => onSelect(cap.examplePrompt)}
                                onDoubleClick={() =>
                                  onSelect(cap.examplePrompt, { autoSend: true })
                                }
                                title={cap.examplePrompt}
                              >
                                {cap.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
