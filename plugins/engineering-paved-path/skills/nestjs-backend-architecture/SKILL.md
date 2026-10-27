---
name: nestjs-backend-architecture
description: "NestJS backend architecture: layering, dependency direction and code placement. Use when adding or changing a module, controller, service, DTO, schema or entity, guard, pipe, filter, config or business rule, when deciding whether a repository or port is worth adding, or when reviewing backend structure and imports. Structure and boundaries only; Nest API usage is engineering-paved-path:nestjs-best-practices."
metadata:
  tags: nestjs, backend, architecture, layering, onion, clean-architecture, ports-and-adapters
---

# NestJS backend architecture

This skill answers two questions about a NestJS API, and only these:

1. **Which layer does this code belong to, and where does the file go?**
2. **Is this import allowed?**

How to write a controller, pipe, guard or test belongs to `engineering-paved-path:nestjs-best-practices`. Import matrix: [references/layering-matrix.md](references/layering-matrix.md). Sources: [references/sources.md](references/sources.md).

## Project rules win

The project's `AGENTS.md`, architecture docs and ADRs, the SDD profile (`docs/sdd-profile.md`) and its lint configuration override every default here. Map the layers below to the project's real folders before judging an import; when the project already uses repositories, ports or CQRS, keep using them.

Rules apply to **new** code. Existing code is not refactored as a side effect of other work.

## The principle

From Onion and Clean architecture, one rule is kept: **source dependencies point inward, and inner code never imports outer code.** The full ring structure — domain entities separate from persistence models, repositories and mappers for every aggregate — is **not** the default: for CRUD-sized modules it is ceremony. Add it where a real invariant or a second implementation needs it.

## Layers

```
presentation   controller · DTO · guard · pipe · interceptor · filter
      ↓
application    service (use case): orchestration, authorization, domain rules via pure functions
      ↓
persistence    schema / entity + the ORM's Nest integration (an injected model or repository)

pure domain    framework-free functions and value objects; any layer may call them, they call nothing outward
composition    *.module.ts files: wire providers; Nest's DI container is the composition root
```

## Severity for reviewers

- **CRITICAL** — an import against the direction above (a controller or DTO importing the ORM or a schema; a pure domain file importing `@nestjs/*` or the ORM), or a break of a boundary the project's linter enforces.
- **WARNING** — business rules in a controller, a module registering another module's schema, `process.env` read outside configuration, an unscoped owner query.
- **SUGGESTION** — placement or naming that hurts navigability but breaks no rule.

## Rules for new code

1. **Direction.** A controller calls a service; a service calls the persistence API. Controllers, DTOs, guards and pipes don't import the ORM, `@nestjs/<orm>` or schema / entity files — only services and `*.module.ts` do.
2. **No repository by default.** A service with the ORM's injected model or repository is the documented Nest path. Add a port only for a real second implementation or a test seam you need; then declare it as an abstract class (it doubles as the injection token) inward, and bind the implementation in the module.
3. **Business rules are explicit.** A rule beyond a field check (ownership, eligibility, uniqueness, a state transition) is a named function or class with no Nest or ORM imports and no I/O or `process.env`, beside its service, with a unit test. It receives its data as arguments; the service orchestrates it.
4. **Ownership is in the query.** Every owner-scoped read and write filters by the caller's identity (from the route or the authenticated principal) in the query itself, not by filtering results afterwards.
5. **DTOs at the edge.** Request DTOs are classes validated by the global pipe; ids are strings in DTOs, converted in the service. Endpoints return explicit response shapes (plain objects or response DTOs), not ORM documents or entities, so internal fields don't leak.
6. **Configuration.** Read settings through the config module, validated at startup; no new `process.env` reads outside it.
7. **Modules follow the domain.** One module per domain feature: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, its schema or entity, `dto/`, plus `guards/` or `decorators/` when needed. Share through `exports` of a provider, not by registering another module's schema. Avoid `forwardRef`; a cycle means a missing third module or a misplaced provider. No barrel `index.ts` for modules or providers.
8. **Contexts don't share persistence.** Data crosses a module boundary as ids or plain contract types, never as another module's schema class or model.
9. **Errors.** Throw Nest's built-in `HttpException` subclasses (`NotFoundException`, `ForbiddenException`) or a domain error that one exception filter maps. Another user's resource returns 404, not 403, unless the project decided otherwise.
10. **Tests.** A `*.spec.ts` beside each service and controller with logic; test pure domain functions directly rather than mocking ORM calls; end-to-end tests in the project's e2e folder against a real database when the project has one.
11. **Contracts are kept.** Collection or table names, model names and response shapes that clients or data depend on change only through a planned migration the user agreed to.

## Review checklist

1. Does any changed import point outward: a controller, DTO, guard or pipe importing the ORM or a schema, or a pure domain file importing Nest? (blocking)
2. Is a business rule inline in a controller, or in a service where a named pure function belongs?
3. Does every owner-scoped query filter by the caller's identity?
4. Does a new endpoint return a response shape rather than an ORM document?
5. Any new `process.env`, repository, port, mapper or `forwardRef` without a stated reason?
6. Does a module register another module's schema, or import another module's internals instead of an exported provider?
7. Is there a spec beside the new logic, and are pinned contracts unchanged?
8. Do the project's lint and boundary checks pass? Run the commands its profile or `AGENTS.md` lists.

## Enforcement

Cross-module rules are enforceable with ESLint `no-restricted-imports` overrides per folder, `eslint-plugin-boundaries` or dependency-cruiser. Rules the project's linter doesn't check are conventions; adding a check is a separate, reviewed change.
