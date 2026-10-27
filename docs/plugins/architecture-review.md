# architecture-review — maintainer notes

One agent, `architecture-reviewer`. Depends on `engineering-paved-path` `^2.0.0` (preloads `nestjs-backend-architecture`, `frontend-architecture`, `engineering-insights`; loads `nestjs-best-practices` or `angular-developer` on demand, only for findings about framework wiring). `sdd-engineering` depends on it and runs it in `/run-plan`'s review phase. Spec: `specs/sdd-engineering.md`.

## Origin

`sgdiachenko/dev-digest` at `1b694bc41a61`, `.claude/agents/architecture-reviewer.md`. Changes:

- **Rule sources** instead of dev-digest's hardcoded ones: the project profile's *Architecture rules*, then `AGENTS.md` and architecture docs, then the project's linter configs (for real rule names), then the paved-path skills as defaults;
- **Checks** come from the profile, or from existing `arch` / `lint` / `depcruise` package scripts; dev-digest's `pnpm -C server arch:check`, `check-shared-sync.sh` and `gate.sh` are gone;
- **Finding schema and severity rules inlined**, since dev-digest's `pr-self-review` (`report.md`, `severity.md`) isn't ported; the `skill` field became `source`;
- the known-violation list moved from a dev-digest file to "the project's baseline";
- the Skill tool is enabled so it can load other skills by namespaced name.

In 2.0.0 (this copy) the backend default moved from the onion ring map to NestJS layers (controller, service, persistence, pure domain, modules); the findings format, verdict rule and delta mode are unchanged.

## Evals

`evals/architecture-review/` holds four cases on an Angular `client/` and a NestJS `server/`: a harmless rename, a Nest import in a pure rule plus a Mongoose model in a controller, filesystem and `process.env` access in a pure rule, and a `shared/` component importing a feature and calling `HttpClient`. Run with `scripts/run-evals.sh architecture-review` before a release; no run on these fixtures is recorded yet.

## Context cost

`claude plugin details architecture-review` on Claude Code 2.1.311 (2.0.0, installed through the plugin cache): ~108 tokens always-on, ~1.8k on invoke, plus the three preloaded skills (~3.7k).

## Compatibility

`/run-plan` parses the findings JSON (`severity`, `file`, `line`, `rule`) and the verdict, and uses the delta re-review mode (`Re-check:`, `Fix files:`). Changing those is a major release.
