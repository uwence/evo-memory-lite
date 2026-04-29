import { describe, it, expect } from 'vitest';
import { chunkMarkdown } from '../src/index.js';

describe('Markdown Chunker', () => {
  it('chunks simple text correctly', () => {
    const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8";
    const chunked = chunkMarkdown(text, { maxChunkSize: 10 });
    expect(chunked.length).toBeGreaterThan(1);
    expect(chunked[0]).toContain('Line 1');
  });

  it('preserves code fences without splitting inside them', () => {
    const text = "Some text before\n```javascript\n" + "A".repeat(100) + "\n" + "B".repeat(100) + "\n```\nSome text after";
    const chunked = chunkMarkdown(text, { maxChunkSize: 50 });
    // It should not split inside the code fence even though the content is 200 length
    expect(chunked.some(c => c.includes('```javascript') && c.includes('B'.repeat(100)))).toBe(true);
  });

  it('injects header context', () => {
    const text = "# Main Title\n" + "intro text\n\n## Sub Title\n\n" + "A".repeat(100) + "\n\n" + "B".repeat(100) + "\n\n" + "C".repeat(100);
    const chunked = chunkMarkdown(text, { maxChunkSize: 50 });
    
    // Check if subsequent chunks receive header context
    const hasContext = chunked.some(c => c.includes('[继承自上文结构]: Main Title > Sub Title'));
    expect(hasContext).toBe(true);
  });
});
