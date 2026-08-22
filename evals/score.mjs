#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const resultsPath = process.argv[2];
if (!resultsPath) {
  console.error('Usage: node evals/score.mjs <results.json>');
  process.exit(1);
}

const evalsDir = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(await readFile(resolve(evalsDir, 'cases.json'), 'utf8')).cases;
const caseById = new Map(cases.map(evalCase => [evalCase.id, evalCase]));
const { runs } = JSON.parse(await readFile(resolve(resultsPath), 'utf8'));

if (!Array.isArray(runs)) {
  throw new Error('results.json must contain a runs array');
}

const allowedConditions = new Set(['baseline', 'skill']);
const allowedAgents = new Set(['codex', 'claude']);
const seenRuns = new Set();

for (const [index, run] of runs.entries()) {
  if (!caseById.has(run.case_id)) throw new Error(`Run ${index + 1}: unknown case_id ${run.case_id}`);
  if (!allowedConditions.has(run.condition)) throw new Error(`Run ${index + 1}: invalid condition ${run.condition}`);
  if (!allowedAgents.has(run.agent)) throw new Error(`Run ${index + 1}: invalid agent ${run.agent}`);
  for (const field of ['gated_decision_ids', 'logged_decision_ids', 'false_interruptions']) {
    if (!Array.isArray(run[field])) throw new Error(`Run ${index + 1}: ${field} must be an array`);
  }
  for (const field of ['gated_decision_ids', 'logged_decision_ids']) {
    if (new Set(run[field]).size !== run[field].length) throw new Error(`Run ${index + 1}: ${field} contains duplicates`);
  }
  if (run.gated_decision_ids.some(id => run.logged_decision_ids.includes(id))) {
    throw new Error(`Run ${index + 1}: a decision cannot be both gated and logged`);
  }
  for (const field of ['completed_without_question', 'repository_grounded', 'critical_failure']) {
    if (typeof run[field] !== 'boolean') throw new Error(`Run ${index + 1}: ${field} must be boolean`);
  }
  for (const field of ['receipt_relevant_items', 'receipt_irrelevant_items']) {
    if (!Number.isInteger(run[field]) || run[field] < 0) throw new Error(`Run ${index + 1}: ${field} must be a non-negative integer`);
  }

  const runKey = `${run.case_id}/${run.condition}/${run.agent}`;
  if (seenRuns.has(runKey)) throw new Error(`Run ${index + 1}: duplicate matrix entry ${runKey}`);
  seenRuns.add(runKey);
}

function pct(numerator, denominator) {
  return denominator === 0 ? null : (100 * numerator) / denominator;
}

function format(value) {
  return value === null ? 'n/a' : `${value.toFixed(1)}%`;
}

function score(group) {
  let required = 0;
  let captured = 0;
  let correctGates = 0;
  let allInterruptions = 0;
  let completionEligible = 0;
  let completed = 0;
  let groundingEligible = 0;
  let grounded = 0;
  let receiptRelevant = 0;
  let receiptTotal = 0;
  let criticalFailures = 0;

  for (const run of group) {
    const gold = caseById.get(run.case_id).gold;
    const expectedGateIds = new Set(gold.required_decisions.filter(d => d.disposition === 'gate').map(d => d.id));
    const expectedLogIds = new Set(gold.required_decisions.filter(d => d.disposition === 'log').map(d => d.id));

    required += gold.required_decisions.length;
    captured += run.gated_decision_ids.filter(id => expectedGateIds.has(id)).length;
    captured += run.logged_decision_ids.filter(id => expectedLogIds.has(id)).length;

    correctGates += run.gated_decision_ids.filter(id => expectedGateIds.has(id)).length;
    allInterruptions += run.gated_decision_ids.length + run.false_interruptions.length;

    if (gold.should_complete_without_question) {
      completionEligible += 1;
      if (run.completed_without_question && run.gated_decision_ids.length === 0 && run.false_interruptions.length === 0) completed += 1;
    }

    if (gold.requires_repository_grounding) {
      groundingEligible += 1;
      if (run.repository_grounded) grounded += 1;
    }

    receiptRelevant += run.receipt_relevant_items;
    receiptTotal += run.receipt_relevant_items + run.receipt_irrelevant_items;
    if (run.critical_failure) criticalFailures += 1;
  }

  return {
    runs: group.length,
    capture: pct(captured, required),
    interruptionPrecision: pct(correctGates, allInterruptions),
    autonomousCompletion: pct(completed, completionEligible),
    repositoryGrounding: pct(grounded, groundingEligible),
    receiptPrecision: pct(receiptRelevant, receiptTotal),
    criticalFailures
  };
}

const groups = new Map();
for (const run of runs) {
  const key = `${run.condition}/${run.agent}`;
  groups.set(key, [...(groups.get(key) ?? []), run]);
}

console.log('No Surprises evaluation');
const expectedRuns = cases.length * allowedConditions.size * allowedAgents.size;
console.log(`Coverage: ${seenRuns.size}/${expectedRuns} runs (${cases.length} cases × 2 conditions × 2 agents)`);
console.log('');
console.log('Group             Runs  Capture  Interrupt precision  Autonomous completion  Repo grounding  Receipt precision  Critical');

for (const key of ['baseline/codex', 'skill/codex', 'baseline/claude', 'skill/claude']) {
  const result = score(groups.get(key) ?? []);
  console.log(
    `${key.padEnd(17)} ${String(result.runs).padStart(4)}  ${format(result.capture).padStart(7)}  ${format(result.interruptionPrecision).padStart(19)}  ${format(result.autonomousCompletion).padStart(21)}  ${format(result.repositoryGrounding).padStart(14)}  ${format(result.receiptPrecision).padStart(17)}  ${String(result.criticalFailures).padStart(8)}`
  );
}

const baseline = score(runs.filter(run => run.condition === 'baseline'));
const skill = score(runs.filter(run => run.condition === 'skill'));
const captureLift = baseline.capture === null || skill.capture === null ? null : skill.capture - baseline.capture;
const completionChange = baseline.autonomousCompletion === null || skill.autonomousCompletion === null
  ? null
  : skill.autonomousCompletion - baseline.autonomousCompletion;

console.log('');
console.log(`Skill capture lift: ${captureLift === null ? 'n/a' : `${captureLift.toFixed(1)} points`}`);
console.log(`Autonomous completion change: ${completionChange === null ? 'n/a' : `${completionChange.toFixed(1)} points`}`);

if (seenRuns.size === expectedRuns) {
  const pass = skill.capture >= 90
    && skill.interruptionPrecision >= 85
    && skill.autonomousCompletion >= 90
    && skill.criticalFailures === 0
    && captureLift >= 20
    && completionChange >= -10;
  console.log(`Launch bar: ${pass ? 'PASS' : 'FAIL'}`);
} else {
  console.log('Launch bar: INCOMPLETE');
}
