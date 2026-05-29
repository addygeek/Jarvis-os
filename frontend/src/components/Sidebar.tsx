import { NavLink } from "react-router-dom";
import {
  Bot,
  Home,
  MessageSquare,
  Mic,
  FolderOpen,
  Wrench,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { OllamaStatus } from "./OllamaStatus";
import type { OllamaStatus as OllamaStatusType } from "@/types";

const nav = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/agent", icon: Bot, label: "Agent" },
  { to: "/voice", icon: Mic, label: "Voice" },
  { to: "/files", icon: FolderOpen, label: "Files" },
  { to: "/tools", icon: Wrench, label: "Tools" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/about", icon: User, label: "About me" },
] as const;

interface Props {
  ollama: OllamaStatusType;
  backendOnline: boolean;
}

export function Sidebar({ ollama, backendOnline }: Props) {
  return (
    <aside className="titlebar-no-drag flex w-[220px] shrink-0 flex-col border-r border-jarvis-border/60 bg-jarvis-surface">
      <div className="titlebar-drag flex h-12 items-center gap-2 border-b border-jarvis-border/40 px-5 pt-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-600/10 ring-1 ring-jarvis-accent/30">
          <Sparkles className="h-4 w-4 text-jarvis-accent" />
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight text-jarvis-text">
            JarvisOS
          </span>
          <p className="text-[10px] text-jarvis-muted">Local AI layer</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-jarvis-elevated text-jarvis-text shadow-sm ring-1 ring-jarvis-border/80"
                  : "text-jarvis-subtle hover:bg-jarvis-elevated/60 hover:text-jarvis-text"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-jarvis-border/40 p-4">
        <OllamaStatus
          status={ollama}
          backendOnline={backendOnline}
          compact
        />
        <p className="mt-2 font-mono text-[10px] text-jarvis-muted">
          {backendOnline ? "API reachable" : "API unreachable"}
        </p>
      </div>
    </aside>
  );
}
