import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import { cleanupTestDb } from './helpers/db.js';
import fs from 'fs';

const TEST_DB = 'test-export.db';
const EXPORT_FILE = 'test-export.jsonl';

describe('MemoryExport', () => {
  let mem;

  beforeEach(() => {
    cleanupTestDb(TEST_DB);
    if (fs.existsSync(EXPORT_FILE)) fs.unlinkSync(EXPORT_FILE);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    cleanupTestDb(TEST_DB);
    if (fs.existsSync(EXPORT_FILE)) fs.unlinkSync(EXPORT_FILE);
  });

  it('exports namespace metadata to JSONL', () => {
    mem.store.add('Global memory for export', { namespace: 'global', source: 'test' });
    mem.store.add('Coder memory for export', { namespace: 'agent-coder', source: 'test' });

    const jsonl = mem.export.toJSONL({ namespaces: ['agent-coder'] });
    const rows = jsonl.split('\n').filter(Boolean).map(line => JSON.parse(line));

    expect(rows).toHaveLength(1);
    expect(rows[0].namespace).toBe('agent-coder');
    expect(rows[0].content).toBe('Coder memory for export');
  });

  it('imports JSONL while preserving namespaces', () => {
    fs.writeFileSync(
      EXPORT_FILE,
      JSON.stringify({
        namespace: 'agent-reviewer',
        content: 'Reviewer imported memory',
        source: 'fixture',
        tags: 'review',
        tier: 'warm'
      }),
      'utf-8'
    );

    const stats = mem.export.fromJSONL(EXPORT_FILE, mem.store);
    const imported = mem.store.list({ namespaces: ['agent-reviewer'] });

    expect(stats.added).toBe(1);
    expect(imported).toHaveLength(1);
    expect(imported[0].namespace).toBe('agent-reviewer');
    expect(imported[0].tier).toBe('warm');
  });
});
