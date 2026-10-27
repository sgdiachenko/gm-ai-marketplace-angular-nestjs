#!/usr/bin/env node
// Shows which version of each plugin from this marketplace a Claude Code session actually loads,
// from the session's own telemetry rather than from installed_plugins.json: it starts a one-line
// `claude -p` session in the given project with the OpenTelemetry console exporter and prints the
// `plugin_loaded` events. Third-party plugin names and versions appear only with
// OTEL_LOG_TOOL_DETAILS=1, which this script sets. Only plugin fields are printed: the raw events
// also carry the user's email and account ids.
// Usage: node scripts/trace-plugin-version.mjs [project-dir] [--marketplace <prefix>] [--all]
//   project-dir: where to start the session, so project-scope plugins load (default: current dir)
//   --marketplace: marketplace name prefix to keep (default: gm-ai-marketplace-angular-nestjs, so -stable matches too)
//   --all: print every loaded plugin
// The session sends one short prompt to Haiku, so it costs a fraction of a cent.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let cwd = process.cwd();
let prefix = 'gm-ai-marketplace-angular-nestjs';
let all = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--all') all = true;
  else if (args[i] === '--marketplace') prefix = args[++i];
  else if (args[i].startsWith('--')) {
    console.error(`Unknown option ${args[i]}`);
    process.exit(2);
  } else cwd = resolve(args[i]);
}

const result = spawnSync('claude', ['-p', '--model', 'haiku', 'Reply with OK.'], {
  cwd,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: {
    ...process.env,
    CLAUDE_CODE_ENABLE_TELEMETRY: '1',
    OTEL_LOGS_EXPORTER: 'console',
    OTEL_METRICS_EXPORTER: 'none',
    OTEL_TRACES_EXPORTER: 'none',
    OTEL_LOG_TOOL_DETAILS: '1',
  },
});
if (result.error) {
  console.error(`Could not start claude: ${result.error.message}`);
  process.exit(1);
}

// The console exporter prints each log record as a JavaScript object literal, not JSON. A record's
// `attributes: { … }` block holds one `key: value` pair per line.
const plugins = [];
let attributes = null;
for (const line of result.stdout.split('\n')) {
  if (/^\s*attributes:\s*{\s*$/.test(line)) {
    attributes = {};
    continue;
  }
  if (!attributes) continue;
  if (/^\s*},?\s*$/.test(line)) {
    if (attributes['event.name'] === 'plugin_loaded') plugins.push(attributes);
    attributes = null;
    continue;
  }
  const match = /^\s*["']?([\w.]+)["']?:\s*"([^"]*)"/.exec(line);
  if (match) attributes[match[1]] = match[2];
}

if (plugins.length === 0) {
  console.error(`No plugin_loaded events in the session's output (claude exited with ${result.status}).`);
  if (result.stderr.trim()) console.error(result.stderr.trim());
  process.exit(1);
}
const shown = all ? plugins : plugins.filter((p) => (p['marketplace.name'] ?? '').startsWith(prefix));
if (shown.length === 0) {
  console.error(`The session loaded ${plugins.length} plugins, none from a marketplace starting with "${prefix}". Use --all to list them.`);
  process.exit(1);
}

const rows = [['plugin', 'version', 'marketplace', 'scope', 'enabled via']];
for (const p of shown) {
  rows.push([p['plugin.name'], p['plugin.version'] ?? '—', p['marketplace.name'] ?? '—', p['plugin.scope'] ?? '—', p.enabled_via ?? '—']);
}
const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => (row[i] ?? '').length)));
console.log(`Loaded in ${cwd}:`);
for (const row of rows) console.log(row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join('  ').trimEnd());
