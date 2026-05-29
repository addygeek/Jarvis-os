import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { OfflineBanner } from "./OfflineBanner";
import { ToastStack } from "./ToastStack";
import { useBackend } from "@/hooks/useBackend";

export function Layout() {
  const { ollama, online, loading } = useBackend();

  return (
    <div className="flex h-full bg-jarvis-bg">
      <Sidebar ollama={ollama} backendOnline={online} />
      <main className="titlebar-drag flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="titlebar-no-drag h-12 shrink-0" />
        <div className="titlebar-no-drag flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
          <OfflineBanner online={online} loading={loading} />
          <Outlet />
        </div>
      </main>
      <ToastStack />
    </div>
  );
}
