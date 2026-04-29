import fs from 'fs';

export class MemoryExport {
  constructor(db) {
    this.memoryDb = db;
  }

  toJSONL({ tier, source, tags } = {}) {
    const db = this.memoryDb.getDb();
    let query = 'SELECT content, source, tags, tier, created_at FROM memories WHERE 1=1';
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

    const rows = db.prepare(query).all(...params);
    return rows.map(r => JSON.stringify(r)).join('\n');
  }

  toMarkdown({ tier, source, tags } = {}) {
    const db = this.memoryDb.getDb();
    let query = 'SELECT content, source, tags, tier, created_at FROM memories WHERE 1=1';
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

    const rows = db.prepare(query).all(...params);
    let md = '# Memory Export\n\n';
    
    rows.forEach(r => {
      md += `## Source: ${r.source || 'N/A'} | Tags: ${r.tags || 'None'} | Tier: ${r.tier}\n`;
      md += `*Created: ${r.created_at}*\n\n`;
      md += `${r.content}\n\n`;
      md += `---\n\n`;
    });
    
    return md;
  }

  fromJSONL(filePath, store) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    
    const entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch(e) {
        return null;
      }
    }).filter(Boolean);

    return store.addBatch(entries);
  }
}
