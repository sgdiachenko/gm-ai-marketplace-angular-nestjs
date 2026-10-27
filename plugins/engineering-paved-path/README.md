# engineering-paved-path

The team's default engineering practices for **Angular** frontends and **NestJS** APIs, as Claude Code skills: the Angular team's official `angular-developer` skill, NestJS practices, where files go on the frontend and the backend, how to review for security, and how to keep a project's `INSIGHTS.md`.

Claude loads a skill on its own when the task matches its description. Other plugins build on these skills: `architecture-review` and `sdd-engineering` declare this plugin as a dependency and call its skills by their namespaced names.

## Install

```bash
claude plugin install engineering-paved-path --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs
```

Or in a session: `/plugin install engineering-paved-path --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs`. Installing `architecture-review` or `sdd-engineering` installs this plugin too. The repository is private: see the marketplace's `docs/installing.md` for git access.

## Skills

| Skill | Use it for | Call it |
|---|---|---|
| `angular-developer` | Angular API usage: components, signals, `linkedSignal`, `resource` / `httpResource`, DI, routing, forms (Signal, reactive, template-driven), HTTP, SSR, ARIA, animations, styling, testing with Vitest and harnesses, CLI. The Angular team's official skill | `/engineering-paved-path:angular-developer` |
| `nestjs-best-practices` | NestJS bootstrap, modules and providers, controllers, DTO validation and pipes, guards, interceptors, errors, configuration, Mongoose or TypeORM, testing with `@nestjs/testing` | `/engineering-paved-path:nestjs-best-practices` |
| `frontend-architecture` | where an Angular file goes, feature folders and `shared/`, dependency direction, splitting components, where logic lives (services, controllers or presenters, pure functions) | `/engineering-paved-path:frontend-architecture` |
| `nestjs-backend-architecture` | NestJS layering (controller → service → persistence), dependency direction, when a repository or port is worth it, module boundaries | `/engineering-paved-path:nestjs-backend-architecture` |
| `security` | OWASP Top 10:2025 for Angular and NestJS: guards, validation, injection, Angular sanitization, CORS, JWT, secrets, logging; confidence-gated findings | `/engineering-paved-path:security` |
| `engineering-insights` | reading `INSIGHTS.md` before a task and appending a dated finding after one | `/engineering-paved-path:engineering-insights` |

You rarely need to type these. Ask for the work ("add an endpoint that cancels an order", "where should this controller live?", "review this diff for security issues") and Claude picks the matching skill.

### Using a skill from an agent or another plugin

Refer to the skill by its namespaced name. In an agent's frontmatter:

```yaml
skills:
  - engineering-paved-path:nestjs-backend-architecture
  - engineering-paved-path:engineering-insights
```

A plugin that does this declares the dependency in its `plugin.json`:

```json
"dependencies": [{ "name": "engineering-paved-path", "version": "^2.0.0" }]
```

## Your project's rules win

Every skill here gives defaults. A project's own `AGENTS.md` / `CLAUDE.md`, its architecture docs and its lint configs override them. The architecture skills describe reference layouts (feature folders and `shared/` in the Angular app; one module per domain feature in the NestJS API). Map them to your folders, or tell Claude where your rules live. When a project prescribes its own pattern, such as MVP or MVVM with a controller per view, `frontend-architecture` maps its roles onto that pattern rather than replacing it.

For `sdd-engineering` users: list the skills each part of your codebase should follow under *Skill lanes* in `docs/sdd-profile.md`.

## Limits

- The stack skills target TypeScript web projects: Angular (v20+ conventions; `angular-developer` checks the installed version first) and NestJS (written against Nest 12; version-sensitive points say so).
- `angular-developer` tells Claude to run `ng build` after generating code. In a project with an SDD profile, the profile's check commands decide what runs.
- Skills advise; they don't block anything. Enforcement comes from your linters and CI.
- Skill descriptions load into every session; a skill's body loads only when it fires. Check the cost with `claude plugin details engineering-paved-path`.

## Credits

- `angular-developer` is by the Angular team (Google LLC), from [angular/skills](https://github.com/angular/skills) (generated from `skills/dev-skills/` in [angular/angular](https://github.com/angular/angular)), under the MIT License. Unchanged; see its `NOTICE.md` and `LICENSE`.
- `frontend-architecture` and `nestjs-backend-architecture` are generalized from a project's own harness skills; `nestjs-best-practices` and `security` were written for this plugin from the sources they list.

## Releases

See [CHANGELOG.md](CHANGELOG.md).
