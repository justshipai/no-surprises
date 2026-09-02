# Changelog

All notable changes to No Surprises are recorded here. Versions follow the public-preview track; see the README for release status.

## [0.2.0] — Public preview (unreleased)

Claude Code-focused plugin release. The behavioural policy is unchanged in spirit — Go, Log, Gate — but its delivery and evidence are substantially strengthened.

### Added
- **Claude Code plugin packaging** — `.claude-plugin/plugin.json`, so the repository installs and updates as a plugin.
- **Marketplace distribution** — `.claude-plugin/marketplace.json` under the `justshipai` marketplace:
  `/plugin marketplace add justshipai/no-surprises` then `/plugin install no-surprises@justshipai`.
- **Always-on policy reminder** — a plugin-level `UserPromptSubmit` hook (`hooks/hooks.json`, `hooks/reminder.sh`) that reinforces the policy on every prompt with a static, dependency-free, fail-open command. This removes the circular dependency where the policy only applied after Claude chose to invoke the skill.
- **Explicit `AskUserQuestion` Gate execution** in `SKILL.md`: call the native tool before any dependent implementation, recommendation first, ≤2 alternatives, wait for the answer, then continue — with a prose fallback for when the tool is unavailable, and an explicit list of Gate failure modes.
- **Product-vs-code reversibility** guidance: a choice can be a Gate even when the code is trivial to change later.
- **Seven evaluation cases** (21 total): easy-to-reverse product commitment, an all-routine substantial task, delegated authority, a second decision discovered after the first answer, a documentation-resolved decision, a subagent attempting to embed a choice, and a review-only request. New `gold` fields: `simulated_answer`, `dependent_mutation_tools`, `must_not_implement`, `expected_implementation`, `expected_receipt`.
- **Four Gate round-trip metrics** in the scorer: pre-commit Gate compliance, question-tool compliance, answer adherence, end-to-end Gate completion.
- **Trace analysis** per run (`analysis.json`): ordered tool calls and whether `AskUserQuestion` preceded the first dependent mutation.
- **Manual desktop acceptance suite** (`evals/manual-acceptance.md`) and an honest, unverified results template (`evals/results-v0.2.md`).

### Changed
- The Claude evaluation runner loads the **complete plugin** (skill + hook) via `--plugin-dir` instead of copying `SKILL.md` into an add-dir, so the treatment exercises the real v1 reliability mechanism.
- Skill description and README front-load Claude Code, substantial implementation, and the requirement to ask before commitment; the README documents supported and unsupported v1 surfaces, install/verify/disable/uninstall, and evaluation status.
- The launch bar adds pre-commit Gate compliance (≥90%), question-tool compliance (100% where available), and answer adherence (≥90%). Round-trip metrics with no eligible runs report as unverified rather than passing.

### Notes
- The v0.2 matrix has **not** been run; the release stays public preview until it is. The full question → answer → resume round trip is exposed to known upstream headless `AskUserQuestion` issues and is unverified in CI.
- Codex assets (`agents/openai.yaml`, `evals/run-codex.mjs`) are retained as legacy/experimental and are outside the supported v1 surface.

## [0.1.0] — 2026-08-25

Initial public preview.

### Added
- The original behavioural No Surprises skill (`SKILL.md`): Go/Log/Gate classification, inspect-before-asking, delegated-authority handling, and the decision-receipt format.
- A 14-case evaluation corpus with fixtures, a fixture-preparation script, a results template generator, and a scorer.
- Isolated evaluation runners for Codex and Claude Code, and the initial evaluation protocol.
