-- JarvisOS SQLite schema (MVP memory layer)
-- Apply: sqlite3 data/jarvis.db < database/schema.sql

PRAGMA foreign_keys = ON;

-- Conversation sessions
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chat messages (user + assistant + system)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Long-term memory facts (preferences, learned context)
CREATE TABLE IF NOT EXISTS memory_facts (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_facts_key ON memory_facts(key);

-- Indexed documents for research / RAG (paths + summaries)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  key_findings_json TEXT,
  research_gaps_json TEXT,
  content_hash TEXT,
  indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path);

-- Agent tool execution audit log
CREATE TABLE IF NOT EXISTS tool_runs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  tool_name TEXT NOT NULL,
  input_json TEXT,
  output_json TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_runs_conversation ON tool_runs(conversation_id);

-- Voice transcription cache (optional dedupe)
CREATE TABLE IF NOT EXISTS transcriptions (
  id TEXT PRIMARY KEY,
  audio_hash TEXT,
  text TEXT NOT NULL,
  engine TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_hash ON transcriptions(audio_hash);

-- Agent tasks (planner runs) — used by @jarvisos/memory MemoryStore
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

-- Key-value memory entries — used by @jarvisos/memory MemoryStore
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_category ON memory_entries(category);
