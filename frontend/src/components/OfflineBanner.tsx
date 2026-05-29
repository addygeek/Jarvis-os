import { WifiOff } from "lucide-react";

interface Props {
  online: boolean;
  loading?: boolean;
}

export function OfflineBanner({ online, loading }: Props) {
  if (loading || online) return null;

  return (
    <div
      className="titlebar-no-drag mb-4 flex items-center gap-2 rounded-lg border border-jarvis-warning/30 bg-jarvis-warning/10 px-4 py-2 text-sm text-jarvis-warning"
      role="alert"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Backend offline — start the API on{" "}
        <span className="font-mono">localhost:3847</span> (
        <code className="text-xs">npm run dev -w @jarvisos/backend</code>)
      </span>
    </div>
  );
}
