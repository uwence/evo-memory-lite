export { MemoryDB } from './db.js';
export { MemoryStore } from './store.js';
export { MemorySearch } from './search.js';
export { MemoryTiering } from './tiering.js';
export { MemoryExport } from './export.js';
export { chunkMarkdown } from './chunker.js';
export { MemoryCBR } from './cbr.js';
export { MemoryAudit } from './audit.js';
export { ContextCurator } from './curator.js';
export { NormativeGating } from './normative.js';

import { MemoryDB } from './db.js';
import { MemoryStore } from './store.js';
import { MemorySearch } from './search.js';
import { MemoryTiering } from './tiering.js';
import { MemoryExport } from './export.js';
import { MemoryCBR } from './cbr.js';
import { MemoryAudit } from './audit.js';

export function createMemoryLite(dbPath = 'memory-lite.db') {
  const db = new MemoryDB(dbPath);
  db.init(); // Initialize tables synchronously
  return {
    store: new MemoryStore(db),
    search: new MemorySearch(db),
    tiering: new MemoryTiering(db),
    export: new MemoryExport(db),
    cbr: new MemoryCBR(db),
    audit: new MemoryAudit(db),
    stats: () => db.stats(),
    close: () => db.close()
  };
}
