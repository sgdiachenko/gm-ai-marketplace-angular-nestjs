# Catalog site

| | |
|---|---|
| Status | Phase 1 implemented in `site/` |
| Date | 2026-10-14 |
| URL | https://sgdiachenko.github.io/gm-ai-marketplace-angular-nestjs/ |

## Summary

A static site on GitHub Pages where anyone can search everything the marketplace ships: plugins, skills, agents, commands, hooks and MCP servers. A user describes a task in a few words, gets matching artifacts as cards, and copies the install command from the card. The site is built from this repository on every push to `main`. The repository stays the only source of truth, and no content is written for the site by hand.

## Problem

- To find a skill for a task, a user has to know which plugin holds it, or read the repository.
- There is no link to send a teammate that says "install this".
- Enabling plugins for a project means writing `.claude/settings.json` by hand from `docs/installing.md`.
- A release is visible only to people who read commits.

## Goals

1. Find any artifact by describing the task in a few words, in English or Ukrainian.
2. From any result, copy the install command and see how to call the artifact (`/<plugin>:<skill>`).
3. Know what a plugin contains, what it needs and what it costs in context before installing it.
4. Share a link to a search, a plugin or a skill.
5. No upkeep: when the repository changes, the site changes with it, and content the site can't show fails the build.

## Non-goals

- Anything that needs a backend: accounts, ratings, comments, install counts, search analytics. Requests and feedback go to GitHub issues.
- Installing from the browser. The site gives commands; Claude Code installs.
- A Codex catalog or Codex badges, until `docs/codex-compatibility.md` is implemented.
- A translated UI. The UI is English; search also understands Ukrainian queries.

## Users

| Who | Wants to | Usually arrives from |
|---|---|---|
| Team member using Claude Code | find and install something for the task at hand | a link in Slack, the home page |
| Team lead | enable a set of plugins for a project | Team setup (phase 2) |
| Plugin author | see how a plugin is presented and what it costs; see what exists before building | the plugin page |
| Outside visitor (the site is public) | browse | search engines, the repository README |

## Constraints

- **GitHub Pages serves static files only.** Search, filters and URL state run in the browser. Every page is pre-rendered HTML, so content reads without JavaScript.
- **The repository and the site are public.** The site shows only what the repository already shows.
- **Base path** `/gm-ai-marketplace-angular-nestjs/`. All links are relative to it; no custom domain.
- **Repository conventions apply.** Scripts are Node.js 20+ without npm dependencies, shell is bash 3.2-compatible. Site code lives outside `plugins/`, so it never ships to users and never needs a plugin version bump.
- **Content is English.** `scripts/check-marketplace.mjs` rejects Cyrillic in catalog metadata, frontmatter, plugin READMEs and repository docs.

## Phases

| Phase | Scope |
|---|---|
| 1, MVP | Search with cards and filters, plugin pages, component pages, Getting started, request-a-plugin, shareable URLs, build and deploy |
| 2 | Team setup, What's new with a feed, context cost, version history on plugin pages |
| 3 | A `catalog` plugin that finds artifacts from inside Claude Code; build-time keyword enrichment; maintainer health page |

Design covers phase 1 in full and leaves room for phase 2: navigation items and plugin page sections.

## Content

The site indexes what users install and what they need to install it.

| Card type | Source | Fields shown and searched | Own page |
|---|---|---|---|
| Plugin | catalog entry, `plugin.json`, `README.md` | name, `displayName`, description, category, keywords, version, author, `defaultEnabled`, `userConfig` options, README | `/plugins/<plugin>/` |
| Skill | `skills/<skill>/SKILL.md` | frontmatter `name`, `description` and flags; body | `/plugins/<plugin>/skills/<skill>/` |
| Agent | `agents/<agent>.md` | frontmatter `name`, `description`, `model`, `tools`; body | `/plugins/<plugin>/agents/<agent>/` |
| Command | `commands/<command>.md` | file name, frontmatter `description`, `argument-hint`; body | `/plugins/<plugin>/commands/<command>/` |
| Hook | `hooks/hooks.json`, or `hooks` in `plugin.json` | event, matcher | no: a section of the plugin page |
| MCP server | `.mcp.json`, or `mcpServers` in `plugin.json` | server name, transport (stdio or HTTP) | no: a section of the plugin page |
| LSP server | the plugin's LSP config | server name | no: a section of the plugin page |
| Guide | `docs/installing.md` | headings, text | `/guides/installing/` |

