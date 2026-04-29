import { generateTrigramQuery, bm25RankToScore } from './utils.js';

export class MemoryCBR {
  constructor(db) {
    this.memoryDb = db;
  }

  addCase(id, problem, solution, outcome, { namespace = 'global' } = {}) {
    const db = this.memoryDb.getDb();
    const info = db.prepare(`
      INSERT INTO cbr_cases (id, namespace, problem, solution, outcome)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, namespace, problem, solution, outcome);
    return id;
  }

  recordRetrieval(id) {
    const db = this.memoryDb.getDb();
    db.prepare('UPDATE cbr_cases SET retrievals = retrievals + 1 WHERE id = ?').run(id);
  }

  recordSuccess(id) {
    const db = this.memoryDb.getDb();
    db.prepare(`
      UPDATE cbr_cases 
      SET successes = successes + 1,
          utility_score = (successes + 2) / CAST(retrievals + 2 AS REAL) -- increment successes by 1 (which it will be)
      WHERE id = ?
    `).run(id);
  }

  updateUtilityScore(id) {
     const db = this.memoryDb.getDb();
     db.prepare(`
      UPDATE cbr_cases 
      SET utility_score = (successes + 1) / CAST(retrievals + 2 AS REAL)
      WHERE id = ?
    `).run(id);
  }

  search(query, { namespaces = ['global'], limit = 5, decayLambda = 0.1 } = {}) {
    if (!query) return [];
    
    let ftsQuery = generateTrigramQuery(query);
    const db = this.memoryDb.getDb();

    // Final Score = (BM25 Normalized * 0.4) + (Time Decay * 0.2) + (Utility Score * 0.4)
    // We compute BM25 rank in SQLite, combined with exponential decay if needed, or we compute the final score in JS.
    // Let's bring all fields to JS to calculate final score accurately, since FTS bm25 is negative.
    
    const nsPlaceholders = namespaces.map(() => '?').join(',');
    const sql = `
      SELECT c.id, c.namespace, c.problem, c.solution, c.outcome, c.successes, c.retrievals, c.utility_score, c.created_at,
             bm25(cbr_cases_fts) AS bm25_rank,
             (julianday('now') - julianday(c.created_at)) AS days_old
        FROM cbr_cases_fts f
        JOIN cbr_cases c ON f.rowid = c.rowid
       WHERE cbr_cases_fts MATCH ?
         AND c.namespace IN (${nsPlaceholders})
       ORDER BY bm25_rank ASC
       LIMIT ?
    `;

    const rows = db.prepare(sql).all(ftsQuery, ...namespaces, limit * 2);

    const scored = rows.map(r => {
       const bm25Score = bm25RankToScore(r.bm25_rank);
       const decayScore = Math.exp(-decayLambda * r.days_old);
       const finalScore = (bm25Score * 0.4) + (decayScore * 0.2) + (r.utility_score * 0.4);
       return {
         ...r,
         bm25Score,
         decayScore,
         finalScore
       };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    
    // Record retrievals for top results
    const topResults = scored.slice(0, limit);
    topResults.forEach(r => {
        this.recordRetrieval(r.id);
        this.updateUtilityScore(r.id);
    });

    return topResults;
  }
}
