import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import fs from 'fs';

const TEST_DB = 'test-cbr.db';

describe('MemoryCBR', () => {
  let mem;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('adds and retrieves CBR cases', () => {
    mem.cbr.addCase('case1', 'system completely frozen', 'restart node', 'node restarted successfully');
    mem.cbr.addCase('case2', 'database lock error', 'clear WAL file', 'lock removed');

    const results = mem.cbr.search('frozen');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('case1');
  });

  it('updates utility score properly on retrieval and success', () => {
    mem.cbr.addCase('case1', 'test problem', 'test solution', 'test outcome');
    
    // Initial utility score should be 0.0 (or whatever default)
    // Actually successes=0, retrievals=0 -> utility = 0.0 before any operation

    // Add search to trigger retrieval
    const results = mem.cbr.search('problem');
    expect(results.length).toBe(1);
    
    let db = mem.cbr.memoryDb.getDb();
    let row = db.prepare('SELECT retrievals, utility_score FROM cbr_cases WHERE id=?').get('case1');
    expect(row.retrievals).toBe(1);
    
    mem.cbr.recordSuccess('case1');
    row = db.prepare('SELECT successes, utility_score FROM cbr_cases WHERE id=?').get('case1');
    expect(row.successes).toBe(1);
    // Score should be (1 + 1) / (1 + 2) => 2/3 => 0.666...
    expect(row.utility_score).toBeCloseTo(0.666, 2);
  });
});
