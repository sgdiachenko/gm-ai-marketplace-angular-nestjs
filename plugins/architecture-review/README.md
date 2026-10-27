# architecture-review

A read-only `architecture-reviewer` agent that checks a diff for layering problems before a human reviewer has to: NestJS controllers or DTOs importing the ORM, business rules in controllers, a module registering another module's schema, Angular components calling `HttpClient`, features importing each other's internals, `shared/` importing a feature.

It reviews against **your** rules first — the project profile, `AGENTS.md`, architecture docs, and the linters you already configured (dependency-cruiser, ESLint boundary rules). Where you have none, it falls back to the `nestjs-backend-architecture` and `frontend-architecture` skills from `engineering-paved-path`.

## Install

```bash
claude plugin install architecture-review --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs
```

This also installs `engineering-paved-path`, which the agent depends on. `sdd-engineering` installs both. The repository is private: see the marketplace's `docs/installing.md` for git access.

## The `architecture-reviewer` agent

| | |
|---|---|
| Name | `architecture-review:architecture-reviewer` |
| Model | Sonnet |
| Tools | Read, Grep, Glob, read-only Bash, Skill |
| Preloaded skills | `engineering-paved-path:nestjs-backend-architecture`, `engineering-paved-path:frontend-architecture`, `engineering-paved-path:engineering-insights` |
| Writes | nothing |

### How to use it

```text
Use architecture-review:architecture-reviewer on all open changes.
Use architecture-review:architecture-reviewer on origin/main..HEAD.
Use architecture-review:architecture-reviewer: re-check F1 and F3 after my fix in src/orders/orders.service.ts.
```

Or @-mention it: `@agent-architecture-review:architecture-reviewer`.

With no scope, it reviews everything not yet on the default branch: committed, staged, unstaged and untracked changes.

### What it does

1. Reads your rule sources: `docs/sdd-profile.md` (*Architecture rules*), `AGENTS.md` / `CLAUDE.md`, architecture docs, linter configs.
2. Runs your architecture checks first, such as `npm run arch:check` or a dependency-cruiser script, and records exit codes. It never installs anything and never runs `--fix`.
3. Reviews the changed lines only, using the NestJS and Angular architecture checklists mapped onto your folders.
4. Returns findings and a verdict.

### Output

```text
# Architecture Review
## Scope            base, files, areas, rule sources read
## Mechanical checks  command · exit · result
## Findings         JSON array: severity, file, line, source, rule, summary, evidence, fix
## Verdict          approve | comment | request_changes
## Config vs documentation drift
## Not found / gaps
```

- `CRITICAL` needs a `file:line` in the diff, the changed line quoted, and a named rule; otherwise it is reported as `WARNING`.
- The verdict follows from the findings alone: any `CRITICAL` → `request_changes`; only `WARNING` / `SUGGESTION` → `comment`; none → `approve`.
- Pre-existing violations outside the changed lines, and entries in your linter's baseline, are not reported unless the diff makes them worse.

### Delta re-review

After a fix round, pass the earlier findings and the files you changed:

```text
Use architecture-review:architecture-reviewer.
Re-check: F1 server/src/orders/orders.controller.ts:42, F3 client/src/app/features/orders/order-list.ts:10
Fix files: server/src/orders/orders.controller.ts, server/src/orders/orders.service.ts
```

It marks each finding `fixed`, `still-open` or `moved`, and reviews only the changed lines of the fix files for new problems. `/sdd-engineering:run-plan` uses this mode in its review-fix loop.

## Tell it your rules

The agent works best when it knows where your rules and checks are. If you use `sdd-engineering`, fill in *Architecture rules* in `docs/sdd-profile.md`:

```markdown
## Architecture rules
- Sources: docs/architecture.md, server/eslint.config.mjs, client/eslint.config.js
- Checks: npm --prefix server run lint · npm --prefix client run lint
- Baseline: none
```

Without a profile it reads `AGENTS.md` and finds linter configs and `arch`/`lint` scripts on its own.

## Limits

- Static review only: it reads code and runs your checks; it doesn't run the app or the tests.
- It reviews architecture only. Correctness bugs belong to `/code-review`; security to `/security-review`.
- Read-only Bash is enforced by its prompt and its tool list (no Write or Edit), not by a sandbox.

## Releases

See [CHANGELOG.md](CHANGELOG.md).
