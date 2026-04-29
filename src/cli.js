import { Command } from 'commander';
import { createMemoryLite } from './index.js';
import fs from 'fs';
import path from 'path';

export function runCLI(argv) {
  const program = new Command();
  
  program
    .name('memory-lite')
    .description('Lightweight local memory management tool')
    .version('0.1.0')
    .option('-d, --db <path>', 'Path to SQLite database', 'memory-lite.db');

  program.command('init')
    .description('Initialize the database')
    .action((options) => {
      const dbPath = program.opts().db;
      const mem = createMemoryLite(dbPath);
      console.log(`Database initialized at ${dbPath}`);
      mem.close();
    });

  program.command('add <content>')
    .description('Add a new memory')
    .option('-s, --source <source>', 'Source tag', '')
    .option('-t, --tags <tags>', 'Comma-separated tags', '')
    .action((content, options) => {
      const mem = createMemoryLite(program.opts().db);
      try {
        const result = mem.store.add(content, { source: options.source, tags: options.tags });
        console.log(`Added memory [ID: ${result.id}]`);
      } catch (err) {
        console.error(`Error: ${err.message}`);
      } finally {
        mem.close();
      }
    });

  program.command('search <query>')
    .description('Search memories')
    .option('-l, --limit <limit>', 'Max results', 10)
    .option('-t, --tier <tier>', 'Filter by tier')
    .option('-s, --source <source>', 'Filter by source')
    .action((query, options) => {
      const mem = createMemoryLite(program.opts().db);
      const results = mem.search.search(query, {
        limit: parseInt(options.limit, 10),
        tier: options.tier,
        source: options.source
      });
      console.log(`Found ${results.length} results for "${query}":\n`);
      results.forEach(r => {
        console.log(`[ID: ${r.id}] (Rank: ${r.rank.toFixed(3)}) [${r.tier}] ${r.tags ? '{'+r.tags+'}' : ''}`);
        console.log(r.snippet);
        console.log('---');
        // Update access count
        mem.store.touch(r.id);
      });
      mem.close();
    });

  program.command('list')
    .description('List memories')
    .option('-t, --tier <tier>', 'Filter by tier')
    .option('-s, --source <source>', 'Filter by source')
    .option('-l, --limit <limit>', 'Max results', 20)
    .action((options) => {
      const mem = createMemoryLite(program.opts().db);
      const results = mem.store.list({
        tier: options.tier,
        source: options.source,
        limit: parseInt(options.limit, 10)
      });
      console.log(`Listing ${results.length} memories:\n`);
      results.forEach(r => {
        console.log(`[ID: ${r.id}] [${r.tier}] [${r.source}] ${r.tags}`);
        console.log(r.content.substring(0, 100).replace(/\n/g, ' '));
        console.log('---');
      });
      mem.close();
    });

  program.command('calibrate')
    .description('Run tiering calibration')
    .action(() => {
      const mem = createMemoryLite(program.opts().db);
      const changed = mem.tiering.calibrate();
      console.log(`Calibration complete. ${changed} memories updated.`);
      mem.close();
    });

  program.command('stats')
    .description('Show database statistics')
    .action(() => {
      const mem = createMemoryLite(program.opts().db);
      const stats = mem.stats();
      console.table(stats);
      mem.close();
    });

  program.command('export')
    .description('Export memories')
    .option('-f, --format <format>', 'Export format (jsonl or markdown)', 'jsonl')
    .option('-o, --output <path>', 'Output file path', 'export.jsonl')
    .option('-t, --tier <tier>', 'Filter by tier')
    .option('-s, --source <source>', 'Filter by source')
    .action((options) => {
      const mem = createMemoryLite(program.opts().db);
      let output = '';
      if (options.format === 'markdown') {
        output = mem.export.toMarkdown({ tier: options.tier, source: options.source });
        if (options.output === 'export.jsonl') options.output = 'export.md'; // Default adjustment
      } else {
        output = mem.export.toJSONL({ tier: options.tier, source: options.source });
      }
      fs.writeFileSync(options.output, output, 'utf-8');
      console.log(`Exported to ${options.output}`);
      mem.close();
    });
    
  program.command('import <path>')
    .description('Import memories from JSONL')
    .action((filePath) => {
      const mem = createMemoryLite(program.opts().db);
      try {
        const stats = mem.export.fromJSONL(filePath, mem.store);
        console.log(`Import complete: ${stats.added} added, ${stats.skipped} skipped.`);
      } catch (err) {
        console.error(`Import failed: ${err.message}`);
      }
      mem.close();
    });

  program.command('delete <id>')
    .description('Delete a memory by ID')
    .action((id) => {
      const mem = createMemoryLite(program.opts().db);
      const success = mem.store.delete(parseInt(id, 10));
      if (success) {
        console.log(`Deleted memory ID ${id}`);
      } else {
        console.log(`Memory ID ${id} not found`);
      }
      mem.close();
    });

  program.parse(argv);
}
