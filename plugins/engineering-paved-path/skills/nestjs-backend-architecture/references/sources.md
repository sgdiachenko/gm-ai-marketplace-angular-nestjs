# Sources

Fetched 2026-10-23.

## Dependency direction
- J. Palermo, The Onion Architecture, parts 1–3 (2008): https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/ (coupling points inward; interfaces defined inward, implemented outward)
- R. Martin, The Clean Architecture (2012): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html (the dependency rule; only simple data crosses boundaries)
- A. Cockburn, Hexagonal Architecture: https://alistair.cockburn.us/hexagonal-architecture/
- Microsoft, Common web application architectures: https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures (folder-only separation is fine for small apps, but nothing enforces the direction)
- M. Fowler, Repository: https://martinfowler.com/eaaCatalog/repository.html ; OrmHate: https://martinfowler.com/bliki/OrmHate.html

## When not to add layers
- Microsoft, Designing a DDD-oriented microservice: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice
- V. Khorikov, Should you abstract the database?: https://enterprisecraftsmanship.com/posts/should-you-abstract-database/
- NestJS CQRS recipe (simple CRUD doesn't need it): https://docs.nestjs.com/recipes/cqrs

## NestJS
- Modules: https://docs.nestjs.com/modules
- Custom providers (an abstract class as the token): https://docs.nestjs.com/fundamentals/custom-providers
- Circular dependency: https://docs.nestjs.com/fundamentals/circular-dependency
- MongoDB with Mongoose: https://docs.nestjs.com/techniques/mongodb ; SQL with TypeORM: https://docs.nestjs.com/techniques/database
- Validation: https://docs.nestjs.com/techniques/validation
- Exception filters: https://docs.nestjs.com/exception-filters
- Guards: https://docs.nestjs.com/guards
- Configuration: https://docs.nestjs.com/techniques/configuration

## Community examples
- Domain-Driven Hexagon: https://github.com/Sairyss/domain-driven-hexagon
- brocoders nestjs-boilerplate (persistence schema → mapper → domain entity): https://github.com/brocoders/nestjs-boilerplate/blob/main/docs/architecture.md

## Enforcement tools
- ESLint `no-restricted-imports`: https://eslint.org/docs/latest/rules/no-restricted-imports
- eslint-plugin-boundaries: https://github.com/javierbrea/eslint-plugin-boundaries
- dependency-cruiser: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-tutorial.md

## Caveats
- No verified 2024–2026 article compares an ORM schema with a separate domain entity in NestJS; "the injected model or repository is already the repository" is an inference from Fowler and Khorikov.
- The NestJS docs pages don't state which major version they describe; check the installed `@nestjs/core` before relying on a version-sensitive detail.
