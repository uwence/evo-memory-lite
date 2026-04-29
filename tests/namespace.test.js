import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryLite } from '../src/index.js';
import fs from 'fs';

const TEST_DB = 'test-namespace.db';

describe('Multi-Agent Namespace Feature', () => {
  let mem;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    mem = createMemoryLite(TEST_DB);
  });

  afterEach(() => {
    mem.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('isolates and shares memory between namespaces', () => {
    mem.store.add('Global system prompt', { namespace: 'global' });
    mem.store.add('Coder specific hint', { namespace: 'agent-coder' });
    mem.store.add('Reviewer secret', { namespace: 'agent-reviewer' });

    // Reviewer searching only in their namespace and global
    const reviewerRes = mem.search.search('prompt OR secret', { namespaces: ['global', 'agent-reviewer'] });
    expect(reviewerRes.length).toBe(2);
    const contents = reviewerRes.map(r => r.content);
    expect(contents).toContain('Global system prompt');
    expect(contents).toContain('Reviewer secret');

    // Coder search
    const coderRes = mem.search.search('hint OR secret', { namespaces: ['agent-coder'] });
    expect(coderRes.length).toBe(1);
    expect(coderRes[0].content).toBe('Coder specific hint');
  });
});
