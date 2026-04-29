import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import fs from 'fs';

const TEST_DB = 'test-tiering.db';

describe('MemoryTiering', () => {
  let mem;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('calibrates tiers correctly', () => {
    const db = mem.tiering.memoryDb.getDb();
    
    // Create test entries
    const idHot = mem.store.add('Hot memory').id;
    const idWarm = mem.store.add('Warm memory').id;
    const idCold = mem.store.add('Cold memory').id;
    const idArchived = mem.store.add('Archived memory').id;
    
    // Manually push stats into the db past the API limit
    db.prepare("UPDATE memories SET access_count = 6, last_accessed_at = datetime('now', '-2 days') WHERE id = ?").run(idHot);
    db.prepare("UPDATE memories SET access_count = 3, last_accessed_at = datetime('now', '-15 days') WHERE id = ?").run(idWarm);
    db.prepare("UPDATE memories SET access_count = 0, created_at = datetime('now', '-100 days') WHERE id = ?").run(idArchived);

    mem.tiering.calibrate();

    expect(mem.store.getById(idHot).tier).toBe('hot');
    expect(mem.store.getById(idWarm).tier).toBe('warm');
    expect(mem.store.getById(idArchived).tier).toBe('archived');
    // Default without touched
    expect(mem.store.getById(idCold).tier).toBe('cold');
  });
  
  it('updates stats correctly', () => {
     mem.store.add('Temp', { tier: 'hot' });
     const stats = mem.tiering.stats();
     expect(stats.total).toBe(1);
     expect(stats.hot).toBe(1);
  });
});
