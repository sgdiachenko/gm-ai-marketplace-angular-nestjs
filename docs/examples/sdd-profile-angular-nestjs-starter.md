# Example SDD profile: Angular `client/` + NestJS `server/` starter

A filled-in `docs/sdd-profile.md` for a training starter with an Angular 22 app in `client/` and a NestJS 12 + Mongoose API in `server/`, MongoDB in Docker Compose, and no tests yet. It was written against [`sgdiachenko/reaktivate-fast-test-homework-angular-nestjs`](https://github.com/sgdiachenko/reaktivate-fast-test-homework-angular-nestjs) at `8241179`.

- Every command comes from `client/package.json` or `server/package.json`; flags are passed to existing scripts only. Where a script doesn't exist, the cell says `none yet` instead of inventing one.
- Checked on 2026-10-27 in that starter: `npm --prefix client run build` → exit 0; `npm --prefix server run build` → exit 0; `npm --prefix client test -- --watch=false` → exit 1 with `No tests found matching the following patterns` (expected until the first `*.spec.ts` exists); `server` has no `test` script.
- The profile is not committed to the starter. To use it, copy everything below the line into `docs/sdd-profile.md` in the starter, or pass `Profile: <path>` to the agents.

---

# SDD profile

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

## Modules

| Module | Path | Package manager | Full checks (what CI runs) | Targeted tests |
|---|---|---|---|---|
| client | client/ | npm | `npm --prefix client run build` · `npm --prefix client test -- --watch=false` | `npm --prefix client test -- --watch=false --include <globs relative to client/src/>` |
| server | server/ | npm | `npm --prefix server run build` | none yet — `server/package.json` has no `test` script |

- No module has a `lint` or type-check script; `ng build` and `nest build` type-check the code.
- The starter has no CI; "full checks" are the commands above.
- **Tests are written during the task.** Until the first `client/src/**/*.spec.ts` exists, `npm --prefix client test -- --watch=false` exits 1 with `No tests found`; that is expected, not a regression. The client test stack is already installed: `ng test` runs Vitest through `@angular/build:unit-test` in jsdom, with `vitest/globals` types (`client/tsconfig.spec.json`).
- **Server tests need a runner first.** `server/` has no test runner. If a plan needs server tests, adding one is an install — the user decides (for an ESM NestJS 12 project the CLI default is Vitest with `unplugin-swc`, plus `@nestjs/testing` and `supertest` for e2e), and the new `test` script is then added to this table. Agents never add it on their own.

Tests that need infrastructure (not run by implementers unless it is up):

- none yet. Future server e2e tests need MongoDB from `docker compose up -d --wait` (check with `docker compose ps`) and a seeded database (`npm --prefix server run seed`, which the user runs).

## Skill lanes

| Files | Skills |
|---|---|
| `client/src/app/**/*.{ts,html,css}` | `engineering-paved-path:angular-developer`, `engineering-paved-path:frontend-architecture` |
| `client/src/app/**/*.spec.ts` | `engineering-paved-path:angular-developer` |
| `client/src/app/shared/api-gateway.ts` | `engineering-paved-path:angular-developer`, `engineering-paved-path:security` |
| `server/src/**/*.controller.ts` | `engineering-paved-path:nestjs-best-practices`, `engineering-paved-path:nestjs-backend-architecture`, `engineering-paved-path:security` |
| `server/src/**` | `engineering-paved-path:nestjs-best-practices`, `engineering-paved-path:nestjs-backend-architecture` |

## Architecture rules

- Sources: `TASK.md` (*Refactoring target: architecture pattern* and *Appendix: code style* — they take precedence over the paved-path defaults for `client/`), `README.md` (*API*: the contract of `/v1/books/:user`)
- Checks: none — neither package has a lint or boundary-check script, so layering is reviewed by convention
- Baseline of known violations: none

## Guardrails

Built in for every agent: no commits, pushes or PRs; no installs; no migrations or seeds; no destructive container commands. Add your own:

- Forbidden commands: `docker compose down -v` (deletes the MongoDB volume), `npm --prefix server run seed`, `npm install` / `npm ci` / `npm audit fix` in either package, `ng update`
- Do-not-touch paths: `TASK.md`, `docker-compose.yml`, `server/src/seed.ts`, `client/package.json`, `client/package-lock.json`, `server/package.json`, `server/package-lock.json` (dependency changes go through the user)
- The HTTP contract in `README.md` → *API* (routes, status codes, response shapes) changes only when the spec says so

## Live checks

- Manual verification may call paid or credentialed services: no (everything is local; MongoDB has no credentials)
- Run the app for manual checks: `docker compose up -d --wait`, then `npm --prefix server run start:dev` (API on http://localhost:3000) and `npm --prefix client start` (app on http://localhost:4200). The database must be seeded once by the user.
