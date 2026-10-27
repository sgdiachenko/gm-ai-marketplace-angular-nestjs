# Releasing, renaming and removing plugins

## Versioning

Each plugin has its own semver `version` in `plugins/<name>/.claude-plugin/plugin.json`. There is no repo-wide version, and catalog entries carry none.

Claude Code caches a plugin by its version. Push new commits under the same version and users keep the old copy. So every PR that changes files under `plugins/<name>/` bumps that plugin's version. Changes to the plugin's `README.md` or `CHANGELOG.md` alone are exempt. `scripts/check-pr.mjs` enforces this in CI.

Every release adds a `## <version> — <YYYY-MM-DD>` entry to the plugin's `CHANGELOG.md`, with `Added`, `Changed`, `Removed` or `Fixed` lists. `scripts/check-marketplace.mjs` fails when the entry for the version in `plugin.json` is missing.

| Bump | When |
|---|---|
| patch `0.1.0 → 0.1.1` | fixes, wording changes in skills or agents |
| minor `0.1.1 → 0.2.0` | a new skill, agent, hook or `userConfig` option |
| major `0.2.0 → 1.0.0` | removed or renamed components or `userConfig` keys, behaviour users must adapt to |

Keep each PR to one plugin where you can, so a release is easy to review and roll back.

## Dependencies between plugins

A plugin that uses another plugin's skill or agent declares it in `plugin.json`:

```json
"dependencies": [{ "name": "engineering-paved-path", "version": "^2.0.0" }]
```

- **Declare every plugin you name.** A `<plugin>:<component>` reference anywhere in a plugin must name the plugin itself or a direct dependency; reaching it through another dependency doesn't count. `scripts/check-marketplace.mjs` checks this, that the component exists, and that the dependency's current version satisfies the range.
- **Ranges resolve against git tags** named `<plugin>--v<version>` in this repository. The repository started without tags: the tags of `gm-ai-marketplace` were deliberately not copied, and the first push to `main` tagged the versions it shipped (`engineering-paved-path--v2.0.0`, `architecture-review--v2.0.0`, `sdd-engineering--v2.0.0`, `research-tools--v1.0.1`, `example--v0.1.1`). After each merge to `main`, `.github/workflows/tag-releases.yml` runs `scripts/tag-releases.mjs --push`, which tags every plugin version that has no tag yet. Without a matching tag, Claude Code installs the catalog's current copy and disables the dependent plugin if that copy is outside the range.
- **Release dependencies first.** A dependent's new range must be satisfied by a version already on `main`. With one PR per plugin, merge the dependency's release, then the dependent's.
- **A major release of a dependency** breaks every dependent pinned to the old major. Release the dependency, then bump each dependent's range in its own release after testing it.
- **Testing locally**, load the dependent and its dependencies together: `claude --plugin-dir plugins/<dependency> --plugin-dir plugins/<name>`. A local copy satisfies any range.

## Check a release before merging

Push the branch, then install from it the way users will:

```bash
git push -u origin <branch>
scripts/try-install.sh <name>
```

The script adds the marketplace from the pushed branch to a throwaway profile (`CLAUDE_CONFIG_DIR`), installs the plugin through the plugin cache, and prints its components and token cost. `~/.claude` is left alone. It stops if the branch isn't pushed or differs from your local copy. Add `--keep` to keep the profile and try the plugin in a session; pass a branch name after the plugin to test someone else's branch.

## How a release reaches users

After the merge to `main`:

- Users with auto-update on get it in their next session, after a random delay of up to ten minutes, and are asked to run `/reload-plugins`.
- Everyone else runs `/plugin marketplace update gm-ai-marketplace-angular-nestjs` or `claude plugin update <name>@gm-ai-marketplace-angular-nestjs`.

## Roll back a release

Publish the old files under a new, higher version:

```bash
node scripts/rollback.mjs <name> <good-version>
```

The script finds the last commit where the plugin had `<good-version>` and restores `plugins/<name>/` from it, deleting files added since. It sets the version to the next patch above the current one: with `0.3.0` bad and `0.2.0` good, you get `0.3.1` containing the files of `0.2.0`. A git ref works in place of the version. The result is staged, not committed. The catalog entry is left as is; the script says when it changed since the good version. Review with `git diff --staged`, then open a PR as for any release.

Don't `git revert` a release. The version goes back down, so `scripts/check-pr.mjs` fails, and Claude Code caches by version, so users who have the bad version may never get the old files back.

Users with auto-update off keep the bad version until they run `claude plugin update <name>@gm-ai-marketplace-angular-nestjs`; tell them.

## Rename a plugin

A plugin's `name` is its install id, stored in users' `enabledPlugins` and `pluginConfigs`. For a cosmetic change, set `displayName` in `plugin.json` and keep `name`.

If the name itself must change:

1. Rename the directory, the catalog entry `name` and `source`, and the `name` in `plugin.json`.
2. Add the old name to `renames` at the top level of `.claude-plugin/marketplace.json`:
   ```json
   "renames": { "old-name": "new-name" }
   ```
3. Bump the version.

Claude Code then moves existing users to the new name. Users who added the marketplace from git may need to run `/plugin install new-name@gm-ai-marketplace-angular-nestjs` once.

