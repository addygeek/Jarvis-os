import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { BackendProvider } from "@/context/BackendContext";
import { PendingChatMessageProvider } from "@/context/PendingChatMessageContext";
import { ToastProvider } from "@/context/ToastContext";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Chat } from "@/pages/Chat";
import { Agent } from "@/pages/Agent";
import { Voice } from "@/pages/Voice";
import { Files } from "@/pages/Files";
import { Tools } from "@/pages/Tools";
import { Settings } from "@/pages/Settings";
import { About } from "@/pages/About";

export default function App() {
  return (
    <ToastProvider>
      <BackendProvider>
      <AppProvider>
        <PendingChatMessageProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="agent" element={<Agent />} />
            <Route path="voice" element={<Voice />} />
            <Route path="files" element={<Files />} />
            <Route path="tools" element={<Tools />} />
            <Route path="settings" element={<Settings />} />
            <Route path="about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
        </PendingChatMessageProvider>
      </AppProvider>
      </BackendProvider>
    </ToastProvider>
  );
}