How each artifact is called, shown on cards as the usage string:

| Type | Usage string |
|---|---|
| Skill, command | `/<plugin>:<name>` |
| Agent | `<plugin>:<agent>` |
| Hook | `<Event> · <matcher>`, for example `PreToolUse · Bash` |
| MCP or LSP server | `<server> (stdio)` or `<server> (HTTP)` |

Not indexed:

- Maintainer docs (`adding-a-plugin.md`, `releasing.md`, `codex-compatibility.md`): linked from the footer as Contributing, opening on GitHub.
- `specs/`, `INSIGHTS.md`, `AGENTS.md`: internal working notes.
- Scripts and other code inside plugins: the cards link to the source on GitHub instead.

## Pages

```
/                                     Search, the home page
/?q=<query>&type=<type>&category=<c>  Search state, kept in the URL
/plugins/<plugin>/                    Plugin
/plugins/<plugin>/skills/<skill>/     Skill
/plugins/<plugin>/agents/<agent>/     Agent
/plugins/<plugin>/commands/<command>/ Command
/guides/installing/                   Getting started
/team-setup/                          Team setup (phase 2)
/whats-new/, /feed.xml                What's new (phase 2)
/404.html                             Not found
```

On every page:

- **Header:** marketplace name linking home, Getting started, What's new (phase 2), Team setup (phase 2), GitHub.
- **Footer:** repository, Contributing, Request a plugin, and "Built from `<short commit>` on `<date>`" so anyone can tell how fresh the site is.

## Screens

Design deliverables: every screen below in light and dark themes, desktop and 360 px mobile, including the listed states.

### Search (home)

