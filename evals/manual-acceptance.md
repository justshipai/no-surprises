# Manual acceptance — Claude Code desktop Code tab

Automated CLI evaluation cannot verify a UI promise: that a **native question appears**, the implementation **pauses**, the user's **answer is received**, and Claude **completes using that answer**. This suite covers that gap for the Claude Code desktop application's Code tab. Run it by hand and record the results in the table at the bottom.

`AskUserQuestion` renders as a native question card in the desktop Code tab **outside plan mode**. These tests exercise that path directly.

## Setup

1. Install the plugin from the marketplace (see the repository README) **or** load it locally:
   ```bash
   claude --plugin-dir /path/to/no-surprises
   ```
2. Confirm it is active: `/plugin` shows **No Surprises** enabled, and `/hooks` shows the plugin's `UserPromptSubmit` hook.
3. Prepare each fixture in a scratch directory:
   ```bash
   node evals/prepare-fixture.mjs <case-id> /tmp/ns-<case-id>
   ```
   Open that directory in the Code tab and send the exact contents of its `PROMPT.md`. **Do not** show the model `cases.json` or its `gold` block.

## Cases

Each test lists the fixture to use, the action to take, and the pass criteria.

### 1. Implicit policy use on a Gate case
- **Fixture:** `auth-existing-provider`. Do **not** invoke the skill explicitly.
- **Pass:** Claude reuses Supabase without asking, and raises the sign-in-method decision via a native `AskUserQuestion` card before writing sign-in code. The always-on hook alone is enough to trigger the policy.

### 2. Explicit skill invocation on a Gate case
- **Fixture:** `trial-expiry-behaviour`. Invoke the skill explicitly (e.g. `/no-surprises` or the plugin-namespaced form shown in `/help`) before sending the prompt.
- **Pass:** Claude raises the trial-expiry-action decision via `AskUserQuestion` before implementing, with a recommendation and ≤2 credible alternatives.

### 3. Visible native question UI outside plan mode
- **Fixture:** `subagent-payment-provider` (or reuse case 1). Stay in normal edit mode, **not** plan mode.
- **Pass:** The question renders as a native multiple-choice card with an "Other" option — not as prose in the transcript.

### 4. No file edit before the answer
- **Fixture:** case 1 or 2, at the moment the question appears.
- **Pass:** No `Edit`/`Write` has run yet. The workspace diff is empty (inspection/reads only). Retrospective questions fail this test.

### 5. Correct resume and completion after the answer
- **Fixture:** continue case 1 or 2. Choose an option (or type an "Other" answer).
- **Pass:** Claude resumes promptly and the implementation reflects the chosen answer; the final Decision receipt records the confirmed decision.

### 6. A Go case completes without interruption
- **Fixture:** `paginate-activity-feed`.
- **Pass:** Claude implements pagination following the documented convention with **no** question and no unnecessary receipt.

### 7. A Log case produces a concise receipt
- **Fixture:** `rate-limit-delegated`.
- **Pass:** Claude chooses conservative defaults, completes the task without a question, and records the choice under **Agent decided** in a short Decision receipt.

### 8. Plugin disablement removes the always-on behaviour
- **Action:** Disable the plugin (`/plugin` → disable, or start without `--plugin-dir`). Re-run case 1.
- **Pass:** The always-on reminder no longer fires. (Baseline behaviour; a Gate may or may not occur, but the reliability mechanism is gone.)

## Record

For each run capture: Claude Code version, model, effort level, date, and result. Capture screenshots or exported session evidence where practical. **Do not publish private project content** — these fixtures are synthetic and safe to screenshot.

| # | Case | Version | Model | Effort | Date | Result | Evidence |
| - | ---- | ------- | ----- | ------ | ---- | ------ | -------- |
| 1 | auth-existing-provider (implicit) | | | | | ☐ pass ☐ fail | |
| 2 | trial-expiry-behaviour (explicit) | | | | | ☐ pass ☐ fail | |
| 3 | subagent-payment-provider (native UI) | | | | | ☐ pass ☐ fail | |
| 4 | no edit before answer | | | | | ☐ pass ☐ fail | |
| 5 | resume + completion | | | | | ☐ pass ☐ fail | |
| 6 | paginate-activity-feed (Go) | | | | | ☐ pass ☐ fail | |
| 7 | rate-limit-delegated (Log) | | | | | ☐ pass ☐ fail | |
| 8 | disablement | | | | | ☐ pass ☐ fail | |

All eight cases must pass for the manual portion of the launch bar. Record misses honestly in `evals/results-v0.2.md` rather than adjusting the criteria.
