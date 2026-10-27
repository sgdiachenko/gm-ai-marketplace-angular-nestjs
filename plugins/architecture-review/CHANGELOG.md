# Changelog

All notable changes to `architecture-review`. Versions follow [semver](https://semver.org): a change to the findings format that callers parse, or to the agent's name, is a major release.

## 2.0.0 — 2026-10-27

First release in `gm-ai-marketplace-angular-nestjs`, the Angular + NestJS copy of `gm-ai-marketplace`. The findings format and the agent's name are unchanged; its default rules changed with the stack, so existing callers should expect different findings.

### Changed

- Preloads `engineering-paved-path:nestjs-backend-architecture` instead of `onion-architecture`; the backend review maps files to NestJS layers (controller, service, persistence, pure domain, modules).
- Loads `engineering-paved-path:nestjs-best-practices` or `engineering-paved-path:angular-developer` only when a finding depends on framework wiring; the Next.js App Router rule is gone.
- Depends on `engineering-paved-path` `^2.0.0`.

## 1.0.0 — 2026-10-14

### Added

- `architecture-reviewer` agent: read-only review of a diff for dependency direction, layering, ports and DI, and frontend module boundaries. Runs the project's architecture checks first, then a manual pass on changed lines; returns findings as JSON with a verdict. Supports delta re-review of earlier findings.
- Depends on `engineering-paved-path` `^1.0.0` for `onion-architecture`, `frontend-architecture`, `next-best-practices` and `engineering-insights`.