```
┌───────────────────────────────────────────────────────────────┐
│ gm-ai-marketplace-angular-nestjs          Getting started  What's new  GitHub │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 🔍 Describe a task, e.g. "review a pull request"     /  │  │
│  └─────────────────────────────────────────────────────────┘  │
│  [All 12] [Plugins 3] [Skills 6] [Agents 2] [Commands 0]      │
│  [Hooks 1] [MCP servers 0] [Guides 0]      Category: [Any ▾]  │
│                                                               │
│  12 results                                                   │
│  ┌ card ───────────┐ ┌ card ───────────┐ ┌ card ───────────┐  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

Elements, in priority order:

1. **Search field.** Large; focused on load on desktop. `/` focuses it from anywhere, `Esc` clears it.
2. **Type filter.** One chip per card type with a live count for the current query.
3. **Category filter.** Values from the catalog's `category` field.
4. **Result count.** Announced to screen readers.
5. **Results.** Cards, best match first.

Behaviour and states:

- **Live results.** Results update as the user types; there is no submit button. The query and filters are written to the URL without adding history entries, so a copied URL reproduces the results and Back leaves the page.
- **Empty query (browse).** All plugins as cards, most recently updated first. The type filter still works: Skills with an empty query lists every skill.
- **Type in the query.** When the query names a type ("skill for…", `скіл для…`), that type is selected automatically and shown as a removable hint: "Showing skills · Show all types". A chip the user picks wins over the hint.
- **No results.** Shows the query and offers:
  - Clear filters, when filters are on.
  - Request a plugin for this: a GitHub issue prefilled with the query.
  - A tip to try English words.
- **Index failed to load.** An inline error with Retry. The pre-rendered plugin list stays visible.
- **No JavaScript.** The pre-rendered plugin list shows; the search field and filters are hidden.

### Result card

```
┌───────────────────────────────────────────┐
│ ◆ Skill                                   │
│ review-pr                                 │
│ in pr-tools · v0.3.1                      │
│ Reviews a pull request for bugs and       │
│ style, then posts a summary…              │
│ [/pr-tools:review-pr ⧉]   [Needs setup]   │
│                          [Copy install ⧉] │
└───────────────────────────────────────────┘
```

- **Type badge:** an icon and a label. Each type gets its own icon; color is never the only cue.
- **Title:** the name, or `displayName` for plugins. Matched words are highlighted.
- **Context line:**
  - for a component: `in <plugin> · v<version>`;
  - for a plugin: `v<version> · <category>`.
- **Description:** at most 3 lines, matched words highlighted.
- **Usage string:** copies on click; see the Content section. Guides have none.
- **Badges, only when they apply:**
  - Needs setup: the plugin declares `userConfig` options.
  - Off by default: the catalog entry sets `"defaultEnabled": false`.
- **Copy install:** copies the parent plugin's command, `claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs`. Shows "Copied" for 2 seconds; screen readers hear it.
- **Card click:** opens the artifact's page. Hooks, MCP servers and LSP servers open their section of the plugin page.

### Plugin page

Sections, in order (hide a section when it has nothing to show):

1. **Header:**
   - `displayName`, with `name` under it when they differ;
   - version, category, author, "Updated `<date>`";
   - description and badges.
2. **Install.** Three tabs, each with a copy button:
   - Terminal: `claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs`
   - In Claude Code: `/plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs`
   - For a project: the `.claude/settings.json` snippet for this plugin (phase 2 links to Team setup instead)

   Below the tabs: "Needs Claude Code 2.1.275 or later. Trouble installing? Getting started".
3. **Setup.** Each `userConfig` option: key, description, and "stored in the system keychain" for sensitive ones.
4. **Contents.** Grouped as Skills, Agents, Commands, Hooks, MCP servers, LSP servers. Each row has a name, description and usage string. Skill, agent and command rows link to their pages.
5. **Context cost (phase 2).** "Adds ≈ N tokens to every session", with always-on and on-invoke tokens per component and a one-line explanation.
6. **README,** rendered. The first heading is dropped when it repeats the plugin name.
7. **Version history (phase 2).** Each version with date and commit subjects, and a compare link on GitHub.
8. **Links:**
   - View source.
   - Report a problem: an issue prefilled with the plugin and version.

### Skill, agent and command pages

1. **Breadcrumb:** plugin › type › name.
2. **Header:** name, type badge, description, usage string, parent plugin and version.
3. **Facts from frontmatter,** only those present:
   - skill: whether users can invoke it, whether Claude invokes it on its own, allowed tools;
   - agent: model, tools;
   - command: argument hint, allowed tools.
4. **Install the parent plugin:** the plugin page's install box, compact.
5. **Instructions:** the rendered body of the file, which is what Claude is told. Long bodies may collapse; design decides.
6. **More from this plugin:** the plugin's other components.
7. **Links:** source, report a problem.

### Getting started

`docs/installing.md`, rendered, with a table of contents and copy buttons on code blocks. Relative links to other repository files open on GitHub.

### Team setup (phase 2)

- **Choose plugins** in a searchable checklist, or with "Add to set" on cards and plugin pages. The selection persists in `localStorage` and in the URL (`?plugins=a,b`), so a lead can send it to the team.
- **The output** follows the format in `docs/installing.md`:
  1. The command that adds the marketplace with project scope.
  2. The `.claude/settings.json` snippet: `extraKnownMarketplaces` plus `enabledPlugins`, with copy and download buttons.
  3. A note on merging into an existing file, and on opting out in `.claude/settings.local.json`.

### What's new (phase 2)

- **Releases, newest first.** Each shows:
  - date, plugin and version change (`0.2.0 → 0.3.0`) with its kind (patch, minor, major);
  - commit subjects since the previous release;
  - a compare link.
- **Catalog events:** new plugins, plus removals and renames from the catalog's `renames`.
- **`/feed.xml`:** an Atom feed of the same entries, so Slack's RSS app can post releases.
- **On the home page:** browse mode may show the latest three releases; design decides.

### 404

A search field and a link home.

## Search

### Query processing

1. Lowercase and normalize Unicode (NFKC). Split on anything but letters, digits and apostrophes inside a word, so `рев'ю` stays one word.
2. Drop stop words in English and Ukrainian (`I`, `need`, `for`, `a`, `мені`, `треба`, `для`, …).
3. Type words set the type filter and are dropped:
   - English: `skill`, `agent`, `command`, `hook`, `mcp`, `plugin`, `guide`, with plurals;
   - Ukrainian forms: `скіл`, `скіли`, `агент`, `хук`, `плагін`, `команда`, ….
4. Reduce English words to a simple stem on both sides: `reviews`, `reviewing` → `review`.
5. Expand words through the synonyms list, mainly Ukrainian to English: `рев'ю` → `review`.

Stop words, type words and synonyms live in `site/search-terms.json`, so maintainers extend them without touching code.

### Matching and ranking

- **Field weights:**

  | Field | Weight |
  |---|---|
  | name | 5 |
  | keywords | 4 |
  | description | 3 |
  | usage string | 2 |
  | parent plugin name, headings | 1.5 |
  | body text | 1 |

