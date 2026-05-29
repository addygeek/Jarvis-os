import { Circle } from "lucide-react";
import type { OllamaStatus as OllamaStatusType } from "@/types";

interface Props {
  status: OllamaStatusType;
  backendOnline: boolean;
  compact?: boolean;
}

export function OllamaStatus({ status, backendOnline, compact }: Props) {
  const connected = backendOnline && status.connected;

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}
      title={
        connected
          ? `Ollama connected${status.model ? ` · ${status.model}` : ""}`
          : backendOnline
            ? "Ollama disconnected"
            : "Backend offline"
      }
    >
      <Circle
        className={`h-2 w-2 fill-current ${
          connected
            ? "text-jarvis-success animate-pulse-soft"
            : backendOnline
              ? "text-jarvis-warning"
              : "text-jarvis-danger"
        }`}
      />
      <span className="text-jarvis-subtle">
        {connected ? (
          <>
            <span className="text-jarvis-text">Ollama</span>
            {!compact && status.model && (
              <span className="ml-1 font-mono text-xs text-jarvis-muted">
                {status.model}
              </span>
            )}
          </>
        ) : backendOnline ? (
          "Ollama offline"
        ) : (
          "Backend offline"
        )}
      </span>
      {connected && status.latencyMs != null && !compact && (
        <span className="font-mono text-xs text-jarvis-muted">
          {status.latencyMs}ms
        </span>
      )}
    </div>
  );
}
