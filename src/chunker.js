export function chunkMarkdown(text, { maxChunkSize = 500, overlap = 80 } = {}) {
  if (!text) return [];

  const chunks = [];
  let currentChunk = '';
  
  // Basic heuristic: split by lines, try to respect headers and empty lines
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If adding this line exceeds maxChunkSize and we have content, push it
    if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Calculate overlap
      if (overlap > 0 && currentChunk.length >= overlap) {
        currentChunk = currentChunk.slice(-overlap) + '\n' + line + '\n';
      } else {
        currentChunk = line + '\n';
      }
    } else {
      // Prioritize split at headers if the chunk is getting somewhat large
      if (line.match(/^#{1,6}\s/) && currentChunk.length > maxChunkSize / 2) {
        chunks.push(currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
