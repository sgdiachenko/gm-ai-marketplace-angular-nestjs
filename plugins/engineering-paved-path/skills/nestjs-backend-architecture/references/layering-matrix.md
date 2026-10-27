# Layering matrix

"May import" is what new code may import. `<orm>` is the project's persistence library and its Nest integration (for example `mongoose` with `@nestjs/mongoose`, TypeORM with `@nestjs/typeorm`, Prisma through a provider). Map the file kinds to the project's own names.

| Layer / file kind | May import | Must not import |
|---|---|---|
| Pure domain logic (function or class, no DI) | TypeScript, other pure domain code | `@nestjs/*`, `<orm>`, schemas / entities, DTOs, I/O (`node:fs`, HTTP clients), `process.env` |
| DTO (`dto/*.dto.ts`) | class-validator, class-transformer, `@nestjs/mapped-types` or `@nestjs/swagger` helpers, shared validators | `<orm>`, schemas / entities, services |
| Schema / entity | `<orm>` and its Nest integration | services, controllers, DTOs |
| Service | `@nestjs/common`, the ORM injection decorator and types, its own module's schema, DTOs, pure domain code, config, exported providers of other modules | controllers, other modules' schemas or internals |
| Guard / pipe / decorator / interceptor | `@nestjs/*`, config, auth contracts | `<orm>`, schemas / entities |
| Exception filter | `@nestjs/*`, domain error types | `<orm>` (map its errors in the service or a persistence adapter instead) |
| Controller | `@nestjs/*`, DTOs, its own service, guards, pipes, decorators | `<orm>`, schemas / entities |
| Module (`*.module.ts`) | everything it composes, the ORM `forFeature` registration of its own schemas | other modules' schemas |
| Shared code (`common/` or equivalent) | `@nestjs/*`, validation libraries | any feature module |
| Port (abstract class), when one exists | domain types | its implementations |
| Port implementation | the port, `<orm>` or the SDK it wraps | services, controllers |

## Cross-module rules

- A module uses another module only through providers that module `exports`.
- Shared code never imports a feature module.
- No module imports another module's schema or entity file.
- Frontend and backend never import each other's source; a shared contract is a separate package or a mirrored copy the project keeps in sync.

## Diagnosing a violation

| Symptom | Usually means | Fix |
|---|---|---|
| A controller imports the ORM's `Types` to parse an id | id conversion at the wrong layer | a pipe that validates the string, conversion in the service |
| A service injects another module's model | a missing exported provider | export a service method from the owning module and call it |
| `forwardRef` between two modules | a shared concern with no home | move it into a third module both import |
| A spec mocks five ORM calls to test one rule | the rule is buried in the service | extract it as a pure function and test it directly |
