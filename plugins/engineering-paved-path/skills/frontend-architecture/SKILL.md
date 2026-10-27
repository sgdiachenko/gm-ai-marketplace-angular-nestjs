---
name: frontend-architecture
description: "Angular frontend architecture: where new code goes, how to split it and which folder may import which. Use when adding or moving a component, routed page, dialog, service, state holder, constant, enum, util, model, form, guard, interceptor or route, when deciding whether to split a component, or when reviewing frontend structure. Placement and layering only; Angular API usage is engineering-paved-path:angular-developer."
metadata:
  tags: angular, frontend, architecture, placement, feature-folders, boundaries
---

# Frontend architecture (Angular)

This skill answers three questions about an Angular app, and only these:

1. **Where does this file go?**
2. **Is this import allowed?**
3. **Should this component be split, and where does its logic go?**

How to write the code — signals, `inject()`, forms, routing, HTTP, testing — belongs to `engineering-paved-path:angular-developer`. Placement: [references/placement-matrix.md](references/placement-matrix.md). Sources: [references/sources.md](references/sources.md).

## Project rules win

The project's `AGENTS.md`, architecture docs, the SDD profile (`docs/sdd-profile.md`) and its lint configuration override every default here. When the project prescribes a pattern — MVP or MVVM with a controller or presenter per view, a facade per feature, a state library — use it and map the roles below onto it. Map the reference folders (`features/`, `shared/`) to the project's real ones before judging an import. Never ask a project to restructure to match this skill.

Rules apply to **new** code. Existing files are not renamed, moved or restructured as a side effect of other work; editing an existing file keeps its name and style.

## Severity for reviewers

- **CRITICAL** — breaks the dependency direction below or a boundary the project's linter enforces.
- **WARNING** — HTTP or business rules in a component, a feature reaching into another feature's internals, logic driven by `effect`.
- **SUGGESTION** — placement, naming or file size that hurts navigability but breaks no rule.

## Dependency direction (CRITICAL)

**Imports flow one way: `app shell → features → shared`.**

- `shared/**` may be imported by anyone. It imports only other `shared/**` code and libraries — never a feature.
- `features/<feature>/**` may import `shared/**`. It does not import another feature's internals. Two features that need the same thing move it down into `shared/`, or are composed by the app shell or the router.
- The app shell (`app.config.ts`, `app.routes.ts`, the root component) composes features and shared code. Nothing imports it.

**The delete test:** removing a feature folder should break only the routes that load it. If unrelated features break too, a boundary leaked.

When the project has a boundary linter (ESLint `no-restricted-imports` zones, `eslint-plugin-boundaries`, Sheriff, dependency-cruiser), its rule names are the rules; cite them. Without one, the direction is a convention; adding enforcement is a separate, reviewed change.

## Rules for new code

1. **Feature-first.** Group by feature (`features/<feature>/` or the project's equivalent), never by code type. No top-level `components/`, `services/`, `utils/`, `helpers/` folders.
2. **Colocate.** A unit's `.ts`, template, styles and `.spec.ts` share a folder and a base name. Every logic-bearing unit gets a spec beside it.
3. **Place by consumers.** One feature uses it: keep it in that feature. A second feature needs it: move it to `shared/<topic>/` then, not before.
4. **One concept per file**, named after its main identifier in kebab-case. Never `utils.ts`, `helpers.ts`, `common.ts`, `constants.ts`, `types.ts`.
5. **Naming.** Follow the project's existing convention. Without one, follow the Angular style guide for the installed version: from v20 the CLI generates files without a type suffix (`book-list.ts` → `BookList`) and the class name carries the role. Keep `.spec.ts`.
6. **Where each kind goes:**

| Kind | Location |
|---|---|
| Routed page | its own folder in the feature; lazy-loaded from the routes |
| Presentational component | the owning feature's folder, or `shared/ui/<name>/` when generic |
| Dialog | component + its data type (+ form) in one folder |
| HTTP calls | one API service (or gateway) per backend resource — nothing else calls `HttpClient` |
| Orchestration | a feature service, controller or presenter: calls the API service, updates state, exposes view state |
| State | private writable signals in a service, exposed read-only; a state library only when the project already uses one |
| Pure domain logic | an exported function beside its consumer, no Angular imports, unit-tested |
| Constants, enums | a narrowly scoped file beside the consumer (`<name>.const.ts`, `<name>.enum.ts`, or the project's suffixes) |
| Models / DTOs | one type per file in the feature (`models/` or `contracts/`, as the project names it) |
| Form model and validation | beside the form; validation rules in one schema or validator set |
| Injection tokens | `<name>.token.ts`, plus a `provideX()` function when configurable |
| Guards, interceptors, resolvers | functional, in the feature that owns them |
| Routes | `app.routes.ts` with lazy `loadComponent` / `loadChildren`; a `<feature>.routes.ts` once a feature has several routes |

## Business logic

- **Components present.** They bind inputs and outputs, forward events, and read view state. They hold no HTTP calls and no domain rules.
- **Logic that needs DI** lives in a service (or the project's controller / presenter). **Logic that needs no DI** is a pure function.
- **Derive, don't copy.** View state is `computed` from source signals; don't mirror state into a second writable signal.
- **Don't drive business logic from `effect`.** Effects are for syncing with the outside (storage, logging, third-party DOM). Actions are explicit method calls.
- **Encapsulate state.** Writable signals are private; expose `asReadonly()` or `computed`; mutate through named methods.
- **Domain language.** Name features, files, types and UI strings after the domain concept, with one term per concept, as the project already uses it. A business rule beyond a field check is a named, framework-free function with a unit test; services call it.

## Splitting components

Split when one of these holds: the component has more than one responsibility; the template is long or deeply nested (roughly 150+ lines); a `@for` item has its own logic; a part is reused or worth testing alone. Don't split only to shrink a file.

- **Container** (routed page or smart parent): injects the services or controller, passes data down, handles outputs.
- **Presentational**: `input()`, `output()`, `model()` only — no service with state, no HTTP.
- Shared UI is generic: no domain names, no feature imports.

## Review checklist

1. Does any changed import point against the direction above, or cross into another feature's internals? (blocking)
2. Does a component call `HttpClient`, hold a business rule or drive logic from `effect`?
3. Is the new file in the owning feature, or in `shared/` with two or more consumers?
4. One concept per file, no generic file name, a spec beside every logic-bearing unit?
5. Are writable signals private and view state derived with `computed`?
6. Do the project's lint and boundary checks pass? Run the commands its profile or `AGENTS.md` lists.
