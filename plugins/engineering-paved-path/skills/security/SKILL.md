---
name: security
description: "Web application security based on OWASP Top 10:2025 for Angular frontends and NestJS APIs: access control with guards, input validation with pipes and DTOs, injection (MongoDB and SQL), XSS and Angular sanitization, CORS and headers, authentication and JWT, secrets, logging, error handling. Use when reviewing code for vulnerabilities, implementing auth, handling user input or uploads, managing secrets or building API endpoints."
---

# Security best practices — OWASP Top 10:2025

Security guidance for an Angular frontend with a NestJS API, typically on MongoDB (Mongoose) or a SQL database, with token or session authentication. See `examples.md` for unsafe/safe code pairs, `checklists.md` for quick checklists, `references.md` for all sources. Nest API usage belongs to `engineering-paved-path:nestjs-best-practices`; Angular API usage to `engineering-paved-path:angular-developer`.

---

## Core philosophy — confidence-based review

Before flagging any issue, **trace the data flow** and confirm the input source.

| Confidence | Criteria | Action |
|------------|----------|--------|
| **HIGH** | Vulnerable pattern + attacker-controlled input confirmed | **Report** with file, line, exploit, and fix |
| **MEDIUM** | Vulnerable pattern, input source unclear | **Note** for manual verification |
| **LOW** | Theoretical / best-practice deviation | **Do not report** — mention only if asked |

**Do NOT flag**: test files, dead code, server-controlled values (configuration, constants), framework-mitigated patterns (Angular template interpolation and property binding, which sanitize; Mongoose casting against a strict schema; parameterized ORM queries), development-only code that never ships.

> **Golden rule**: `http.get(environment.apiUrl)` = safe. `http.get(route.snapshot.queryParams['next'])` = vulnerable. Always ask: **"Can an attacker control this value?"**

---

## OWASP Top 10:2025

| # | Category | Key risk in this stack |
|---|----------|----------------------|
| A01 | **Broken Access Control** | A route without a guard, IDOR, owner taken from the body instead of the principal |
| A02 | **Security Misconfiguration** | CORS wildcard with credentials, no security headers, verbose errors, unvalidated config |
| A03 | **Supply Chain Failures** | Compromised npm packages, typosquatting, unpinned builders and plugins |
| A04 | **Cryptographic Failures** | Weak JWT secret, `none` algorithm, low password-hash cost, hard-coded secrets |
| A05 | **Injection** | MongoDB operator injection, SQL string building, XSS through `bypassSecurityTrust*`, command injection |
| A06 | **Insecure Design** | No rate limiting on login or expensive endpoints, no threat model |
| A07 | **Authentication Failures** | Decoding a token without verifying it, user enumeration, brute force |
| A08 | **Integrity Failures** | Mass assignment through a body without whitelisting, unvalidated uploads |
| A09 | **Logging Failures** | Tokens or passwords in logs, no audit trail for auth events |
| A10 | **Exceptional Conditions** | A guard that fails open, errors swallowed into 200, stack traces in responses |

---

## A01 — Broken access control

