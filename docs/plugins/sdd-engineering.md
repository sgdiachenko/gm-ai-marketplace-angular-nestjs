# sdd-engineering — maintainer notes

The Spec-Driven Development workflow. Depends on `engineering-paved-path` `^2.0.0`, `research-tools` `^1.0.0` and `architecture-review` `^2.0.0`. Claude Code only (its value is in agents; see `docs/codex-compatibility.md`, rule 5). Spec: `specs/sdd-engineering.md`.

## Where each component came from

Ported from `sgdiachenko/dev-digest` at `1b694bc41a61`.

| Component | Source | Main changes |
|---|---|---|
| `agents/spec-creator.md` | `.claude/agents/spec-creator.md` | paths, modules and language from the project profile; EARS keywords in English, or translations listed in the profile; preloads namespaced skills; contract-change reasoning inlined instead of reading three dev-digest skills; never sets `implemented` (run-plan does) |
| `agents/implementation-planner.md` | `.claude/agents/implementation-planner.md` | preloads one skill instead of 16 (~40k tokens); skills per file from the profile's *Skill lanes* or by file type, loaded through the Skill tool; checks from the profile; unknown project facts become `Q#`; `doc-writer` / `test-writer` hand-offs removed |
| `agents/implementer.md` | `.claude/agents/implementer.md` | step skills loaded through the Skill tool by namespaced name; checks and guardrails from the profile; dev-digest's lane table, commands, migration and contract-sync rules generalized |
| `agents/plan-verifier.md` | `.claude/agents/plan-verifier.md` | `gate.sh fingerprint` replaced by the bundled `skills/run-plan/scripts/fingerprint.sh`; skill sources loaded through the Skill tool; checks from the profile |
| `skills/run-plan/` | `.claude/skills/run-plan/SKILL.md` | profile intake and draft offer; reviewers = `architecture-review:architecture-reviewer` ∥ `/code-review` (+ `/security-review` when flagged); the `doc-writer` phase became "close the spec"; the `/pr-self-review` gate became "full checks, then commit or PR on the user's yes"; principles renumbered |
| `skills/run-plan/profile-template.md` | new | the profile template |
| `skills/run-plan/scripts/fingerprint.sh` | new | working-tree fingerprint (HEAD + staged, unstaged, untracked changes), with `--exclude` for the plans directory |
| `skills/workflow-retro/` | `.claude/skills/workflow-retro/` | script called through `${CLAUDE_SKILL_DIR}`; transcripts found through `CLAUDE_CONFIG_DIR`; rate card read from `${CLAUDE_PLUGIN_DATA}/prices.json` (`--prices`), bundled card empty; report language from the profile |
| `skills/ears-requirements/` | `.claude/skills/ears-requirements/SKILL.md` | English keywords, with translations from the profile as an option; examples rewritten without dev-digest's domain |
| `skills/ux-design-review/` | `.claude/skills/ux-design-review/SKILL.md` | dev-digest states (`~/.devdigest`, GitHub token, LLM review runs) generalized |
| `skills/mermaid-diagram/` | `.claude/skills/mermaid-diagram/` | reference to a missing `references.md` replaced by the Mermaid docs link |

