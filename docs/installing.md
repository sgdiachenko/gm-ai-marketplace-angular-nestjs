# Installing plugins from gm-ai-marketplace-angular-nestjs

## Requirements

- Claude Code 2.1.275 or later for the one-step install in a session, 2.1.292 or later for the one-step install from a terminal. On older versions, add the marketplace first, then install. CI validates the catalog against the version pinned in `.github/workflows/validate.yml`.
- `git`.

## Git access

The repository is **private**. Claude Code clones it by running `git` on your machine with prompts turned off, using credentials your machine already holds; it has no token of its own. You need read access to `sgdiachenko/gm-ai-marketplace-angular-nestjs` on GitHub (ask the owner to add you as a collaborator).

Set up HTTPS access once:

```bash
gh auth login
gh auth setup-git
```

Then add `export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to your shell profile. For an `owner/repo` source, Claude Code first probes `ssh -T git@github.com` and clones over SSH when the probe succeeds. If your SSH key belongs to a GitHub account without access to this repository, that clone fails; installs from `/plugin` and plugin updates don't fall back to HTTPS on their own. The variable skips the probe and goes straight to HTTPS with the credential `gh auth setup-git` stored.

SSH works too, when your key is loaded in `ssh-agent` and belongs to an account with access to the repository.

**Auto-update** checks the private repository in the background without prompting. It works when your credential helper answers on its own (after `gh auth setup-git`, or a key in `ssh-agent`). A `GITHUB_TOKEN` in the environment alone doesn't authenticate the check. If the check can't authenticate, Claude Code re-clones and keeps the old checkout when that fails too; set `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` to skip the re-clone attempt.

## Install

The commands below run in one of two places, and each block holds one command:

- **In a terminal**: your shell, such as macOS Terminal, iTerm or the terminal of your IDE. These commands start with `claude plugin`. Inside a running Claude Code session, you can run one by putting `!` in front of it.
- **In a Claude Code session**: at the Claude Code prompt. These commands start with `/plugin`.

Replace `<plugin>` with the plugin's name, such as `sdd-engineering`. A plugin installs together with the plugins it depends on.

### In a terminal

Add the marketplace, once per machine:

```bash
claude plugin marketplace add sgdiachenko/gm-ai-marketplace-angular-nestjs
```

Install a plugin for yourself, in every project:

```bash
claude plugin install <plugin>@gm-ai-marketplace-angular-nestjs
```

Or do both in one command, on Claude Code 2.1.292 or later:

```bash
claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs
```

A Claude Code session that is already open loads the plugin after `/reload-plugins`.

### In a Claude Code session

Add the marketplace:

```text
/plugin marketplace add sgdiachenko/gm-ai-marketplace-angular-nestjs
```

Install a plugin:

```text
/plugin install <plugin>@gm-ai-marketplace-angular-nestjs
```

Or do both in one command, on Claude Code 2.1.275 or later. This is the command **Copy install** copies in the catalog:

```text
/plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs
```

In a session, `/plugin install` doesn't install right away. It opens the plugin's details and asks where to install it: for you in every project (user scope), for everyone who works in this repository (project scope) or for you in this repository only (local scope). There is no `--scope` flag in a session. `/plugin` on its own lists everything in the catalog.

## Install into a project

To install a plugin for one repository, so that everyone who works in it gets it, run these in a terminal from the repository's root. Both take `--scope project`:

```bash
claude plugin marketplace add sgdiachenko/gm-ai-marketplace-angular-nestjs --scope project
```

```bash
claude plugin install <plugin>@gm-ai-marketplace-angular-nestjs --scope project
```

The first command declares the marketplace in the project's `.claude/settings.json`; the second enables the plugin and its dependencies there. Commit `.claude/settings.json`. Don't use the one-step `--marketplace` form for a project: it declares the marketplace in your user settings even with `--scope project`, so teammates wouldn't get it.

In a session, choosing **project scope** in the `/plugin install <plugin>@gm-ai-marketplace-angular-nestjs` panel enables the plugin for the repository too. Run the terminal `marketplace add … --scope project` command above as well, so the marketplace is declared in the project.

To write the file by hand instead, list the marketplace and the plugins in `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "gm-ai-marketplace-angular-nestjs": {
      "source": { "source": "github", "repo": "sgdiachenko/gm-ai-marketplace-angular-nestjs" }
    }
  },
  "enabledPlugins": {
    "example@gm-ai-marketplace-angular-nestjs": true
  }
}
```

- Teammates get the plugins after they accept the workspace trust dialog for the folder, provided they have read access to this private repository and the git setup under *Git access*. Every plugin here uses a relative-path source, so it loads without a separate install step.
- To opt out on your machine, set the plugin to `false` in `.claude/settings.local.json`.
- Cloud sessions don't add marketplaces listed in a repository's settings.

## Switch a project from gm-ai-marketplace

This catalog has the same plugin names as `gm-ai-marketplace`, but a different catalog name, so both can be installed side by side: `sdd-engineering@gm-ai-marketplace` and `sdd-engineering@gm-ai-marketplace-angular-nestjs` are separate installs. Two enabled copies of one plugin load the same namespaced skill and agent names (`engineering-paved-path:security`, `sdd-engineering:implementer`), so a project enables **one** set.

To use this copy in one Angular + NestJS project, for yourself only, run these in a terminal from the project's root. Everything goes to `.claude/settings.local.json` (local scope); your user settings and the project's committed `.claude/settings.json` don't change, and every other project keeps what it had.

1. Turn the originals off in this project, dependents first (`claude plugin disable` refuses a plugin that an enabled plugin still requires). Disable, don't uninstall: uninstalling removes them from your other projects too.

   ```bash
   for p in sdd-engineering architecture-review research-tools engineering-paved-path; do
     claude plugin disable "$p@gm-ai-marketplace" --scope local
   done
   ```

   A plugin that isn't enabled here prints `already disabled at local scope` and nothing changes; that's fine.

2. Register this marketplace for the project:

   ```bash
   claude plugin marketplace add sgdiachenko/gm-ai-marketplace-angular-nestjs --scope local
   ```

3. Install `sdd-engineering`; its three dependencies come with it:

   ```bash
   claude plugin install sdd-engineering@gm-ai-marketplace-angular-nestjs --scope local
   ```

4. Check: in the project, the four `@gm-ai-marketplace` plugins are `disabled` and the four `@gm-ai-marketplace-angular-nestjs` plugins `enabled`; in any other directory, nothing changed.

   ```bash
   claude plugin list
   ```

   In an open session, run `/reload-plugins`. To see which copy a session really loads, run `node scripts/trace-plugin-version.mjs <project-dir>` from this repository.

The resulting `.claude/settings.local.json`:

```json
{
  "enabledPlugins": {
    "sdd-engineering@gm-ai-marketplace": false,
    "architecture-review@gm-ai-marketplace": false,
    "research-tools@gm-ai-marketplace": false,
    "engineering-paved-path@gm-ai-marketplace": false,
    "sdd-engineering@gm-ai-marketplace-angular-nestjs": true,
    "engineering-paved-path@gm-ai-marketplace-angular-nestjs": true,
    "research-tools@gm-ai-marketplace-angular-nestjs": true,
    "architecture-review@gm-ai-marketplace-angular-nestjs": true
  },
  "extraKnownMarketplaces": {
    "gm-ai-marketplace-angular-nestjs": {
      "source": { "source": "github", "repo": "sgdiachenko/gm-ai-marketplace-angular-nestjs" }
    }
  }
}
```

Local settings override user and project settings, so the `false` entries also win over originals a teammate enabled in the committed `.claude/settings.json`. Keep `.claude/settings.local.json` out of git: Claude Code's convention is to ignore it, but check that your `.gitignore` or global git ignore covers it.

To go back, reverse the order: disable the copies (`sdd-engineering`, `architecture-review`, `research-tools`, `engineering-paved-path` `@gm-ai-marketplace-angular-nestjs`, `--scope local`), then enable the originals (`engineering-paved-path`, `research-tools`, `architecture-review`, `sdd-engineering` `@gm-ai-marketplace`, `--scope local`), or delete those entries from `.claude/settings.local.json`.

For the whole team instead, use `--scope project` in steps 1–3 and commit `.claude/settings.json`; every teammate then needs access to this private repository.

## Updates

Auto-update is off for this marketplace by default. To turn it on: `/plugin` → **Marketplaces** → `gm-ai-marketplace-angular-nestjs` → **Enable auto-update**. Claude Code then checks after your first message in a session and asks you to run `/reload-plugins`. A project can keep it off for itself with `"autoUpdate": false` on the marketplace's entry in its `.claude/settings.json`.

To update by hand, refresh the catalog first, then update the plugin. These are two separate steps.

### Update in a terminal

Refresh the catalog, so new plugins and new versions show up:

```bash
claude plugin marketplace update gm-ai-marketplace-angular-nestjs
```

Update one installed plugin to the version the catalog lists:

```bash
claude plugin update <plugin>@gm-ai-marketplace-angular-nestjs
```

For a plugin installed into a project, add `--scope project`:

```bash
claude plugin update <plugin>@gm-ai-marketplace-angular-nestjs --scope project
```

Then run `/reload-plugins` in an open session, or restart Claude Code.

### Update in a Claude Code session

Refresh the catalog:

```text
/plugin marketplace update gm-ai-marketplace-angular-nestjs
```

Then open `/plugin`, find the plugin on the **Installed** tab, choose **Update now**, and load the new version:

```text
/reload-plugins
```

## For administrators

Managed settings can register the marketplace with `"autoUpdate": true` for everyone, force-enable plugins through `enabledPlugins`, and restrict other sources with `strictKnownMarketplaces`. See [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org).
