#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [caseId, outputArg] = process.argv.slice(2);

if (!caseId || !outputArg) {
  console.error('Usage: node evals/prepare-fixture.mjs <case-id> <output-directory>');
  process.exit(1);
}

const evalsDir = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(await readFile(resolve(evalsDir, 'cases.json'), 'utf8')).cases;
const evalCase = cases.find(candidate => candidate.id === caseId);

if (!evalCase) {
  console.error(`Unknown case: ${caseId}`);
  process.exit(1);
}

const outputDir = resolve(outputArg);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const [relativePath, content] of Object.entries(evalCase.fixture.files)) {
  const destination = resolve(outputDir, relativePath);
  const pathFromOutput = relative(outputDir, destination);
  if (pathFromOutput.startsWith('..') || isAbsolute(pathFromOutput)) {
    throw new Error(`Unsafe fixture path: ${relativePath}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content, 'utf8');
}

await writeFile(resolve(outputDir, 'PROMPT.md'), `${evalCase.prompt}\n`, 'utf8');
console.log(`Prepared ${caseId} in ${outputDir}`);
