import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Conversation,
  CreateMessageInput,
  CreateTaskInput,
  MemoryEntry,
  Message,
  Task,
  TaskStatus,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveSchemaPath(): string {
  const candidates = [
    join(__dirname, "..", "..", "database", "schema.sql"),
    join(__dirname, "..", "..", "..", "database", "schema.sql"),
    join(process.cwd(), "database", "schema.sql"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    `database/schema.sql not found (tried: ${candidates.join(", ")})`,
  );
}

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata_json: string | null;
  created_at: string;
}

interface TaskRow {
  id: string;
  conversation_id: string | null;
  intent: string;
  plan_json: string | null;
  status: string;
  result_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryRow {
  id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export class MemoryStore {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    const schema = readFileSync(resolveSchemaPath(), "utf-8");
    this.db.exec(schema);
    this.migrateLegacySchema();
  }

  /** Upgrade DBs created before metadata_json / tasks / memory_entries. */
  private migrateLegacySchema(): void {
    const messageCols = this.db
      .prepare(`PRAGMA table_info(messages)`)
      .all() as Array<{ name: string }>;
    const messageNames = new Set(messageCols.map((c) => c.name));

    if (messageNames.size > 0) {
      if (messageNames.has("metadata") && !messageNames.has("metadata_json")) {
        this.db.exec(
          `ALTER TABLE messages RENAME COLUMN metadata TO metadata_json`,
        );
      } else if (!messageNames.has("metadata_json")) {
        this.db.exec(`ALTER TABLE messages ADD COLUMN metadata_json TEXT`);
      }
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        intent TEXT NOT NULL,
        plan_json TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        result_json TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id);

      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_memory_entries_category ON memory_entries(category);
    `);
  }

  close(): void {
    this.db.close();
  }

  createConversation(title?: string): Conversation {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO conversations (id, title, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, title ?? null, now, now);
    return this.getConversation(id)!;
  }

  getConversation(id: string): Conversation | null {
    const row = this.db
      .prepare(`SELECT * FROM conversations WHERE id = ?`)
      .get(id) as ConversationRow | undefined;
    return row ? this.mapConversation(row) : null;
  }

  listConversations(limit = 50): Conversation[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(limit) as ConversationRow[];
    return rows.map((r) => this.mapConversation(r));
  }

  addMessage(input: CreateMessageInput): Message {
    const id = randomUUID();
    const now = new Date().toISOString();
    const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.conversationId, input.role, input.content, metadata, now);

    this.db
      .prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`)
      .run(now, input.conversationId);

    return this.getMessage(id)!;
  }

  getMessage(id: string): Message | null {
    const row = this.db
      .prepare(`SELECT * FROM messages WHERE id = ?`)
      .get(id) as MessageRow | undefined;
    return row ? this.mapMessage(row) : null;
  }

  getMessages(conversationId: string, limit = 100): Message[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC
         LIMIT ?`,
      )
      .all(conversationId, limit) as MessageRow[];
    return rows.map((r) => this.mapMessage(r));
  }

  createTask(input: CreateTaskInput): Task {
    const id = randomUUID();
    const now = new Date().toISOString();
    const status = input.status ?? "pending";

    this.db
      .prepare(
        `INSERT INTO tasks (id, conversation_id, intent, plan_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.conversationId ?? null,
        input.intent,
        input.planJson ?? null,
        status,
        now,
        now,
      );

    return this.getTask(id)!;
  }

  updateTask(
    id: string,
    patch: {
      status?: TaskStatus;
      planJson?: string;
      resultJson?: string;
      error?: string | null;
    },
  ): Task | null {
    const existing = this.getTask(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE tasks SET
           status = COALESCE(?, status),
           plan_json = COALESCE(?, plan_json),
           result_json = COALESCE(?, result_json),
           error = COALESCE(?, error),
           updated_at = ?
         WHERE id = ?`,
      )
      .run(
        patch.status ?? null,
        patch.planJson ?? null,
        patch.resultJson ?? null,
        patch.error !== undefined ? patch.error : null,
        now,
        id,
      );

    return this.getTask(id);
  }

  getTask(id: string): Task | null {
    const row = this.db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(id) as TaskRow | undefined;
    return row ? this.mapTask(row) : null;
  }

  listTasks(limit = 50): Task[] {
    const rows = this.db
      .prepare(`SELECT * FROM tasks ORDER BY updated_at DESC LIMIT ?`)
      .all(limit) as TaskRow[];
    return rows.map((r) => this.mapTask(r));
  }

  setMemory(key: string, value: string, category = "general"): MemoryEntry {
    const existing = this.db
      .prepare(`SELECT id FROM memory_entries WHERE key = ?`)
      .get(key) as { id: string } | undefined;

    const now = new Date().toISOString();

    if (existing) {
      this.db
        .prepare(
          `UPDATE memory_entries SET value = ?, category = ?, updated_at = ? WHERE key = ?`,
        )
        .run(value, category, now, key);
      return this.getMemoryByKey(key)!;
    }

    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO memory_entries (id, key, value, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, key, value, category, now, now);

    return this.getMemoryByKey(key)!;
  }

  getMemoryByKey(key: string): MemoryEntry | null {
    const row = this.db
      .prepare(`SELECT * FROM memory_entries WHERE key = ?`)
      .get(key) as MemoryRow | undefined;
    return row ? this.mapMemory(row) : null;
  }

  listMemory(category?: string, limit = 100): MemoryEntry[] {
    const rows = category
      ? (this.db
          .prepare(
            `SELECT * FROM memory_entries WHERE category = ? ORDER BY updated_at DESC LIMIT ?`,
          )
          .all(category, limit) as MemoryRow[])
      : (this.db
          .prepare(
            `SELECT * FROM memory_entries ORDER BY updated_at DESC LIMIT ?`,
          )
          .all(limit) as MemoryRow[]);
    return rows.map((r) => this.mapMemory(r));
  }

  deleteMemory(key: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM memory_entries WHERE key = ?`)
      .run(key);
    return result.changes > 0;
  }

  private mapConversation(row: ConversationRow): Conversation {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMessage(row: MessageRow): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as Message["role"],
      content: row.content,
      metadata: row.metadata_json
        ? (JSON.parse(row.metadata_json) as Record<string, unknown>)
        : null,
      createdAt: row.created_at,
    };
  }

  private mapTask(row: TaskRow): Task {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      intent: row.intent,
      planJson: row.plan_json,
      status: row.status as Task["status"],
      resultJson: row.result_json,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMemory(row: MemoryRow): MemoryEntry {
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
