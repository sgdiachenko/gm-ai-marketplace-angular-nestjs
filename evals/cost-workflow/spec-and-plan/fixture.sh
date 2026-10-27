#!/usr/bin/env bash
# Seeds the workspace with a small Angular app that has its own instructions, check commands
# and an SDD profile, but none of this marketplace's components. Runs only with --scaffold.
set -euo pipefail

mkdir -p src/app/features/words docs/specs docs/plans

cat > package.json <<'EOF'
{
  "name": "vocabulary",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test"
  },
  "dependencies": {
    "@angular/common": "^22.2.0",
    "@angular/compiler": "^22.2.0",
    "@angular/core": "^22.2.0",
    "@angular/forms": "^22.2.0",
    "@angular/platform-browser": "^22.2.0",
    "@angular/router": "^22.2.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@angular/build": "^22.2.4",
    "@angular/cli": "^22.2.4",
    "@angular/compiler-cli": "^22.2.0",
    "jsdom": "^30.0.0",
    "typescript": "~6.0.2",
    "vitest": "^5.0.0"
  }
}
EOF

cat > AGENTS.md <<'EOF'
# vocabulary

A small Angular app for learning words. There is no backend: data lives in the browser.

## Commands
- build (also type-checks): `npm run build`
- tests: `npm test -- --watch=false` (Vitest through `ng test`)

## Layout
- `src/app/app.routes.ts` — routes; `/words` lazy-loads the words page
- feature code goes to `src/app/features/<feature>/`; code shared by two features goes to `src/app/shared/`
- state lives in signals inside services; components only render and forward events
EOF

cat > src/app/app.ts <<'EOF'
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <h1>Vocabulary</h1>
    <a routerLink="/words">Words</a>
    <router-outlet />
  `,
})
export class App {}
EOF

cat > src/app/app.routes.ts <<'EOF'
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'words', loadComponent: () => import('./features/words/words-page').then((m) => m.WordsPage) },
];
EOF

cat > src/app/features/words/words-page.ts <<'EOF'
import { Component } from '@angular/core';

@Component({
  selector: 'app-words-page',
  template: `
    <h2>Words</h2>
    <p>Coming soon.</p>
  `,
})
export class WordsPage {}
EOF

cat > docs/specs/README.md <<'EOF'
# Specs

| ID | Title | Status | Modules | Supersedes |
|---|---|---|---|---|
EOF

cat > docs/sdd-profile.md <<'EOF'
# SDD profile

## Paths

| What | Path |
|---|---|
| Specs | docs/specs/ |
| Plans and run state | docs/plans/ |
| Retros | docs/retros/ |
| Design images | docs/design/ |

## Language

- Docs language: English
- EARS keywords: WHEN / WHILE / IF … THEN / WHERE

## Modules

| Module | Path | Package manager | Full checks (what CI runs) | Targeted tests |
|---|---|---|---|---|
| web | ./ | npm | `npm run build` · `npm test -- --watch=false` | `npm test -- --watch=false --include <globs relative to src/>` |

## Skill lanes

| Files | Skills |
|---|---|
| `src/app/**/*.{ts,html}` | `engineering-paved-path:angular-developer`, `engineering-paved-path:frontend-architecture` |
| `src/app/**/*.spec.ts` | `engineering-paved-path:angular-developer` |

## Architecture rules

- Sources: AGENTS.md
- Checks: none

## Guardrails

- Forbidden commands: none beyond the built-in ones
- Do-not-touch paths: none

## Live checks

- Manual verification may call paid or credentialed services: no
- Run the app for manual checks: `npm start` (http://localhost:4200)
EOF

git init -q
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "Vocabulary app with a placeholder words page"
