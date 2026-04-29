import Database from 'better-sqlite3';
import fs from 'fs';

export class MemoryDB {
  constructor(dbPath = 'memory-lite.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  init() {
    this.db = new Database(this.dbPath);
    
    // 强制开启 WAL 模式 (Write-Ahead Logging) 和 NORMAL synchronous
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    
    // Add alter table for legacy support
    try { this.db.exec(`ALTER TABLE memories ADD COLUMN namespace TEXT DEFAULT 'global'`); } catch(e){}
    try { this.db.exec(`ALTER TABLE cbr_cases ADD COLUMN namespace TEXT DEFAULT 'global'`); } catch(e){}
    try { this.db.exec(`ALTER TABLE cycle_logs ADD COLUMN namespace TEXT DEFAULT 'global'`); } catch(e){}

    // Create core tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        namespace  TEXT DEFAULT 'global',
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
        tokenize='trigram',
        detail='none'
      );

      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, source, tags)
        VALUES (new.id, new.content, new.source, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, source, tags)
        VALUES ('delete', old.id, old.content, old.source, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE OF content, source, tags ON memories BEGIN
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

      -- CBR table for experience logs
      CREATE TABLE IF NOT EXISTS cbr_cases (
        id TEXT PRIMARY KEY,
        namespace TEXT DEFAULT 'global',
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        outcome TEXT NOT NULL,
        successes INTEGER DEFAULT 0,
        retrievals INTEGER DEFAULT 0,
        utility_score REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT (datetime('now'))
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS cbr_cases_fts USING fts5(
        problem,
        solution,
        outcome,
        content='cbr_cases',
        content_rowid='rowid',
        tokenize='trigram',
        detail='none'
      );

      CREATE TRIGGER IF NOT EXISTS cbr_cases_ai AFTER INSERT ON cbr_cases BEGIN
        INSERT INTO cbr_cases_fts(rowid, problem, solution, outcome)
        VALUES (new.rowid, new.problem, new.solution, new.outcome);
      END;

      CREATE TRIGGER IF NOT EXISTS cbr_cases_ad AFTER DELETE ON cbr_cases BEGIN
        INSERT INTO cbr_cases_fts(cbr_cases_fts, rowid, problem, solution, outcome)
        VALUES ('delete', old.rowid, old.problem, old.solution, old.outcome);
      END;

      CREATE TRIGGER IF NOT EXISTS cbr_cases_au AFTER UPDATE OF problem, solution, outcome ON cbr_cases BEGIN
        INSERT INTO cbr_cases_fts(cbr_cases_fts, rowid, problem, solution, outcome)
        VALUES ('delete', old.rowid, old.problem, old.solution, old.outcome);
        INSERT INTO cbr_cases_fts(rowid, problem, solution, outcome)
        VALUES (new.rowid, new.problem, new.solution, new.outcome);
      END;

      -- DAG audit logs
      CREATE TABLE IF NOT EXISTS cycle_logs (
        cycle_id TEXT PRIMARY KEY,
        namespace TEXT DEFAULT 'global',
        trigger_source TEXT NOT NULL, 
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        tools_called TEXT DEFAULT '[]',
        safety_decision TEXT,
        elapsed_ms INTEGER,
        created_at DATETIME DEFAULT (datetime('now'))
      );

      CREATE TRIGGER IF NOT EXISTS prevent_cycle_logs_update BEFORE UPDATE ON cycle_logs BEGIN
        SELECT RAISE(ABORT, 'cycle_logs is append-only');
      END;

      CREATE TRIGGER IF NOT EXISTS prevent_cycle_logs_delete BEFORE DELETE ON cycle_logs BEGIN
        SELECT RAISE(ABORT, 'cycle_logs is append-only');
      END;
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
