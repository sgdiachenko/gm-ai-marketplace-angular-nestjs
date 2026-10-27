# Changelog

All notable changes to `engineering-paved-path`. Versions follow [semver](https://semver.org): a new skill is a minor release, a removed or renamed skill is a major one.

## 2.0.0 — 2026-10-27

First release in `gm-ai-marketplace-angular-nestjs`, the Angular + NestJS copy of `gm-ai-marketplace` (forked from its `main` at `be94e42`). The stack skills now target Angular and NestJS instead of React, Next.js and Fastify.

### Added

- `angular-developer`: the Angular team's official skill from `angular/skills` at `46e60f9`, unchanged, MIT, with `LICENSE` and `NOTICE.md`. Replaces the React and Next.js skills for Angular API usage, including testing.
- `nestjs-best-practices`: NestJS bootstrap, providers, controllers, validation and pipes, guards, interceptors, errors, configuration, persistence, logging, lifecycle and testing. Written for this plugin from the NestJS docs. Replaces `fastify-best-practices`.
- `nestjs-backend-architecture`: NestJS layering, dependency direction and placement; repositories and ports only for a real need. Generalized from a project's harness skill. Replaces `onion-architecture` as the backend default.

### Changed

- `frontend-architecture`: rewritten for Angular, generalized from a project's harness skill: feature folders and `shared/`, the `app → features → shared` direction, where each kind of file goes, component splitting, where business logic lives, mapping onto MVP / MVVM controllers. No product names, paths, Nx commands, glossary or required state library.
- `security`: examples, checklists and stack notes for Angular and NestJS (guards, `ValidationPipe`, Angular sanitization and `bypassSecurityTrust*`, interceptors, throttling) instead of React and Express. The OWASP JWT cheat sheet link points to its current URL.

### Removed

- `react-best-practices`, `next-best-practices`, `react-testing-library`: use `angular-developer`.
- `fastify-best-practices`: use `nestjs-best-practices`.
- `onion-architecture` and its dependency-cruiser config: use `nestjs-backend-architecture`, which keeps the inward dependency rule without the full ring layout.

## 1.0.0 — 2026-10-14

### Added

- `react-best-practices`: component design, state, hooks, performance and data fetching, with severity levels and examples.
- `next-best-practices`: App Router conventions, Server/Client boundaries, async request APIs, data and caching, errors, metadata, images, hydration. Written for this plugin; it defers to the Next.js docs bundled with the installed version.
- `fastify-best-practices`: Matteo Collina's Fastify skill (MIT), unchanged except for a shorter description.
- `frontend-architecture`: where frontend files go and which module may import which.
- `onion-architecture`: backend rings, the dependency rule, ports, use cases, the composition root, and a dependency-cruiser config for a reference layout.
- `react-testing-library`: user-flow tests with React Testing Library and Vitest.
- `security`: OWASP Top 10:2025 practices with confidence-gated review.
- `engineering-insights`: reading and appending to `INSIGHTS.md`.
