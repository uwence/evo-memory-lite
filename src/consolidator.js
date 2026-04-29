export class MemoryConsolidator {
  constructor(db, emitter) {
    this.memoryDb = db;
    this.emitter = emitter;
  }

  // Get fragmented memories that are candidate for consolidation
  getFragments({ namespace = 'global', tags, source, timespanHours = 24 } = {}) {
    const db = this.memoryDb.getDb();
    let sql = `
       SELECT id, content, source, tags, tier, created_at 
       FROM memories 
       WHERE namespace = ? 
         AND tier IN ('hot', 'warm')
         AND created_at >= datetime('now', '-' || ? || ' hours')
    `;
    const params = [namespace, timespanHours];

    if (tags) {
       sql += " AND tags LIKE '%' || ? || '%'";
       params.push(tags);
    }
    if (source) {
       sql += " AND source = ?";
       params.push(source);
    }

    return db.prepare(sql).all(...params);
  }

  // Consolidate given memories into a super-memory
  // Returns the new memory ID
  commitConsolidation(oldIds, newContent, { namespace = 'global', source = 'consolidator', tags = '' } = {}) {
     if (!oldIds || oldIds.length === 0) return null;
     
     const db = this.memoryDb.getDb();
     let newId = null;

     db.transaction(() => {
        // Create the new consolidated memory (warm by default)
        const insertInfo = db.prepare(`
          INSERT INTO memories (namespace, content, source, tags, tier)
          VALUES (?, ?, ?, ?, 'warm')
        `).run(namespace, newContent, source, tags);
        newId = insertInfo.lastInsertRowid;

        // Archive the old fragments
        const placeholders = oldIds.map(() => '?').join(',');
        db.prepare(`
           UPDATE memories 
           SET tier = 'archived' 
           WHERE id IN (${placeholders})
        `).run(...oldIds);
     })();

     if (this.emitter) {
        this.emitter.emit('memory_consolidated', {
           newId,
           oldIds,
           namespace,
           content: newContent
        });
     }

     return newId;
  }
}
