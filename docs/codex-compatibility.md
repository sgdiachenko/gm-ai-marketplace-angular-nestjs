# Codex compatibility (planned)

Status: the marketplace serves Claude Code only. This document sets the rules that keep a later Codex port cheap, and the target layout. Codex facts below come from OpenAI's docs as of October 2026 and haven't been tested here.

## What carries over

| Component | Claude Code | Codex |
|---|---|---|
| Skills, `skills/<name>/SKILL.md` | yes | yes, same Agent Skills format; the shared part |
| Agents, `agents/` | yes | not documented; treat as Claude-only |
| Commands, `commands/` | yes | no; write skills instead |
| Hooks | `hooks/hooks.json` | own config under `extensions.com.openai.hooks`, different events |
| MCP servers | `.mcp.json` | `mcp.json`, each server needs a `type`; renaming the file isn't enough |
| Plugin manifest | `.claude-plugin/plugin.json` | root `plugin.json` (Agent Plugins standard) or `.codex-plugin/plugin.json` |
| Catalog | `.claude-plugin/marketplace.json` | `.agents/plugins/marketplace.json`; each entry also needs `policy` and `category` |
| Invocation | `/plugin:skill` | `$skill` |

## Rules to follow now

1. Put behaviour in skills.
2. In `SKILL.md`, refer to bundled files relative to the skill folder (`scripts/check.py`), not through `${CLAUDE_PLUGIN_ROOT}`. That substitution is Claude Code's; Codex doesn't document it for skill content.
3. Don't name Claude-only tools or subagents in a skill's instructions unless the skill is meant to stay Claude-only.
4. Keep hook logic in `scripts/` and the hook config thin. Codex passes `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` to hook commands for compatibility, so the scripts can be shared.
5. A plugin whose value is in agents or hooks can stay Claude-only. Leave it out of the Codex catalog.

## Target layout

```
gm-ai-marketplace-angular-nestjs/
├── .claude-plugin/marketplace.json     Claude Code catalog
├── .agents/plugins/marketplace.json    Codex catalog, same marketplace name
└── plugins/<name>/
    ├── plugin.json                     portable manifest, the source of truth
    ├── .claude-plugin/plugin.json      generated from plugin.json without `extensions`
    ├── skills/<skill>/SKILL.md         shared
    ├── agents/                         Claude only
    ├── hooks/hooks.json                Claude hooks
    ├── hooks/codex.json                Codex hooks; not hooks/hooks.json, which Claude loads automatically
    ├── .mcp.json                       Claude MCP config
    └── mcp.json                        portable MCP config
```

- Use the same marketplace `name` in both catalogs, so `<plugin>@gm-ai-marketplace-angular-nestjs` works in both tools.
- Add a script that generates `.claude-plugin/plugin.json` from the root `plugin.json`, and a CI check that the generated file is up to date. One source keeps `version` from drifting between the two manifests.
- In Codex, plugins are enabled per project in `.codex/config.toml`:
  ```toml
  [plugins."<plugin>@gm-ai-marketplace-angular-nestjs"]
  enabled = true
  ```

## Why not symlink the manifest

Tested on Claude Code 2.1.296: `.claude-plugin/plugin.json -> ../plugin.json` installs and loads, but:

- `claude plugin validate . --strict` fails: the validator skips a symlinked manifest and warns about it.
- A Codex `extensions` field in the shared file produces `Unknown field 'extensions'`, which also fails `--strict`.
- Git on Windows without `core.symlinks` checks the link out as a text file, and the plugin fails to load.

`scripts/check-marketplace.mjs` therefore rejects a symlinked `plugin.json`.

## References

- [Codex: Package your plugin](https://developers.openai.com/codex/plugins/build)
- [Agent Plugins standard](https://agent-plugins.org)
- [Claude Code: Plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference)
- [Example of a repo with both catalogs](https://github.com/xiaolai/claude-plugin-marketplace)
