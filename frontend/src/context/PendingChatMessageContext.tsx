import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface PendingChatMessage {
  text: string;
  autoSend?: boolean;
}

interface PendingChatMessageContextValue {
  pending: PendingChatMessage | null;
  setPendingChatMessage: (message: PendingChatMessage | null) => void;
  consumePendingChatMessage: () => PendingChatMessage | null;
}

const PendingChatMessageContext = createContext<PendingChatMessageContextValue | null>(
  null,
);

export function PendingChatMessageProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingChatMessage | null>(null);

  const setPendingChatMessage = useCallback((message: PendingChatMessage | null) => {
    setPending(message);
  }, []);

  const consumePendingChatMessage = useCallback(() => {
    const value = pending;
    if (value) setPending(null);
    return value;
  }, [pending]);

  const value = useMemo(
    () => ({
      pending,
      setPendingChatMessage,
      consumePendingChatMessage,
    }),
    [pending, setPendingChatMessage, consumePendingChatMessage],
  );

  return (
    <PendingChatMessageContext.Provider value={value}>
      {children}
    </PendingChatMessageContext.Provider>
  );
}

export function usePendingChatMessage() {
  const ctx = useContext(PendingChatMessageContext);
  if (!ctx) {
    throw new Error("usePendingChatMessage must be used within PendingChatMessageProvider");
  }
  return ctx;
}
