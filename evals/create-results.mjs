#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputPath = process.argv[2];
if (!outputPath) {
  console.error('Usage: node evals/create-results.mjs <output.json>');
  process.exit(1);
}

const evalsDir = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(await readFile(resolve(evalsDir, 'cases.json'), 'utf8')).cases;
const runs = [];

for (const agent of ['codex', 'claude']) {
  for (const condition of ['baseline', 'skill']) {
    for (const evalCase of cases) {
      runs.push({
        case_id: evalCase.id,
        condition,
        agent,
        gated_decision_ids: [],
        logged_decision_ids: [],
        false_interruptions: [],
        completed_without_question: false,
        repository_grounded: false,
        receipt_relevant_items: 0,
        receipt_irrelevant_items: 0,
        critical_failure: false,
        notes: ''
      });
    }
  }
}

await writeFile(resolve(outputPath), `${JSON.stringify({ runs }, null, 2)}\n`, { flag: 'wx' });
console.log(`Created ${runs.length}-run results template at ${resolve(outputPath)}`);
