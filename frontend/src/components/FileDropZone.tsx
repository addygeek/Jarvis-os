import { useCallback, useState } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useBackend } from "@/hooks/useBackend";
import { useToast } from "@/context/ToastContext";

interface Props {
  onUploaded?: (files: { name: string; path: string; size: number }[]) => void;
  className?: string;
}

export function FileDropZone({ onUploaded, className = "" }: Props) {
  const { online } = useBackend();
  const { pushToast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      if (!online) {
        const msg = "Start the backend (npm run dev) before uploading.";
        setError(msg);
        return;
      }

      setUploading(true);
      setError(null);
      setMessage(null);

      try {
        const uploaded = await api.uploadFiles(files);
        const summary =
          uploaded.length === 1
            ? `Uploaded ${uploaded[0].name}`
            : `Uploaded ${uploaded.length} files`;
        setMessage(summary);
        pushToast("success", summary);
        onUploaded?.(uploaded);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Upload failed — check that the API is running.";
        setError(msg);
        pushToast("error", msg);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, online, pushToast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div
      className={`relative ${className}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (online) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <label
        className={`flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition ${
          online ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        } ${
          dragging
            ? "border-jarvis-accent bg-jarvis-accent/5 shadow-glow"
            : "border-jarvis-border bg-jarvis-elevated/30 hover:border-jarvis-accent/40 hover:bg-jarvis-elevated/50"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          type="file"
          multiple
          className="sr-only"
          disabled={uploading || !online}
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-jarvis-accent" />
        ) : dragging ? (
          <FileUp className="h-10 w-10 text-jarvis-accent" />
        ) : (
          <Upload className="h-10 w-10 text-jarvis-muted" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-jarvis-text">
            {dragging ? "Drop files here" : "Drag & drop files"}
          </p>
          <p className="mt-1 text-xs text-jarvis-muted">
            {online
              ? "POST /api/files/upload → data/uploads/"
              : "Backend offline — npm run dev"}
          </p>
        </div>
      </label>
      {message && (
        <p className="mt-2 text-center text-xs text-jarvis-success">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-center text-xs text-jarvis-danger">{error}</p>
      )}
    </div>
  );
}
