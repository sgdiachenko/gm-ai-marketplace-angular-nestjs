# SDD profile

<!--
Project profile for the sdd-engineering plugin. Save it as docs/sdd-profile.md in your project
(or point agents at another path with a "Profile: <path>" line in the prompt).
Agents read it instead of guessing project paths, commands and rules. Keep the headings;
delete the example rows and write your own. A section you leave empty falls back to the default
noted in it; a missing check command is never guessed — the agents ask instead.
-->

## Paths

| What | Path |
|---|---|
| Specs | docs/specs/ |
| Plans and run state | docs/plans/ |
| Retros | docs/retros/ |
| Design images | docs/design/ |

## Language

- Docs language: English
- EARS keywords: WHEN / WHILE / IF … THEN / WHERE

<!-- To write specs in another language, set the docs language and list the four keywords translated into it, in the same order. -->

## Modules

| Module | Path | Package manager | Full checks (what CI runs) | Targeted tests |
|---|---|---|---|---|
| api | apps/api/ | npm | `npm --prefix apps/api run lint` · `npm --prefix apps/api run build` · `npm --prefix apps/api test` | `npm --prefix apps/api exec vitest run <files>` |
| web | apps/web/ | npm | `npm --prefix apps/web run lint` · `npm --prefix apps/web run build` · `npm --prefix apps/web test -- --watch=false` | `npm --prefix apps/web test -- --watch=false --include <globs relative to src/>` |

<!-- Only commands that exist in the module's package.json (or its CI config). A module with no test or lint script
gets "none yet" in that cell: agents never invent a script, and the planner asks how tests will be added
(adding a test runner is an install, which is the user's decision). -->

Tests that need infrastructure (not run by implementers unless it is up):

- `apps/api/test/**/*.e2e-spec.ts` — needs a database (`docker compose ps`)

## Skill lanes

Which skills govern which files. Implementers load these for every file they touch.

| Files | Skills |
|---|---|
| `apps/web/src/app/**/*.{ts,html}` | `engineering-paved-path:angular-developer`, `engineering-paved-path:frontend-architecture` |
| `apps/web/src/app/**/*.spec.ts` | `engineering-paved-path:angular-developer` |
| `apps/web/src/app/**/*{guard,interceptor}*.ts` | `engineering-paved-path:angular-developer`, `engineering-paved-path:security` |
| `apps/api/src/**/*.controller.ts`, `apps/api/src/**/dto/**` | `engineering-paved-path:nestjs-best-practices`, `engineering-paved-path:nestjs-backend-architecture`, `engineering-paved-path:security` |
| `apps/api/src/**` | `engineering-paved-path:nestjs-best-practices`, `engineering-paved-path:nestjs-backend-architecture` |
| `apps/api/**/*.spec.ts`, `apps/api/test/**` | `engineering-paved-path:nestjs-best-practices` |

## Architecture rules

- Sources: docs/architecture.md, apps/api/eslint.config.mjs, apps/web/eslint.config.js
- Checks: `npm --prefix apps/api run lint` · `npm --prefix apps/web run lint`
- Baseline of known violations: none

## Guardrails

Built in for every agent: no commits, pushes or PRs; no installs; no migrations or seeds; no destructive container commands. Add your own:

- Forbidden commands: `npm --prefix apps/api run seed`, `docker compose down -v`
- Do-not-touch paths: `apps/api/src/generated/`, `infra/`

## Live checks

- Manual verification may call paid or credentialed services: no
- Run the app for manual checks: `npm --prefix apps/api run start:dev` (API on http://localhost:3000), `npm --prefix apps/web start` (web on http://localhost:4200)
