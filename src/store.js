export class MemoryStore {
  constructor(db, emitter) {
    this.memoryDb = db;
    this.emitter = emitter;
  }

  add(content, { namespace = 'global', source = '', tags = '', tier = 'hot' } = {}) {
    if (!content) {
      throw new Error('Content cannot be empty');
    }
    if (content.length < 10) {
      console.warn('Warning: Content is less than 10 characters');
    }

    const db = this.memoryDb.getDb();

    // Deduplication check
    const existing = db.prepare('SELECT id FROM memories WHERE content = ? AND namespace = ?').get(content, namespace);
    if (existing) {
      return this.getById(existing.id);
    }

    const info = db.prepare(`
      INSERT INTO memories (namespace, content, source, tags, tier) 
      VALUES (?, ?, ?, ?, ?)
    `).run(namespace, content, source, tags, tier);

    const mem = this.getById(info.lastInsertRowid);
    if (this.emitter) this.emitter.emit('memory_added', mem);
    return mem;
  }

  addBatch(entries) {
    const db = this.memoryDb.getDb();
    let added = 0;
    let skipped = 0;

    const insert = db.prepare(`
      INSERT INTO memories (namespace, content, source, tags, tier) 
      VALUES (?, ?, ?, ?, ?)
    `);

    const check = db.prepare('SELECT id FROM memories WHERE content = ? AND namespace = ?');

    const transaction = db.transaction((items) => {
      for (const item of items) {
        if (!item.content) continue;
        const ns = item.namespace || 'global';
        if (check.get(item.content, ns)) {
          skipped++;
        } else {
          insert.run(ns, item.content, item.source || '', item.tags || '', item.tier || 'hot');
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
    
    const mem = this.getById(id);
    if (this.emitter) this.emitter.emit('memory_updated', mem);
    return mem;
  }

  delete(id) {
    const db = this.memoryDb.getDb();
    const info = db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    const success = info.changes > 0;
    if (success && this.emitter) this.emitter.emit('memory_deleted', { id });
    return success;
  }

  getById(id) {
    const db = this.memoryDb.getDb();
    return db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
  }

  list({ namespaces = ['global'], tier, source, tags, limit = 100, offset = 0, orderBy = 'created_at DESC' } = {}) {
    const db = this.memoryDb.getDb();
    let query = 'SELECT * FROM memories WHERE 1=1';
    const params = [];

    if (namespaces && namespaces.length > 0) {
      const placeholders = namespaces.map(() => '?').join(',');
      query += ` AND namespace IN (${placeholders})`;
      params.push(...namespaces);
    }

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

  consolidate(oldIdsArray, newContent, { namespace = 'global', source, tags } = {}) {
    const db = this.memoryDb.getDb();
    const transaction = db.transaction(() => {
      oldIdsArray.forEach(id => this.delete(id));
      return this.add(newContent, { namespace, source, tags, tier: 'hot' });
    });
    return transaction();
  }
}
