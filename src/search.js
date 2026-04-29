function bm25RankToScore(rank) {
  // FTS5 bm25() returns negative values
  // convert to 0-1 score
  return 1 / (1 + Math.exp(rank));
}

function generateSnippet(content, query, maxChars = 200) {
  const keywords = query.replace(/[^\w\s\u4e00-\u9fa5]/gi, ' ').split(/\s+/).filter(Boolean);
  if (!keywords.length) return content.slice(0, maxChars);
  
  const lowerContent = content.toLowerCase();
  
  let matchIdx = -1;
  for (const kw of keywords) {
    const idx = lowerContent.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      matchIdx = idx;
      break;
    }
  }
  
  if (matchIdx === -1) {
    return content.slice(0, maxChars);
  }

  const start = Math.max(0, matchIdx - Math.floor(maxChars / 2));
  let snippet = content.slice(start, start + maxChars);
  if (start > 0) snippet = '...' + snippet;
  if (start + maxChars < content.length) snippet = snippet + '...';
  return snippet;
}

export class MemorySearch {
  constructor(db) {
    this.memoryDb = db;
  }
  
  search(query, { limit = 10, minRank = 0, tier, source } = {}) {
    if (!query) return [];
    
    const db = this.memoryDb.getDb();
    
    let sql = `
      SELECT f.rowid as id, m.content, m.source, m.tags, m.tier,
             bm25(memories_fts) AS rank
        FROM memories_fts f
        JOIN memories m ON f.rowid = m.id
       WHERE memories_fts MATCH ?
    `;
    const params = [query];

    if (tier && tier !== 'archived') {
       sql += ' AND m.tier = ?';
       params.push(tier);
    } else if (tier === 'archived') {
       sql += " AND m.tier = 'archived'";
    } else {
       sql += " AND m.tier != 'archived'";
    }

    if (source) {
      sql += ' AND m.source = ?';
      params.push(source);
    }

    sql += ' ORDER BY rank ASC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params);

    return rows.map(r => ({
      ...r,
      rank: bm25RankToScore(r.rank),
      snippet: generateSnippet(r.content, query)
    })).filter(r => r.rank >= minRank);
  }

  searchMulti(keywords, { mode = 'AND', limit = 10, tier } = {}) {
    if (!keywords || keywords.length === 0) return [];
    const sanitized = keywords.map(k => `"${k.replace(/"/g, '')}"`);
    const query = sanitized.join(` ${mode} `);
    return this.search(query, { limit, tier });
  }

  suggest(prefix, { limit = 5 } = {}) {
    if (!prefix) return [];
    const safePrefix = prefix.replace(/"/g, '');
    const query = `"${safePrefix}"*`;
    return this.search(query, { limit, minRank: 0 }).map(r => ({
      id: r.id,
      snippet: generateSnippet(r.content, safePrefix, 50)
    }));
  }
}
