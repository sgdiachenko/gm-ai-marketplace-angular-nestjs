# Security Checklists — Quick Reference

Compact checklists for common security scenarios. Use these for self-review before committing or creating a PR.

---

## Pre-Commit Security Self-Review

Run through this before every commit that touches server code, auth logic, or user input handling.

- [ ] No hardcoded secrets, passwords, or API keys in code
- [ ] No `.env` files staged for commit
- [ ] User input is validated server-side (not just client-side)
- [ ] Database queries use parameterized/typed inputs (no raw operator injection)
- [ ] Error responses don't leak stack traces or internal paths
- [ ] Every protected endpoint is covered by a guard (a global guard with explicit public routes)
- [ ] File uploads have MIME type validation, size limits, and safe naming
- [ ] No `bypassSecurityTrust*` call or direct `innerHTML` write on a user-controlled value
- [ ] No secrets in Angular `environment*.ts` files or anywhere in the frontend bundle
- [ ] No `eval()`, `Function()`, or `exec()` with user input
- [ ] Sensitive data is redacted in log output

---

## New API Endpoint Checklist

When adding a NestJS controller route.

### Authentication & Authorization
- [ ] Endpoint is covered by the auth guard, or explicitly marked public
- [ ] Role check applied if the endpoint is admin-only (a roles guard reading route metadata)
- [ ] Resource ownership verified for update/delete operations (IDOR prevention)
- [ ] Throttling applied (especially for login, sign-up, expensive or paid operations, uploads)

