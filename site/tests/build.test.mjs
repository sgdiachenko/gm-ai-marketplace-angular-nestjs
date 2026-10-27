import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { claudeAvailable, parseDetails } from '../lib/inventory.mjs';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE = join(SITE, 'tests', 'fixture');
const tmp = mkdtempSync(join(tmpdir(), 'site-build-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function build(root, out, ...extra) {
  return spawnSync(process.execPath, [join(SITE, 'build.mjs'), '--root', root, '--out', out, '--skip-inventory', ...extra], {
    encoding: 'utf8',
  });
}

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  );
}

const out = join(tmp, 'site');
const read = (path) => readFileSync(join(out, path), 'utf8');
let index;

before(() => {
  const result = build(FIXTURE, out);
  assert.equal(result.status, 0, result.stderr);
  index = JSON.parse(read('index.json'));
});

test('writes every page, the index and the assets', () => {
  for (const path of [
    'index.html',
    '404.html',
    'index.json',
    'plugins/pr-tools/index.html',
    'plugins/pr-tools/skills/review-pr/index.html',
    'plugins/pr-tools/agents/pr-reviewer/index.html',
    'plugins/pr-tools/commands/pr-checklist/index.html',
    'plugins/db-helpers/index.html',
    'guides/installing/index.html',
    'assets/site.css',
    'assets/icons.svg',
    'assets/search-terms.json',
    'assets/i18n.js',
    'assets/fonts/inter-latin-wght-normal.woff2',
  ]) {
    assert.ok(existsSync(join(out, path)), `${path} is missing`);
  }
});

test('index.json follows the versioned format', () => {
  assert.equal(index.version, 1);
  assert.deepEqual(index.marketplace, { name: 'gm-ai-marketplace-angular-nestjs', repo: 'sgdiachenko/gm-ai-marketplace-angular-nestjs' });
  assert.deepEqual(index.categories, ['code-review', 'data', 'workflow']);
  const ids = index.items.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  const byId = Object.fromEntries(index.items.map((it) => [it.id, it]));
  assert.deepEqual(Object.keys(byId['skill:pr-tools/review-pr']), [
    'id', 'type', 'name', 'title', 'plugin', 'pluginVersion', 'description', 'category', 'keywords', 'usage', 'badges', 'url', 'source', 'updated', 'headings', 'text',
  ]);
  assert.equal(byId['skill:pr-tools/review-pr'].usage, '/pr-tools:review-pr');
  assert.deepEqual(byId['skill:pr-tools/review-pr'].keywords, ['code review', 'github'], 'metadata.tags become keywords');
  assert.equal(byId['agent:pr-tools/pr-reviewer'].usage, 'pr-tools:pr-reviewer');
  assert.equal(byId['command:pr-tools/pr-checklist'].usage, '/pr-tools:pr-checklist');
  assert.equal(byId['hook:pr-tools/pretooluse-bash'].usage, 'PreToolUse · Bash');
  assert.equal(byId['hook:pr-tools/pretooluse-bash'].url, 'plugins/pr-tools/#hook-pretooluse-bash');
  assert.equal(byId['mcp-server:db-helpers/postgres'].usage, 'postgres (stdio)');
  assert.equal(byId['plugin:pr-tools'].title, 'PR Tools');
  assert.deepEqual(byId['plugin:pr-tools'].badges, ['needs-setup']);
  assert.deepEqual(byId['plugin:db-helpers'].badges, ['needs-setup', 'off-by-default']);
  assert.equal(byId['skill:pr-tools/describe-pr'].description, 'Writes a pull request title and description from the branch diff and linked issues.');
  assert.equal(byId['guide:installing'].url, 'guides/installing/');
  assert.ok(!byId['skill:pr-tools/review-pr'].text.includes('#'), 'text has Markdown stripped');
});

test('rendered Markdown escapes raw HTML and links to GitHub', () => {
  const html = read('plugins/pr-tools/index.html');
  assert.ok(html.includes('&lt;script&gt;alert'), 'raw HTML is escaped');
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('href="https://github.com/sgdiachenko/gm-ai-marketplace-angular-nestjs/blob/main/docs/installing.md"'));
  assert.ok(html.includes('src="../../files/plugins/pr-tools/assets/flow.svg"'));
  assert.ok(existsSync(join(out, 'files/plugins/pr-tools/assets/flow.svg')), 'images are copied into the site');
  assert.ok(!/<h[1-6][^>]*>PR Tools</.test(html.split('id="readme-h"')[1]), 'the README title repeating the name is dropped');
});

