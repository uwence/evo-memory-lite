import { generateTrigramQuery, bm25RankToScore } from './utils.js';

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
  
  search(query, { limit = 10, minRank = -9999, tier, source, decayLambda = 0.1 } = {}) {
    if (!query) return [];
    
    // Fallback: If using detail='none' and tokenize='trigram', FTS5 rejects phrases.
    // So we manually extract trigrams and use an AND query.
    let ftsQuery = generateTrigramQuery(query);

    const db = this.memoryDb.getDb();
    
    let sql = `
      SELECT f.rowid as id, m.content, m.source, m.tags, m.tier,
             (bm25(memories_fts, 1.0, 0.0, 5.0) * exp(-? * (julianday('now') - julianday(m.created_at)))) AS rank
        FROM memories_fts f
        JOIN memories m ON f.rowid = m.id
       WHERE memories_fts MATCH ?
    `;
    const params = [decayLambda, ftsQuery];

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
      // BM25 is returned as a scaled negative rank. We can still apply transformation if needed.
      rank: bm25RankToScore(r.rank),
      snippet: generateSnippet(r.content, query)
    })).filter(r => r.rank >= minRank);
  }

  searchMulti(keywords, { mode = 'AND', limit = 10, tier } = {}) {
    if (!keywords || keywords.length === 0) return [];
    // Do not wrap in quotes because detail=none does not support phrase queries
    const sanitized = keywords.map(k => `${k.replace(/"/g, '')}`);
    const query = sanitized.join(` ${mode} `);
    return this.search(query, { limit, tier });
  }

  searchExpanded(keywordsArray, { limit = 5, decayLambda = 0.1 } = {}) {
    if (!keywordsArray || keywordsArray.length === 0) return [];
    const matchQuery = keywordsArray.map(k => `${k.replace(/"/g, '')}`).join(' OR ');
    return this.search(matchQuery, { limit, decayLambda });
  }

  suggest(prefix, { limit = 5 } = {}) {
    if (!prefix) return [];
    const safePrefix = prefix.replace(/"/g, '');
    const query = `${safePrefix}*`;
    return this.search(query, { limit, minRank: -9999 }).map(r => ({
      id: r.id,
      snippet: generateSnippet(r.content, safePrefix, 50)
    }));
  }
}
