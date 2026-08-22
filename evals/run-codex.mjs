#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(evalsDir, '..');
const cases = JSON.parse(await readFile(resolve(evalsDir, 'cases.json'), 'utf8')).cases;
const caseById = new Map(cases.map(evalCase => [evalCase.id, evalCase]));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    caseId: 'all',
    condition: 'both',
    output: resolve(repoRoot, '.eval-runs'),
    codexBin: process.env.CODEX_BIN || 'codex',
    skillFile: resolve(repoRoot, 'SKILL.md'),
    model: null,
    dryRun: false,
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--case' && value) options.caseId = value, index += 1;
    else if (arg === '--condition' && value) options.condition = value, index += 1;
    else if (arg === '--output' && value) options.output = resolve(value), index += 1;
    else if (arg === '--codex-bin' && value) options.codexBin = value, index += 1;
    else if (arg === '--skill-file' && value) options.skillFile = resolve(value), index += 1;
    else if (arg === '--model' && value) options.model = value, index += 1;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else fail(`Unknown or incomplete argument: ${arg}`);
  }

  if (!['baseline', 'skill', 'both'].includes(options.condition)) {
    fail('--condition must be baseline, skill or both');
  }
  if (options.caseId !== 'all' && !caseById.has(options.caseId)) {
    fail(`Unknown case: ${options.caseId}`);
  }
  if (options.codexBin.includes('/') || options.codexBin.includes('\\')) {
    options.codexBin = resolve(options.codexBin);
  }
  return options;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findNamedSkill(root, targetName) {
  if (!(await exists(root))) return null;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) stack.push(path);
      if (entry.isFile() && entry.name === 'SKILL.md') {
        const content = await readFile(path, 'utf8');
        if (new RegExp(`^name:\\s*${targetName}\\s*$`, 'm').test(content)) return path;
      }
    }
  }
  return null;
}

function run(command, args, spawnOptions = {}) {
  const result = spawnSync(command, args, {
    cwd: spawnOptions.cwd,
    encoding: 'utf8',
    env: spawnOptions.env ?? process.env,
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.error?.code === 'ENOENT' && command === options.codexBin) {
    fail(
      'Codex CLI not found. Install it with:\n\n' +
      '  curl -fsSL https://chatgpt.com/codex/install.sh | sh\n\n' +
      'Then run `codex login`, verify with `codex --version`, and retry this evaluation.'
    );
  }
  if (result.error) fail(`Could not run ${command}: ${result.error.message}`);
  return result;
}

async function writeFixture(evalCase, workspace) {
  for (const [relativePath, content] of Object.entries(evalCase.fixture.files)) {
    const destination = resolve(workspace, relativePath);
    const pathFromWorkspace = relative(workspace, destination);
    if (pathFromWorkspace.startsWith('..') || isAbsolute(pathFromWorkspace)) {
      throw new Error(`Unsafe fixture path: ${relativePath}`);
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, 'utf8');
  }
}

function git(args, cwd) {
  const result = run('git', args, { cwd });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args[0]} failed`);
  return result.stdout;
}

function conditionsFor(index, requested) {
  if (requested !== 'both') return [requested];
  return index % 2 === 0 ? ['baseline', 'skill'] : ['skill', 'baseline'];
}

const options = parseArgs(process.argv.slice(2));
const selectedCases = options.caseId === 'all' ? cases : [caseById.get(options.caseId)];

if (['baseline', 'both'].includes(options.condition)) {
  const globalSkill = await findNamedSkill(resolve(homedir(), '.agents', 'skills'), 'no-surprises');
  if (globalSkill) {
    fail(`Baseline contamination: no-surprises is installed at ${globalSkill}. Disable or move that user-level skill before running baseline evaluations.`);
  }
}

const version = run(options.codexBin, ['--version']);
if (version.status !== 0) fail(version.stderr || `Could not run ${options.codexBin}`);

const plannedRuns = selectedCases.flatMap((evalCase, index) =>
  conditionsFor(index, options.condition).map(condition => ({ evalCase, condition }))
);

if (plannedRuns.some(run => run.condition === 'skill') && !(await exists(options.skillFile))) {
  fail(`Skill file not found: ${options.skillFile}`);
}

console.log(`Codex: ${version.stdout.trim()}`);
console.log(`Planned runs: ${plannedRuns.length}`);
if (options.model) console.log(`Model: ${options.model}`);

if (options.dryRun) {
  for (const { evalCase, condition } of plannedRuns) console.log(`${condition.padEnd(8)} ${evalCase.id}`);
  process.exit(0);
}

await mkdir(options.output, { recursive: true });
const manifest = {
  created_at: new Date().toISOString(),
  codex_version: version.stdout.trim(),
  model: options.model ?? 'default',
  arguments: {
    case: options.caseId,
    condition: options.condition
  },
  runs: []
};

for (const { evalCase, condition } of plannedRuns) {
  const runDir = resolve(options.output, 'codex', condition, evalCase.id);
  const workspace = resolve(runDir, 'workspace');

  if (await exists(runDir)) {
    if (!options.force) fail(`Run already exists: ${runDir}. Use --force to replace it.`);
    await rm(runDir, { recursive: true, force: true });
  }

  await mkdir(workspace, { recursive: true });
  await writeFixture(evalCase, workspace);
  git(['init', '-q'], workspace);
  git(['add', '.'], workspace);
  git(['-c', 'user.name=No Surprises Eval', '-c', 'user.email=eval@example.invalid', 'commit', '-qm', 'Initial fixture'], workspace);

  if (condition === 'skill') {
    const skillDir = resolve(workspace, '.agents', 'skills', 'no-surprises');
    await mkdir(skillDir, { recursive: true });
    await cp(options.skillFile, resolve(skillDir, 'SKILL.md'));
  }

  const finalMessagePath = resolve(runDir, 'final.md');
  const codexArgs = [
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '--sandbox',
    'workspace-write',
    '--json',
    '--output-last-message',
    finalMessagePath,
    '-C',
    workspace
  ];
  if (options.model) codexArgs.push('--model', options.model);
  codexArgs.push(evalCase.prompt);

  console.log(`Running ${condition.padEnd(8)} ${evalCase.id}`);
  const startedAt = new Date().toISOString();
  const result = run(options.codexBin, codexArgs, { cwd: workspace });
  const finishedAt = new Date().toISOString();

  await writeFile(resolve(runDir, 'trace.jsonl'), result.stdout ?? '', 'utf8');
  await writeFile(resolve(runDir, 'stderr.log'), result.stderr ?? '', 'utf8');
  git(['add', '-N', '.'], workspace);
  const patch = git(['diff', '--binary', '--', '.', ':(exclude).agents'], workspace);
  await writeFile(resolve(runDir, 'changes.patch'), patch, 'utf8');

  const record = {
    case_id: evalCase.id,
    condition,
    exit_code: result.status,
    started_at: startedAt,
    finished_at: finishedAt,
    directory: relative(options.output, runDir)
  };
  manifest.runs.push(record);
  await writeFile(resolve(options.output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (result.status !== 0) {
    fail(`Codex failed for ${condition}/${evalCase.id}. Inspect ${resolve(runDir, 'stderr.log')}`);
  }
}

console.log(`Completed ${manifest.runs.length} runs in ${options.output}`);
