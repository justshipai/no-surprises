# No Surprises

**Keep AI coding agents autonomous without letting them quietly make decisions you should own.**

No Surprises is a behavioural skill for substantial coding work. It helps an agent distinguish routine implementation choices from consequential commitments about product behaviour, architecture, data, dependencies, external services, cost, security, privacy and scope.

The operating rule is simple:

- **Go** when the choice is local, conventional and easily reversible
- **Log** when the choice matters downstream but remains reasonably reversible
- **Gate** before a choice creates meaningful cost, risk, lock-in or commitment

The goal is not more questions. It is better-timed questions.

## The problem

Coding agents are increasingly capable of completing entire features autonomously. That creates a subtler failure mode: an implementation can be technically sound while quietly choosing a provider, changing product behaviour, creating a data commitment or expanding scope in a way the user never authorised.

No Surprises preserves the user's decision rights without turning every task into an approval workflow.

## Example

Asked to add authentication, an agent should inspect the project first.

- If the repository already uses Supabase, reuse it without asking
- If the sign-in method has not been decided and materially affects the product, ask one bounded question before embedding it
- If the user delegates the choice, choose a defensible default and record it in the final decision receipt

## Install

Using the Skills CLI:

```bash
npx skills add justshipai/no-surprises
```

Or clone it into your agent's skills directory:

```bash
# Claude Code
git clone https://github.com/justshipai/no-surprises ~/.claude/skills/no-surprises

# OpenAI Codex
git clone https://github.com/justshipai/no-surprises ~/.codex/skills/no-surprises
```

Then invoke it explicitly with `$no-surprises`, or let a compatible agent load it automatically when the task matches its description.

## Evaluation

The repository includes a reproducible [14-case evaluation suite](evals/README.md) covering product behaviour, architecture, data, providers, privacy, authorisation, commercial rules, scope control and routine implementation choices.

The full matrix is 56 independent runs: 14 cases, with and without the skill, across Codex and Claude Code. The zero-dependency tools prepare clean fixture repositories, generate a complete results template and calculate the launch metrics.

## Status

This is an early public version. The evaluation harness is ready, but the 56-run cross-agent matrix has not yet been completed. A structural Commitment Scan also remains planned before a full launch.

## Licence

MIT
