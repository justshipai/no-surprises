# No Surprises

**Stop AI agents making decisions behind your back.**

No Surprises is a behavioural skill for substantial coding work. It helps an agent distinguish routine implementation choices from consequential commitments about product behaviour, architecture, data, dependencies, external services, cost, security, privacy and scope.

The operating rule is simple:

- **Go** when the choice is local, conventional and easily reversible
- **Log** when the choice matters downstream but remains reasonably reversible
- **Gate** before the choice creates meaningful cost, risk, lock-in or commitment

The goal is not more questions. It is better-timed questions.

## The problem

A coding agent can produce technically sound work while quietly choosing a provider, changing product behaviour, creating a data commitment or expanding scope in a way the user never authorised.

The usual alternatives are not good enough:

- Let the agent make every decision and discover the consequences later
- Make the agent ask about everything and lose the benefit of autonomy

No Surprises preserves the user's decision rights without turning every task into an approval workflow.

## What changes

| Task | Common failure | With No Surprises |
| --- | --- | --- |
| “Add user sign-in” in a project already using Supabase | Quietly chooses email/password, magic links or social login | Reuses Supabase without asking, then **Gates** the undecided sign-in method because it changes the product experience |
| “Add a weekly revenue chart” with Recharts already installed | Interrupts to ask about libraries, chart types or styling details | **Goes** with the established library and sensible local defaults |
| “Add a daily activity email. Use your judgement.” | Asks the user to choose defaults despite being given authority | Chooses defensible defaults, completes the work and **Logs** the consequential choice in a short decision receipt |

A useful Gate looks like this:

> **Decision needed:** Which sign-in method should the first release support?
>
> **Why it matters:** Passwords, magic links and social sign-in create different user experiences and operational requirements.
>
> **Recommendation:** Start with magic links because the product already uses Supabase and this avoids password-reset flows.
>
> **Alternative:** Email and password if users need a familiar credential-based flow.
>
> **Default:** Magic links if you want me to make the call.

No questionnaire. No vague “how would you like to proceed?”. No implementation before the decision.

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

## How it works

No Surprises inspects the request, project documentation, nearby code and established conventions before raising a decision. It then classifies meaningful unstated choices internally:

- **Go:** proceed without asking or recording
- **Log:** proceed, then disclose the consequential choice in the final decision receipt
- **Gate:** pause before a meaningful commitment and ask one bounded question with a recommendation

When the user says “use your judgement” or “just ship it”, ordinary Gates become Logs. Destructive production actions, real expenditure, external publication and material security exposure still require specific authority.

Read the complete behaviour in [SKILL.md](SKILL.md).

## Evaluation

The repository includes an open, reproducible [14-case evaluation suite](evals/README.md) covering product behaviour, architecture, data, providers, privacy, authorisation, commercial rules, scope control and routine implementation choices.

The suite compares baseline and skill-assisted behaviour across Codex and Claude Code. Its runners create clean fixture repositories, capture traces and diffs and calculate:

- Consequential-decision capture
- Interruption precision
- Autonomous completion
- Repository grounding
- Decision-receipt precision
- Critical failures

Validation is ongoing and results will be published as the matrix is completed. The skill is available as a public preview now so real-world edge cases can inform that work.

## Status

**v0.1 public preview.** The core skill, installation path and evaluation harness are ready to use. Feedback, adversarial examples and reports of unnecessary or missed decisions are welcome through GitHub issues.

## Licence

MIT
