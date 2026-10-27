# Security

Everything under `plugins/<name>/` is copied to the machine of every user who installs the plugin, and its skills, agents and hooks run with that user's permissions. This file sets what a plugin may contain and what to do when a release turns out to be unsafe.

## What a plugin never contains

- **Secrets.** No API keys, tokens, passwords or private keys in any file: manifests, skills, agents, hooks, MCP configs, examples. A credential a plugin needs comes from the user at run time, through `userConfig` with `"sensitive": true` or an environment variable the user sets. Installed copies and git history keep whatever was committed, so a committed secret is leaked even after the commit is reverted.
- **Absolute paths.** No `/Users/<name>/…`, `/home/<name>/…` or `C:\Users\…`. Refer to bundled files as `${CLAUDE_PLUGIN_ROOT}/…` or `${CLAUDE_SKILL_DIR}/…`, to persistent state as `${CLAUDE_PLUGIN_DATA}/…`, and to project files through paths the user or the project profile gives.
- **One project's names.** No paths, module names or rules of the project a component was taken from; see the forbidden-reference rule in `scripts/check-marketplace.mjs`.

`scripts/check-marketplace.mjs` fails on absolute home paths, common credential formats (Anthropic, GitHub, AWS and Slack tokens, PEM private keys) and project-specific references in plugin files. CI runs it on every pull request. The patterns catch mistakes, not every secret: review what you add.

## Least privilege

- **Agents.** Plugin agents ignore `permissionMode`, so `tools` and `disallowedTools` are the only limits. Read-only agents list no `Write`, `Edit` or `NotebookEdit`; agents that may change files say in their prompt which files.
- **Hooks and MCP servers.** They run outside the model's permission prompts, as the user. A plugin adds them only when its README says why, and an MCP server that reaches the network or needs credentials is an optional integration, documented as such, not something a workflow plugin turns on silently.
- **Network.** Skills and agents that fetch from the web say so in their description.

## Report a vulnerability

The repository is private: report a vulnerability to the code owner in `.github/CODEOWNERS` directly, not in an issue other collaborators can read.

## After an unsafe release

1. **Stop the spread.** Publish the last good files under a new, higher version: `node scripts/rollback.mjs <name> <good-version>`, then a PR as for any release (`docs/releasing.md`). Users with auto-update on get it in their next session; users on a stable channel, once one exists, are unaffected unless the release was promoted there.
2. **Rotate first, clean up second**, if a secret was published: revoke it at its provider before anything else. Removing it from the repository doesn't remove it from clones, forks or installed caches.
3. **Tell users with auto-update off** to run `claude plugin update <name>@gm-ai-marketplace-angular-nestjs`.
4. **Remove the plugin** if no safe version exists: delete its entry, record `"<name>": null` in `renames`, and set `forceRemoveDeletedPlugins` so Claude Code uninstalls it at session start (`docs/releasing.md`).
5. **Record what happened** in `INSIGHTS.md` and add a check that would have caught it.
