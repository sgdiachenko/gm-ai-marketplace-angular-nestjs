# Placement matrix

Paths are relative to the app's source folder (for an Angular CLI app, `src/app`). `<feature>` is a domain concept (`orders`, `invoices`), not a code type. Names follow the v20+ style guide (no type suffix); a project with its own convention keeps it.

| Need | Put it | Example |
|---|---|---|
| New routed page | `features/<feature>/<page>/` | `features/orders/order-list/order-list.ts` + `.html` + `.spec.ts` |
| Child presentational component | next to its parent, in the same feature | `features/orders/order-row/` |
| Generic UI used by 2+ features | `shared/ui/<name>/` | `shared/ui/button/` |
| Reusable form control | `shared/ui/form-fields/<name>/` | `shared/ui/form-fields/text-input/` |
| Form-only helpers (validators, messages) | `shared/forms/` once shared; beside the form before | `shared/forms/email-validator.ts` |
| HTTP client for one resource | `features/<feature>/<resource>-api.ts` | `features/orders/orders-api.ts` |
| Orchestration and view state | `features/<feature>/<name>.ts` service, or the project's controller / presenter | `features/orders/order-list-controller.ts` |
| State shared across features | `shared/state/<name>.ts` (or the project's store) | `shared/state/session-store.ts` |
| Pure domain rule | `features/<feature>/<rule>.ts`, no Angular imports | `features/orders/can-cancel-order.ts` |
| Table columns, labels | a `.const.ts` beside the consumer | `features/orders/order-table-columns.const.ts` |
| Domain types | `features/<feature>/models/<type>.ts` | `features/orders/models/order.ts` |
| Dialog input data | beside the dialog | `features/orders/cancel-dialog/cancel-dialog-data.ts` |
| Functional guard, interceptor, resolver | the owning feature | `features/auth/auth-guard.ts` |
| Build-time configuration | `environments/` or the project's config file | `environment.apiUrl` |

## Decision flow for a new piece of code

1. Does it render UI? Component. Routed: a page (container). Otherwise presentational.
2. Does it call HTTP? Only the feature's API service does.
3. Does it hold state other parts read? A service with private signals (or the project's store).
4. Does it need DI? Service. No DI: a pure function.
5. Is it a fixed value or a label? A `.const.ts` or `.enum.ts` file.
6. Is it a data shape? A model file, one type per file.
7. Is it used by a second feature? Move it to `shared/<topic>/` — not before.

## Mapping a presenter / controller pattern

When a project asks for MVP or MVVM ("the view only renders; a controller holds the logic"):

| Role | Here |
|---|---|
| View | the component class and template: inject the controller, bind its signals, forward events |
| Controller / presenter | an injectable class per view or per feature: view state as signals, actions as methods |
| Repository (optional) | maps API DTOs to the view's model and back |
| Gateway / API service | the only place that calls `HttpClient` |

Provide a per-view controller in the component's `providers` so it lives and dies with the view, and release resources through `DestroyRef`. Test the controller without rendering: construct it through `TestBed` with a fake API service.
