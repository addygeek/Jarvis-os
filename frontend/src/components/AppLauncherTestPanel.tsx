import { useCallback, useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
interface TrialState {
  loading: boolean;
  success?: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
}

/** Mirrors `APP_LAUNCHER_APPS` when the backend is offline. */
const FALLBACK_APPS: { alias: string; displayName: string }[] = [
  { alias: "chrome", displayName: "Google Chrome" },
  { alias: "safari", displayName: "Safari" },
  { alias: "firefox", displayName: "Firefox" },
  { alias: "vscode", displayName: "Visual Studio Code" },
  { alias: "vs code", displayName: "Visual Studio Code" },
  { alias: "code", displayName: "Visual Studio Code" },
  { alias: "slack", displayName: "Slack" },
  { alias: "spotify", displayName: "Spotify" },
  { alias: "notes", displayName: "Notes" },
  { alias: "mail", displayName: "Mail" },
  { alias: "calendar", displayName: "Calendar" },
  { alias: "finder", displayName: "Finder" },
  { alias: "terminal", displayName: "Terminal" },
  { alias: "iterm", displayName: "iTerm" },
  { alias: "xcode", displayName: "Xcode" },
  { alias: "preview", displayName: "Preview" },
  { alias: "messages", displayName: "Messages" },
  { alias: "zoom", displayName: "zoom.us" },
  { alias: "discord", displayName: "Discord" },
  { alias: "notion", displayName: "Notion" },
  { alias: "figma", displayName: "Figma" },
  { alias: "arc", displayName: "Arc" },
];

interface AppLauncherTestPanelProps {
  trial?: TrialState;
  onRun: (params: Record<string, unknown>) => void;
}

export function AppLauncherTestPanel({ trial, onRun }: AppLauncherTestPanelProps) {
  const [apps, setApps] = useState(FALLBACK_APPS);
  const [appInput, setAppInput] = useState("chrome");
  const [pathInput, setPathInput] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/tools/app_launcher/apps");
        if (!res.ok) return;
        const data = (await res.json()) as { apps?: { alias: string; displayName: string }[] };
        if (data.apps?.length) setApps(data.apps);
      } catch {
        /* use fallback */
      }
    })();
  }, []);

  const launch = useCallback(
    (app: string, path?: string) => {
      const trimmed = app.trim();
      if (!trimmed) return;
      const params: Record<string, unknown> = { app: trimmed };
      if (path?.trim()) params.path = path.trim();
      onRun(params);
    },
    [onRun],
  );

  const handleRun = () => launch(appInput, pathInput);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-jarvis-subtle">Available applications</p>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-jarvis-border/40 bg-jarvis-bg/40 p-2">
          {apps.map(({ alias, displayName }) => (
            <button
              key={alias}
              type="button"
              title={displayName}
              className={`rounded border px-2 py-1 font-mono text-[11px] transition ${
                appInput.toLowerCase() === alias
                  ? "border-purple-400/50 bg-purple-400/15 text-purple-300"
                  : "border-jarvis-border/50 bg-jarvis-elevated/40 text-jarvis-text hover:border-purple-400/40 hover:bg-purple-400/10"
              }`}
              onClick={() => {
                setAppInput(alias);
                launch(alias, pathInput);
              }}
            >
              {alias}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-jarvis-muted">
          Click an app to launch it, or type any macOS app name below.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-jarvis-subtle">
          App name
          <input
            type="text"
            className="input-field mt-1 font-mono text-sm"
            placeholder="e.g. chrome, slack, or Google Chrome"
            value={appInput}
            onChange={(e) => setAppInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRun();
            }}
          />
        </label>
        <label className="block text-xs font-medium text-jarvis-subtle">
          Open path or URL <span className="font-normal text-jarvis-muted">(optional)</span>
          <input
            type="text"
            className="input-field mt-1 font-mono text-sm"
            placeholder="~/Downloads/file.pdf or https://…"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRun();
            }}
          />
        </label>
      </div>

      <button
        type="button"
        className="btn-primary !py-1.5 text-xs"
        onClick={handleRun}
        disabled={!appInput.trim() || trial?.loading}
      >
        {trial?.loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        Run tool
      </button>
    </div>
  );
}
