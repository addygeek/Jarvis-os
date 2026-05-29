import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FALLBACK_AGENT_CAPABILITIES } from "@/data/fallbackCapabilities";
import type { AgentCapabilityCategory } from "@/types";

export function useCapabilities() {
  const [categories, setCategories] = useState<AgentCapabilityCategory[]>(
    FALLBACK_AGENT_CAPABILITIES,
  );
  const [source, setSource] = useState<"api" | "static">("static");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getCapabilities();
        if (!cancelled) {
          setCategories(res.categories);
          setSource(res.source ?? "static");
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCategories(FALLBACK_AGENT_CAPABILITIES);
          setSource("static");
          setError(err instanceof Error ? err.message : "Could not load capabilities");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, source, loading, error };
}
