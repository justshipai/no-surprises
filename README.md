# No Surprises

**Stop Claude making decisions behind your back.**

No Surprises pauses Claude Code before consequential product, architecture, data and service decisions, while leaving routine implementation choices alone. It is a Claude Code plugin: it reinforces its policy on every prompt and, for a genuine commitment, uses Claude Code's native `AskUserQuestion` to ask you one bounded question **before** any implementation depends on the answer.

The goal is not more questions. It is better-timed questions.

## Go, Log, Gate

No Surprises classifies each unstated choice and acts accordingly:

- **Go** — routine, local, easily reversible, or already settled by the project. Proceed without asking or recording.
- **Log** — consequential but reasonably reversible, or within authority you delegated. Proceed, then disclose it in a short decision receipt.
- **Gate** — a meaningful commitment about product behaviour, access, money, privacy, security, an external provider, a public contract, or scope. Pause **before** the choice is embedded and ask via `AskUserQuestion`.

A choice can be a Gate even when changing the code later would be trivial: product reversibility is not code reversibility.

## Supported in v1

- Claude Code in the terminal
- Claude Code in the desktop application's Code tab
- Automatic policy reinforcement whenever the plugin is enabled (a `UserPromptSubmit` hook)
- Explicit invocation of the No Surprises skill
- Native `AskUserQuestion` Gates outside plan mode
- Go / Log / Gate classification and decision receipts
- Installation and updates through a Claude Code plugin marketplace, and local development via `--plugin-dir`

## Not supported in v1

Claude Cowork, general claude.ai chat, Codex CLI/app, ChatGPT Work, and other Agent Skills hosts (Cursor, Gemini, OpenCode). No external service, API, or MCP server. No per-edit model classifier. No mandatory up-front questionnaire. No deterministic prevention of every bad decision — this combines persistent policy reinforcement with Claude's judgement and the native question UI; it does not guarantee.

## Install (recommended)

Add the marketplace and install the plugin:

```bash
/plugin marketplace add justshipai/no-surprises
```

```bash
/plugin install no-surprises@justshipai
```

If the install summary says `Run /reload-plugins to activate.`, run that.

## Install for local development

Point Claude Code at a clone of this repository — no marketplace needed:

```bash
claude --plugin-dir /path/to/no-surprises
```

Validate the plugin manifest and marketplace before shipping changes:

```bash
claude plugin validate .
```

## Verify the installation

- `/plugin` — **No Surprises** appears and is enabled.
- `/hooks` — the plugin's `UserPromptSubmit` hook is listed.
- `/help` → **Custom commands** — the No Surprises skill is listed under the plugin namespace and is explicitly invocable (shown there as `/no-surprises:no-surprises`).

## Use it

**Automatic (no invocation).** The always-on hook reinforces the policy on every prompt, so the behaviour applies even when Claude does not explicitly load the skill:

> **You:** Add user sign-in to this app. Implement everything you safely can.
>
> **Claude:** *(reuses the Supabase client already in the repo, then before writing any sign-in code asks a native question — see below.)*

**Explicit.** Invoke the skill by its command from `/help` when you want the policy front-of-mind for a task (for example when handing over an ambiguous spec).

### A native `AskUserQuestion` Gate

For the sign-in task above, the repo has already decided the provider (Supabase) but not the sign-in method — a real product commitment. No Surprises does not guess; it asks, **before** editing:

> **How should the first release let people sign in?**
> - **Magic links (recommended)** — the project already uses Supabase; avoids password-reset flows.
> - **Email & password** — familiar credential-based flow.
> - *Other…* (type your own)

Claude waits for your answer, then implements it and records the confirmed decision in the receipt. No questionnaire, no vague "how would you like to proceed?", no implementation before the decision.

### A Go example (routine work is not interrupted)

> **You:** The activity feed loads every row at once and is slow. Add pagination.
>
> **Claude:** *(follows the repo's existing cursor-pagination convention and default page size, implements it, and finishes — no question, no unnecessary receipt.)*

Reusing an installed library, following established patterns, ordinary UI/naming choices, contained refactors and routine tests all stay autonomous.

## Disable or uninstall

- **Disable temporarily:** open `/plugin`, select No Surprises, and disable it. Or simply start a session without `--plugin-dir`.
- **Uninstall:** `/plugin uninstall no-surprises@justshipai` (or remove it from the `/plugin` manager).
- **Remove the marketplace:** `/plugin marketplace remove justshipai`.

Removing the plugin removes the always-on reminder; nothing else is left behind.

## How it works

The plugin ships one skill ([SKILL.md](SKILL.md)) and one lightweight hook ([hooks/hooks.json](hooks/hooks.json), [hooks/reminder.sh](hooks/reminder.sh)):

- The `UserPromptSubmit` hook prints a short static policy reminder into Claude's context on every prompt. It makes no model or network call, needs no Node/Python/jq, has a short timeout, and fails open — a reminder failure can never block a prompt. Using a plugin-level hook (rather than skill frontmatter) is deliberate: it removes the circular dependency where the policy only loads *after* Claude chooses to invoke the skill.
- The skill defines Go/Log/Gate, how to execute a Gate with `AskUserQuestion` (and the prose fallback when the tool is unavailable), and the decision-receipt format.

This is reinforcement plus judgement, not deterministic enforcement.

## Evaluation

The repository includes an open, reproducible suite ([evals/README.md](evals/README.md)) of 21 cases covering product behaviour, architecture, data, providers, privacy, authorisation, commercial rules, scope control, delegated authority, documented decisions, subagent embedding and review-only requests.

- The Claude treatment loads the **complete plugin** (skill + hook) via `--plugin-dir`, so it tests the real v1 reliability mechanism — not a bare copy of the skill file.
- Metrics: consequential-decision capture, interruption precision, autonomous completion, repository grounding, decision-receipt precision, critical failures, plus v0.2 Gate round-trip metrics (pre-commit Gate compliance, question-tool compliance, answer adherence, end-to-end Gate completion).
- A UI promise needs a UI test: [evals/manual-acceptance.md](evals/manual-acceptance.md) covers the desktop Code tab.

**Status:** the v0.2 matrix has not yet been run. See [evals/results-v0.2.md](evals/results-v0.2.md) — every cell is marked pending, and the release is **public preview** until real runs fill it in. The full round-trip harness is exposed to known upstream headless `AskUserQuestion` issues and is unverified in CI.

## Status

**v0.2 public preview.** Claude Code plugin, always-on reminder hook, native `AskUserQuestion` Gates, marketplace distribution, and an expanded evaluation harness. Feedback, adversarial examples, and reports of unnecessary or missed decisions are welcome through GitHub issues. See [CHANGELOG.md](CHANGELOG.md).

## Licence

MIT
