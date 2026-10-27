# Catalog site

The static site for https://sgdiachenko.github.io/gm-ai-marketplace-angular-nestjs/ (not deployed while the repository is private and the `PAGES_ENABLED` variable is unset): search over every plugin, skill, agent, command, hook and MCP server in the marketplace, with install commands. It is built from this repository; nothing on it is written by hand. Spec: `specs/catalog-site.md`. Design: the claude.ai/design project "Catalog Site".

Everything the site needs lives in this directory, apart from the GitHub files that must sit elsewhere: `.github/workflows/site.yml` and `.github/ISSUE_TEMPLATE/`. Nothing here ships to plugin users, and changing it never needs a plugin version bump.

## Commands

- **Develop:** `node site/dev.mjs` serves http://localhost:4000/gm-ai-marketplace-angular-nestjs/ the way GitHub Pages does, rebuilds when `site/`, `plugins/`, `.claude-plugin/` or `docs/` change, and reloads the browser. A failed build shows in the terminal and on the page, over the last good build. `--port` changes the port, `--inventory` adds the `claude plugin details` check to every rebuild, `--root site/tests/fixture` previews the test fixture instead of the real plugins.
- **Build:** `node site/build.mjs` writes `_site/` (gitignored). `--out <dir>` picks another directory, `--root <dir>` reads another repository, `--base <path>` changes the absolute path 404.html uses.
- **Test:** `node --test site/tests/*.test.mjs`.

Opening the built HTML files from disk doesn't work: browsers block modules and `fetch` on `file://`. Use the dev server.

## Where the site is built

On GitHub Actions, in `.github/workflows/site.yml`, apart from the marketplace checks in `validate.yml`:

| Job | Runs on | Does |
|---|---|---|
| Build and test the site | every pull request and every push to `main` | runs the tests, builds the site from the checked-out commit with Claude Code installed for the inventory check, and writes a summary |
| Deploy to GitHub Pages | pushes to `main` and manual runs from `main`, when the repository variable `PAGES_ENABLED` is `true` | publishes the build from the job above |

The build output is never committed: there is no `gh-pages` branch. GitHub keeps each deploy as an artifact.

To roll the site back, run the Site workflow by hand from `main` with `ref` set to the last good commit. One-time setup: Settings → Pages → Source: GitHub Actions, then the repository variable `PAGES_ENABLED=true`. Pages for a private repository needs a paid GitHub plan.

## How content gets in

There is no separate indexing step to remember. Every build reads the repository as it is at that commit and writes `index.json` from scratch, so merging a new plugin, skill or fix to `main` puts it on the site a minute later. The browser loads `index.json` from the site; it never calls GitHub.

**Indexed:**

- every plugin listed in `.claude-plugin/marketplace.json`, with its `plugin.json` and `README.md`;
- in each plugin: skills (`skills/*/SKILL.md`), agents (`agents/*.md`), commands (`commands/*.md`), hooks (`hooks/hooks.json`), MCP servers (`.mcp.json`) and LSP servers (`.lsp.json`), plus extra paths that `plugin.json` names for them;
- `docs/installing.md`, as Getting started.

**Not indexed:** plugins missing from the catalog (`scripts/check-marketplace.mjs` already rejects them), maintainer docs, `specs/`, `INSIGHTS.md`, `AGENTS.md`, and scripts or other files inside plugins; cards link to the source on GitHub instead.

**The build fails, and nothing deploys, when content can't be shown:**

- frontmatter outside the supported YAML subset (scalars, quoted strings, `>` and `|` blocks, lists, one level of mapping such as `metadata:`), with `file:line`;
- a skill or agent without `name` or `description`, or a command without `description`;
- a component Claude Code loads that the build didn't find, or the other way round (`claude plugin details`);
- a README image that doesn't exist, or a link in the site that points nowhere.

Only content from this repository appears. The test fixture in `tests/fixture/` is used by the tests and by `dev.mjs --root`, never by the deployed site.

## Text and translations

Every text the site shows, apart from repository content, is in one file: `i18n/en.json`. Templates and scripts refer to keys (`t.search.placeholder`); the build passes the strings to the templates and ships them to the browser as `assets/i18n.js`. Strings use `{name}` placeholders, and counts use plural forms (`{ "one": "{n} result", "other": "{n} results" }`, any `Intl.PluralRules` category). `tests/i18n.test.mjs` fails on a key that doesn't exist and on visible text written into a template or script.

To add a language, copy `en.json` to `<locale>.json`, translate the values and set `LOCALE` in `config.mjs`. The site serves one language at a time.

Search words are a separate file, `search-terms.json`: stop words, words that name a type in English or Ukrainian (such as `skill`), and synonyms that map other languages to the English words in the index.

## Layout

```
site/
├── build.mjs           reads the repository, renders pages and index.json, checks every link
├── dev.mjs             local server with rebuilds and live reload
├── config.mjs          repository, branch, base path and locale
├── i18n/en.json        every UI string
├── lib/                build steps: catalog and plugins, frontmatter, Markdown, git dates, inventory check
├── templates/          page templates, plain functions returning HTML
├── assets/             served as-is: CSS and the browser's ES modules
├── vendor/             pinned third-party files, see vendor/README.md
├── search-terms.json   stop words, type words and synonyms for search
├── package.json        marks site/ as ES modules; no dependencies
└── tests/              node:test tests and the fixture repository they build
```

`assets/search.js`, `assets/render.js` and `assets/text.js` run both in the build and in the browser, so pre-rendered cards and live results share one implementation.

## How it fits GitHub Pages

- Pages link to each other with relative paths, so the site works at `/gm-ai-marketplace-angular-nestjs/`, at a fork's path and in the dev server. Only `404.html`, which GitHub serves at any depth, uses the absolute base path.
- The build fails when a relative link, image or icon points at a file that isn't in the output.
- A CSP meta tag allows only the site's own origin: fonts and icons are vendored, README images are copied into the site, and there are no inline scripts or `style` attributes.

## Maintaining

- **A new component type or location.** The inventory check fails; teach `lib/read-repo.mjs` to read it, then add it to the fixture in `tests/fixture/`.
- **Icons.** Copy the SVG from `@phosphor-icons/core` (regular weight) into `vendor/phosphor/`. The build makes a sprite of every file there.