- **Match quality:** exact word, then prefix (query words of 3+ characters), then one typo (query words of 5+ characters).
- **Weighted score:** each query word scores its best field, weight × match quality, and the document's score is the sum over query words. Taking the best field rather than adding all of them keeps a plugin's long README from outranking a skill whose name matches.
- **Ordering:**
  1. Documents that match more distinct query words rank first.
  2. Then by weighted score.
  3. Ties go by type: plugin, skill, agent, command, hook, MCP server, LSP server, guide.
  4. Then by name.
- **Minimum:** a result matches at least one query word.

### Acceptance examples

Fixture: plugin `pr-tools` with skill `review-pr`, description "Reviews a pull request for bugs and style".

| Query | Expected |
|---|---|
| `review pull request` | `review-pr` first |
| `revew pr` | `review-pr` in the results (one typo) |
| `skill for reviewing PRs` | type set to Skills; `review-pr` first |
| `мені треба скіл для рев'ю PR` | type set to Skills; `review-pr` first |
| `xyzzy` | no-results state with the Request a plugin link |

## Technical design

### Layout

Everything the site needs lives in `site/`, apart from files GitHub requires elsewhere, so it stays apart from the marketplace itself:

```
site/
├── build.mjs           builds _site/ from the repository
├── dev.mjs             local server: rebuilds on changes, reloads the browser
├── config.mjs          repository, branch, base path, locale
├── i18n/en.json        every UI string, so none is written into templates or scripts
├── lib/                build steps
├── templates/          page templates
├── assets/             CSS and client-side JavaScript, served as-is
├── vendor/             pinned third-party files, see Dependencies
├── search-terms.json   stop words, type words, synonyms
└── tests/              fixtures and node:test tests for the build and search
.github/workflows/site.yml
.github/ISSUE_TEMPLATE/plugin-request.yml, bug-report.yml
```

`_site/` goes into `.gitignore`.

### Build: `node site/build.mjs [--out _site] [--root <dir>]`

`--root` points the build at a fixture repository in tests.

1. **Read the catalog and every plugin.** Parse frontmatter with a small built-in parser for the YAML subset skills use: scalars, quoted strings, `>` and `|` blocks, simple lists, and one level of mapping (`metadata:` with `tags`, which become search keywords). Fail with `file:line` on anything else, and on a skill, agent or command without `name` or `description`.
2. **Check the inventory.** For each plugin, compare the components found with `claude --plugin-dir plugins/<name> plugin details <name>`, and fail on a mismatch. This catches components in custom paths and component types the build doesn't know yet. When the `claude` CLI is missing locally, skip the check with a warning, as `validate.sh` does for shellcheck; CI requires it.
3. **Read git history.** Last commit date per plugin. In phase 2, also the version history from `plugin.json` and the commit subjects between versions. Needs the full history (`fetch-depth: 0`).
4. **Render Markdown** for READMEs, component bodies and `docs/installing.md`. Raw HTML in Markdown is escaped. Relative links resolve to the file on GitHub. Relative images are copied into the site, because the CSP allows no other origin; a missing image fails the build.
5. **Write the output:** pages, `index.json`, `404.html`, and in phase 2 `feed.xml`.
6. **Stay deterministic.** The same commit gives the same output: dates come from git, not the clock.
7. **Phase 2, context cost:** parsed from the same `claude plugin details` output ("Always-on", "Per-component").

### `index.json`

Versioned, because the phase 3 plugin reads it too.

```json
{
  "version": 1,
  "marketplace": { "name": "gm-ai-marketplace-angular-nestjs", "repo": "sgdiachenko/gm-ai-marketplace-angular-nestjs" },
  "build": { "commit": "abc1234", "date": "2026-10-14T10:00:00Z" },
  "categories": ["templates"],
  "items": [
    {
      "id": "skill:example/hello",
      "type": "skill",
      "name": "hello",
      "title": "hello",
      "plugin": "example",
      "pluginVersion": "0.1.0",
      "description": "Confirms that the example plugin from gm-ai-marketplace-angular-nestjs is installed.",
      "category": "templates",
      "keywords": [],
      "usage": "/example:hello",
      "badges": [],
      "url": "plugins/example/skills/hello/",
      "source": "https://github.com/sgdiachenko/gm-ai-marketplace-angular-nestjs/blob/main/plugins/example/skills/hello/SKILL.md",
      "updated": "2026-10-13",
      "headings": [],
      "text": "Body as plain text, Markdown stripped"
    }
  ]
}
```

