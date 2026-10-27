# Compatibility

## Claude Code

| Version | Status |
|---|---|
| 2.1.275 or later | supported: the one-step `claude plugin install sdd-engineering --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs` needs it |
| 2.1.296, 2.1.299 | tested: CI validates the catalog on 2.1.296; the evals and the install in another project ran on 2.1.299 |

The plugin relies on these platform features:

- **Plugin dependencies with version ranges.** `engineering-paved-path` and `architecture-review` are declared as `^2.0.0`, `research-tools` as `^1.0.0`; they resolve against the `<plugin>--v<version>` git tags of the marketplace repository.
- **Namespaced components.** Agents call `research-tools:researcher` and `architecture-review:architecture-reviewer`, and preload or load skills by names such as `engineering-paved-path:security` or `engineering-paved-path:angular-developer`.
- **Path variables in Markdown.** `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PLUGIN_DATA}` are substituted in agent and skill files; scripts get paths as arguments, since Bash commands don't receive these variables.
- **Plugin agents' tool lists.** Plugin agents ignore `permissionMode`, so the read-only agents are read-only through `tools` and `disallowedTools`; `implementer` follows the session's permission mode.

## Other agents

Claude Code only. The workflow lives in agents, which other coding agents load differently (see the marketplace's `docs/codex-compatibility.md`).

## Platforms

macOS and Linux. `skills/run-plan/scripts/fingerprint.sh` runs on bash 3.2, and `skills/workflow-retro/assets/collect.mjs` needs Node.js 20 or later on `PATH`.
