import Database from 'better-sqlite3';
import fs from 'fs';

export class MemoryDB {
  constructor(dbPath = 'memory-lite.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  init() {
    this.db = new Database(this.dbPath);
    
    // Create core tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        content    TEXT NOT NULL,
        source     TEXT DEFAULT '',
        tags       TEXT DEFAULT '',
        tier       TEXT DEFAULT 'hot',
        access_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now')),
        last_accessed_at DATETIME DEFAULT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        source,
        tags,
        content='memories',
        content_rowid='id',
        tokenize='unicode61'
      );

      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, source, tags)
        VALUES (new.id, new.content, new.source, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, source, tags)
        VALUES ('delete', old.id, old.content, old.source, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, source, tags)
        VALUES ('delete', old.id, old.content, old.source, old.tags);
        INSERT INTO memories_fts(rowid, content, source, tags)
        VALUES (new.id, new.content, new.source, new.tags);
      END;

      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
      CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
    `);
  }

  getDb() {
    if (!this.db) {
      this.init();
    }
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  stats() {
    const db = this.getDb();
    const row = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN tier = 'hot' THEN 1 ELSE 0 END) as hot,
        SUM(CASE WHEN tier = 'warm' THEN 1 ELSE 0 END) as warm,
        SUM(CASE WHEN tier = 'cold' THEN 1 ELSE 0 END) as cold,
        SUM(CASE WHEN tier = 'archived' THEN 1 ELSE 0 END) as archived
      FROM memories
    `).get();

    let dbSize = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      dbSize = stats.size;
    } catch(e) {
      // Ignore if file doesn't exist yet somehow
    }

    return {
      total: row.total || 0,
      hot: row.hot || 0,
      warm: row.warm || 0,
      cold: row.cold || 0,
      archived: row.archived || 0,
      dbSize
    };
  }
}
