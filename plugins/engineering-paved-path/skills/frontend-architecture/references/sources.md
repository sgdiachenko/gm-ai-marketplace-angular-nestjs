# Sources

Checked 2026-10-23 against the Angular 22.x docs.

## Official
- Angular style guide: https://angular.dev/style-guide (feature grouping, colocated specs, no generic file names, one concept per file, `inject()`)
- Angular best practices for AI: https://angular.dev/ai/develop-with-ai (signals, OnPush, lazy routes, Signal Forms)
- Creating and using services: https://angular.dev/guide/di/creating-and-using-services
- Defining dependency providers: https://angular.dev/guide/di/defining-dependency-providers
- Route guards: https://angular.dev/guide/routing/route-guards
- Component inputs: https://angular.dev/guide/components/inputs
- Content projection: https://angular.dev/guide/components/content-projection
- Resource API: https://angular.dev/guide/signals/resource
- Effects, and when not to use them: https://angular.dev/guide/signals/effect
- Signal Forms: https://angular.dev/guide/forms/signals/overview
- Testing: https://angular.dev/guide/testing

## Community (older than 2024, use with care)
- M. Steyer, NgRx Signal Store and your architecture (2023-12): https://www.angulararchitects.io/?p=23822
- M. Steyer, Strategic design with Sheriff (2023-07): https://www.angulararchitects.io/en/?p=7366
- M. Steyer, Angular Signals and your architecture, 5 options (2023-05): https://www.angulararchitects.io/blog/angular-signals-your-architecture-5-options

## Enforcement tools
- ESLint `no-restricted-imports`: https://eslint.org/docs/latest/rules/no-restricted-imports
- eslint-plugin-boundaries: https://github.com/javierbrea/eslint-plugin-boundaries
- Sheriff (module boundaries for TypeScript and Angular): https://github.com/softarc-consulting/sheriff
- dependency-cruiser: https://github.com/sverweij/dependency-cruiser

## Caveats
- No official guidance exists for where to put constants, mappers, validators or models; those rows are conventions, and a project's own rules replace them.
- Suffix-less naming follows the v20+ style guide; older guides (v18/v19) used `.component` / `.service` suffixes, and existing projects often keep them.
- A state library is optional: the official guides use signals in services; a project that already uses one (for example NgRx SignalStore) keeps it.