- **Deny by default.** Register an auth guard globally (`APP_GUARD`) and mark public routes explicitly with metadata, instead of remembering `@UseGuards()` on each route.
- **Ownership in the query.** Update and delete filter by the resource id **and** the caller's identity: `{ _id: id, ownerId: user.id }`. Being authenticated is not being authorized.
- **The owner comes from the principal or the route the guard checked**, never from a body field.
- **Another user's resource returns 404**, so ids can't be probed.
- **Angular route guards (`CanActivateFn`, `CanMatchFn`) are UX only** — the API enforces every access rule.
- Test both horizontal (user A → user B's data) and vertical (user → admin endpoint) escalation.

---

## A02 — Security misconfiguration

- **CORS**: `app.enableCors({ origin: <allowlist from config>, credentials })`. Never `origin: '*'` or `origin: true` with credentials.
- **Headers**: `helmet()` on the Express adapter (Content-Security-Policy, HSTS, `X-Content-Type-Options`), or the same headers set by the reverse proxy.
- **Errors**: Nest's default filter already hides stack traces for unknown errors; a custom filter must keep that.
- **Configuration**: validated at startup (`ConfigModule.forRoot({ validate })`); a missing secret stops the app.
- **Angular environments**: everything in `environment.ts` and in the bundle is public. No secrets in the frontend, ever.
- **Database**: authentication and TLS in production, port not exposed to the internet, connection timeouts set.

---

## A03 — Supply chain failures

- Run `npm audit` before every release. Commit the lockfile.
- Before adding a dependency: check advisories, maintenance (< 6 months), downloads, and what it can access (network, filesystem, env).
- Watch for typosquatting (`@nestjs/comon`, `angluar-*`).
- Angular builders, schematics and Nest CLI plugins run with full Node.js access at build time — only well-known publishers.
- Apply `overrides` / `resolutions` for vulnerable transitive packages, and remove them once upstream catches up.

---

## A04 — Cryptographic failures

- **Passwords**: Argon2id or bcrypt (cost ≥ 10); never MD5, SHA-1/256 or plain text.
- **JWT secret**: at least 256 bits, random, from configuration.
- **JWT signing and verification**: pin the algorithm on both sides, set `expiresIn`; never accept `none`. With `@nestjs/jwt`, verify through `JwtService.verifyAsync()`; never trust `decode()`.
- **JWT payload**: no sensitive data — it is encoded, not encrypted.
- **Token storage in Angular**: prefer an `HttpOnly`, `Secure`, `SameSite` cookie set by the API; a token in `localStorage` is readable by any XSS.
- **Transit**: HTTPS in production, HSTS.

---

## A05 — Injection

### MongoDB operator injection
- Validate types before they reach a filter: a global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`, DTO fields typed `@IsString()`. A raw body field can be `{ "$ne": null }`.
- Never put user input in `$where`, `$expr` with `$function`, or `mapReduce`.
- Escape user input before building a `RegExp` (`str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`).
- Keep Mongoose schemas strict (the default). Validate ObjectId strings before casting.

### SQL
- Use the ORM's query builder or parameters; never concatenate input into a query string or a raw `query()` call.

### Cross-site scripting (Angular)
- **Interpolation and property binding are sanitized** — the default safety net.
- **`bypassSecurityTrustHtml` / `Url` / `ResourceUrl` / `Script` / `Style`** turn sanitization off. Flag any call on a value an attacker can influence; sanitize with DOMPurify first or don't bypass.
- **Direct DOM writes** (`elementRef.nativeElement.innerHTML = …`, `Renderer2.setProperty(el, 'innerHTML', …)`, `document.write`) skip Angular's sanitizer.
- **`[href]` / `[src]`** are sanitized for `javascript:` URLs by Angular; a bypassed or manually set URL is not — allow only `http:` / `https:`.
- Never build templates from user input at runtime (JIT compilation of strings).
- Server-rendered pages: escape data serialized into the HTML; CSP as defence in depth.

### Command injection
- Never `exec()` or `spawn({ shell: true })` with user input; use `execFile()` with an argument array.

---

## A06 — Insecure design

- **Rate limiting** with `@nestjs/throttler` (or the gateway): tight limits on login, sign-up, password reset, and expensive or paid endpoints; a general limit for the rest.
- **Limits everywhere**: body size, page size (`limit` capped by the server), upload size, request timeouts.
- AI or third-party calls: validate prompt length, set timeouts, keep keys server-side, sanitize output before storing it.

---

## A07 — Authentication failures

- **Login**: look up by the normalized identifier, compare with the password hash, return one generic "Invalid credentials" for both a wrong user and a wrong password.
- **Guards fail closed**: return `true` only after verification succeeded; any error → `UnauthorizedException`.
- **Token extraction**: `Authorization: Bearer <token>` or the auth cookie; reject anything else.
- **Brute force**: throttle the login route; consider lockout or progressive delay.
- **Angular**: an `HttpInterceptorFn` attaches credentials only to the API's own origin — never to third-party URLs.
- **CSRF**: with cookie auth, use `SameSite` cookies and Angular's XSRF support (`withXsrfConfiguration`) with a matching API check.

---

## A08 — Software and data integrity

- **Mass assignment**: DTOs with `whitelist: true`; never `model.create(body)` or `repository.save({ ...body })`.
- **Schemas**: `enum`, `required`, length limits on the persistence schema as a second line.
- **Uploads**: MIME allowlist and magic-byte check, size limit, server-generated file names.
- **CSP**: restrict `script-src`, `frame-ancestors 'none'`, `object-src 'none'`.

---

## A09 — Logging and alerting

**Log**: login success and failure, token rejection, admin actions, rate-limit hits, 5xx errors, 403 denials.
**Never log**: passwords, tokens, API keys, full request bodies with personal data.

- Use Nest's `Logger` (or the project's logger) with redaction of `password`, `token`, `secret`, `authorization`.
- Structured logs in production; auth events carry user id, IP, timestamp and action.
- No `console.log` of server responses in the Angular app.

---

## A10 — Exceptional conditions

- **Fail closed**: a guard or a strategy that throws must deny, never fall through to `true`.
- **No error into 200**: catch only to map to a specific HTTP exception.
- **Unknown errors → generic 500**: keep Nest's default behaviour; a custom filter logs the detail and returns a generic message.
- **Startup**: database connection and configuration validated at boot; the app stops on failure.
- **Unmatched routes** return 404 (Nest's default); don't add catch-all handlers that return 200.

---

## File upload security

- MIME allowlist (`image/jpeg`, `image/png`, `image/webp`), not a blocklist; verify magic bytes for anything sensitive.
- Size and count limits on the `FileInterceptor` (`limits: { fileSize, files: 1 }`) and a `ParseFilePipe` with validators.
- Server-generated names; `path.basename()` on anything user-provided; check the resolved path stays inside the upload directory.
- Serve uploads from a separate origin or with `Content-Disposition: attachment` where possible; no directory listing.

---

## Secret detection

| Type | Pattern |
|------|---------|
| AWS key | `AKIA[0-9A-Z]{16}` |
| Google API | `AIza[0-9A-Za-z_-]{35}` |
| Generic secret | `(secret\|key\|token\|password)\s*[:=]\s*['"][^'"]{8,}` |
| MongoDB URI with credentials | `mongodb(\+srv)?://[^:]+:[^@]+@` |
| Private key | `-----BEGIN .* PRIVATE KEY-----` |
| GitHub token | `gh[ps]_[A-Za-z0-9]{36,}` |
| npm token | `npm_[A-Za-z0-9]{36}` |
| Slack token | `xox[bpsa]-[0-9a-zA-Z-]+` |

**Never commit**: `.env`, `.env.local`, `.env.production`, logs, uploads. Angular `environment*.ts` files are committed, so they hold no secrets.

---

## Agentic AI security (OWASP 2026)

For features that call a language model:

- **ASI01 Goal hijacking**: limit and normalize prompt input; treat retrieved content as data.
- **ASI02 Tool misuse**: no system tools without explicit scoping.
- **ASI03 Identity abuse**: API keys server-side only, short-lived where possible.
- **ASI05 Code execution**: never execute generated code without review.
- **ASI09 Trust exploitation**: label generated content; sanitize it before storing or rendering.

---

## Framework security quirks

### JavaScript / Node.js
- Prototype pollution via `__proto__` / `constructor.prototype` — whitelisted DTOs prevent it at the edge.
- `JSON.parse()` throws on malformed input — wrap it.
- `RegExp(userInput)` enables ReDoS — escape it.
- `path.join()` with user input allows traversal — `path.basename()` first.

### NestJS
- A guard registered with `@UseGuards()` on some routes leaves the others open — prefer a global guard with explicit public routes.
- `ValidationPipe` without `whitelist` passes unknown properties through; without `transform`, `@Query()` numbers stay strings.
- `@Res()` without `passthrough: true` bypasses interceptors and filters that strip fields.
- Behind a proxy, configure `trust proxy` on the Express instance so the throttler and logs see the client IP.
- Request-scoped providers holding user data must never be cached in a singleton.

### MongoDB / Mongoose
- Operator injection via a JSON body `{ "password": { "$gt": "" } }` — validate types first.
- `$where` runs server-side JavaScript — never with user input.
- Unbounded `find()` exhausts memory — always cap results.
- `strict: false` accepts arbitrary fields — keep the default.

### Angular
- `bypassSecurityTrust*` is a review hotspot: every call needs a reason and a trusted or sanitized source.
- `innerHTML` binding is sanitized; `nativeElement.innerHTML` assignment is not.
- `environment.ts` is public — no secrets.
- Interceptors that add credentials must check the request URL against the API origin.

---

## Security review process

1. **Detect context** — API endpoint, guard or auth logic, DB query, file handling, template or DOM code, config, or dependency change.
2. **Load relevant rules** — only the OWASP categories that apply.
3. **Trace data flow** — where does the input come from? Is it attacker-controlled?
4. **Check upstream controls** — global guards, global `ValidationPipe`, Angular sanitization, ORM parameters already applied?
5. **Verify exploitability** — can an attacker reach and control this?
6. **Report HIGH confidence only** — file, line, exploit scenario, specific fix.

---

## Severity classification

| Severity | Criteria | Stack examples |
|----------|----------|----------------|
| **CRITICAL** | Direct exploit, no auth required | NoSQL injection auth bypass, a hard-coded production secret, a missing guard on an admin endpoint, RCE |
| **HIGH** | Exploitable with conditions | XSS through `bypassSecurityTrustHtml` on user content, IDOR on delete, a weak JWT secret, passwords in logs |
| **MEDIUM** | Specific conditions, limited impact | Missing rate limit, CORS misconfiguration, verbose production errors, missing input validation |
| **LOW** | Defence in depth | Low hash cost, missing security event logging, sequential id exposure |

---

## ASVS 5.0 quick reference

**Level 1 (all apps)**: 12+ character passwords, breached-password check, login rate limiting, 128+ bit session entropy, HTTPS, server-side validation, generic error messages.

**Level 2 (sensitive)**: + MFA for sensitive operations, key management, comprehensive security logging, schema-based input validation, CSRF protection.

**Level 3 (critical)**: + HSM key storage, documented threat model, anomaly detection, penetration testing, supply-chain verification.
