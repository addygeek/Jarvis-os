import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Send, Trash2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { usePendingChatMessage } from "@/context/PendingChatMessageContext";
import { useToast } from "@/context/ToastContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { CapabilityExamplesPanel } from "@/components/CapabilityExamplesPanel";
import { PlanStepsPanel } from "@/components/PlanStepsPanel";
import { ToolResultChips, toolResultsFromPlan } from "@/components/ToolResultChips";
import { QUICK_AGENT_EXAMPLES, countCapabilities } from "@/data/fallbackCapabilities";
import type { ChatMessage, ToolResult } from "@/types";

interface ChatLocationState {
  prefill?: string;
  autoSend?: boolean;
}

export function Chat() {
  const location = useLocation();
  const {
    messages,
    conversationId,
    setConversationId,
    activePlan,
    setActivePlan,
    appendMessage,
    clearChat,
    consumeChatPrefill,
  } = useApp();
  const { consumePendingChatMessage, setPendingChatMessage } = usePendingChatMessage();
  const { categories, loading: loadingCaps } = useCapabilities();
  const { pushToast } = useToast();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepByStep, setStepByStep] = useState(false);
  const [autoSendText, setAutoSendText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const exampleCount = countCapabilities(categories) + QUICK_AGENT_EXAMPLES.length;

  useEffect(() => {
    const state = location.state as ChatLocationState | null;
    const pending = consumePendingChatMessage();
    const fromRouter = state?.prefill?.trim();
    const fromContext = consumeChatPrefill()?.trim();
    const prefill = pending?.text?.trim() || fromRouter || fromContext;
    const autoSend = pending?.autoSend ?? state?.autoSend ?? false;

    if (prefill) {
      setInput(prefill);
      window.history.replaceState({}, document.title);
      if (autoSend) setAutoSendText(prefill);
    }
  }, [location.state, consumePendingChatMessage, consumeChatPrefill]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activePlan]);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;

      if (!textOverride) setInput("");
      setLoading(true);
      setActivePlan(null);
      appendMessage({ role: "user", content: text });

      let toolResults: ToolResult[] | undefined;

      try {
        if (stepByStep) {
          const { agentPlan, summary } = await api.runPlanPipeline(text, setActivePlan);
          setActivePlan(agentPlan);
          toolResults = toolResultsFromPlan(agentPlan.steps);
          appendMessage({ role: "assistant", content: summary, toolResults });
          return;
        }

        const { reply, conversationId: cid, plan } = await api.sendChat(text, {
          conversationId: conversationId ?? undefined,
          executePlan: true,
        });
        setConversationId(cid);
        if (plan) {
          setActivePlan(plan);
          toolResults = toolResultsFromPlan(plan.steps);
        }
        appendMessage({
          role: "assistant",
          content: reply.content,
          toolResults,
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not reach the backend. Start JarvisOS API on localhost:3847.";
        appendMessage({ role: "assistant", content: message });
        pushToast("error", message);
      } finally {
        setLoading(false);
      }
    },
    [
      input,
      loading,
      conversationId,
      stepByStep,
      appendMessage,
      setActivePlan,
      setConversationId,
      pushToast,
    ],
  );

  useEffect(() => {
    if (!autoSendText || loading) return;
    const text = autoSendText;
    setAutoSendText(null);
    void sendMessage(text);
  }, [autoSendText, loading, sendMessage]);

  const handleExampleSelect = useCallback(
    (prompt: string, options?: { autoSend?: boolean }) => {
      if (options?.autoSend) {
        setPendingChatMessage({ text: prompt, autoSend: true });
        void sendMessage(prompt);
        return;
      }
      setInput(prompt);
    },
    [sendMessage, setPendingChatMessage],
  );

  return (
    <div className="flex h-full gap-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-jarvis-text">Chat</h1>
            <p className="text-sm text-jarvis-muted">
              {loadingCaps ? "Loading examples…" : `${exampleCount} example prompts`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-jarvis-muted">
              <input
                type="checkbox"
                checked={stepByStep}
                onChange={(e) => setStepByStep(e.target.checked)}
                className="rounded border-jarvis-border"
              />
              Step-by-step plan
            </label>
            <button
              type="button"
              onClick={clearChat}
              className="btn-ghost"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <CapabilityExamplesPanel
          categories={categories}
          loading={loadingCaps}
          compact
          onSelect={handleExampleSelect}
        />

        <div className="glass-panel mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <EmptyState exampleCount={exampleCount} />
            ) : (
              <ul className="space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </ul>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-jarvis-border/60 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Ask Jarvis anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn-primary shrink-0"
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto lg:block">
        <PlanStepsPanel plan={activePlan} loading={loading} />
        {!activePlan && !loading && (
          <p className="mt-4 text-center text-xs text-jarvis-muted">
            Tool steps appear here when the agent runs a plan.
          </p>
        )}
      </aside>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <li
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-jarvis-accent/15 text-jarvis-text ring-1 ring-jarvis-accent/25"
            : "bg-jarvis-elevated text-jarvis-text ring-1 ring-jarvis-border/60"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && message.toolResults && message.toolResults.length > 0 && (
          <ToolResultChips results={message.toolResults} />
        )}
      </div>
    </li>
  );
}

function EmptyState({ exampleCount }: { exampleCount: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-sm text-jarvis-muted">
        Start a conversation — Jarvis will plan and execute tools locally.
      </p>
      <p className="mt-2 text-xs text-jarvis-subtle">
        Pick from {exampleCount} examples above · double-click to send instantly
      </p>
    </div>
  );
}
