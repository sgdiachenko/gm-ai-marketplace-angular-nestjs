# INSIGHTS

Lessons learned while working on this repository. Read before changing it; append new entries at the end.

Entry template:

```markdown
## YYYY-MM-DD — <short title>
- **Context:** what we were doing
- **Insight:** what turned out to be true and wasn't obvious
- **Action:** what we changed, or what to do next time
```

---

## 2026-10-13 — An unchanged version blocks updates
- **Context:** research for the initial scaffold.
- **Insight:** Claude Code resolves a plugin's version from `plugin.json`, then the catalog entry, then the commit SHA, and caches by it. New commits under an unchanged `version` never reach users. When both files set `version`, `plugin.json` wins without a load-time warning.
- **Action:** `version` lives only in `plugin.json`; `scripts/check-pr.mjs` fails a PR that changes a plugin without bumping it.

## 2026-10-13 — Symlinked plugin.json installs but fails strict catalog validation
- **Context:** tested one shared manifest for Claude Code and Codex on Claude Code 2.1.296.
- **Insight:** `.claude-plugin/plugin.json -> ../plugin.json` installs correctly (the symlink is kept in the cache), but `claude plugin validate . --strict` fails with "is a symlink or is not a regular file, so it was not validated". A Codex `extensions` field adds "Unknown field 'extensions'".
- **Action:** keep `plugin.json` a regular file; `scripts/check-marketplace.mjs` rejects a symlinked one. Plan for Codex in `docs/codex-compatibility.md`.

## 2026-10-13 — A local-path marketplace hides cache bugs
- **Context:** choosing how to test plugins before release.
- **Insight:** a marketplace added from a local directory loads relative-path plugins in place, ignores `version` and skips the dependency install, so `../` paths and missing bumps work locally and break for users. `CLAUDE_CONFIG_DIR` pointed at an empty directory gives a separate profile, plugin cache included, without touching `~/.claude`.
- **Action:** before release, install from the git branch into a throwaway profile (`docs/adding-a-plugin.md`).

## 2026-10-14 — A rollback is a new release
- **Context:** writing release and rollback tooling.
- **Insight:** `git revert` of a release lowers the plugin's `version`. `check-pr.mjs` rejects that, and since Claude Code caches by version, users who have the bad version may never get the old files back. Whether Claude Code moves users to a lower version at all is untested.
- **Action:** `scripts/rollback.mjs` restores the old files under the next patch version above the current one (`docs/releasing.md`).

## 2026-10-14 — Plugin agents ignore permissionMode
- **Context:** porting the SDD agents from dev-digest into `sdd-engineering`.
- **Insight:** Claude Code ignores `permissionMode`, `hooks`, `mcpServers` and `initialPrompt` in a plugin agent's frontmatter. The planner's `plan` mode and the implementer's `acceptEdits` don't carry over; only `tools` and `disallowedTools` restrict a plugin agent.
- **Action:** read-only agents have no Write/Edit in their tool lists; the `sdd-engineering` README tells users the implementer follows the session's permission mode.

## 2026-10-14 — Dependency ranges resolve against git tags
- **Context:** making `sdd-engineering` depend on three plugins with `^1.0.0`.
- **Insight:** a range in `dependencies` resolves against tags named `<plugin>--v<version>` in the repository that hosts the plugin — for relative-path plugins, this marketplace. Without a matching tag Claude Code installs the catalog's current copy and only checks the range at load time, disabling the dependent if it doesn't match. A `^1.0.0` range also means dependencies can't start at `0.1.0`.
- **Action:** `scripts/tag-releases.mjs` tags every untagged plugin version on `main` (`tag-releases.yml`); `scripts/check-marketplace.mjs` checks that each range is satisfied by the catalog. The four SDD plugins start at `1.0.0`.

