export class MemoryStore {
  constructor(db) {
    this.memoryDb = db;
  }

  add(content, { source = '', tags = '', tier = 'hot' } = {}) {
    if (!content) {
      throw new Error('Content cannot be empty');
    }
    if (content.length < 10) {
      console.warn('Warning: Content is less than 10 characters');
    }

    const db = this.memoryDb.getDb();

    // Deduplication check
    const existing = db.prepare('SELECT id FROM memories WHERE content = ?').get(content);
    if (existing) {
      return this.getById(existing.id);
    }

    const info = db.prepare(`
      INSERT INTO memories (content, source, tags, tier) 
      VALUES (?, ?, ?, ?)
    `).run(content, source, tags, tier);

    return this.getById(info.lastInsertRowid);
  }

  addBatch(entries) {
    const db = this.memoryDb.getDb();
    let added = 0;
    let skipped = 0;

    const insert = db.prepare(`
      INSERT INTO memories (content, source, tags, tier) 
      VALUES (?, ?, ?, ?)
    `);

    const check = db.prepare('SELECT id FROM memories WHERE content = ?');

    const transaction = db.transaction((items) => {
      for (const item of items) {
        if (!item.content) continue;
        if (check.get(item.content)) {
          skipped++;
        } else {
          insert.run(item.content, item.source || '', item.tags || '', item.tier || 'hot');
          added++;
        }
      }
    });

    transaction(entries);
    return { added, skipped };
  }

  update(id, { content, tags, tier } = {}) {
    const db = this.memoryDb.getDb();
    const updates = [];
    const values = [];

    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(tags);
    }
    if (tier !== undefined) {
      updates.push('tier = ?');
      values.push(tier);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE memories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    
    return this.getById(id);
  }

  delete(id) {
    const db = this.memoryDb.getDb();
    const info = db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    return info.changes > 0;
  }

  getById(id) {
    const db = this.memoryDb.getDb();
    return db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
  }

  list({ tier, source, tags, limit = 100, offset = 0, orderBy = 'created_at DESC' } = {}) {
    const db = this.memoryDb.getDb();
    let query = 'SELECT * FROM memories WHERE 1=1';
    const params = [];

    if (tier) {
      query += ' AND tier = ?';
      params.push(tier);
    }
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }
    if (tags) {
      query += ' AND tags LIKE ?';
      params.push(`%${tags}%`);
    }

    const orderCols = {
      'created_at DESC': 'created_at DESC',
      'created_at ASC': 'created_at ASC',
      'updated_at DESC': 'updated_at DESC',
      'id DESC': 'id DESC'
    };
    
    const orderClause = orderCols[orderBy] || 'created_at DESC';
    query += ` ORDER BY ${orderClause} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(query).all(...params);
  }

  touch(id) {
    const db = this.memoryDb.getDb();
    db.prepare(`
      UPDATE memories 
      SET access_count = access_count + 1, 
          last_accessed_at = datetime('now') 
      WHERE id = ?
    `).run(id);
  }
}