Not ported, by decision (see the spec's non-goals): `brainstorm`, `test-writer`, `doc-writer`, `security-reviewer`, `stack-reviewer`, `conventions-reviewer`, `pr-self-review` and its gate hook, dev-digest's own specs, plans and retros.

## The Angular + NestJS copy (2.0.0)

This repository is a copy of `gm-ai-marketplace` for Angular and NestJS. The workflow itself is unchanged and must stay so unless a change is deliberate: four agents with the same roles, tools and models (`spec-creator` and `implementation-planner` on Opus, `implementer` and `plan-verifier` on Sonnet), the planner's two passes, `/run-plan`'s phases with the verification loop (≤ 2 rounds) and the review-fix loop (≤ 3 rounds), the commit/PR gate and `/workflow-retro`. What changed is stack knowledge only:

- the planner's default file-type → skill mapping (`angular-developer`, `frontend-architecture`, `nestjs-best-practices`, `nestjs-backend-architecture`, `security`);
- Angular wording for DOM-measuring steps (manual verification) and a `Q#` when a module that needs tests has no test command;
- examples in agents, the profile template and `mermaid-diagram`.

An example profile for an Angular `client/` + NestJS `server/` starter lives in `docs/examples/sdd-profile-angular-nestjs-starter.md`. SDD-light (a reduced flow) is not part of this copy.

## Platform facts the design relies on

- Plugin agents ignore `permissionMode`, `hooks` and `mcpServers`. Read-only agents are read-only through `tools` / `disallowedTools`; the implementer runs in whatever permission mode the session has.
- `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` and `${CLAUDE_SKILL_DIR}` are substituted in skill and agent Markdown, but they are not in the environment of Bash commands. Scripts receive paths as arguments.
- Skills with `disable-model-invocation: true` (`run-plan`, `workflow-retro`) run only when typed and can't be preloaded by an agent.
- Whether an agent's `skills:` list preloads a skill from a dependency plugin by its namespaced name is not documented. The `namespaces` eval suite checks reachability; if preloading turns out not to work, agents still load the skills through the Skill tool.

## Coverage gate (1.1.0)

`spec-creator` doesn't finish a spec while a `must` story has no acceptance criterion: `write` and `revise` add one (with a `[NEEDS CLARIFICATION]` marker when the behaviour is open), and `approve` refuses even with the user's approval. `implementation-planner` already returns a `draft` spec as `SC1`, so an uncovered spec never reaches a plan. Checked by `evals/sdd-engineering/spec-approve-blocks-uncovered`. The 1.0.0 approve ran a self-check that also covered stories, but nothing made it binding and no report line named the gaps.

## Cost

`docs/COST-BASELINE.md`: the fixed spec-and-plan scenario costs $2.14 per successful run on 1.0.0. Removing the instructions `spec-creator` repeats from `ears-requirements` failed the quality gate (more revise rounds, one run without a plan) and did not ship; keep the writer-facing EARS rules in the prompt.

## Context cost

Measured with `claude plugin details sdd-engineering` on Claude Code 2.1.299: ~1,120 tokens always-on for 4 agents and 5 skills; on invoke from ~2.4k (`ux-design-review`) to ~7.7k (`spec-creator`). With its three dependencies, installing `sdd-engineering` adds ~2,300 tokens to every session.

## Before a release

1. `scripts/validate.sh`.
2. Load all four plugins: `claude --plugin-dir plugins/engineering-paved-path --plugin-dir plugins/research-tools --plugin-dir plugins/architecture-review --plugin-dir plugins/sdd-engineering`, then `claude plugin details <name>` for each.
3. `scripts/run-evals.sh namespaces` and `scripts/run-evals.sh sdd-engineering` (paid).
4. A manual chain on a small project: spec → plan → `/run-plan` → `/workflow-retro`.
5. Push the branch and run `scripts/try-install.sh sdd-engineering`; the three dependencies must install with it.

## 2.1.0 — rules from a run retro

A run with two feature slices in parallel worktrees showed four things:
- agents were fast, but the critical path went through human gates;
- a review suggestion that later turned out to be a user-visible bug was dropped by an up-front "fix only CRITICAL/WARNING" rule;
- the user's manual browser check found defects that tests and all three reviews missed;
- resumed `spec-creator` and planner agents cost more than fresh launches with report paths.

2.1.0 turns these into rules (see `CHANGELOG.md`). Still a note, not a rule: when a project runs slices in parallel worktrees, the lane prompt should pre-authorise its setup steps (sync with the main branch by merge, local env file, install, checks), so a lane doesn't sit waiting for a "go". That lives in the user's playbook, not in the plugin.

The cost-workflow eval (`docs/COST-BASELINE.md`) was not re-run for 2.1.0. The prompt changes add rules, they do not change model choices, and their cost effect is unmeasured.

