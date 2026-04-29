import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import fs from 'fs';

const TEST_DB = 'test-cons.db';

describe('MemoryConsolidator', () => {
  let mem;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('retrieves fragments within timespan and consolidates them', () => {
    // Add old fragments
    mem.store.add('User said hello', { source: 'chat', tags: 'greeting', namespace: 'agent1' });
    mem.store.add('User asked about weather', { source: 'chat', tags: 'weather', namespace: 'agent1' });
    
    const fragments = mem.consolidator.getFragments({ namespace: 'agent1', source: 'chat' });
    expect(fragments.length).toBe(2);

    const oldIds = fragments.map(f => f.id);

    // Mock emitting logic
    const listener = vi.fn();
    mem.events.on('memory_consolidated', listener);

    const newId = mem.consolidator.commitConsolidation(oldIds, 'User greeted and asked about weather', {
       namespace: 'agent1',
       source: 'chat'
    });

    expect(newId).toBeDefined();

    // The old ones should be archived
    oldIds.forEach(id => {
       const m = mem.store.getById(id);
       expect(m.tier).toBe('archived');
    });

    // Event should be emitted
    expect(listener).toHaveBeenCalled();
  });
});