test('pages work under any base path; 404.html uses the absolute one', () => {
  const home = read('index.html');
  assert.ok(home.includes('href="./assets/site.css"'));
  assert.equal((home.match(/<article class="card">/g) ?? []).length, 3, 'the plugin list is pre-rendered');
  assert.ok(read('plugins/pr-tools/skills/review-pr/index.html').includes('href="../../../../assets/site.css"'));
  const notFound = read('404.html');
  assert.ok(notFound.includes('href="/gm-ai-marketplace-angular-nestjs/assets/site.css"'));
  assert.ok(notFound.includes('action="/gm-ai-marketplace-angular-nestjs/"'));
  const custom = join(tmp, 'custom-base');
  assert.equal(build(FIXTURE, custom, '--base', '/preview/').status, 0);
  assert.ok(readFileSync(join(custom, '404.html'), 'utf8').includes('href="/preview/assets/site.css"'));
});

test('every page allows only its own origin', () => {
  for (const path of listFiles(out).filter((p) => p.endsWith('.html'))) {
    const html = read(path);
    assert.ok(html.includes(`content="default-src 'self'; script-src 'self'; style-src 'self'`), `${path} has the CSP`);
    assert.ok(!/\sstyle="/.test(html), `${path} has no style attributes, which the CSP blocks`);
    assert.ok(!/<script>/.test(html), `${path} has no inline scripts`);
  }
});

test('the same input builds the same output', () => {
  const again = join(tmp, 'again');
  assert.equal(build(FIXTURE, again).status, 0);
  const files = listFiles(out).sort();
  assert.deepEqual(listFiles(again).sort(), files);
  for (const f of files) assert.ok(readFileSync(join(out, f)).equals(readFileSync(join(again, f))), `${f} differs`);
});

function brokenFixture(name, edit) {
  const root = join(tmp, name);
  cpSync(FIXTURE, root, { recursive: true });
  edit(root);
  return build(root, join(tmp, `${name}-out`));
}

test('frontmatter outside the subset fails with file:line', () => {
  const result = brokenFixture('bad-yaml', (root) => {
    writeFileSync(join(root, 'plugins/pr-tools/skills/review-pr/SKILL.md'), '---\nname: review-pr\ndescription: x\nmetadata:\n  owner:\n    team: core\n---\n');
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /plugins\/pr-tools\/skills\/review-pr\/SKILL\.md:5: mappings nested more than one level are not supported/);
});

test('a component without a description fails the build', () => {
  const result = brokenFixture('no-description', (root) => {
    writeFileSync(join(root, 'plugins/pr-tools/agents/pr-reviewer.md'), '---\nname: pr-reviewer\n---\nBody\n');
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /agents\/pr-reviewer\.md:1: frontmatter needs a "description"/);
});

test('a README image that does not exist fails the build', () => {
  const result = brokenFixture('missing-image', (root) => rmSync(join(root, 'plugins/pr-tools/assets/flow.svg')));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /README\.md: image plugins\/pr-tools\/assets\/flow\.svg does not exist/);
});

test('refuses to overwrite a directory that is not an earlier build', () => {
  const dir = join(tmp, 'not-a-build');
  mkdirSync(dir);
  writeFileSync(join(dir, 'keep.txt'), 'keep');
  const result = build(FIXTURE, dir);
  assert.equal(result.status, 1);
  assert.ok(existsSync(join(dir, 'keep.txt')));
});

test('reads the component inventory from `claude plugin details`', () => {
  const found = parseDetails(`pr-tools 0.3.1
  Description: Review pull requests

Component inventory
  Skills (2)  pr-checklist, review-pr
  Agents (1)  pr-reviewer
  Hooks (2)  PreToolUse, Stop  (harness-only — no model context cost)
  MCP servers (1)  postgres  (tool schemas resolved at runtime; not counted)
  LSP servers (0)
`);
  assert.deepEqual(found.skills, { count: 2, names: ['pr-checklist', 'review-pr'] });
  assert.deepEqual(found.hooks.names, ['PreToolUse', 'Stop']);
  assert.deepEqual(found.mcpServers.names, ['postgres']);
  assert.deepEqual(found.lspServers, { count: 0, names: [] });
});

test('every icon the scripts and templates name is vendored', async () => {
  const { TYPE_ICONS } = await import('../assets/render.js');
  const vendored = new Set(readdirSync(join(SITE, 'vendor', 'phosphor')).map((f) => f.replace(/\.svg$/, '')));
  const names = new Set([...Object.values(TYPE_ICONS), 'copy', 'check']);
  for (const dir of ['assets', 'templates']) {
    for (const f of readdirSync(join(SITE, dir)).filter((f) => /\.m?js$/.test(f))) {
      for (const m of readFileSync(join(SITE, dir, f), 'utf8').matchAll(/icon\(\w+, '([a-z-]+)'/g)) names.add(m[1]);
    }
  }
  for (const name of names) assert.ok(vendored.has(name), `icon "${name}" is not in site/vendor/phosphor`);
});

test('the fixture matches what Claude Code loads', { skip: !claudeAvailable() && 'claude CLI not installed' }, () => {
  const result = spawnSync(process.execPath, [join(SITE, 'build.mjs'), '--root', FIXTURE, '--out', join(tmp, 'inventory')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
