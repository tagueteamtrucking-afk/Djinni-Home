#!/usr/bin/env node
import { Command } from 'commander';
import { defaultMemoryPath, loadMemory } from './memory';
import { listRequests, newRequest, approveRequest, buildApprovalArtifact } from './approvals';

const program = new Command();
program.name('overseers').description('Overseers-as-Code CLI for Avalon').version('0.1.0');

program
  .command('check')
  .option('--memory <path>', 'Path to Cody\'s Memory.yaml', '')
  .action((opts) => {
    const p = opts.memory || defaultMemoryPath();
    const mem = loadMemory(p);
    console.log('✔ Loaded memory for project:', mem.meta.project);
    console.log('Overseers:', mem.governance.overseers.map(o => o.id).join(', '));
  });

program
  .command('requests')
  .description('List pending permission requests')
  .action(() => {
    const reqs = listRequests();
    if (!reqs.length) return console.log('No requests found.');
    for (const r of reqs) {
      console.log(`- ${r.id} assistant=${r.assistantId} scopes=${r.scopes.join(',')} approvals=${r.approvals.length}`);
    }
  });

program
  .command('request')
  .requiredOption('--id <id>', 'Request id, e.g. req_2025-09-11_001')
  .requiredOption('--assistant <id>', 'Assistant id, e.g. clarice')
  .requiredOption('--scopes <csv>', 'Comma-separated scopes')
  .requiredOption('--reason <text>', 'Reason')
  .action((o) => {
    const r = newRequest({
      id: o.id,
      assistantId: o.assistant,
      scopes: String(o.scopes).split(',').map((s: string) => s.trim()),
      reason: o.reason,
      createdAt: new Date().toISOString()
    });
    console.log('Created request:', r);
  });

program
  .command('approve')
  .requiredOption('--id <id>', 'Request id')
  .requiredOption('--by <overseer>', 'Approver id: ray_czar|white_star')
  .action((o) => {
    const r = approveRequest(o.id, o.by);
    console.log('Updated request:', r);
  });

program
  .command('artifact')
  .requiredOption('--id <id>', 'Request id')
  .action((o) => {
    const out = buildApprovalArtifact(o.id);
    console.log('Approval artifact written:', out);
  });

program.parseAsync();