## 2026-10-14 — Path variables are substituted in Markdown, not exported to Bash
- **Context:** pointing `workflow-retro` at its bundled script and a user rate card.
- **Insight:** `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are replaced inline in skill and agent Markdown, but commands Claude runs through the Bash tool don't get them as environment variables. A script can't read `CLAUDE_PLUGIN_DATA` itself.
- **Action:** skills write the variable into the command line (`node "${CLAUDE_SKILL_DIR}/assets/collect.mjs" --prices "${CLAUDE_PLUGIN_DATA}/prices.json"`), and scripts take paths as arguments.

## 2026-10-14 — claude plugin eval publishes reports by default
- **Context:** porting dev-digest's evals to the built-in `claude plugin eval`.
- **Insight:** the command publishes its HTML report to claude.ai unless given `--no-publish`, and its default baseline arm runs without the plugin, where namespaced agents don't exist and every dispatch fails.
- **Action:** `scripts/run-evals.sh` always passes `--no-publish` and `--ablation none`.

## 2026-10-14 — claude plugin eval loads plugins only from under its target
- **Context:** first run of the `namespaces` suite, with each case file as the target.
- **Insight:** a case's `plugins:` entries must resolve inside the containment root: the enclosing plugin, or else the directory given as the target. With a case file as the target, the root is the case directory, so `../../../plugins/<name>` fails to load ("outside the containment root") before any model call.
- **Action:** `scripts/run-evals.sh` runs `claude plugin eval .` from the repository root and selects a suite with `--tag <suite>`; every case carries its suite as a tag.

## 2026-10-14 — Judge graders need the agent's own words and a stronger judge
- **Context:** the `architecture-review` eval suite; the reviewer found both planted violations in every run, but the case scored 0.44.
- **Insight:** an `llm` grader judges the main session's final reply. Asked only to "show the review", the main session paraphrased it into a table, dropping the verbatim quotes the rubric required and adding its own corrections. One all-or-nothing rubric turned a single strict clause into a failed case, and the default Haiku judge failed on-topic findings that the rubric explicitly allowed.
- **Action:** prompts ask for the agent's output "exactly as returned"; one grader per criterion; rubrics name what fails rather than what passes; `scripts/run-evals.sh` passes `--judge-model sonnet`.

## 2026-10-14 — GitHub Pages serves 404.html at any depth
- **Context:** building the catalog site under the project path `/gm-ai-marketplace/`.
- **Insight:** relative links work on every page except `404.html`: GitHub returns it for a missing URL at any depth, so `assets/site.css` resolves against the missing path and the page renders unstyled. A local `python3 -m http.server` never serves `404.html` for a missing path, so the bug doesn't show in a preview.
- **Action:** `404.html` uses the absolute base path from `site/config.mjs`; every other page links relatively. `site/build.mjs` checks each link against the output and fails on a relative one in `404.html`.

## 2026-10-14 — `claude plugin details` lists commands as skills and has no JSON output
- **Context:** comparing the site's component inventory with what Claude Code loads, on Claude Code 2.1.299.
- **Insight:** the Skills line names skills and `commands/*.md` files together, the Hooks line lists each event once, and the command has no `--json` flag, so the build parses the text output. A wording change in a new Claude Code release breaks the parse.
- **Action:** `site/lib/inventory.mjs` fails with a clear message when a section is missing. Check it when bumping the Claude Code pin.

## 2026-10-14 — A CSP meta tag also blocks style attributes
- **Context:** porting the design prototype, which styles everything inline, to a site whose CSP allows only its own origin.
- **Insight:** `style-src 'self'` blocks `style="…"` attributes and `<style>` elements in the HTML, not only third-party stylesheets. Setting `element.style` from a script is still allowed. Fonts and icons from Google Fonts or unpkg would be blocked too.
- **Action:** all styles live in `site/assets/site.css`; fonts and icons are vendored in `site/vendor/`. A build test fails on any `style` attribute or inline script.

## 2026-10-14 — Real skills nest `metadata:` in frontmatter
- **Context:** the first build of the catalog site against the SDD engineering plugins (#3).
- **Insight:** skills use `metadata:` with `tags: a, b` under it, the Agent Skills convention, so a parser that rejects every nested mapping, as the spec first said, fails on real content. Agents also use `skills:` lists and `disallowedTools`.
- **Action:** `site/lib/frontmatter.mjs` accepts one level of mapping and still fails with `file:line` on deeper nesting; `metadata.tags` become search keywords. Build the site against new plugins before relying on a parser rule.

## 2026-10-14 — A stable channel pins the plugin, not its dependencies or its data
- **Context:** setting up the `stable` branch as a second catalog, `gm-ai-marketplace-stable`, for rollback.
- **Insight:** dependency ranges resolve against the `<plugin>--v<version>` tags of the whole repository, so a stable plugin picks up the newest dependency tag in its range even if that release was never promoted. `${CLAUDE_PLUGIN_DATA}` is `~/.claude/plugins/data/<plugin>-<marketplace>/`, so the two channels of one plugin have separate data directories. Installing from the stable branch resolved the same `*--v1.0.0` tags as latest (`1.0.0-6b7d849a6734`).
- **Action:** `docs/releasing.md` (*Release channels*) says both; a dependency change stable users must not get yet needs a major version, and switching channels copies the data directory.

## 2026-10-14 — Let the cost scenario's orchestrator pick defaults and the spec triples
- **Context:** the first run of `evals/cost-workflow/spec-and-plan`.
- **Insight:** told to "take the recommended default", the orchestrator accepted every UX and edge-case proposal: the spec grew to six `must` stories and ~30 ACs, spec-creator ran seven times through revise loops, and the run cost $5.52 in 22 minutes. Planner pass 2 also stopped once, because it got "accept REC1–REC5" without the pass-1 report it reads the REC text from. With "smallest scope, reject UX proposals, revise at most once" and the pass-1 report passed by path, the same flow cost $1.92 in 8 minutes and passed every grader.
- **Action:** the scenario says so; the `sdd-engineering` README tells users to save the pass-1 report and pass its path.

## 2026-10-14 — What `claude plugin eval` keeps of a run
- **Context:** counting tokens and tool calls per run for `docs/COST-BASELINE.md`.
- **Insight:** `aggregate-result.json` has per-run `costUsd`, `durationSeconds`, `turns` and `passed`, but no token counts, and the run's `trace.jsonl` is deleted afterwards. With `--keep-temp` the run's own config directory stays in `/tmp/e-*/config/projects/`, with the main transcript and `subagents/*.jsonl`; its `home/` and `tmp/` are sealed with mode 000. The kept `out/trace.jsonl` holds subagent messages too, marked with `parent_tool_use_id`, so `tool_used` graders can check what an agent did, not only the orchestrator.
- **Action:** `scripts/run-evals.sh` keeps temp for `cost-workflow`; `scripts/compare-evals.mjs` reads the transcripts and saves `metrics.json` beside the result, so a comparison survives the temp cleanup.

## 2026-10-14 — The plugin_loaded event is the version trace
- **Context:** proving which plugin version a session runs.
- **Insight:** with `CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_LOGS_EXPORTER=console` and `OTEL_LOG_TOOL_DETAILS=1`, a `claude -p` session prints one `claude_code.plugin_loaded` record per plugin, dependencies included, with `plugin.name`, `plugin.version` (the manifest version, without the tag-commit suffix `claude plugin list` shows) and `marketplace.name`. The console exporter prints JavaScript object literals, not JSON, and every record carries the user's email and account ids. `plugin.scope` is a category (`user-local`, `official`), not the install scope.
- **Action:** `scripts/trace-plugin-version.mjs` parses the records and prints only plugin fields.

## 2026-10-14 — Don't edit a shell script while it runs
- **Context:** changing `scripts/run-evals.sh` during a 20-minute eval run.
- **Insight:** bash reads a script as it executes it. Rewriting the file in place made the running copy read the new file from its old byte offset after the eval returned: a syntax error and a skipped `commit.txt`. Writing a new file and `mv`-ing it over the old one leaves the running process on the old inode.
- **Action:** replace scripts with `mv` while they may be running.

## 2026-10-14 — Rolling a project back to stable is disable, install, copy data
- **Context:** rehearsing the return from latest to the stable channel in `vocabulary-nextjs`, at project scope.
- **Insight:** `claude plugin disable` refuses a plugin that another enabled plugin requires, so dependents go first and dependencies last, and enabling goes the other way. Both channels' copies can stay installed; with one set disabled, the session loads only the other (the `plugin_loaded` events show `marketplace.name`). Uninstalling instead of disabling would delete `~/.claude/plugins/data/<plugin>-<marketplace>/`. `claude plugin prune --scope project` after uninstalling the stable copy removed only the stable dependencies; the latest ones stayed because an enabled plugin still needed them.
- **Action:** `docs/releasing.md` (*Move a project to stable, and back*) lists the commands in that order.

## 2026-10-27 — A cloned marketplace carries the source's release tags
- **Context:** creating `gm-ai-marketplace-angular-nestjs` as an independent copy of `gm-ai-marketplace`.
- **Insight:** `git clone` of `main` fetches the `<plugin>--v<version>` tags reachable from it. Pushed to the new repository, they would make dependency ranges such as `^1.0.0` resolve to the source's commits — the React-era plugins — whenever a range still matched them. The catalog name decides the install id (`<plugin>@<catalog>`), the cache path and `${CLAUDE_PLUGIN_DATA}`, so renaming the catalog is what lets both marketplaces be installed side by side.
- **Action:** local tags were deleted before the first push, versions of changed plugins went to new majors, and `tag-releases.yml` created this repository's own tags. The source remote is fetch-only (`upstream`, push URL disabled).

## 2026-10-27 — The official Angular skill has no marketplace and no license file
- **Context:** replacing the React and Next.js skills with the Angular team's `angular-developer`.
- **Insight:** `angular/skills` is a build output of `skills/dev-skills/` in `angular/angular`; its own installer is `npx skills add`, which writes into a project's skills folder, so agents can't preload it by a namespaced name or declare it as a dependency. The repository has no `LICENSE`; `SKILL.md` says `license: MIT`, and `angular/angular` is MIT.
- **Action:** the skill is vendored unchanged into `engineering-paved-path` with the `angular/angular` MIT license and a `NOTICE.md` that pins the upstream commit; `docs/plugins/engineering-paved-path.md` has the update procedure.

## 2026-10-27 — A private marketplace and an SSH key of another account
- **Context:** the first install of this private repository through `scripts/try-install.sh`, Claude Code 2.1.311.
- **Insight:** for an `owner/repo` source, Claude Code probes `ssh -T git@github.com`; the probe succeeded with a key of a GitHub account that has no access to this repository, so the SSH clone failed and the CLI fell back to HTTPS, where the keychain credential worked. Installs from `/plugin` in a session and plugin updates don't fall back. A throwaway `CLAUDE_CONFIG_DIR` profile installs plugins but has no login, so agent checks need the normal profile with `--plugin-dir` pointing at the cached copies.
- **Action:** `docs/installing.md` asks users to run `gh auth setup-git` and set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`; the release check loads the cache copies with `--plugin-dir` in a logged-in session.
