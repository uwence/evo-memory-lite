# memory-lite

> A pure-local, zero-dependency cognitive middleware and memory fabric for autonomous agents.

`memory-lite` is a high-performance memory engine designed to push SQLite to its physical limits in Node.js environments. It provides isolated namespaces, structured case-based reasoning (CBR), schema-aware normative gating, and deep forensic auditing for AI agents and LLM tool-calling logic.

## Core Features (v0.5.0)

- **Multi-Agent Memory Isolation**: Native namespace support allowing multiple agents (e.g., Coder, Reviewer) to share the same database while selectively isolating or interacting with contextual memory.
- **Sleep-Mode Consolidation**: Compress fragmented hot memories into dense semantic structures automatically when agents are idle, completely preventing context poisoning limits.
- **Deep Tool-Call Gating**: Real-time intercept and schema constraints for agent tool outputs (`NormativeGating`), safely halting destructive operations and injecting self-correction prompts.
- **Async Event Bus**: Pluggable memory event subscriptions (`memory_added`, `memory_consolidated`, `memory_deleted`) using standard Node.js `EventEmitter`.
- **Compensatory CBR**: Zero-dependency vector-less retrieval leveraging FTS5 Trigrams, combined with rigorous Laplace-smoothed utility scores and Exponential Time Decay logic.
- **Forensic Auditability**: Complete directed acyclic graph (DAG) cycle traces securely enforced at the SQLite trigger level—`cycle_logs` are strictly append-only.

## Installation

```bash
npm install better-sqlite3 events
```

## Quick Start

```javascript
import { createMemoryLite } from './src/index.js';

// Initialize engine
const mem = createMemoryLite('agent-memory.db');

// 1. Add context targeting a specific agent
mem.store.add('The user prefers functional programming paradigms.', { 
  namespace: 'agent-coder', 
  tags: 'preference' 
});

// 2. Perform a time-decayed semantic query across specified namespaces
const results = mem.search.search('functional programming', { 
  namespaces: ['global', 'agent-coder'],
  limit: 5,
  decayLambda: 0.1
});

// 3. React to background memory consolidations
mem.events.on('memory_consolidated', (event) => {
  console.log(`Agent ${event.namespace} learned a new core concept!`, event.content);
});

// 4. Force consolidation of related fragmented thoughts
mem.consolidator.commitConsolidation(
  [1, 2, 3], // Fragment IDs
  'User is building an immutable event-sourcing app in React.', 
  { namespace: 'agent-coder' }
);
```

## Architecture

`memory-lite` does not wrap LLMs or orchestration processes. It functions exclusively as a robust data and state bus that is 100% replayable. It runs completely locally with `better-sqlite3` providing WAL mode concurrency and extreme performance.

## License

MIT License
