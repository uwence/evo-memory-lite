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

export { MemoryConsolidator } from './consolidator.js';

import { MemoryDB } from './db.js';
import { MemoryStore } from './store.js';
import { MemorySearch } from './search.js';
import { MemoryTiering } from './tiering.js';
import { MemoryExport } from './export.js';
import { MemoryCBR } from './cbr.js';
import { MemoryAudit } from './audit.js';
import { MemoryConsolidator } from './consolidator.js';
import EventEmitter from 'events';

export function createMemoryLite(dbPath = 'memory-lite.db') {
  const db = new MemoryDB(dbPath);
  db.init(); // Initialize tables synchronously
  
  const emitter = new EventEmitter();

  return {
    events: emitter,
    store: new MemoryStore(db, emitter),
    search: new MemorySearch(db),
    tiering: new MemoryTiering(db),
    export: new MemoryExport(db),
    cbr: new MemoryCBR(db),
    audit: new MemoryAudit(db),
    consolidator: new MemoryConsolidator(db, emitter),
    stats: () => db.stats(),
    close: () => {
      emitter.removeAllListeners();
      db.close();
    }
  };
}
