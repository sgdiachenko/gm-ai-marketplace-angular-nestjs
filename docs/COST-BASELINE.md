# Cost baseline: sdd-engineering

What one short SDD workflow costs, one change that removes a source of excess context, and the quality gate that decides whether the change ships. Re-run the experiment before changing an agent prompt or a model choice in `sdd-engineering`.

## Scenario

> **In this copy:** the numbers below were measured in `gm-ai-marketplace` (sdd-engineering 1.0.0–1.1.0) with the Next.js fixture. The fixture here is now an equivalent Angular app with the same feature request, so the old numbers are a reference, not a baseline: run the scenario on 2.0.0 once and record a new baseline before applying the quality gate to a prompt or model change.

`evals/cost-workflow/spec-and-plan`: a seeded project (originally Next.js, now Angular) with its own `AGENTS.md`, check commands and `docs/sdd-profile.md`. The user asks for a spec and a plan for a small feature: add a word with its translation on the words page, kept only while the page is open. The orchestrating session isn't allowed to ask anything; it answers questions with the smallest scope, rejects UX proposals and revises at most once:

1. `sdd-engineering:spec-creator` analyze → write → approve (one revise if approval is refused);
2. `research-tools:researcher` for each research request, if any;
3. `sdd-engineering:implementation-planner` pass 1 (report saved to a file) → pass 2 → the plan saved to `docs/plans/words-list.md`.

**Success** is a run that passes all eight free graders: a dated spec file and the plan file were created, the spec is `approved` and has AC lines, the plan has steps, spec-creator ran at least three times and the planner at least twice, and the spec came before the plan.

**Fixed for both arms:** Claude Code 2.1.299; the orchestrator on Sonnet (`--model sonnet`); the agents on the models their frontmatter sets (`spec-creator` and `implementation-planner` on Opus, `researcher` on Sonnet); the same case, fixture and graders. Costs are the list-price estimates `claude plugin eval` reports. Tokens, API calls and tool calls are counted from the run transcripts by `scripts/compare-evals.mjs`, across the main session and every subagent.

Reproduce:

```bash
git switch --detach <commit>
scripts/run-evals.sh cost-workflow 9 --runs 3
node scripts/compare-evals.mjs evals/results/<baseline>/cost-workflow evals/results/<candidate>/cost-workflow
```

## Quality gate

`scripts/compare-evals.mjs` passes a candidate only when all of these hold:

- its pass rate is at least the baseline's;
- no run is partial and no paid grader was skipped;
- no grader that passed in every baseline run fails in a candidate run (no new critical false negative);
- its median cost or median latency is below the **lowest** baseline run, so the saving is outside the baseline's own spread rather than noise.

The cost-workflow graders are free, so the gate itself costs nothing beyond the runs.

## Baseline: sdd-engineering 1.0.0

Plugins at the `*--v1.0.0` tags; the plugin files of every baseline commit are identical to the tags. Runs on 2026-10-14, results `evals/results/20261014-164857` (commit `0c8a520f846b`) and `evals/results/20261014-165709` (commit `83e4cd67b5e1`).

| Run | Result | Cost | Latency | Output tokens | Cache read | Cache write | API calls | Tool calls | Agents launched | Revise rounds |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | pass | $1.92 | 458 s | 53,213 | 727,830 | 179,399 | 33 | 61 | 5 | 0 |
| 2 | pass | $1.92 | 498 s | 55,761 | 559,967 | 175,263 | 26 | 55 | 5 | 0 |
| 3 | pass | $2.59 | 598 s | 70,085 | 955,692 | 243,410 | 40 | 77 | 7 | 1 |

| Metric | Baseline |
|---|---|
| Models | `spec-creator` and `implementation-planner` on Opus, orchestrator on Sonnet: 71 and 28 API calls across the three runs |
| Pass rate | 3/3 |
| Median cost per run | $1.92 (range $1.92–$2.59) |
| **Cost per successful workflow** | **$2.14** ($6.43 / 3) |
| Median latency | 498 s (458–598 s) |
| Median input / output tokens | 76 / 55,761 |
| Median cache read / write tokens | 727,830 / 179,399 |
| Median API calls / tool calls | 33 / 61 |
| Critical errors | none |

