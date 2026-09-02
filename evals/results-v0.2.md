# Results — v0.2 (public preview)

**Status: UNVERIFIED.** The v0.2 evaluation matrix has **not** been run. This document is the honest reporting template required before a release recommendation; it deliberately shows every cell as pending rather than presenting example records as validation. Do not cite v0.2 as validated until the cells below are filled from real runs and this banner is removed.

The example records in `results.example.json` are illustrative scoring shapes only. They are **not** results.

## Environment (fill on run)

- Claude Code version:
- Model / effort:
- Date:
- Plugin load: `--plugin-dir` (local) or marketplace install

## Automated — CLI (`run-claude.mjs`, full plugin via `--plugin-dir`)

Proves: policy reinforcement without explicit invocation, Gate raised **before** mutation (`analysis.json`), Go/Log behaviour, receipts. Does **not** prove the answer round trip (headless `AskUserQuestion` limitation).

| Metric | Baseline | Skill | Target |
| --- | --- | --- | --- |
| Consequential-decision capture | _pending_ | _pending_ | ≥90% skill; ≥+20pts vs baseline |
| Interruption precision | _pending_ | _pending_ | ≥85% |
| Autonomous completion (non-Gate) | _pending_ | _pending_ | ≥90%; ≤10pt drop vs baseline |
| Repository grounding | _pending_ | _pending_ | — |
| Decision-receipt precision | _pending_ | _pending_ | — |
| Pre-commit Gate compliance | _pending_ | _pending_ | ≥90% |
| Critical failures | _pending_ | _pending_ | 0 |

## Automated — Gate round trip (SDK `canUseTool` or CLI `defer` harness)

Proves: question → answer → resume → implementation → receipt. **Harness unverified in CI**; exposed to upstream headless issues (anthropics/claude-code #30983, #50728).

| Metric | Skill | Target |
| --- | --- | --- |
| Question-tool compliance | _pending_ | 100% where available |
| Answer adherence | _pending_ | ≥90% |
| End-to-end Gate completion | _pending_ | — |

## Manual — desktop Code tab (`manual-acceptance.md`)

Proves: the UI promise (native card, pause, resume) that CLI runs cannot.

| # | Case | Result |
| - | ---- | ------ |
| 1 | Implicit policy use on a Gate case | _pending_ |
| 2 | Explicit skill invocation on a Gate case | _pending_ |
| 3 | Visible native question UI outside plan mode | _pending_ |
| 4 | No file edit before the answer | _pending_ |
| 5 | Correct resume and completion after the answer | _pending_ |
| 6 | Go case completes without interruption | _pending_ |
| 7 | Log case produces a concise receipt | _pending_ |
| 8 | Plugin disablement removes always-on behaviour | _pending_ |

## Release recommendation

Not ready for a validated release. Keep the **public-preview** label until:

1. The CLI matrix meets the automated bar with ≥+20pts capture lift and no critical failures.
2. The round-trip harness produces eligible runs meeting question-tool / answer-adherence targets (or the release explicitly scopes those as preview).
3. All eight manual desktop acceptance cases pass.

Publish the misses; do not tune the scorer or gold labels to manufacture a pass.
