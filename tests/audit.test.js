import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import fs from 'fs';

const TEST_DB = 'test-audit.db';

describe('MemoryAudit', () => {
  let mem;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('logs a cycle', () => {
    mem.audit.logCycle({
      cycleId: 'cycle_123',
      triggerSource: 'user_input',
      tokensIn: 100,
      tokensOut: 200,
      toolsCalled: ['search', 'reply'],
      safetyDecision: 'approved',
      elapsedMs: 1500
    });

    const logs = mem.audit.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].cycle_id).toBe('cycle_123');
    expect(logs[0].tools_called).toBe('["search","reply"]');
  });

  it('prevents updates and deletes', () => {
    mem.audit.logCycle({ cycleId: 'cycle_1', triggerSource: 'test' });
    
    const db = mem.audit.memoryDb.getDb();
    
    expect(() => {
        db.prepare('UPDATE cycle_logs SET tokens_in = 500 WHERE cycle_id = ?').run('cycle_1');
    }).toThrow(/cycle_logs is append-only/);

    expect(() => {
        db.prepare('DELETE FROM cycle_logs WHERE cycle_id = ?').run('cycle_1');
    }).toThrow(/cycle_logs is append-only/);
  });
});
