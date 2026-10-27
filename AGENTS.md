# gm-ai-marketplace-angular-nestjs — AGENTS.md

Claude Code plugin marketplace for the team's Angular + NestJS projects, in a private repo. One repo = one marketplace named `gm-ai-marketplace-angular-nestjs`; each plugin lives in `plugins/<name>/`. It is an independent copy of `sgdiachenko/gm-ai-marketplace` (forked from its `main` at `be94e42`): the plugin names and the SDD workflow are the same, the stack skills are Angular and NestJS.

## Stack
- Claude Code plugin marketplace format; CI pins Claude Code 2.1.296 (`.github/workflows/validate.yml`)
- Node.js 20+ for repo scripts, no npm dependencies
- Bash 3.2-compatible shell (stock macOS)
- GitHub Actions

## Commands
- validate the marketplace, same as the Validate workflow: `scripts/validate.sh`
- version bumps and renames vs base: `node scripts/check-pr.mjs origin/main`
- try one plugin while editing: `claude --plugin-dir plugins/<name>`, then `/reload-plugins`
- install from a pushed branch the way users get it, in a throwaway profile: `scripts/try-install.sh <name> [branch]`
- roll a plugin back to an earlier release: `node scripts/rollback.mjs <name> <version>`, never `git revert`
- behaviour evals (paid, run by hand before a release): `scripts/run-evals.sh <suite> [max-cost-usd] [eval options]`
- compare two eval runs and apply the cost quality gate: `node scripts/compare-evals.mjs <baseline-dir> <candidate-dir>`
- which plugin versions a session actually loads, from its telemetry: `node scripts/trace-plugin-version.mjs [project-dir]`
- list release tags that would be created (CI pushes them on main): `node scripts/tag-releases.mjs`
- catalog site, checked by the separate Site workflow: develop with `node site/dev.mjs`, test with `node --test site/tests/*.test.mjs`, build with `node site/build.mjs`

## Map
- `.claude-plugin/marketplace.json` — the catalog, one entry per plugin
- `plugins/<name>/` — a plugin; everything in it ships to users
- `scripts/` — validation used locally and in CI
- `site/` — the catalog site, built from the repository; `.github/workflows/site.yml` tests it on every push and deploys it to GitHub Pages only when the repository variable `PAGES_ENABLED` is `true`
- `docs/` — maintainer and user docs; per-plugin notes in `docs/plugins/<name>.md`
- `evals/` — `claude plugin eval` suites; maintainer-only, never inside a plugin
- `specs/` — specs for planned plugins and changes
- `INSIGHTS.md` — lessons learned

## Conventions (non-default only)
- Directory name = catalog entry `name` = `plugin.json` `name`, kebab-case; entry `source` is `./plugins/<name>`
- `version` (semver) lives only in `plugins/<name>/.claude-plugin/plugin.json`; bump it in every PR that changes the plugin, README- and CHANGELOG-only changes excepted; every release adds a `CHANGELOG.md` entry
- A plugin that names another plugin's component (`<plugin>:<name>`) declares it in `dependencies` with a range; agents' `skills:` entries are always namespaced
- Prefer skills over commands; keep SKILL.md tool-neutral for a future Codex port
- Hooks and MCP configs reference bundled files as `"${CLAUDE_PLUGIN_ROOT}"/...`; persistent state goes to `${CLAUDE_PLUGIN_DATA}`
- Maintainer-only files (AGENTS.md, INSIGHTS.md, docs, specs, tests) never go inside `plugins/<name>/`; per-plugin notes go to `docs/plugins/<name>.md`
- This copy targets Angular and NestJS only: no React, Next.js or Fastify skills, and no mechanism for choosing between stacks. `scripts/check-marketplace.mjs` rejects the retired skill names (`react-best-practices`, `next-best-practices`, `fastify-best-practices`, `react-testing-library`, `onion-architecture`) and source-project names in plugins
- `engineering-paved-path/skills/angular-developer` is the Angular team's skill, vendored unchanged from `angular/skills`; update it only by copying a newer upstream commit (`docs/plugins/engineering-paved-path.md`), never by editing it
- Everything in the repository is in English: docs, catalog metadata, plugin files (code, examples and comments included), scripts, evals and the catalog site. `scripts/check-marketplace.mjs` rejects Cyrillic anywhere in `plugins/`, `scripts/`, `evals/` and `.github/`, and outside code spans in the root docs, `docs/`, `specs/` and `site/`. The one exception is data a feature needs: the Ukrainian search words in `site/search-terms.json` and the tests that query with them

## Gotchas
- Users get a plugin change only when its `version` changes; Claude Code caches plugins by version
- A marketplace added from a local path loads plugins in place and ignores `version`, so it hides caching and path bugs
- Installed plugins are copied to a cache: paths that leave the plugin directory (`../`) break
- Renaming or removing a plugin breaks existing installs unless `renames` in the catalog maps the old name
- Do not add CLAUDE.md to this repo: when one exists, Claude Code ignores AGENTS.md
- Plugin names starting with `claude-` or `anthropic-` fail validation
- A newer Claude Code can add validation rules that fail `--strict`; bump the CI pin in its own PR

- There is no `stable` branch yet. When one is created, it is the stable channel: `main` at a promoted commit plus a catalog renamed to `gm-ai-marketplace-angular-nestjs-stable`. Promote by merging `main` into it in a PR; never merge `stable` into `main`
- Never push to `sgdiachenko/gm-ai-marketplace` from here, and don't copy its `<plugin>--v<version>` tags: this repository's tags are created by its own `tag-releases.yml`

## Do not touch
- `renames` in `.claude-plugin/marketplace.json` — append-only history that migrates installed users

## Read when…
- Read `README.md` when you need the user-facing overview or the plugin list.
- Read `docs/adding-a-plugin.md` before creating a plugin or changing a plugin's layout.
- Read `docs/releasing.md` before bumping a version, rolling back, renaming or removing a plugin.
- Read `docs/installing.md` when changing install instructions, git access or team rollout.
- Read `docs/codex-compatibility.md` before writing skills or hooks, and before adding Codex support.
- Read the relevant file in `specs/` before implementing a plugin or feature.
- Read `site/README.md` before changing the catalog site or the way plugins declare components.
- Read `SECURITY.md` before adding hooks, MCP servers, network access or anything that handles credentials.
- Read `docs/COST-BASELINE.md` before changing an agent prompt or a model choice in `sdd-engineering`.
- Read `INSIGHTS.md` before changing this repo; append a new entry when you learn something non-obvious.
