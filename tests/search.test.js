import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import SAMPLE_MEMORIES from './fixtures/sample.js';
import { cleanupTestDb } from './helpers/db.js';

const TEST_DB = 'test-search.db';

describe('MemorySearch', () => {
  let mem;

  beforeEach(() => {
    cleanupTestDb(TEST_DB);
    mem = createMemoryLite(TEST_DB);
    mem.store.addBatch(SAMPLE_MEMORIES);
  });

  afterEach(() => {
    mem.close();
    cleanupTestDb(TEST_DB);
  });

  it('performs basic BM25 search', () => {
    const results = mem.search.search('sqlite');
    expect(results.length).toBeGreaterThan(0);
    // Should get FTS5 and WSL2 sqlite items because 'sqlite' and 'sqlite-vec' are related
    expect(results[0].content.toLowerCase()).toContain('sqlite');
    expect(results[0].rank).toBeGreaterThan(0);
    expect(results[0].rank).toBeLessThanOrEqual(1);
    expect(results[0].snippet).toBeDefined();
  });

  it('includes namespace in search and suggestion results', () => {
    const added = mem.store.add('Coder namespace sqlite preference', {
      namespace: 'agent-coder',
      source: 'test',
      tags: 'namespace,sqlite'
    });

    const results = mem.search.search('namespace sqlite', {
      namespaces: ['agent-coder']
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(added.id);
    expect(results[0].namespace).toBe('agent-coder');

    const suggestions = mem.search.suggest('sql', {
      namespaces: ['agent-coder']
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].namespace).toBe('agent-coder');
  });

  it('performs multi-keyword search', () => {
    const results = mem.search.searchMulti(['sqlite', 'wsl2'], { mode: 'AND' });
    expect(results.length).toBe(1);
    expect(results[0].content).toContain('WSL2');
  });

  it('filters by tier in search', () => {
    // Modify one to be cold
    const wsl2Info = mem.search.search('wsl2')[0];
    mem.store.update(wsl2Info.id, { tier: 'cold' });

    const coldResults = mem.search.search('wsl2', { tier: 'cold' });
    expect(coldResults.length).toBe(1);

    const hotResults = mem.search.search('wsl2', { tier: 'hot' });
    expect(hotResults.length).toBe(0);
  });

  it('archived items are not returned by default', () => {
    const result = mem.search.search('sqlite');
    mem.store.update(result[0].id, { tier: 'archived' });

    const newResult = mem.search.search('sqlite');
    expect(newResult.find(r => r.id === result[0].id)).toBeUndefined();
  });
  
  it('generates suggestions', () => {
    const suggestions = mem.search.suggest('sql');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
