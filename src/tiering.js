export class MemoryTiering {
  constructor(db) {
    this.memoryDb = db;
  }

  calibrate() {
    const db = this.memoryDb.getDb();
    
    const updateAll = `
      UPDATE memories
      SET tier = CASE
        WHEN access_count >= 5 AND last_accessed_at >= datetime('now', '-3 days') THEN 'hot'
        WHEN access_count >= 2 AND last_accessed_at >= datetime('now', '-15 days') THEN 'warm'
        WHEN created_at < datetime('now', '-90 days') AND (last_accessed_at < datetime('now', '-60 days') OR last_accessed_at IS NULL) THEN 'archived'
        ELSE 'cold'
      END
    `;
    
    const info = db.prepare(updateAll).run();
    return info.changes;
  }

  stats() {
    return this.memoryDb.stats();
  }
}
