# evo-memory-lite

Local-first SQLite memory engine for autonomous agents and coding assistants.

`evo-memory-lite` is a small Node.js library and CLI for storing, searching, exporting, and auditing agent memory on a local SQLite database. It is designed for coding agents, personal assistants, and multi-agent workflows that need durable local context without a hosted vector database.

## Current scope

Implemented:

- SQLite-backed memory storage with WAL mode.
- FTS5 trigram search for lightweight local retrieval.
- Namespace isolation for multi-agent and project-specific memory.
- Tiering for hot, warm, cold, and archived memories.
- JSONL and Markdown export.
- Case-based reasoning records for problem, solution, and outcome reuse.
- Append-only audit logs for agent cycles.
- CLI commands for initialization, add, search, list, export, import, delete, stats, and calibration.

Experimental:

- Sleep-mode consolidation of fragmented memories.
- Rule-based normative gating for structured tool calls.
- Context curation for token-budgeted prompt assembly.

## Installation

```bash
npm install evo-memory-lite
```

For local development:

```bash
npm install
npm test
```

## Library usage

```js
import { createMemoryLite } from 'evo-memory-lite';

const mem = createMemoryLite('agent-memory.db');

mem.store.add('The user prefers small, explicit pull requests.', {
  namespace: 'agent-coder',
  source: 'chat',
  tags: 'preference,workflow'
});

const results = mem.search.search('pull requests', {
  namespaces: ['global', 'agent-coder'],
  limit: 5
});

console.log(results);
mem.close();
```

## CLI usage

Initialize a database:

```bash
memory-lite --db agent-memory.db init
```

Add memory to a namespace:

```bash
memory-lite --db agent-memory.db add "Prefer small pull requests" --namespace agent-coder --source chat --tags preference
```

Search across one or more namespaces:

```bash
memory-lite --db agent-memory.db search "pull requests" --namespace global --namespace agent-coder
```

Export selected namespaces:

```bash
memory-lite --db agent-memory.db export --namespace agent-coder --format jsonl --output coder-memory.jsonl
```

## Recommended namespace model

Use namespaces to keep memory isolated while still allowing selected shared context:

```text
global
project:<repo-name>
agent:<agent-name>
session:<session-id>
worktree:<branch-name>
```

Examples:

```text
global
project:learningenglish
agent:coder
agent:reviewer
worktree:feature-memory-mcp
```

## Development direction

The preferred roadmap is:

1. Stabilize the core library API and schema migrations.
2. Harden CLI support for namespace-first workflows.
3. Add an MCP server so Claude Code, Codex-style tools, OpenCode, and other agents can use the memory engine directly.
4. Add coding-agent specific memory types such as project profile, decision log, bug case, code style, and review finding.
5. Build a local dashboard only after the core and MCP layers are stable.

## License

MIT