### Input Validation
- [ ] All expected fields validated (required, type, length, format)
- [ ] Input is a DTO class validated by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`)
- [ ] Route params pass through a parsing pipe (`ParseIntPipe`, `ParseUUIDPipe`, an id pipe) before use
- [ ] No raw `@Body()` object is spread into a create or update query
- [ ] Query parameters validated and cast before use in MongoDB queries

### Error Handling
- [ ] Errors are thrown as Nest HTTP exceptions; none is caught and turned into a 200
- [ ] Specific error codes returned (400, 401, 403, 404, 500)
- [ ] Error messages are generic in production (no internal details)
- [ ] Resource not found returns 404 (not 500)
- [ ] Duplicate key errors handled gracefully (not raw Mongoose error)

### Response Security
- [ ] Response only includes fields the user should see
- [ ] Password hash never included in a response (response DTOs map only public fields)
- [ ] Internal IDs not leaked if not needed by client
- [ ] Timestamps and metadata appropriate for the user's role

---

## New Angular Feature Checklist

When adding a page, form or HTTP call to the Angular app.

- [ ] User content is rendered through interpolation or `[innerHTML]` binding, never through `bypassSecurityTrust*` without sanitizing first
- [ ] No `nativeElement.innerHTML`, `document.write` or runtime template compilation with user data
- [ ] Redirect targets from query params are limited to internal paths
- [ ] Interceptors attach credentials only to the API's own origin
- [ ] Route guards are treated as UX; the API enforces the same rule
- [ ] Tokens are not stored in `localStorage` when an `HttpOnly` cookie is an option
- [ ] No server response or token is logged with `console.log`

---

## New Dependency Checklist

Before adding a package to `package.json`.

- [ ] **Need check**: Can this be done with built-in Node.js APIs or existing dependencies?
- [ ] **Audit**: `npm audit` shows no known vulnerabilities for this package
- [ ] **Maintenance**: Last commit within 6 months, responsive to issues
- [ ] **Popularity**: Reasonable download count (>10K weekly for production deps)
- [ ] **Scope**: Package only accesses what it needs (no unnecessary network/fs/env access)
- [ ] **Name**: Package name is correct (not a typosquat — `@nestjs/comon` vs `@nestjs/common`)
- [ ] **License**: Compatible license (MIT, Apache 2.0, BSD — avoid GPL for proprietary code)
- [ ] **Size**: Bundle size reasonable for what it does (check bundlephobia.com)
- [ ] **Lock file**: `package-lock.json` updated and committed after install

---

## File Upload Checklist

When implementing or modifying file upload functionality.

### Configuration
- [ ] MIME type allowlist (whitelist, not blacklist)
- [ ] File size limit set (e.g., 5MB)
- [ ] Single file limit per request (`files: 1`)
- [ ] Upload directory exists and has correct permissions
- [ ] Upload directory is NOT in the source tree (or is gitignored)

### Naming & Storage
- [ ] Filename generated server-side (timestamp + random, not user-provided)
- [ ] File extension extracted from original and lowercased
- [ ] No path traversal possible (`../` in filename)
- [ ] Upload directory path resolved and validated before operations

### Cleanup
- [ ] Uploaded file deleted when associated resource is deleted
- [ ] File deletion validates path is within upload directory
- [ ] Failed uploads are cleaned up (the `FileInterceptor` storage and its error path)
- [ ] Old files replaced when resource is updated

### Serving
- [ ] Static file serving configured with `crossOriginResourcePolicy`
- [ ] No directory listing enabled for upload directory
- [ ] Appropriate cache headers set for uploaded files

---

## Authentication Flow Checklist

When modifying login, registration, or token handling.

### Login
- [ ] User found by email with `isActive: true` check
- [ ] Password compared with bcrypt (not in database query)
- [ ] Generic error message for both "user not found" and "wrong password"
- [ ] Login route throttled (`@Throttle` or the gateway)
- [ ] JWT signed with env secret, explicit algorithm, and expiration
- [ ] JWT payload contains only necessary claims (userId, email, name, role)
- [ ] Password hash never included in response

### Token Verification (auth guard)
- [ ] Token extracted from `Authorization: Bearer <token>` header
- [ ] `JwtService.verifyAsync()` used, with the algorithm pinned (never `decode()`)
- [ ] Expired token returns 401 with "Token expired" message
- [ ] Invalid token returns 401 with "Invalid token" message
- [ ] Fail-closed: the guard returns `true` only after successful verification; every error throws `UnauthorizedException`
- [ ] Decoded user data set on `req.user`

### Password Storage
- [ ] Argon2id, or bcrypt with cost >= 10
- [ ] Password hashed in the service before saving (Argon2id or bcrypt)
- [ ] Response DTOs never include the hash
- [ ] Password field has `minlength` validation

---

## Deployment Security Checklist

Before deploying to production.

### Environment
- [ ] `NODE_ENV=production` is set
- [ ] All secrets in environment variables (not in code)
- [ ] Default seed credentials changed or removed
- [ ] Debug/development middleware disabled
- [ ] `.env.example` doesn't contain real secrets

### HTTP Security
- [ ] `helmet()` enabled on the Express adapter, or the same headers set by the proxy
- [ ] CORS configured with explicit production origin (not wildcard)
- [ ] HTTPS enforced (TLS termination at load balancer or reverse proxy)
- [ ] `ThrottlerGuard` (or the gateway) active on all API routes
- [ ] Body parser size limit set (e.g., 10MB)
- [ ] `trust proxy` set correctly if behind reverse proxy

### Database
- [ ] MongoDB authentication enabled (username/password or x.509)
- [ ] MongoDB TLS enabled for connections
- [ ] MongoDB port not exposed to internet
- [ ] Connection string in environment variable
- [ ] Connection timeout configured

### Error Handling
- [ ] Exception filters keep unknown errors generic (Nest's default 500)
- [ ] Stack traces hidden in production responses
- [ ] Unmatched routes return 404 (no catch-all route answering 200)
- [ ] Configuration validated at startup; the app stops on a missing secret
- [ ] Process exit on critical failures (DB connection loss)

### Logging & Monitoring
- [ ] Request logging active with sensitive data redaction
- [ ] Error logging captures context (method, URL, IP, userId)
- [ ] Log files stored securely (not publicly accessible)
- [ ] Log rotation configured to prevent disk exhaustion
- [ ] Auth events logged (login success, failure, token rejection)

### Dependencies
- [ ] `npm audit` passes with no critical/high vulnerabilities
- [ ] `package-lock.json` committed and up to date
- [ ] No unnecessary dev dependencies in production

---

## Security Incident Response Checklist

If a security vulnerability is discovered in production.

### Immediate (0-1 hours)
- [ ] Assess severity and scope of the vulnerability
- [ ] Determine if it's actively being exploited (check logs)
- [ ] If credentials exposed: rotate all affected secrets immediately
- [ ] If data breach: identify affected records and users
- [ ] Create a private issue/ticket to track the incident

### Short-term (1-24 hours)
- [ ] Develop and test a fix
- [ ] Deploy the fix to production
- [ ] Verify the fix resolves the vulnerability
- [ ] Review logs for any exploitation attempts
- [ ] If user data affected: prepare notification plan

### Follow-up (1-7 days)
- [ ] Conduct root cause analysis
- [ ] Add automated test that would catch this vulnerability
- [ ] Update security checklists if a gap was found
- [ ] Review similar code for the same vulnerability pattern
- [ ] Document lessons learned

---

*Use these checklists as living documents. Update them as new patterns emerge or the stack evolves.*