Where the money goes: Opus output (the analysis, the spec and the plan) and the cache writes of each new agent context. A revise round adds about a third to a run (run 3). Input tokens are almost all cache reads.

Before this baseline, the scenario's first version let the orchestrator take every recommended default: the spec grew to six `must` stories and ~30 ACs, spec-creator ran seven times and the run cost $5.52 in 1,319 s (`evals/results/20261014-162327`). That run is not part of the baseline; it is why the scenario now asks for the smallest scope.

## Optimization: drop the instructions spec-creator repeats from its own skill

**Source of excess context.** `spec-creator` preloads `ears-requirements`, and its prompt repeated that skill: five items of its final self-check restated the skill's self-check (story coverage, AC fields, `shall`, banned words, unwanted-behaviour coverage, NFR categories, no implementation details), and its section rules restated the AC line format, the NFR rule, the traceability rule and ID stability. Its 3.9 KB spec template and section rules sat in the prompt in every mode, though only `write` and `revise` use them.

**Change** (one change, no model or routing change): the repeated lines are removed and point to the skill; the template and section rules move to `skills/ears-requirements/references/spec-template.md`, which `spec-creator` reads in `write` and `revise` only. The prompt shrinks from 21.5 KB to 17.5 KB; `claude plugin details` puts `spec-creator`'s on-invoke cost at ~4.1k tokens, down from ~5.1k.

Result `evals/results/20261014-171527` (commit `a108a81272f2`, branch `sdd-context-diet`), same scenario, 2026-10-14.

| Run | Result | Cost | Latency | Output tokens | Cache read | Cache write | API calls | Tool calls | Agents launched | Revise rounds |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | pass | $2.35 | 501 s | 57,863 | 1,090,387 | 250,489 | 50 | 85 | 8 | 1 |
| 2 | **fail** | $1.76 | 439 s | 48,264 | 730,733 | 157,962 | 34 | 50 | 6 | 1 |
| 3 | pass | $1.94 | 486 s | 55,563 | 680,829 | 185,906 | 34 | 68 | 6 | 0 |

| Metric | Baseline 1.0.0 | Candidate |
|---|---|---|
| Pass rate | 3/3 | 2/3 |
| Median cost per run | $1.92 | $1.94 (+1%) |
| **Cost per successful workflow** | **$2.14** | **$3.03 (+41%)** ($6.06 / 2) |
| Median latency | 498 s | 486 s (−2%) |
| Median output tokens | 55,761 | 55,563 (0%) |
| Median cache read / write tokens | 727,830 / 179,399 | 730,733 / 185,906 (+0% / +4%) |
| Median API calls / tool calls | 33 / 61 | 34 / 68 |
| Critical errors | none | run 2: no plan — approval refused twice |

**The failed run.** In `write`, spec-creator put two responses in one line (NFR-1: no length limit *nor* a count limit) and, after one revise, used a banned phrase ("as many lines as needed") with a second response in AC-17. `approve` caught both, as it should, but the scenario allows one revise, so the run ended without a plan. Spec-creator needed a revise in two of three candidate runs against one of three in the baseline.

## Decision

**Gate: failed.** `node scripts/compare-evals.mjs` reports: pass rate fell from 100% to 67%; six graders that passed in every baseline run failed in candidate run 2; and the median cost ($1.94) and latency (486 s) are inside the baseline's spread ($1.92–$2.59, 458–598 s). **The change does not ship**: `sdd-engineering` 1.1.0 keeps the 1.0.0 prompt plus the coverage gate.

What we learned:

- The removed lines were not pure waste. The writer-facing rules (one response per line, no banned words without a number) restated in the prompt kept `write` closer to EARS; with only the skill's self-check left, `approve` found more to refuse.
- The context saving was too small to show in cost. ~1k fewer tokens per spec-creator call is a few percent of a run whose cost is Opus output and cache writes, and reading the template in `write` gives some of it back.
- A next attempt should target output or agent count instead: for example the analysis handed to `write` by file instead of pasted text, or fewer full rewrites per revise. Keep the writer-facing EARS rules in the prompt.

Spend for the experiment: $12.49 for the six runs, plus $5.52 for the first-version run.
