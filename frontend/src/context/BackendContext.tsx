import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { HealthResponse, OllamaStatus } from "@/types";

const POLL_MS = 10_000;

interface BackendContextValue {
  health: HealthResponse | null;
  ollama: OllamaStatus;
  online: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BackendContext = createContext<BackendContextValue | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ollama, setOllama] = useState<OllamaStatus>({ connected: false });
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
      setOllama(h.ollama ?? { connected: false });
      setOnline(true);
    } catch {
      setHealth(null);
      setOllama({ connected: false });
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <BackendContext.Provider
      value={{ health, ollama, online, loading, refresh }}
    >
      {children}
    </BackendContext.Provider>
  );
}

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    throw new Error("useBackend must be used within BackendProvider");
  }
  return ctx;
}
