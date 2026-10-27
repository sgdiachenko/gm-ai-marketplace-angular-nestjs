---
name: nestjs-best-practices
description: "NestJS API practices: bootstrap, modules and providers, controllers, DTO validation and pipes, guards, interceptors, exception handling, configuration, Mongoose or TypeORM integration, logging, lifecycle and testing with @nestjs/testing. Use when writing, reviewing or debugging NestJS server code or its tests. Checks the installed Nest version and module system first."
metadata:
  tags: nestjs, nodejs, typescript, backend, api, validation, testing
---

# NestJS best practices

Framework usage for a NestJS API. Where files go and which layer may import which belongs to `engineering-paved-path:nestjs-backend-architecture`; security review to `engineering-paved-path:security`. Written for this plugin from the official docs (sources at the end). Where this skill and the docs for the installed version disagree, the docs win.

## Severity levels

- **CRITICAL** — breaks correctness or security: unvalidated input reaching a query, an exception swallowed into a 200, a guard that fails open.
- **HIGH** — breaks the framework's contract: bypassing the response pipeline, a hidden scope change, configuration read before validation.
- **MEDIUM** — maintainability and testability.

## 0. Check the project first

- **Version.** Read `@nestjs/core` in `package.json`. Nest 12 needs Node.js 20.19+ or 22.12+ to run (the CLI's schematics need newer); its packages ship as ESM.
- **Module system.** `"type": "module"` with `"module": "nodenext"` means ESM: relative imports end in `.js` (`import { X } from './x.js'`) and there is no `__dirname`. A CommonJS project stays CommonJS; don't convert it as a side effect.
- **What is installed.** `class-validator`, `class-transformer`, `@nestjs/testing`, a test runner, `helmet`, `@nestjs/throttler`: use what the project has. Adding a package is a dependency change the user approves, not a step you take on your own.
- **Scripts.** Use the project's own `build`, `test`, `lint` scripts. Don't assume `npm test` exists.

## 1. Bootstrap (`main.ts`)

- Apply app-wide behaviour in one place: global pipes, CORS, prefix or versioning, shutdown hooks. Put it in a function (`configureApp(app)`) that end-to-end tests call too, so tests run the same pipeline as production. (HIGH)
- **CORS** with an explicit origin from configuration; never `origin: '*'` or `origin: true` together with credentials. (CRITICAL when credentials are on)
- `app.enableShutdownHooks()` when providers hold connections or timers.
- Read the port and settings through `ConfigService`, not `process.env`.

## 2. Modules and providers

- Providers are **singletons** by default. `Scope.REQUEST` cascades to every consumer and costs a construction per request; use it only for real per-request state. (HIGH)
- Constructor injection with `private readonly`. Inject non-class values through an `InjectionToken`-style constant and `@Inject(TOKEN)`; for a swappable implementation use an abstract class as the token.
- Configure third-party modules with `forRootAsync({ inject: [ConfigService], useFactory })` so they read validated configuration.
- `@Global()` only for genuinely app-wide infrastructure (configuration, logging). A feature module exports what others may use and nothing else.
- A circular import (`forwardRef`) is a design smell; split the shared part into its own module. (MEDIUM)

## 3. Controllers

- Thin: bind route, params, body and status; call one service method; return a plain object. No queries, no business rules. (HIGH)
- **Status codes.** `POST` defaults to 201; set `@HttpCode(HttpStatus.OK)` when the contract says 200. Keep the response shape the contract documents.
- **Don't inject `@Res()`** to send responses: it switches off interceptors and serialization for the route. If you need the response object, use `@Res({ passthrough: true })`. (HIGH)
- Route params are strings. Parse and validate them with a pipe (`ParseIntPipe`, `ParseUUIDPipe`, or a project pipe) before they reach the service.
- Prefer one versioning style for the whole API: a path segment in `@Controller('v1/…')` or `app.enableVersioning({ type: VersioningType.URI })`.

## 4. Validation and DTOs

- Validate **every** body, query and param before use. With `class-validator` installed, register one global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` and `transform: true`, and describe input as DTO classes (`@IsString()`, `@IsNotEmpty()`, `@MaxLength()`; `@ValidateNested()` with `@Type(() => Child)` for nested objects). (CRITICAL)
- Without `class-validator`, validate in a dedicated pipe or with the project's schema library — not with ad-hoc checks spread through handlers. Nest 12 adds a `StandardSchemaValidationPipe` for Zod, Valibot or ArkType schemas and an `errorFormat` option on `ValidationPipe`; check the installed version before using them.
- `whitelist` is the mass-assignment guard: unknown properties never reach the service. Never pass a raw `@Body()` object into a create or update query. (CRITICAL)
- Derive update DTOs with `PartialType`, `PickType`, `OmitType` from `@nestjs/mapped-types` (or `@nestjs/swagger` when the project uses it).
- Response shapes are explicit types or response DTOs; map ORM documents to them in the service.

## 5. Request pipeline: middleware, guards, interceptors, pipes, filters

Order per request: middleware → guards → interceptors (before) → pipes → handler → interceptors (after) → exception filters.

- **Guards** decide access and fail closed: return `true` only on a positive check; throw `UnauthorizedException` or `ForbiddenException` otherwise. For deny-by-default, register a global guard and mark public routes with metadata (`SetMetadata('isPublic', true)` read through `Reflector`). (CRITICAL)
- **Interceptors** for cross-cutting response work: mapping, timing, timeouts, caching. Not for authorization.
- **Pipes** for validation and transformation of one argument. They don't call services with side effects.
- **Middleware** for Express-level concerns (request id, raw body). It runs before Nest knows the route handler.

## 6. Errors

- Throw the built-in exceptions (`BadRequestException`, `NotFoundException`, `ConflictException`, …). Nest turns them into `{ statusCode, message, error }`; anything else becomes a generic 500 without a stack trace. (HIGH)
- Never catch an error and return a 200 with an error field. (CRITICAL)
- Domain errors thrown by services may be mapped once, in a global exception filter (`APP_FILTER`); don't build error JSON in controllers.
- Map persistence errors at the persistence boundary (a duplicate-key error → `ConflictException` in the service), never by `instanceof` checks in controllers.

## 7. Configuration

- `ConfigModule.forRoot({ isGlobal: true, validate })` — validate required variables at startup so a missing one stops the app instead of failing at the first request. Nest 12's `@nestjs/config` accepts Standard Schema validators (Zod, Valibot, ArkType); Joi schemas need Joi 18+. (HIGH)
- `config.getOrThrow('KEY')` for required values; defaults only for safe local development values.
- No secrets in code, in committed `.env` files or in logs.

## 8. Persistence

**Mongoose** (`@nestjs/mongoose`):

- `MongooseModule.forRootAsync` with the URI from configuration; `MongooseModule.forFeature([{ name: X.name, schema: XSchema }])` in the module that owns `X`; `@InjectModel(X.name)` in its service only.
- Reads that return data to clients use `.lean()` and map `_id` to `id`; never return documents with internal fields (`__v`, owner ids the client shouldn't see).
- Build query filters from validated, typed values. A filter built from a raw body accepts operator objects such as `{ "$ne": null }`. (CRITICAL)
- Unbounded `find()` on user-controlled collections needs a limit.

**TypeORM / Prisma**: the same rules — the repository or client is injected into the service only; queries use parameters, never string concatenation; entities are mapped to response shapes.

## 9. Logging and lifecycle

- `new Logger(MyService.name)` or an injected logger; no `console.log` in committed code. Never log request bodies, tokens or passwords.
- `OnModuleInit` / `OnApplicationShutdown` for connections and timers. From Nest 12 lifecycle hooks run by component hierarchy level, which can change their order; don't rely on cross-module hook order.

## 10. Testing

- **Unit:** build the unit with `Test.createTestingModule({ providers: [MyService, { provide: getModelToken(X.name), useValue: fakeModel }] }).compile()` and `moduleRef.get(MyService)`. Replace collaborators with `overrideProvider(...).useValue(...)`. Test pure domain functions directly, without Nest.
- **End-to-end:** `const app = moduleRef.createNestApplication(); configureApp(app); await app.init();` then drive it with `supertest` against `app.getHttpServer()`; close the app in `afterAll`. Run against a real test database when the project has one; never against shared or production data.
- **Runner.** Nest 12 generates Vitest for new ESM projects and Jest for CommonJS ones. Vitest needs SWC (`unplugin-swc`) to emit the decorator metadata Nest's DI relies on — see the SWC recipe. If the project has no test runner yet, adding one is an install: ask the user, and record the decision in the plan.
- Assert on behaviour through the public API (status code and body for e2e, return values and calls to ports for units), not on private methods.

## Review checklist

1. Is every input validated before it reaches a query, with unknown properties stripped or rejected? (blocking)
2. Do guards fail closed, and are non-public routes protected by default?
3. Is any error turned into a 200, or any `@Res()` used without `passthrough`?
4. Are configuration values validated at startup and read through `ConfigService`?
5. Do responses use explicit shapes rather than ORM documents?
6. Do new providers keep the default singleton scope unless per-request state requires otherwise?
7. Does each new service or controller with logic have a spec, and do e2e tests reuse the bootstrap configuration?

## Sources

- Controllers: https://docs.nestjs.com/controllers
- Providers and scopes: https://docs.nestjs.com/providers , https://docs.nestjs.com/fundamentals/injection-scopes
- Custom providers: https://docs.nestjs.com/fundamentals/custom-providers
- Pipes and validation: https://docs.nestjs.com/pipes , https://docs.nestjs.com/techniques/validation
- Guards: https://docs.nestjs.com/guards ; interceptors: https://docs.nestjs.com/interceptors ; exception filters: https://docs.nestjs.com/exception-filters
- Configuration: https://docs.nestjs.com/techniques/configuration
- MongoDB: https://docs.nestjs.com/techniques/mongodb ; SQL: https://docs.nestjs.com/techniques/database
- Lifecycle events: https://docs.nestjs.com/fundamentals/lifecycle-events
- Testing: https://docs.nestjs.com/fundamentals/testing ; SWC and Vitest: https://docs.nestjs.com/recipes/swc
- Security (CORS, Helmet, rate limiting): https://docs.nestjs.com/security/cors , https://docs.nestjs.com/security/helmet , https://docs.nestjs.com/security/rate-limiting
- Migration guide, 11 → 12 (Node.js versions, ESM packages, Vitest for ESM projects, Standard Schema config validation, lifecycle hook order): https://docs.nestjs.com/migration-guide
