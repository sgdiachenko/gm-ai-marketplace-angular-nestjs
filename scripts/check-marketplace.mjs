#!/usr/bin/env node
// Repository conventions that `claude plugin validate` does not check.
// Usage: node scripts/check-marketplace.mjs
import { existsSync, lstatSync, openSync, readFileSync, readSync, closeSync, readdirSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// Everything under plugins/<name>/ is copied to users, so maintainer files stay at the repo root.
const MAINTAINER_ONLY = ['AGENTS.md', 'CLAUDE.md', 'INSIGHTS.md', 'docs', 'specs', 'tests', 'evals', 'node_modules'];
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.sh', '.js', '.mjs', '.cjs', '.ts', '.py', '.yml', '.yaml', '.toml', '.txt']);
// Matches ${CLAUDE_PLUGIN_ROOT}/x, "${CLAUDE_PLUGIN_ROOT}"/x and the JSON-escaped \"${CLAUDE_PLUGIN_ROOT}\"/x.
const PLUGIN_ROOT_REF = /\$\{CLAUDE_PLUGIN_ROOT\}(?:\\?")?\/([\w./-]+)/g;
// The same forms of ${CLAUDE_SKILL_DIR}/x, which resolves to the folder holding the skill's SKILL.md.
const SKILL_DIR_REF = /\$\{CLAUDE_SKILL_DIR\}(?:\\?")?\/([\w./-]+)/g;
// Plugins are shared across projects: no plugin may point at one project's files or at its own source layout.
const FORBIDDEN_REF = /dev-?digest|\.claude\/(?:skills|agents)\//i;
// This marketplace targets Angular and NestJS. The React, Next.js, Fastify and onion skills it replaced must not
// come back as hidden defaults, and no plugin names the project its architecture skills were generalized from.
// A plugin's CHANGELOG.md may name them: it records what was removed.
const RETIRED_REF = /(?<![\w-])(?:react-best-practices|next-best-practices|fastify-best-practices|react-testing-library|onion-architecture)(?![\w-])|gm-?vocabulary|\bword-?groups?\b/i;
// SECURITY.md: no file in a plugin carries a path from one machine or a credential.
const ABSOLUTE_HOME = /(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)[\w.-]+/;
const SECRET = /sk-ant-[\w-]{16,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_\w{30,}|AKIA[0-9A-Z]{16}|xox[abprs]-[\w-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
// The repository is in English. Plugins, scripts, evals and workflows have no Cyrillic at all, code and
// examples included; root docs may quote a non-English term only inside `code`.
const CYRILLIC = /[\u0400-\u04FF]/;
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const FRONTMATTER = /^---\n[\s\S]*?\n---/;
const ROOT_DOCS = ['.claude-plugin/marketplace.json', 'README.md', 'AGENTS.md', 'INSIGHTS.md', 'SECURITY.md', 'CONTRIBUTING.md', 'docs', 'specs', 'site'];
const STRICT_ENGLISH = ['scripts', 'evals', '.github'];

const errors = [];
const plugins = new Map(); // name -> { dir, manifest, components }
const fail = (message) => errors.push(message);
const rel = (path) => relative(root, path) || '.';

function isInside(path, dir) {
  const r = relative(dir, path);
  return r === '' || (r.split(sep)[0] !== '..' && !isAbsolute(r));
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${rel(path)}: ${error.message}`);
    return null;
  }
}

// Lists files without following symlinks, so symlinks are reported as files.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function checkNoCyrillic(path, text = readFileSync(path, 'utf8')) {
  const line = text.split('\n').findIndex((l) => CYRILLIC.test(l));
  if (line !== -1) fail(`${rel(path)}:${line + 1}: Cyrillic text; everything in plugins, scripts, evals and workflows is in English, code and examples included`);
}

function checkEnglish(path, text = readFileSync(path, 'utf8')) {
  const prose = text.replace(CODE, (code) => code.replace(/[^\n]/g, ' '));
  const line = prose.split('\n').findIndex((l) => CYRILLIC.test(l));
  if (line !== -1) fail(`${rel(path)}:${line + 1}: Cyrillic text; catalog metadata and docs are in English`);
}

function frontmatter(text) {
  return FRONTMATTER.exec(text)?.[0] ?? '';
}

function frontmatterName(text) {
  return /^name:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(frontmatter(text))?.[1];
}

// The `skills:` list of an agent: a block list (`- name`) or a flow list (`[a, b]`).
function frontmatterSkills(text) {
  const lines = frontmatter(text).split('\n');
  const start = lines.findIndex((line) => /^skills:/.test(line));
  if (start === -1) return [];
  const inline = /^skills:\s*\[(.*)\]\s*$/.exec(lines[start]);
  if (inline) return inline[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const skills = [];
  for (const line of lines.slice(start + 1)) {
    const item = /^\s+-\s*["']?([^"'\n]+?)["']?\s*$/.exec(line);
    if (!item) break;
    skills.push(item[1]);
  }
  return skills;
}

// Component names as Claude Code namespaces them: skills by frontmatter name or folder,
// agents by frontmatter name or file name with subfolders joined by ":", commands by file name.
function listComponents(dir) {
  const components = new Set();
  const skillsDir = join(dir, 'skills');
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      const skillFile = join(skillsDir, entry.name, 'SKILL.md');
      if (entry.isDirectory() && existsSync(skillFile)) components.add(frontmatterName(readFileSync(skillFile, 'utf8')) ?? entry.name);
    }
  }
  for (const kind of ['agents', 'commands']) {
    const kindDir = join(dir, kind);
    if (!existsSync(kindDir)) continue;
    for (const file of walk(kindDir).filter((f) => extname(f) === '.md')) {
      const parts = relative(kindDir, file).split(sep);
      const base = parts.pop().replace(/\.md$/, '');
      const name = kind === 'agents' ? frontmatterName(readFileSync(file, 'utf8')) ?? base : base;
      components.add([...parts, name].join(':'));
    }
  }
  return components;
}

// Minimal semver range matching for `dependencies`: ^, ~, comparison operators, x-ranges, spaces (AND) and ||.
function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version ?? '');
  return match && { parts: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] };
}

function compareParts(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function comparatorBounds(comparator) {
  const match = /^(\^|~|>=|<=|>|<|=)?v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?$/.exec(comparator);
  if (!match) throw new Error(`unsupported range syntax "${comparator}"`);
  const [, op = '', ...raw] = match;
  const given = raw.map((part) => (part === undefined || /[xX*]/.test(part) ? undefined : Number(part)));
  const known = given.findIndex((part) => part === undefined);
  const depth = known === -1 ? 3 : known; // how many leading parts are fixed
  const low = given.map((part) => part ?? 0);
  const bump = (index) => low.map((part, i) => (i < index ? part : i === index ? part + 1 : 0));
  if (op === '>=') return { low };
  if (op === '>') return depth === 3 ? { low, lowExclusive: true } : { low: bump(depth - 1) };
  if (op === '<') return { high: low };
  if (op === '<=') return depth === 3 ? { high: low, highInclusive: true } : { high: bump(depth - 1) };
  if (op === '^') {
    const first = low.findIndex((part, i) => part !== 0 || i >= depth - 1);
    return { low, high: bump(Math.min(first, depth - 1)) };
  }
  if (op === '~') return { low, high: bump(depth >= 2 ? 1 : 0) };
  if (depth === 0) return { low };
  return depth === 3 ? { low, high: low, highInclusive: true } : { low, high: bump(depth - 1) };
}

function satisfies(version, range) {
  const parsed = parseVersion(version);
  if (!parsed || parsed.pre) return false; // ranges in this repo don't opt into pre-releases
  return range.split('||').some((set) =>
    set.trim().split(/\s+/).every((comparator) => {
      const { low, high, lowExclusive, highInclusive } = comparatorBounds(comparator);
      if (low) {
        const c = compareParts(parsed.parts, low);
        if (c < 0 || (c === 0 && lowExclusive)) return false;
      }
      if (high) {
        const c = compareParts(parsed.parts, high);
        if (c > 0 || (c === 0 && !highInclusive)) return false;
      }
      return true;
    }),
  );
}

function hasShebang(path) {
  const fd = openSync(path, 'r');
  const head = Buffer.alloc(2);
  const bytes = readSync(fd, head, 0, 2, 0);
  closeSync(fd);
  return bytes === 2 && head.toString() === '#!';
}

function checkFile(file, pluginDir) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink()) {
    let target;
    try {
      target = realpathSync(file);
    } catch {
      return fail(`${rel(file)}: broken symlink`);
    }
    if (!isInside(target, root)) fail(`${rel(file)}: symlink points outside the repository; Claude Code skips it on install`);
    return;
  }
  if (hasShebang(file) && (stat.mode & 0o111) === 0) fail(`${rel(file)}: has a shebang but is not executable (chmod +x)`);

  const path = relative(pluginDir, file).split(sep).join('/');
  if (!TEXT_EXTENSIONS.has(extname(file))) return;

  const text = readFileSync(file, 'utf8');
  checkNoCyrillic(file, text);
  for (const match of text.matchAll(PLUGIN_ROOT_REF)) {
    const target = match[1].replace(/\.+$/, '');
    const path = resolve(pluginDir, target);
    if (!isInside(path, pluginDir)) fail(`${rel(file)}: \${CLAUDE_PLUGIN_ROOT}/${target} escapes the plugin directory`);
    else if (!existsSync(path)) fail(`${rel(file)}: \${CLAUDE_PLUGIN_ROOT}/${target} does not exist in the plugin`);
  }

  const skillDir = /^skills\/[^/]+\//.exec(path)?.[0];
  for (const match of text.matchAll(SKILL_DIR_REF)) {
    const target = match[1].replace(/\.+$/, '');
    if (!skillDir) {
      fail(`${rel(file)}: \${CLAUDE_SKILL_DIR} only resolves in a skill's own files; use \${CLAUDE_PLUGIN_ROOT} here`);
      continue;
    }
    const base = join(pluginDir, skillDir);
    const resolved = resolve(base, target);
    if (!isInside(resolved, base)) fail(`${rel(file)}: \${CLAUDE_SKILL_DIR}/${target} escapes the skill directory`);
    else if (!existsSync(resolved)) fail(`${rel(file)}: \${CLAUDE_SKILL_DIR}/${target} does not exist in ${skillDir}`);
  }

  const line = text.split('\n').findIndex((l) => FORBIDDEN_REF.test(l));
  if (line !== -1) {
    fail(`${rel(file)}:${line + 1}: names "${FORBIDDEN_REF.exec(text)[0]}"; plugins are shared, so take project paths from inputs and call skills and agents by <plugin>:<name>`);
  }
  const retired = path === 'CHANGELOG.md' ? -1 : text.split('\n').findIndex((l) => RETIRED_REF.test(l));
  if (retired !== -1) {
    fail(`${rel(file)}:${retired + 1}: names "${RETIRED_REF.exec(text)[0]}"; this marketplace is Angular + NestJS only, and plugins carry no source-project names (AGENTS.md)`);
  }
  const home = text.split('\n').findIndex((l) => ABSOLUTE_HOME.test(l));
  if (home !== -1) {
    fail(`${rel(file)}:${home + 1}: absolute path "${ABSOLUTE_HOME.exec(text)[0]}"; use \${CLAUDE_PLUGIN_ROOT}, \${CLAUDE_SKILL_DIR}, \${CLAUDE_PLUGIN_DATA} or a path from the input (SECURITY.md)`);
  }
  const secret = text.split('\n').findIndex((l) => SECRET.test(l));
  if (secret !== -1) fail(`${rel(file)}:${secret + 1}: looks like a credential; plugins never carry secrets (SECURITY.md)`);
}

function checkPlugin(entry, where) {
  const dir = resolve(root, entry.source);
  if (entry.source !== `./plugins/${entry.name}`) fail(`${where}: source must be "./plugins/${entry.name}"`);
  if (!existsSync(dir)) return fail(`${where}: source directory ${rel(dir)} does not exist`);

  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) return fail(`${rel(dir)}: missing .claude-plugin/plugin.json`);
  if (lstatSync(manifestPath).isSymbolicLink()) {
    fail(`${rel(manifestPath)}: must be a regular file; \`claude plugin validate . --strict\` fails on a symlinked manifest`);
  }
  const manifest = readJson(manifestPath);
  if (manifest) {
    if (manifest.name !== entry.name) fail(`${rel(manifestPath)}: name "${manifest.name}" differs from marketplace entry "${entry.name}"`);
    if (!SEMVER.test(manifest.version ?? '')) fail(`${rel(manifestPath)}: needs a semver "version", got ${JSON.stringify(manifest.version)}`);
  }

  for (const name of MAINTAINER_ONLY) {
    if (existsSync(join(dir, name))) fail(`${rel(join(dir, name))}: ships to users; keep maintainer files at the repo root (docs/plugins/, specs/, INSIGHTS.md)`);
  }
  if (existsSync(join(dir, 'bin'))) {
    fail(`${rel(join(dir, 'bin'))}: claude.ai organization sync rejects a top-level bin/; use scripts/ and "\${CLAUDE_PLUGIN_ROOT}"/scripts/<name>`);
  }
  const changelog = join(dir, 'CHANGELOG.md');
  if (!existsSync(changelog)) fail(`${rel(dir)}: missing CHANGELOG.md; add a "## <version> — <date>" entry per release`);
  else if (manifest?.version) {
    const heading = new RegExp(`^##\\s+\\[?v?${manifest.version.replace(/[.+]/g, '\\$&')}\\]?(\\s|$)`, 'm');
    if (!heading.test(readFileSync(changelog, 'utf8'))) fail(`${rel(changelog)}: no "## ${manifest.version}" entry for the version in plugin.json`);
  }

  for (const file of walk(dir)) checkFile(file, dir);
  plugins.set(entry.name, { dir, manifest, components: listComponents(dir) });
}

function dependencyEntries(manifest) {
  return (manifest?.dependencies ?? []).map((dep) => {
    if (typeof dep !== 'string') return dep;
    const [name, marketplaceName] = dep.split('@');
    return { name, marketplace: marketplaceName };
  });
}

// Every dependency is in this catalog and its current version satisfies the declared range.
function checkDependencies(name, { dir, manifest }) {
  const where = rel(join(dir, '.claude-plugin', 'plugin.json'));
  for (const dep of dependencyEntries(manifest)) {
    if (dep.marketplace && dep.marketplace !== marketplace.name) {
      fail(`${where}: dependency "${dep.name}@${dep.marketplace}" is in another marketplace; this repo has no cross-marketplace allowlist`);
      continue;
    }
    const target = plugins.get(dep.name);
    if (dep.name === name) fail(`${where}: depends on itself`);
    else if (!target) fail(`${where}: dependency "${dep.name}" is not in the catalog`);
    else if (dep.version) {
      try {
        if (!satisfies(target.manifest?.version, dep.version)) {
          fail(`${where}: dependency "${dep.name}" requires "${dep.version}", but the catalog has ${target.manifest?.version}`);
        }
      } catch (error) {
        fail(`${where}: dependency "${dep.name}": ${error.message}`);
      }
    }
  }
}

// A <plugin>:<component> reference names this plugin or a direct dependency, and the component exists.
function checkReferences(name, { dir, manifest }) {
  const allowed = new Set([name, ...dependencyEntries(manifest).map((dep) => dep.name)]);
  const names = [...plugins.keys()].map((n) => n.replace(/[-]/g, '\\-'));
  const reference = new RegExp(`(?<![\\w./@-])(${names.join('|')}):([a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)*)`, 'g');
  for (const file of walk(dir).filter((f) => TEXT_EXTENSIONS.has(extname(f)) && !lstatSync(f).isSymbolicLink())) {
    const text = readFileSync(file, 'utf8');
    if (/^agents\//.test(relative(dir, file).split(sep).join('/'))) {
      for (const skill of frontmatterSkills(text)) {
        if (!skill.includes(':')) fail(`${rel(file)}: skills entry "${skill}" needs its plugin namespace, as <plugin>:${skill}`);
      }
    }
    for (const [i, line] of text.split('\n').entries()) {
      for (const [, plugin, component] of line.matchAll(reference)) {
        const at = `${rel(file)}:${i + 1}`;
        if (!allowed.has(plugin)) fail(`${at}: uses ${plugin}:${component}; add "${plugin}" to dependencies in plugin.json`);
        else if (!plugins.get(plugin).components.has(component)) fail(`${at}: ${plugin}:${component} does not exist in plugins/${plugin}`);
      }
    }
  }
}

const marketplacePath = join(root, '.claude-plugin', 'marketplace.json');
const marketplace = readJson(marketplacePath);
if (marketplace) {
  const listed = new Set();
  for (const [i, entry] of (marketplace.plugins ?? []).entries()) {
    const where = `marketplace.json plugins[${i}] "${entry.name}"`;
    listed.add(entry.name);
    if ('version' in entry) fail(`${where}: remove "version"; it lives only in the plugin's plugin.json`);
    if (typeof entry.source === 'string') checkPlugin(entry, where);
  }

  for (const [name, info] of plugins) {
    checkDependencies(name, info);
    checkReferences(name, info);
  }

  const pluginsDir = join(root, 'plugins');
  if (existsSync(pluginsDir)) {
    for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !listed.has(entry.name)) fail(`plugins/${entry.name}: not listed in .claude-plugin/marketplace.json`);
    }
  }
}

for (const name of STRICT_ENGLISH) {
  const path = join(root, name);
  if (!existsSync(path)) continue;
  for (const file of walk(path).filter((f) => TEXT_EXTENSIONS.has(extname(f)) && !f.includes(`${sep}results${sep}`))) checkNoCyrillic(file);
}

for (const name of ROOT_DOCS) {
  const path = join(root, name);
  if (!existsSync(path)) continue;
  const files = lstatSync(path).isDirectory() ? walk(path).filter((file) => extname(file) === '.md') : [path];
  for (const file of files) checkEnglish(file);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✘ ${error}`);
  console.error(`\n${errors.length} problem(s) found`);
  process.exit(1);
}
console.log('✔ Repository conventions passed');
