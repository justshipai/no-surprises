#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
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
    claudeBin: process.env.CLAUDE_BIN || 'claude',
    pluginDir: repoRoot,
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
    else if (arg === '--claude-bin' && value) options.claudeBin = value, index += 1;
    else if (arg === '--plugin-dir' && value) options.pluginDir = resolve(value), index += 1;
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
  if (options.claudeBin.includes('/') || options.claudeBin.includes('\\')) {
    options.claudeBin = resolve(options.claudeBin);
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

function run(command, args, spawnOptions = {}) {
  const result = spawnSync(command, args, {
    cwd: spawnOptions.cwd,
    encoding: 'utf8',
    env: spawnOptions.env ?? process.env,
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.error?.code === 'ENOENT' && command === options.claudeBin) {
    fail(
      'Claude Code CLI not found. Install it with:\n\n' +
      '  curl -fsSL https://claude.ai/install.sh | bash\n\n' +
      'Then run `claude auth login`, verify with `claude --version`, and retry this evaluation.'
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

function resultEventFromTrace(trace) {
  const lines = trace.split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const event = JSON.parse(lines[index]);
      if (event.type === 'result') return event;
    } catch {
      // Preserve malformed output in trace.jsonl and report the missing final result below.
    }
  }
  return null;
}

const DEFAULT_MUTATION_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'MultiEdit', 'Bash'];

// Extract the ordered tool calls from a stream-json trace and locate the first
// AskUserQuestion relative to the first dependent mutating tool call. This is
// the raw evidence for the pre-commit Gate metric: a Gate only counts when the
// question precedes any mutation that would embed the decision.
//
// Caveat: a plain `claude --print` run cannot supply an answer to
// AskUserQuestion, so this runner records whether the question was ASKED before
// mutation. The full question -> answer -> resume round trip (ER2) requires the
// Agent SDK canUseTool runner (evals/run-claude-sdk.mjs).
function analyzeTrace(trace, mutationTools) {
  const mutationSet = new Set(mutationTools);
  const toolCalls = [];
  for (const line of trace.split(/\r?\n/)) {
    if (!line) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const content = event?.message?.content;
    if (event.type !== 'assistant' || !Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === 'tool_use' && typeof block.name === 'string') {
        toolCalls.push(block.name);
      }
    }
  }
  const askIndex = toolCalls.indexOf('AskUserQuestion');
  const firstMutationIndex = toolCalls.findIndex(name => mutationSet.has(name));
  return {
    tool_calls: toolCalls,
    asked_user_question: askIndex !== -1,
    first_ask_user_question_index: askIndex === -1 ? null : askIndex,
    first_mutation_index: firstMutationIndex === -1 ? null : firstMutationIndex,
    first_mutation_tool: firstMutationIndex === -1 ? null : toolCalls[firstMutationIndex],
    // True only when a question was asked and no dependent mutation preceded it.
    asked_before_mutation:
      askIndex !== -1 && (firstMutationIndex === -1 || askIndex < firstMutationIndex),
    mutation_tools: mutationTools
  };
}

const options = parseArgs(process.argv.slice(2));
const selectedCases = options.caseId === 'all' ? cases : [caseById.get(options.caseId)];

const version = run(options.claudeBin, ['--version']);
if (version.status !== 0) fail(version.stderr || `Could not run ${options.claudeBin}`);

const auth = run(options.claudeBin, ['auth', 'status']);
if (auth.status !== 0) {
  fail('Claude Code is not logged in. Run `claude auth login` and retry this evaluation.');
}

const plannedRuns = selectedCases.flatMap((evalCase, index) =>
  conditionsFor(index, options.condition).map(condition => ({ evalCase, condition }))
);

const pluginManifest = resolve(options.pluginDir, '.claude-plugin', 'plugin.json');
if (plannedRuns.some(run => run.condition === 'skill') && !(await exists(pluginManifest))) {
  fail(
    `Plugin manifest not found: ${pluginManifest}\n` +
    'The skill condition loads the complete No Surprises plugin (skill + always-on hook) ' +
    'through --plugin-dir. Point --plugin-dir at a directory containing .claude-plugin/plugin.json.'
  );
}

console.log(`Claude Code: ${version.stdout.trim()}`);
console.log(`Planned runs: ${plannedRuns.length}`);
if (options.model) console.log(`Model: ${options.model}`);

if (options.dryRun) {
  for (const { evalCase, condition } of plannedRuns) console.log(`${condition.padEnd(8)} ${evalCase.id}`);
  process.exit(0);
}

await mkdir(options.output, { recursive: true });
const manifest = {
  created_at: new Date().toISOString(),
  claude_version: version.stdout.trim(),
  model: options.model ?? 'default',
  arguments: {
    case: options.caseId,
    condition: options.condition
  },
  runs: []
};

const sandboxSettings = JSON.stringify({
  sandbox: {
    enabled: true,
    failIfUnavailable: true,
    autoAllowBashIfSandboxed: true,
    allowUnsandboxedCommands: false,
    network: {
      strictAllowlist: true,
      allowedDomains: []
    }
  }
});

for (const { evalCase, condition } of plannedRuns) {
  const runDir = resolve(options.output, 'claude', condition, evalCase.id);
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

  const claudeArgs = [
    '--bare',
    '--print',
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
    '--permission-mode',
    'acceptEdits',
    '--settings',
    sandboxSettings,
    '--disallowedTools',
    'mcp__*'
  ];
  // Treatment loads the COMPLETE plugin (skill + always-on UserPromptSubmit hook)
  // through the supported --plugin-dir mechanism, not a bare copy of SKILL.md.
  // This exercises the v1 reliability mechanism: the hook reinforces the policy
  // even when the model does not explicitly invoke the skill.
  if (condition === 'skill') claudeArgs.push('--plugin-dir', options.pluginDir);
  if (options.model) claudeArgs.push('--model', options.model);
  claudeArgs.push(evalCase.prompt);

  console.log(`Running ${condition.padEnd(8)} ${evalCase.id}`);
  const startedAt = new Date().toISOString();
  const result = run(options.claudeBin, claudeArgs, {
    cwd: workspace,
    env: {
      ...process.env,
      CLAUDE_CODE_SKIP_PROMPT_HISTORY: '1',
      CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: '1'
    }
  });
  const finishedAt = new Date().toISOString();

  const trace = result.stdout ?? '';
  await writeFile(resolve(runDir, 'trace.jsonl'), trace, 'utf8');
  await writeFile(resolve(runDir, 'stderr.log'), result.stderr ?? '', 'utf8');
  const resultEvent = resultEventFromTrace(trace);
  const finalMessage = typeof resultEvent?.result === 'string' ? resultEvent.result : null;
  await writeFile(resolve(runDir, 'final.md'), finalMessage ?? '', 'utf8');
  git(['add', '-N', '.'], workspace);
  const patch = git(['diff', '--binary', '--', '.'], workspace);
  await writeFile(resolve(runDir, 'changes.patch'), patch, 'utf8');

  const mutationTools = evalCase.gold?.dependent_mutation_tools ?? DEFAULT_MUTATION_TOOLS;
  const analysis = analyzeTrace(trace, mutationTools);
  await writeFile(resolve(runDir, 'analysis.json'), `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');

  const record = {
    case_id: evalCase.id,
    condition,
    exit_code: result.status,
    started_at: startedAt,
    finished_at: finishedAt,
    directory: relative(options.output, runDir),
    asked_user_question: analysis.asked_user_question,
    asked_before_mutation: analysis.asked_before_mutation
  };
  manifest.runs.push(record);
  await writeFile(resolve(options.output, 'manifest.claude.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (result.status !== 0) {
    fail(`Claude Code failed for ${condition}/${evalCase.id}. Inspect ${resolve(runDir, 'stderr.log')}`);
  }
  if (resultEvent?.is_error || (resultEvent?.subtype && resultEvent.subtype !== 'success')) {
    fail(`Claude Code reported ${resultEvent.subtype ?? 'an error'} for ${condition}/${evalCase.id}. Inspect ${resolve(runDir, 'trace.jsonl')}`);
  }
  if (finalMessage === null) {
    fail(`Claude Code returned no final result for ${condition}/${evalCase.id}. Inspect ${resolve(runDir, 'trace.jsonl')}`);
  }
}

console.log(`Completed ${manifest.runs.length} runs in ${options.output}`);
