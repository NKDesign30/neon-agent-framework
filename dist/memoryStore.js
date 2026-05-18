import { join } from "node:path";
import { ensureDir } from "./fs.js";
const DEFAULT_MEMORY_LIMIT = 20;
export function memoryDatabasePath(config) {
    return join(config.stateDir, "memory", "memory.sqlite");
}
export async function initMemoryDatabase(config) {
    await ensureDir(join(config.stateDir, "memory"));
    const db = await openMemoryDatabase(config);
    try {
        migrate(db);
    }
    finally {
        db.close();
    }
    return {
        path: memoryDatabasePath(config),
        ready: true
    };
}
export async function createMemory(config, input) {
    const title = input.title.trim();
    const body = input.body.trim();
    if (title.length === 0) {
        throw new Error("Memory title is empty.");
    }
    if (body.length === 0) {
        throw new Error("Memory body is empty.");
    }
    const db = await openMemoryDatabase(config);
    try {
        migrate(db);
        const now = new Date().toISOString();
        const memory = {
            id: crypto.randomUUID(),
            title,
            body,
            tags: normalizeTags(input.tags),
            source: input.source?.trim() || "manual",
            createdAt: now,
            updatedAt: now
        };
        db.prepare(`
      INSERT INTO memories (id, title, body, tags_json, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memory.id, memory.title, memory.body, JSON.stringify(memory.tags), memory.source, memory.createdAt, memory.updatedAt);
        indexMemory(db, memory.id);
        return memory;
    }
    finally {
        db.close();
    }
}
export async function listMemories(config, limit = DEFAULT_MEMORY_LIMIT) {
    const db = await openMemoryDatabase(config);
    try {
        migrate(db);
        const rows = db.prepare(`
      SELECT id, title, body, tags_json, source, created_at, updated_at
      FROM memories
      ORDER BY created_at DESC
      LIMIT ?
    `).all(normalizeLimit(limit));
        return rows.map((row) => parseMemoryRow(row));
    }
    finally {
        db.close();
    }
}
export async function searchMemories(config, query, limit = DEFAULT_MEMORY_LIMIT) {
    const cleanQuery = query.trim();
    if (cleanQuery.length === 0) {
        throw new Error("Memory search query is empty.");
    }
    const db = await openMemoryDatabase(config);
    try {
        migrate(db);
        const ftsQuery = toFtsQuery(cleanQuery);
        const rows = db.prepare(`
      SELECT m.id, m.title, m.body, m.tags_json, m.source, m.created_at, m.updated_at, bm25(memories_fts) AS rank
      FROM memories_fts
      JOIN memories AS m ON m.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, normalizeLimit(limit));
        return rows.map((row) => {
            const memory = parseMemoryRow(row);
            return {
                ...memory,
                rank: readNumber(row, "rank")
            };
        });
    }
    finally {
        db.close();
    }
}
async function openMemoryDatabase(config) {
    await ensureDir(join(config.stateDir, "memory"));
    process.removeAllListeners("warning");
    const sqlite = await import("node:sqlite");
    return new sqlite.DatabaseSync(memoryDatabasePath(config));
}
function migrate(db) {
    db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    DROP TABLE IF EXISTS memories_fts;
    CREATE VIRTUAL TABLE memories_fts USING fts5(
      title,
      body,
      tags
    );
  `);
    db.prepare(`
    INSERT INTO memories_fts (rowid, title, body, tags)
    SELECT rowid, title, body, tags_json
    FROM memories
  `).run();
}
function indexMemory(db, id) {
    db.prepare("DELETE FROM memories_fts WHERE rowid = (SELECT rowid FROM memories WHERE id = ?)").run(id);
    db.prepare(`
    INSERT INTO memories_fts (rowid, title, body, tags)
    SELECT rowid, title, body, tags_json
    FROM memories
    WHERE id = ?
  `).run(id);
}
function parseMemoryRow(row) {
    return {
        id: readString(row, "id"),
        title: readString(row, "title"),
        body: readString(row, "body"),
        tags: parseTagsJson(readString(row, "tags_json")),
        source: readString(row, "source"),
        createdAt: readString(row, "created_at"),
        updatedAt: readString(row, "updated_at")
    };
}
function parseTagsJson(value) {
    const raw = JSON.parse(value);
    if (!Array.isArray(raw) || !raw.every((item) => typeof item === "string")) {
        throw new Error("Memory tags are invalid.");
    }
    return raw;
}
function normalizeTags(tags) {
    return Array.from(new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))).sort();
}
function normalizeLimit(limit) {
    if (!Number.isFinite(limit)) {
        return DEFAULT_MEMORY_LIMIT;
    }
    return Math.max(1, Math.min(Math.trunc(limit), 100));
}
function toFtsQuery(query) {
    const terms = query.split(/\s+/).map((term) => term.trim()).filter((term) => term.length > 0);
    return terms.map((term) => `"${term.replaceAll("\"", "\"\"")}"`).join(" OR ");
}
function readString(row, key) {
    const value = row[key];
    if (typeof value === "string") {
        return value;
    }
    throw new Error(`Memory row field is not a string: ${key}`);
}
function readNumber(row, key) {
    const value = row[key];
    if (typeof value === "number") {
        return value;
    }
    throw new Error(`Memory row field is not a number: ${key}`);
}
//# sourceMappingURL=memoryStore.js.map