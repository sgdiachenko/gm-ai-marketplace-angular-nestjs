# Changelog

All notable changes to `sdd-engineering`. Versions follow [semver](https://semver.org):

- **patch** — wording and fixes in agents and skills that don't change what they write;
- **minor** — a new agent, skill, mode or profile field that existing projects can ignore;
- **major** — a renamed or removed agent or skill, a changed artifact format or path, a profile field that projects must update.

## 2.1.0 — 2026-10-29

Lessons from a multi-agent run: two feature slices in parallel worktrees, each running spec → plan → `/run-plan`, then a manual browser check by the user. The agents, models and phases are unchanged; these rules close gaps that the run's retro traced to the flow.

### Added

- Profile template: an optional *Stack versions* section. `spec-creator`, `implementation-planner` and `implementer` use it, when present, instead of reading package manifests one agent at a time.
- `implementation-planner` reads a saved `spec-creator` analysis report when the prompt names one, and reuses its repository facts.

### Changed

- `/run-plan` Phase 3:
  - a rule such as "fix only CRITICAL/WARNING" skips the suggestion question but still lists every `SUGGESTION` with a one-line user-visible impact;
  - a suggestion that leaves wrong or missing data in a `must` flow is triaged as a `WARNING`.
- `implementation-planner`: for a plan that changes a screen users see, *Review handoff → Manual verification* lists a browser smoke on seeded data through the main flow of each `must` story. "none" is only for plans with no user-visible change.
- `spec-creator` picks `verify:` from what agents may run. An AC that needs an action the profile's *Guardrails* forbid (seeding, migrations, destructive container commands) is `verify: manual`, and the self-check enforces it.
- `implementer` does its steps in the run it was launched for, so prompts no longer need "execute now, synchronously".
- `/run-plan` Phase 5: a run that adds or changes a command (dev server, seed, full-stack start, test script) updates the profile's *Modules* and *Live checks* in the same change.
- `/run-plan` Phase 4 browser tips: sign in from a separate browser profile or a private window, or sign out afterwards. `localhost` cookies are shared across ports, so a sign-in on one port replaces the user's session on the others.
- README: each `spec-creator` mode and planner pass 2 is a fresh launch with report paths, not a resume.

## 2.0.0 — 2026-10-27

First release in `gm-ai-marketplace-angular-nestjs`, the Angular + NestJS copy of `gm-ai-marketplace`. The workflow is unchanged: the same four agents with the same roles and models (`spec-creator` and `implementation-planner` on Opus, `implementer` and `plan-verifier` on Sonnet), the planner's two passes, `/run-plan` with its implementer waves, verification loop (≤ 2 rounds) and review-fix loop (≤ 3 rounds), and `/workflow-retro`.

### Changed

- The planner's default file-type → skill mapping, used when a profile has no *Skill lanes*, now names `angular-developer`, `frontend-architecture`, `nestjs-best-practices`, `nestjs-backend-architecture` and `security`. Profiles whose skill lanes name `react-best-practices`, `next-best-practices`, `fastify-best-practices`, `react-testing-library` or `onion-architecture` must be updated: those skills no longer exist.
- The planner flags DOM-measuring steps in Angular terms (`viewChild()`, `ElementRef`, `afterRenderEffect` across `@if` / `@defer`) for manual verification, and asks a `Q#` when a module that needs tests has no test command in the profile instead of inventing one.
- Examples in the agents, the profile template and `mermaid-diagram` use Angular and NestJS (npm scripts, `ng test --include`, NestJS request pipeline, MVP roles).
- Depends on `engineering-paved-path` `^2.0.0` and `architecture-review` `^2.0.0`; `research-tools` stays `^1.0.0`.

## 1.1.0 — 2026-10-14

### Added

- `spec-creator` coverage gate: a spec isn't finished while a `must` user story has no acceptance criterion. `write` and `revise` give every `must` story an AC, with a `[NEEDS CLARIFICATION]` marker and a blocking question when its behaviour is still open; `approve` refuses such a spec even with the user's approval and leaves it `draft`, so `implementation-planner` never receives it.
- A `Coverage: complete | incomplete — US-n (…)` line in every spec report, and `approval refused` as a report outcome. Existing report fields and the spec format are unchanged.
- `COMPATIBILITY.md`: the Claude Code versions and platform features the plugin relies on.

### Fixed

- README: pass 2 of `implementation-planner` needs the saved pass-1 report's path; without it the planner stops and asks for the `REC#` text.

## 1.0.0 — 2026-10-14

First release, ported from the team's in-repo workflow and made project-neutral.

### Added

- `spec-creator` agent: analyze, write, revise and approve modes; dated specs with EARS acceptance criteria, edge cases, NFRs, contracts, untrusted inputs and a traceability matrix; a spec registry.
- `implementation-planner` agent: two passes (spec conflicts, recommendations and execution mode; then the plan), work packages with non-overlapping owned paths for parallel implementers.
- `implementer` agent: executes a plan or one work package, writes the plan's tests, runs the project's checks, reports per step.
- `plan-verifier` agent: traceability matrix over requirements, constraints, steps and tests; re-runs checks unless the tree fingerprint matches; writes its report to a file.
- `/sdd-engineering:run-plan` skill: implementer waves, verification, architecture review with `/code-review` and optional `/security-review`, a bounded review-fix loop, closing the spec, the commit/PR gate; resumable state file.
- `/sdd-engineering:workflow-retro` skill: token, timing and launch metrics from session transcripts, judged findings, a report and a ledger row.
- `ears-requirements`, `ux-design-review` and `mermaid-diagram` skills used by the agents.
- Project profile (`docs/sdd-profile.md`) for paths, docs language, EARS keywords, modules and check commands, skill lanes, architecture rules and guardrails; template in `skills/run-plan/profile-template.md`.
- Dependencies: `engineering-paved-path`, `research-tools` and `architecture-review`, each `^1.0.0`.
