# Security code examples — unsafe vs safe patterns

Each section shows a vulnerable pattern and its secure replacement for an Angular frontend and a NestJS API on MongoDB (Mongoose). The domain is a neutral one: users, orders, notes.

---

## 1. MongoDB operator injection

### UNSAFE — raw body in a filter

```ts
@Post('login')
async login(@Body() body: any) {
  // body.password can be { "$ne": null }: matches any user
  const user = await this.users.findOne({ email: body.email, password: body.password });
  if (!user) throw new UnauthorizedException();
  return this.tokens.issue(user);
}
```

### SAFE — typed DTO, global whitelist, hash comparison

```ts
// main.ts (or configureApp)
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @Length(12, 128) password: string;
}

@Post('login')
@HttpCode(HttpStatus.OK)
login(@Body() dto: LoginDto) {
  return this.auth.login(dto.email, dto.password); // service: findOne({ email }), then compare the hash
}
```

**Why it works:** the pipe rejects objects where strings are expected, and the password is never part of the query.

---

## 2. XSS — bypassing Angular's sanitizer

### UNSAFE — trusting user content

```ts
@Component({ template: `<div [innerHTML]="body"></div>` })
export class NoteView {
  private readonly sanitizer = inject(DomSanitizer);
  note = input.required<Note>();
  get body() {
    return this.sanitizer.bypassSecurityTrustHtml(this.note().html); // user-authored HTML runs as-is
  }
}
```

### SAFE — let Angular sanitize, or sanitize before trusting

```ts
@Component({ template: `<div [innerHTML]="note().html"></div>` }) // Angular strips scripts and handlers
export class NoteView {
  note = input.required<Note>();
}

// Only when rich HTML must survive Angular's sanitizer:
const clean = DOMPurify.sanitize(note.html, { ALLOWED_TAGS: ['b', 'i', 'a', 'p', 'ul', 'li'], ALLOWED_ATTR: ['href'] });
const trusted = sanitizer.bypassSecurityTrustHtml(clean);
```

---

## 3. XSS — writing to the DOM directly

### UNSAFE

```ts
private readonly host = inject(ElementRef<HTMLElement>);
render(message: string) {
  this.host.nativeElement.innerHTML = message; // no sanitization at all
}
```

### SAFE

```ts
protected readonly message = signal('');
// template: <p>{{ message() }}</p>  — interpolation escapes the text
```

---

## 4. URL-based XSS and open redirects

### UNSAFE

```ts
const next = this.route.snapshot.queryParamMap.get('next')!;
window.location.href = next; // javascript:… or https://evil.example
```

### SAFE — internal paths only

```ts
const next = this.route.snapshot.queryParamMap.get('next') ?? '/';
const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
this.router.navigateByUrl(safe);
```

---

## 5. JWT signing and verification

### UNSAFE

```ts
JwtModule.register({ secret: 'secret' }); // weak, hard-coded, no expiry
const payload = this.jwt.decode(token);   // no signature check
```

### SAFE

```ts
JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'), // ≥ 32 random bytes, validated at startup
    signOptions: { algorithm: 'HS256', expiresIn: '15m' },
    verifyOptions: { algorithms: ['HS256'] },
  }),
});

const payload = await this.jwt.verifyAsync<TokenPayload>(token);
```

---

## 6. Guards — fail open vs fail closed

### UNSAFE

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    try {
      const req = ctx.switchToHttp().getRequest();
      req.user = await this.jwt.verifyAsync(extractToken(req));
    } catch {
      // logged and ignored
    }
    return true; // always lets the request through
  }
}
```

### SAFE — deny by default, explicit public routes

```ts
export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException();
    try {
      req.user = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

// app.module.ts
providers: [{ provide: APP_GUARD, useClass: AuthGuard }];
```

---

## 7. Error handling — leaking internals

### UNSAFE

```ts
@Catch()
export class AllErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(500).json({ message: error.message, stack: error.stack });
  }
}
```

### SAFE — map known errors, keep unknown ones generic

```ts
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);
  catch(error: DomainError, host: ArgumentsHost) {
    this.logger.warn(`${error.code}: ${error.message}`);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    host.switchToHttp().getResponse().status(status).json({ statusCode: status, message: error.publicMessage });
  }
}
// Everything else falls through to Nest's default filter: a generic 500 without a stack trace.
```

---

## 8. Access control — IDOR

### UNSAFE

```ts
@Delete(':id')
remove(@Param('id') id: string) {
  return this.notes.deleteOne({ _id: id }); // any authenticated user deletes any note
}
```

### SAFE — ownership in the query, 404 for others

```ts
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
async remove(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: Principal) {
  await this.notesService.remove(id, user.id);
}

// service
async remove(id: string, ownerId: string) {
  const { deletedCount } = await this.notes.deleteOne({ _id: id, ownerId });
  if (deletedCount === 0) throw new NotFoundException();
}
```

---

## 9. Password storage

### UNSAFE

```ts
const hash = createHash('sha256').update(dto.password).digest('hex'); // fast, unsalted
```

### SAFE

```ts
const hash = await argon2.hash(dto.password, { type: argon2.argon2id });
// or: await bcrypt.hash(dto.password, 12)
const ok = await argon2.verify(user.passwordHash, dto.password);
```

Response shapes never include the hash; map the document to a response DTO.

---

## 10. CORS

### UNSAFE

```ts
app.enableCors({ origin: true, credentials: true }); // reflects any origin, with cookies
```

### SAFE

```ts
const origins = config.getOrThrow<string>('CORS_ORIGINS').split(',');
app.enableCors({ origin: origins, credentials: true });
```

---

## 11. Command injection

### UNSAFE

```ts
exec(`convert ${dto.fileName} out.png`); // fileName = "x; rm -rf /"
```

### SAFE

```ts
execFile('convert', [path.basename(dto.fileName), 'out.png']);
```

---

## 12. Rate limiting

### UNSAFE — unlimited login attempts

```ts
@Post('login')
login(@Body() dto: LoginDto) { /* … */ }
```

### SAFE — `@nestjs/throttler`

```ts
// app.module.ts
imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],

// auth.controller.ts
@Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
@Post('login')
login(@Body() dto: LoginDto) { /* … */ }
```

---

## 13. Mass assignment

### UNSAFE

```ts
@Patch(':id')
update(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: Principal) {
  return this.users.updateOne({ _id: id }, body); // body.role = 'admin'
}
```

### SAFE

```ts
export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @IsOptional() @IsUrl({ protocols: ['https'] }) avatarUrl?: string;
}

@Patch('me')
update(@Body() dto: UpdateProfileDto, @CurrentUser() user: Principal) {
  return this.profiles.update(user.id, dto); // whitelist drops role and every unknown field
}
```

---

## 14. Sensitive data in logs

### UNSAFE

```ts
this.logger.log(`login ${JSON.stringify(dto)}`); // includes the password
```

### SAFE

```ts
this.logger.log(`login attempt for ${maskEmail(dto.email)}`);
```

---

## 15. Credentials sent to the wrong origin (Angular)

### UNSAFE

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: `Bearer ${inject(Session).token()}` } })); // every URL
```

### SAFE

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(API_URL);
  if (!req.url.startsWith(api)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${inject(Session).token()}` } }));
};
```

---

## 16. Regex injection (ReDoS)

### UNSAFE

```ts
this.notes.find({ title: new RegExp(query.q, 'i') });
```

### SAFE

```ts
const escaped = query.q.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
this.notes.find({ title: new RegExp(escaped, 'i') }).limit(50);
```
