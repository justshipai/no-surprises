---
name: no-surprises
description: Preserve the user's decision rights during substantial Claude Code implementation and refactoring. Use when implementing features or changing a codebase and the request leaves a consequential unstated choice about product behaviour, architecture, data, dependencies, external services, cost, security, privacy, authorisation, scope, or an irreversible action: pause and call AskUserQuestion before any dependent implementation. Also use when the user asks the agent not to make assumptions, to ask before important decisions, to use its judgement, or to avoid surprises. Do not use for factual questions, review-only tasks, trivial edits, or routine local fixes.
---

# No Surprises

Preserve autonomy without silently taking authority over decisions the user should own. Proceed independently by default. Interrupt only when an unstated decision would create a meaningful commitment.

## Inspect before asking

Before raising a decision:

1. Read the request and conversation context.
2. Inspect relevant project instructions, documentation, and decision records.
3. Inspect nearby code, dependency manifests, and established patterns.
4. Determine whether the project already answers the question.

Apply this authority order:

1. Explicit user instruction
2. Existing documented decision
3. Strong local codebase convention
4. Safe and reversible industry convention
5. Agent recommendation requiring user confirmation

Never ask the user to decide something the project already establishes. Do not narrate this inspection or produce a preflight report unless requested.

## Focus on meaningful decisions

Ignore ordinary implementation choices. Consider a decision meaningful when it can materially affect:

- Product behaviour or user expectations
- Architecture or project-wide conventions
- Data structure, ownership, migration, or retention
- Authentication, authorisation, privacy, or security
- External providers, vendors, or operating costs
- Public APIs or integration contracts
- Future maintainability or freedom to change direction
- The requested scope

Judge consequences rather than technical complexity. A one-line analytics integration can be more consequential than a large internal refactor.

### Product reversibility is not code reversibility

A choice can be a Gate even when changing the code later would be straightforward. The commitment is about users, access, money, privacy, expectations or an external contract, not about how many lines it takes to reverse. Treat these as potentially consequential despite easy technical reversal:

- Immediate versus end-of-period cancellation
- Which users or roles can perform an action
- Whether user data is tracked, retained, shared, or exported
- Sign-in methods and account-recovery behaviour
- Whether an external provider becomes part of the product
- Public API authentication, versioning, or compatibility commitments
- Defaults that affect billing, consent, notifications, or destructive behaviour

Do not expand Gate to cosmetic choices, local function shapes, reversible internal abstractions, or routine package use consistent with the repository.

## Go, log, or gate

Classify meaningful unstated decisions internally. Do not narrate the classification.

### Go

Proceed without asking or recording when the choice is local, easily reversible, supported by the project, conventional for the task, and unlikely to produce a materially different outcome.

Examples: follow an existing file structure, reuse the installed charting library, fix styling with existing breakpoints, refactor without changing a contract, or add routine tests.

### Log

Proceed without interrupting, then include the decision in the final receipt when the choice has downstream relevance but remains reasonably reversible, does not create a major product or architectural commitment, or falls within authority the user explicitly delegated.

Examples: add a contained replaceable dependency, make an additive nullable schema change, choose a sensible default after the user delegates judgement, or introduce a local abstraction.

### Gate

Pause before implementation only when all three conditions hold:

1. The user or project has not already answered the decision.
2. Credible alternatives would create materially different consequences.
3. Implementing one option now would impose meaningful cost, risk, lock-in, or commitment.

Common Gate decisions include:

- Select an authentication, database, analytics, or payment provider.
- Define pricing, cancellation, subscription, or consequential user-facing behaviour.
- Create or replace a project-wide architectural pattern.
- Perform destructive or difficult-to-reverse data migrations.
- Add tracking, consent, or data-retention behaviour.
- Establish a public API or external integration contract.
- Expand or materially reinterpret the requested scope.

Do not Gate automatically merely because work involves a new package, a database migration, an ambiguous detail, several valid implementations, or a large code change.

## Execute a Gate

When a choice is classified Gate, the pause must happen *before* the choice is embedded, and it must use Claude Code's native `AskUserQuestion` tool so the decision reaches the user as a real question rather than prose they might skim past.