`renames` is append-only history. Never edit or delete an entry. When you rename again, add a new entry; Claude Code follows the chain from the oldest name. `scripts/check-pr.mjs` fails a PR that drops a plugin without a `renames` entry or deletes an existing one.

## Remove a plugin

There is no "deprecated" state. To retire a plugin:

1. Delete its directory and its catalog entry, and its row in the root `README.md`.
2. Record the removal: `"renames": { "old-name": null }`.
3. Optionally set `"forceRemoveDeletedPlugins": true` at the top level of the catalog. Claude Code then uninstalls removed plugins from users' machines at session start. Without it, a removed plugin stays installed and reports `not found in marketplace`.

## Release channels

One catalog serves one version of each plugin, so a channel is a second catalog. Both would live in this repository. **This repository has no `stable` branch yet**: only the latest channel exists. To create the stable channel, branch `stable` from a verified `main` commit and add one commit that renames the catalog to `gm-ai-marketplace-angular-nestjs-stable`; the rest of this section then applies.

| Channel | Users add | Catalog `name` | Serves |
|---|---|---|---|
| latest | `sgdiachenko/gm-ai-marketplace-angular-nestjs` | `gm-ai-marketplace-angular-nestjs` | `main`: every merged release |
| stable | `sgdiachenko/gm-ai-marketplace-angular-nestjs#stable` | `gm-ai-marketplace-angular-nestjs-stable` | the `stable` branch: releases promoted after they were verified |

The `stable` branch is `main` at a verified commit plus one commit that renames the catalog. Claude Code identifies a marketplace by its `name`, so a user can register both, and the install ids differ: `sdd-engineering@gm-ai-marketplace-angular-nestjs` and `sdd-engineering@gm-ai-marketplace-angular-nestjs-stable`. Plugins keep their relative-path sources, so a project that enables a stable plugin in `.claude/settings.json` gets it fetched like a latest one.

### Promote a release to stable

Promote a `main` commit only after its release tags exist and its evals passed:

```bash
git fetch origin
git switch -c promote-<plugin>-<version> origin/stable
git merge --no-ff <main commit>     # keep "name": "gm-ai-marketplace-angular-nestjs-stable" if the catalog conflicts
git push -u origin promote-<plugin>-<version>
```

Open the pull request against `stable`; CI validates it, and `check-pr.mjs` compares versions against `origin/stable`. Users on the stable channel get the promoted versions on their next auto-update or `/plugin marketplace update gm-ai-marketplace-angular-nestjs-stable`. Never merge `stable` into `main`: the catalog name would follow.

### What a channel doesn't pin

- **Dependencies.** A range such as `^1.0.0` resolves against the `<plugin>--v<version>` tags of the whole repository, not of the channel's branch. A stable plugin therefore picks up the newest dependency tag in its range as soon as that tag exists on `main`, promoted or not. A dependency change that stable users must not get yet needs a new major version, outside the range.
- **Plugin data.** `${CLAUDE_PLUGIN_DATA}` is `~/.claude/plugins/data/<plugin>-<marketplace>/`, so each channel has its own directory. Moving between channels doesn't carry state such as the `workflow-retro` rate card (`prices.json`); copy it.

### Move a project to stable, and back

The rollback path when a latest release misbehaves in a project, without a new release and without the nonexistent `plugin rollback`. Rehearsed on Claude Code 2.1.299 in a project with `sdd-engineering` at project scope. Disable dependents before their dependencies, and enable in the reverse order: `claude plugin disable` refuses a plugin another enabled plugin still requires.

```bash
# 1. Turn the latest channel off. Disable, don't uninstall: uninstall deletes the plugin's data directory.
for p in sdd-engineering architecture-review research-tools engineering-paved-path; do
  claude plugin disable "$p@gm-ai-marketplace-angular-nestjs" --scope project
done

# 2. Add the stable channel and install from it; its dependencies come along.
claude plugin marketplace add 'sgdiachenko/gm-ai-marketplace-angular-nestjs#stable' --scope project
claude plugin install sdd-engineering@gm-ai-marketplace-angular-nestjs-stable --scope project

# 3. Carry the plugin's data over, if it has any.
src=~/.claude/plugins/data/sdd-engineering-gm-ai-marketplace-angular-nestjs
[ -d "$src" ] && mkdir -p "$src-stable" && cp -R "$src"/. "$src-stable"/

# 4. Check: the stable copies are enabled, the latest ones disabled, no dependency errors,
#    and the session loads stable.
claude plugin list --json
node scripts/trace-plugin-version.mjs <project-dir>      # run from this repository
```

In an open session, run `/reload-plugins`. Then run the smoke suite on the stable branch's files, which are what the stable install copied: `git switch --detach origin/stable && scripts/run-evals.sh namespaces`.

To return to latest once a fixed release is out, disable the stable copies and enable the latest ones; the latest data directory is still there because step 1 only disabled it:

```bash
for p in sdd-engineering architecture-review research-tools engineering-paved-path; do
  claude plugin disable "$p@gm-ai-marketplace-angular-nestjs-stable" --scope project
done
for p in engineering-paved-path research-tools architecture-review sdd-engineering; do
  claude plugin enable "$p@gm-ai-marketplace-angular-nestjs" --scope project
done
```

Commit `.claude/settings.json` after each switch so the whole team moves together. External state: the SDD plugins write only files in the project (specs, plans, verification reports, retros), which git restores; they call no external service.
