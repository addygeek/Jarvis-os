export type MessageRole = "user" | "assistant" | "system" | "tool";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Task {
  id: string;
  conversationId: string | null;
  intent: string;
  planJson: string | null;
  status: TaskStatus;
  resultJson: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskInput {
  conversationId?: string;
  intent: string;
  planJson?: string;
  status?: TaskStatus;
}
