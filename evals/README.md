# Evals

Behaviour tests for the SDD plugins, in the format of Claude Code's built-in [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Maintainer-only: this directory sits outside `plugins/`, so it never ships to users. Each case names the plugins it loads with `plugins:` in its `prompt.md` and carries its suite name as a tag.

## Suites

| Suite | What it checks | Graders | Approximate cost |
|---|---|---|---|
| `namespaces` | each skill and agent is reachable by its namespaced name: `engineering-paved-path:<skill>` (an Angular placement question and a NestJS layering question), `research-tools:researcher`, `architecture-review:architecture-reviewer`, the four `sdd-engineering` agents | `tool_used` only (free) | one run per case |
| `sdd-engineering` | `spec-creator` in analyze mode asks numbered questions and writes no file; `/run-plan` without a plan points to the planner and starts no implementer; a small edit that needs no spec starts no `sdd-engineering` agent or skill (negative case); `spec-creator` refuses to approve a spec whose `must` story has no AC, even with the user's approval, and names the story in its `Coverage:` line (1.1.0) | `tool_used`, `file_exists`, `regex` (free) | two runs per case |
| `architecture-review` | on NestJS and Angular fixtures, the reviewer finds a Nest import in a pure domain rule and a Mongoose model queried from a controller, flags filesystem and `process.env` access in a pure rule, flags a `shared/` component importing a feature and calling `HttpClient`, and approves a harmless rename | `tool_used` + `llm` judge | three runs per case, plus judge calls |
| `cost-workflow` | the fixed cost scenario of `docs/COST-BASELINE.md`: in a seeded Angular project, the user asks for a spec and a plan for a small feature; `spec-creator` analyze → write → approve, then `implementation-planner` pass 1 → pass 2; the spec is approved and has AC lines, the plan is saved and has steps | `tool_used`, `tool_order`, `file_exists`, `regex` (free) | three runs; the most expensive suite, since both agents run on Opus |

The `architecture-review` fixtures use an Angular `client/` and a NestJS `server/` and the default rules of `engineering-paved-path:nestjs-backend-architecture` and `engineering-paved-path:frontend-architecture`. They replaced the onion-layout fixtures of `gm-ai-marketplace` in 2026-10; no run of this suite on the new fixtures has been recorded yet.

## Run

```bash
scripts/run-evals.sh namespaces              # cost ceiling for the suite defaults to $5
scripts/run-evals.sh sdd-engineering
scripts/run-evals.sh architecture-review 10
scripts/run-evals.sh cost-workflow 15 --runs 1   # options after the ceiling go to claude plugin eval as is
```

The script runs `claude plugin eval .` from the repository root with `--tag <suite>`. The root has to be the target: the command loads a case's `plugins:` only from under the directory it runs against, so a case file as the target can't reach `plugins/`. It also passes:

- `--ablation none` — without the plugins, the namespaced agents don't exist, so a baseline arm would only fail;
- `--no-publish` — `claude plugin eval` otherwise publishes the HTML report to claude.ai;
- `--judge-model sonnet` — with the default Haiku judge, `llm` graders failed reviews that met their rubric;
- `--trust-plugin` and `--max-cost-usd`.

It passes `--scaffold` to every suite: a case's `fixture.sh` seeds its workspace, and every case here is ours. For `sdd-engineering` it grants `Write` and `Edit`, so a case that expects an agent not to write or not to approve checks the agent rather than a missing tool. For `cost-workflow` it grants `Write` and `Edit` (the flow writes the spec and the plan) and adds `--keep-temp` (each run's transcripts stay in `/tmp/e-*` for token and tool-call counts) and `--model sonnet` for the orchestrating session; the agents keep the models in their frontmatter. Compare two of its runs with `node scripts/compare-evals.mjs <baseline-dir> <candidate-dir>`, which also applies the quality gate of `docs/COST-BASELINE.md`.

Reports go to `evals/results/<timestamp>/<suite>/`, which git ignores. To run one case: add `--case <name>` to the same command.

Runs use your Claude credentials and count against your plan or API bill. CI doesn't run them: it has no model credentials. Run the suites by hand before releasing a change to these plugins, and note the result in the PR.

## Add a case

Copy a case directory in the suite and edit `prompt.md` and `graders/`; keep the suite name in `tags:`. Prefer free graders (`tool_used`, `regex`, `file_exists`) for anything that can be checked without a judge. To check that an agent was used:

```markdown
---
type: tool_used
tool: Agent
input_match: '"subagent_type"\s*:\s*"research-tools:researcher"'
---
```

Grader types, `prompt.md` fields and the result format: [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals).
