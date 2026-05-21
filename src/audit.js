export class MemoryAudit {
  constructor(db) {
    this.memoryDb = db;
  }

  logCycle({
    cycleId,
    namespace = 'global',
    triggerSource,
    tokensIn = 0,
    tokensOut = 0,
    toolsCalled = [],
    safetyDecision = null,
    elapsedMs = null
  }) {
    if (!cycleId) {
      throw new Error('cycleId is required');
    }
    if (!triggerSource) {
      throw new Error('triggerSource is required');
    }

    const db = this.memoryDb.getDb();
    db.prepare(`
      INSERT INTO cycle_logs (cycle_id, namespace, trigger_source, tokens_in, tokens_out, tools_called, safety_decision, elapsed_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cycleId,
      namespace,
      triggerSource,
      tokensIn,
      tokensOut,
      JSON.stringify(toolsCalled),
      safetyDecision,
      elapsedMs
    );
    return cycleId;
  }

  getLogs({ namespaces = ['global'], limit = 50, offset = 0 } = {}) {
    const db = this.memoryDb.getDb();
    if (!namespaces || namespaces.length === 0) return [];
    const placeholders = namespaces.map(() => '?').join(',');
    return db.prepare(`SELECT * FROM cycle_logs WHERE namespace IN (${placeholders}) ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...namespaces, limit, offset);
  }
}
