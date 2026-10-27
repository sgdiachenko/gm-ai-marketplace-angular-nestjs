# gm-ai-marketplace-angular-nestjs

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) for the team's **Angular + NestJS** projects. One repository, one catalog (`.claude-plugin/marketplace.json`), one directory per plugin in `plugins/`.

It is an independent copy of [`sgdiachenko/gm-ai-marketplace`](https://github.com/sgdiachenko/gm-ai-marketplace), forked from its `main` at `be94e42`. The plugin names and the SDD workflow are the same; the stack skills are Angular and NestJS instead of React, Next.js and Fastify. The two catalogs have different names, so their plugins never collide: `sdd-engineering@gm-ai-marketplace` and `sdd-engineering@gm-ai-marketplace-angular-nestjs` are different installs. Enable one set per project — see [docs/installing.md](docs/installing.md#switch-a-project-from-gm-ai-marketplace).

## Install

The repository is **private**. Claude Code clones it with your own git credentials, so set up access once (details in [docs/installing.md](docs/installing.md#git-access)):

```bash
gh auth login
gh auth setup-git
export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1   # put it in your shell profile
```

In a Claude Code session, add the marketplace once:

```
/plugin marketplace add sgdiachenko/gm-ai-marketplace-angular-nestjs
```

Then install a plugin:

```
/plugin install <plugin>@gm-ai-marketplace-angular-nestjs
```

`<plugin>` is a name from the table below, the `name` of an entry in `.claude-plugin/marketplace.json`; `gm-ai-marketplace-angular-nestjs` is the catalog name. `/plugin` on its own browses the catalog.

From a terminal, one command does both (Claude Code 2.1.292 or later):

```bash
claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs
```

## Update

Updating is two different things:

| Command | What it does |
|---|---|
| `/plugin marketplace update gm-ai-marketplace-angular-nestjs` | Refreshes the catalog, so new plugins and new versions show up |
| `claude plugin update <plugin>@gm-ai-marketplace-angular-nestjs` | Updates one installed plugin to the version the catalog lists; run `/reload-plugins` or restart Claude Code to load it |

Auto-update is off by default. To turn it on: `/plugin` → **Marketplaces** → `gm-ai-marketplace-angular-nestjs` → **Enable auto-update**. For a private repository it works only when your git credential helper can answer without prompting (`gh auth setup-git` does that).

Setup details and enabling plugins for a whole project: [docs/installing.md](docs/installing.md).

## Plugins

| Plugin | What it does |
|---|---|
| [sdd-engineering](plugins/sdd-engineering) | Spec-Driven Development: spec, plan, parallel implementation, verification against the spec, architecture and code review, a retro of the run. Installs the three plugins below |
| [engineering-paved-path](plugins/engineering-paved-path) | Shared engineering skills: the Angular team's official `angular-developer`, NestJS practices, Angular and NestJS architecture, security, `INSIGHTS.md` |
| [research-tools](plugins/research-tools) | Read-only `researcher` agent: answers a concrete question with evidence from the repo or external sources |
| [architecture-review](plugins/architecture-review) | Read-only `architecture-reviewer` agent: dependency direction, NestJS layering and Angular module boundaries in a diff |
| [example](plugins/example) | Template plugin. Copy it to start a new one; remove it once real plugins exist |

An example SDD profile for an Angular `client/` + NestJS `server/` project: [docs/examples/sdd-profile-angular-nestjs-starter.md](docs/examples/sdd-profile-angular-nestjs-starter.md).

## Contributing

- Add a plugin: [docs/adding-a-plugin.md](docs/adding-a-plugin.md)
- Release, roll back, rename or remove a plugin: [docs/releasing.md](docs/releasing.md)
- Planned Codex support and the rules that keep it cheap: [docs/codex-compatibility.md](docs/codex-compatibility.md)
- Before pushing, run `scripts/validate.sh`. CI runs the same checks, plus a version-bump check on pull requests.
- The catalog site has its own check, Site; see [site/README.md](site/README.md).

## Layout

```
.claude-plugin/marketplace.json   catalog: one entry per plugin
plugins/<name>/                   a plugin; everything here ships to users
scripts/                          validation, release tagging and eval runs
evals/                            behaviour tests run with claude plugin eval; never shipped
site/                             the catalog site, built from this repository
docs/                             maintainer and user docs
specs/                            specs for planned plugins and changes
INSIGHTS.md                       lessons learned
AGENTS.md                         instructions for coding agents working on this repo
```