`type` is one of `plugin`, `skill`, `agent`, `command`, `hook`, `mcp-server`, `lsp-server`, `guide`. `badges` holds `needs-setup` and `off-by-default`. The build warns when the gzipped index exceeds 250 KB.

### Client

- **Code:** plain HTML, CSS and ES modules, with no framework, bundler or client build step.
- **Index:** `index.json` loads after first paint.
- **Theme:** follows the system light or dark setting; a toggle is optional in design.
- **Privacy:** no cookies, analytics or third-party requests. A CSP meta tag allows only the site's own origin.
- **Storage:** `localStorage` holds the Team setup selection only (phase 2).

### Dependencies

The repository has no npm dependencies, and the site needs a Markdown renderer at build time. Proposal:

- Vendor `marked` into `site/vendor/`. It is a single file under the MIT license with no dependencies of its own.
- Optionally vendor `MiniSearch` for the client. It goes in only if writing the search behaviour above by hand turns out larger.
- Record versions and licenses in `site/vendor/README.md`.
- Update vendored files by copying them by hand, in their own PR.

### Deploy

`.github/workflows/site.yml`, a workflow of its own, so the site's result shows as a separate check from the marketplace checks in `validate.yml`:

- **Triggers:**
  - every pull request, so a PR fails on content the site can't build;
  - every push to `main`, with no path filter: the build takes seconds, and path filters miss template changes;
  - `workflow_dispatch` with an optional `ref` input, to redeploy an older commit.
- **Build and test the site** (all triggers):
  1. checkout with `fetch-depth: 0`;
  2. Node;
  3. Claude Code pinned to the same version as `validate.yml`;
  4. `node --test site/tests/*.test.mjs`;
  5. `node site/build.mjs`, with its summary in the job summary;
  6. `actions/upload-pages-artifact`, except on pull requests.
- **Deploy to GitHub Pages** (`main` only): `actions/deploy-pages` in the `github-pages` environment.
- **Permissions:** `contents: read`; the deploy job alone gets `pages: write` and `id-token: write`.
- **Concurrency:** deploys share group `pages` without cancel-in-progress, so they finish in order; a newer push cancels an older build on the same pull request.
- **One-time setup:** repository Settings → Pages → Source: GitHub Actions.

`scripts/validate.sh` stays the marketplace check; the site has its own commands (`site/README.md`).

### Rollback

- **A bad plugin release.** Use `node scripts/rollback.mjs <plugin> <good-version>` (see `docs/releasing.md`). The site follows `main`.
- **A broken site.** Revert the commit, or run the Pages workflow by hand with `ref` set to the last good commit.

No site-specific script is needed.

### Issue forms

Two issue forms:

| Form | Fields |
|---|---|
| `plugin-request.yml` | what you need, an example task, who would use it |
| `bug-report.yml` | plugin, version, what happened |

The site prefills them through URL parameters, for example `issues/new?template=plugin-request.yml&need=<query>`.

## Quality bar

- **Accessibility:** WCAG 2.2 AA.
  - Visible focus; every action reachable from the keyboard.
  - Result counts and copy confirmations announced through `aria-live`.
  - Badges and types never rely on color alone.
  - `prefers-reduced-motion` respected.
- **Layout:** works from 360 px wide. On mobile the filters collapse; design decides how.
- **Performance:**
  - At most 100 KB gzipped (HTML, CSS and JavaScript) before the index loads.
  - Results within 50 ms of a keystroke at 1,000 indexed items on a mid-range laptop.

## Before launch

- Link the site from the repository README and the GitHub repository's website field.

## Open questions for design

1. Results: one flat list, as specified, or grouped under their plugin?
2. Identity: there is no logo or brand yet. Name only, or a simple mark?
3. Cards: a grid or a list? Density on mobile?
4. Team setup in phase 2: a separate page, or a "set" tray that stays visible on every page?

## Later (phase 3)

- **`catalog` plugin.** A skill that fetches `https://sgdiachenko.github.io/gm-ai-marketplace-angular-nestjs/index.json` and recommends artifacts for the user's request from inside Claude Code, in any language.
- **Keyword enrichment.** A maintainer script asks Claude for English and Ukrainian keywords and example requests for each artifact. The output is committed to `site/enrichment.json` and reviewed in the PR. CI only checks that it matches the content hashes, so no API key goes into CI.
- **Maintainer health page.** Long descriptions, missing READMEs, context cost outliers.
