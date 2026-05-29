import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgentPlan, ChatMessage } from "@/types";

interface AppContextValue {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  activePlan: AgentPlan | null;
  setActivePlan: React.Dispatch<React.SetStateAction<AgentPlan | null>>;
  appendMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  clearChat: () => void;
  chatPrefill: string | null;
  setChatPrefill: (message: string | null) => void;
  consumeChatPrefill: () => string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<AgentPlan | null>(null);
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  const consumeChatPrefill = useCallback(() => {
    const value = chatPrefill;
    if (value) setChatPrefill(null);
    return value;
  }, [chatPrefill]);

  const appendMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "timestamp">) => {
      const full: ChatMessage = {
        ...msg,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, full]);
      return full;
    },
    [],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setActivePlan(null);
    setConversationId(null);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      setMessages,
      conversationId,
      setConversationId,
      activePlan,
      setActivePlan,
      appendMessage,
      clearChat,
      chatPrefill,
      setChatPrefill,
      consumeChatPrefill,
    }),
    [messages, conversationId, activePlan, chatPrefill, appendMessage, clearChat, consumeChatPrefill],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
