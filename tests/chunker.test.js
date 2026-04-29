import { describe, it, expect } from 'vitest';
import { chunkMarkdown } from '../src/index.js';

describe('Markdown Chunker', () => {
  it('chunks simple text correctly', () => {
    const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    const chunked = chunkMarkdown(text, { maxChunkSize: 20, overlap: 0 });
    expect(chunked.length).toBeGreaterThan(1);
    expect(chunked[0]).toContain('Line 1');
  });

  it('handles overlaps', () => {
    const text = 'A'.repeat(100) + '\n' + 'B'.repeat(100);
    const chunked = chunkMarkdown(text, { maxChunkSize: 100, overlap: 20 });
    expect(chunked.length).toBe(2);
    // Overlap chunk has a trailing newline from 'currentChunk' being stringified line by line
    expect(chunked[1].includes('A'.repeat(19))).toBe(true);
  });
});
