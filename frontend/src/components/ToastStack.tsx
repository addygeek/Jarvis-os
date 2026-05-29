import { X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const styles = {
  error: "border-jarvis-danger/40 bg-jarvis-danger/10 text-jarvis-danger",
  success: "border-jarvis-success/40 bg-jarvis-success/10 text-jarvis-success",
  info: "border-jarvis-accent/40 bg-jarvis-accent/10 text-jarvis-text",
} as const;

export function ToastStack() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="titlebar-no-drag pointer-events-none fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-2"
      role="status"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg animate-fade-in ${styles[toast.type]}`}
        >
          <p className="flex-1">{toast.text}</p>
          <button
            type="button"
            className="shrink-0 opacity-70 hover:opacity-100"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
