import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import fs from 'fs';

const TEST_DB = 'test-store.db';

describe('MemoryStore', () => {
  let mem;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('adds and retrieves a memory', () => {
    const memObj = mem.store.add('This is a test memory', { source: 'test', tags: 'unit' });
    expect(memObj.id).toBeTypeOf('number');
    expect(memObj.content).toBe('This is a test memory');
    
    const fetched = mem.store.getById(memObj.id);
    expect(fetched.content).toBe('This is a test memory');
    expect(fetched.tier).toBe('hot');
  });

  it('deduplicates exact same content', () => {
    const mem1 = mem.store.add('Dupe content');
    const mem2 = mem.store.add('Dupe content');
    expect(mem1.id).toBe(mem2.id);
  });

  it('fails on empty content', () => {
    expect(() => mem.store.add('')).toThrow('Content cannot be empty');
  });

  it('updates a memory', () => {
    const memObj = mem.store.add('Original content');
    mem.store.update(memObj.id, { content: 'Updated content', tier: 'warm' });
    
    const updated = mem.store.getById(memObj.id);
    expect(updated.content).toBe('Updated content');
    expect(updated.tier).toBe('warm');
  });

  it('deletes a memory', () => {
    const memObj = mem.store.add('To be deleted');
    const success = mem.store.delete(memObj.id);
    expect(success).toBe(true);
    
    const fetched = mem.store.getById(memObj.id);
    expect(fetched).toBeUndefined();
  });

  it('lists memories with filters and pagination', () => {
    mem.store.add('First', { tier: 'hot', source: 'A', tags: 'x' });
    mem.store.add('Second', { tier: 'warm', source: 'A', tags: 'x,y' });
    mem.store.add('Third', { tier: 'hot', source: 'B', tags: 'y' });

    const all = mem.store.list();
    expect(all.length).toBe(3);

    const hot = mem.store.list({ tier: 'hot' });
    expect(hot.length).toBe(2);

    const sourceA = mem.store.list({ source: 'A' });
    expect(sourceA.length).toBe(2);

    const tagX = mem.store.list({ tags: 'x' });
    expect(tagX.length).toBe(2); // 'x' and 'x,y' both matcha LIKE %x%

    const paged = mem.store.list({ limit: 1, offset: 1, orderBy: 'id DESC' });
    expect(paged.length).toBe(1);
    expect(paged[0].content).toBe('Second'); // Since Reverse ID order: Third, Second, First
  });
});
