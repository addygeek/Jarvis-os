import fs from "node:fs";
import Database from "better-sqlite3";
import type { Tool } from "../types.js";
import { JARVIS_NOTES_DB, JARVIS_NOTES_DIR } from "../utils/paths.js";
import { fail, ok, optionalString, requireString } from "../utils/result.js";

interface NoteRow {
  id: number;
  title: string;
  body: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }
  fs.mkdirSync(JARVIS_NOTES_DIR, { recursive: true });
  dbInstance = new Database(JARVIS_NOTES_DB);
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
    CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags);
  `);
  return dbInstance;
}

export const notesTool: Tool = {
  name: "notes",
  description: "Create and search notes stored in ~/JarvisOS/notes (SQLite).",
  parameters: {
    type: "object",
    required: ["action"],
    properties: {
      action: { type: "string", enum: ["create", "search", "get", "update", "list"] },
      title: { type: "string" },
      body: { type: "string" },
      tags: { type: "string", description: "Comma-separated tags" },
      query: { type: "string", description: "Search query for title/body/tags" },
      id: { type: "number" },
      limit: { type: "number", default: 20 },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");
      const db = getDb();
      const limit =
        typeof params.limit === "number" && params.limit > 0 ? Math.min(params.limit, 100) : 20;

      switch (action) {
        case "create": {
          const title = requireString(params, "title");
          const body = optionalString(params, "body") ?? "";
          const tags = optionalString(params, "tags") ?? "";
          const stmt = db.prepare(
            `INSERT INTO notes (title, body, tags) VALUES (?, ?, ?) RETURNING *`,
          );
          const row = stmt.get(title, body, tags) as NoteRow;
          return ok({ note: row, dbPath: JARVIS_NOTES_DB }, "Note created");
        }

        case "search": {
          const query = requireString(params, "query");
          const pattern = `%${query}%`;
          const rows = db
            .prepare(
              `SELECT * FROM notes
               WHERE title LIKE ? OR body LIKE ? OR tags LIKE ?
               ORDER BY updated_at DESC
               LIMIT ?`,
            )
            .all(pattern, pattern, pattern, limit) as NoteRow[];
          return ok({ notes: rows, count: rows.length, query });
        }

        case "get": {
          const id = params.id;
          if (typeof id !== "number") {
            return fail("Missing required parameter: id");
          }
          const row = db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id) as NoteRow | undefined;
          if (!row) {
            return fail(`Note not found: ${id}`);
          }
          return ok({ note: row });
        }

        case "update": {
          const id = params.id;
          if (typeof id !== "number") {
            return fail("Missing required parameter: id");
          }
          const existing = db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id) as
            | NoteRow
            | undefined;
          if (!existing) {
            return fail(`Note not found: ${id}`);
          }
          const title = optionalString(params, "title") ?? existing.title;
          const body = optionalString(params, "body") ?? existing.body;
          const tags = optionalString(params, "tags") ?? existing.tags;
          db.prepare(
            `UPDATE notes SET title = ?, body = ?, tags = ?, updated_at = datetime('now') WHERE id = ?`,
          ).run(title, body, tags, id);
          const row = db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id) as NoteRow;
          return ok({ note: row }, "Note updated");
        }

        case "list": {
          const rows = db
            .prepare(`SELECT * FROM notes ORDER BY updated_at DESC LIMIT ?`)
            .all(limit) as NoteRow[];
          return ok({ notes: rows, count: rows.length, dbPath: JARVIS_NOTES_DB });
        }

        default:
          return fail(`Unknown action: ${action}`);
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};

/** Reset DB connection (for tests). */
export function resetNotesDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