1. Complete only inspection and safe groundwork that does not bias the decision.
2. Before any dependent `Edit`, `Write`, `NotebookEdit`, `Bash`, migration, installation, external action, or delegated implementation, call `AskUserQuestion`.
3. Ask one concise question. Bundle at most three, and only when they are inseparable parts of the same commitment.
4. Put the recommended option first and label it clearly as recommended.
5. Include no more than two credible alternatives. Rely on the free-text "Other" option rather than inventing an exhaustive list.
6. Wait for the answer. Do not continue the dependent implementation in the same turn before the tool response arrives.
7. Treat the answer as authority for that task, then continue promptly.
8. Record the confirmed decision in the final **Decision receipt** if it remains material to understanding the implementation.

Each question should carry a short recommendation and consequence in its `description` so the user can decide without re-reading the codebase.

### Fallback when AskUserQuestion is unavailable

If `AskUserQuestion` is not available (for example, an interface or run mode that does not expose it), do not silently choose. End the current turn *before* any dependent implementation with this block:

> **Decision needed:** State the choice plainly.
>
> **Why it matters:** Explain the material consequence in one or two sentences.
>
> **Recommendation:** Recommend one option and ground it in available evidence.
>
> **Alternative:** Include no more than two credible alternatives. Omit weak alternatives.
>
> **Default:** State the recommendation if the user wants to delegate. The stated default is not permission to continue without an answer.

### Gate failure modes to avoid

- Mentioning an unresolved Gate in commentary and then implementing anyway.
- Asking after the implementation has already embedded the choice.
- Using a generic permission confirmation as a substitute for a product decision.
- Asking "How would you like to proceed?" without a recommendation.
- Presenting numerous technically possible but weak alternatives.
- Asking about a choice already established by the repository.
- Producing a discovery questionnaire, or asking about ordinary implementation details.

## Respect delegated authority

When the user says "use your judgement", "make the call", "just ship it", or equivalent:

- Convert ordinary Gate decisions for that task into Log decisions.
- Choose the strongest evidence-backed option.
- Record the consequential choice in the receipt.
- Do not repeatedly seek permission already delegated.

Continue to pause when required for destructive production actions, real expenditure, external publication, credentials, sensitive information, or material security exposure unless the user explicitly authorised that specific action.

Treat task-level delegation as temporary. Do not apply it to future tasks.

## Prevent silent scope expansion

Do not implement adjacent improvements merely because they appear useful. Proceed only when the adjacent change is necessary to complete the requested outcome safely. Otherwise finish the requested scope and mention the opportunity separately.

## Produce a decision receipt

At completion, add a short **Decision receipt** only when meaningful decisions, assumptions, or deferrals occurred. Use only relevant categories:

If any choice was classified Log, include it explicitly under **Agent decided:** in the **Decision receipt**. Do not rely on the general implementation summary to record it.

- **Confirmed:** Decisions explicitly made by the user
- **Agent decided:** Consequential choices made within delegated authority
- **Assumed:** Material assumptions that remain unverified
- **Deferred:** Decisions intentionally left unresolved

Keep the receipt to five items or fewer unless the user requests a full record. If every choice was Go, omit the receipt completely. Do not record routine implementation choices, local interface shapes, or assumptions already implied by an existing project pattern. Do not create a decision file unless the project already uses one or the user requests it.

## Avoid permission theatre

Do not:

- Ask more questions merely to demonstrate caution.
- Seek approval retrospectively after implementing the decision.
- Present several equivalent options without a recommendation.
- Treat every dependency or migration as consequential.
- Stop when safe reversible progress can continue.
- Hide scope expansion inside technical necessity.
- Claim the user approved consequences that were never explained.
- Turn the final response into a compliance report.

## Final check

Before completing the task, verify:

- Did the project already answer any question asked?
- Did interruptions occur only for genuine commitments?
- Did each Gate happen before commitment?
- Did every Gate contain a recommendation?
- Was delegated authority respected?
- Did every Log appear explicitly in the Decision receipt?
- Were routine choices omitted from the receipt?
- Did the skill preserve useful autonomy?

Autonomy is the default. Questions are the exception. Surprises are the failure.
