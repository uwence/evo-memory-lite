export function chunkMarkdown(text, { maxChunkSize = 500 } = {}) {
  if (!text) return [];

  const chunks = [];
  let currentChunk = '';
  let codeFenceLock = false;
  let currentHeaderPath = [];
  
  const lines = text.split('\n');

  const pushChunk = () => {
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      // On new chunk, inject header path if available
      currentChunk = currentHeaderPath.length > 0 ? `[继承自上文结构]: ${currentHeaderPath.join(' > ')}\n` : '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code fence lock
    if (line.trim().startsWith('```')) {
      codeFenceLock = !codeFenceLock;
    }

    // Update header path
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch && !codeFenceLock) {
      const level = headerMatch[1].length;
      const title = headerMatch[2];
      // Keep only paths less than current level
      currentHeaderPath = currentHeaderPath.slice(0, level - 1);
      currentHeaderPath[level - 1] = title;
      // remove undefined holes
      currentHeaderPath = currentHeaderPath.filter(Boolean);
    }

    // Check boundary
    const isTable = line.trim().startsWith('|') && line.trim().endsWith('|');
    const isLargeEnough = currentChunk.length >= maxChunkSize;
    
    // We only split if we exceed maxChunkSize, and we are NOT in a code fence, NOT currently inside a contiguous table block
    if (isLargeEnough && !codeFenceLock && !isTable && currentChunk.length > 0) {
      // If the current line is a header, definitely split here instead of adding it
      if (headerMatch) {
         pushChunk();
         currentChunk += line + '\n';
         continue;
      }
      // If it's a blank line, it's a great place to split
      if (line.trim() === '') {
         pushChunk();
         continue; // skip the blank line at the start of next chunk
      }
      
      // If it's forced by size, just split
      if (currentChunk.length > maxChunkSize * 1.5) {
         pushChunk();
      }
    }

    currentChunk += line + '\n';
  }

  // Push remaining
  if (currentChunk.replace(/^\[继承自上文结构\]:.*$/, '').trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
