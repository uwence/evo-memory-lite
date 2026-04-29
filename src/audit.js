export class MemoryAudit {
  constructor(db) {
    this.memoryDb = db;
  }

  logCycle({ cycleId, triggerSource, tokensIn, tokensOut, toolsCalled = [], safetyDecision, elapsedMs }) {
    const db = this.memoryDb.getDb();
    db.prepare(`
      INSERT INTO cycle_logs (cycle_id, trigger_source, tokens_in, tokens_out, tools_called, safety_decision, elapsed_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cycleId,
      triggerSource,
      tokensIn,
      tokensOut,
      JSON.stringify(toolsCalled),
      safetyDecision,
      elapsedMs
    );
    return cycleId;
  }

  getLogs({ limit = 50, offset = 0 } = {}) {
    const db = this.memoryDb.getDb();
    return db.prepare('SELECT * FROM cycle_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  }
}
