#!/usr/bin/env node
// Builds the catalog site from the repository into a static directory for GitHub Pages.
// Usage: node site/build.mjs [--out _site] [--root <repo>] [--base /gm-ai-marketplace-angular-nestjs/] [--skip-inventory]
//   --root            the repository to read; tests point it at a fixture
//   --base            the absolute path the site is served from; only 404.html uses it
//   --skip-inventory  skip the `claude plugin details` comparison (tests; CI never skips it)
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { BASE_PATH, BRANCH, GITHUB, LOCALE, REPO } from './config.mjs';
import { text } from './assets/text.js';
import { buildCommit } from './lib/git.mjs';
import { checkInventory, claudeAvailable } from './lib/inventory.mjs';
import { renderMarkdown, slug } from './lib/markdown.mjs';
import { BuildError, readRepo } from './lib/read-repo.mjs';
import { componentPage } from './templates/component.mjs';
import { guidePage } from './templates/guide.mjs';
import { home } from './templates/home.mjs';
import { page } from './templates/layout.mjs';
import { notFoundPage } from './templates/not-found.mjs';
import { pluginPage } from './templates/plugin.mjs';

const SITE = fileURLToPath(new URL('.', import.meta.url));
const INDEX_WARN_BYTES = 250 * 1024;
const PAGE_WARN_BYTES = 100 * 1024;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const warn = (message) => console.warn(`warning: ${message}`);

function options() {
  const { values } = parseArgs({
    options: {
      out: { type: 'string' },
      root: { type: 'string' },
      base: { type: 'string', default: BASE_PATH },
      'skip-inventory': { type: 'boolean', default: false },
    },
  });
  const root = resolve(values.root ?? join(SITE, '..'));
  const base = values.base.replace(/\/?$/, '/');
  if (!base.startsWith('/')) throw new BuildError(`--base must start with /, got ${values.base}`);
  return { root, out: resolve(values.out ?? join(SITE, '..', '_site')), base, inventory: !values['skip-inventory'] };
}

// The output directory is deleted first, so refuse anything that isn't empty or an earlier build.
function prepareOut(out, root) {
  if (out === root || !relative(out, root).startsWith('..') || !relative(out, SITE).startsWith('..')) {
    throw new BuildError(`--out ${out} would overwrite the repository; pick a separate directory`);
  }
  if (existsSync(out) && readdirSync(out).length > 0 && !existsSync(join(out, 'index.json'))) {
    throw new BuildError(`--out ${out} is not empty and is not an earlier site build`);
  }
  rmSync(out, { recursive: true, force: true });
}

function iconSprite() {
  const dir = join(SITE, 'vendor', 'phosphor');
  const ids = new Set();
  const symbols = readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()
    .map((f) => {
      const svg = readFileSync(join(dir, f), 'utf8');
      const m = /<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/.exec(svg);
      if (!m) throw new BuildError(`site/vendor/phosphor/${f}: not an SVG icon`);
      const id = f.replace(/\.svg$/, '');
      ids.add(id);
      return `<symbol id="${id}" viewBox="${m[1]}">${m[2].trim()}</symbol>`;
    });
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`, ids };
}

// Every relative href and src must point at a file in the build, and every icon at a symbol,
// which catches base-path mistakes before GitHub Pages serves a broken page.
function checkLinks(files, iconIds, base) {
  const problems = [];
  for (const [path, content] of files) {
    if (!path.endsWith('.html')) continue;
    const dir = posix.dirname(path);
    for (const m of String(content).matchAll(/\s(?:href|src|action)="([^"]*)"/g)) {
      const url = m[1].replace(/&amp;/g, '&');
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) continue;
      const [rest, hash = ''] = url.split('#');
      const clean = rest.split('?')[0];
      let target;
      if (clean.startsWith('/')) {
        if (!clean.startsWith(base)) {
          problems.push(`${path}: ${url} is outside the base path ${base}`);
          continue;
        }
        target = clean.slice(base.length);
      } else {
        if (path === '404.html') problems.push(`${path}: ${url} is relative; 404.html is served at any depth`);
        target = posix.normalize(posix.join(dir, clean));
      }
      if (target.startsWith('..')) {
        problems.push(`${path}: ${url} leaves the site`);
        continue;
      }
      const file = target === '.' || target === '' || target.endsWith('/') ? posix.join(target, 'index.html') : target;
      if (!files.has(file)) problems.push(`${path}: ${url} points to a missing file (${file})`);
      else if (file === 'assets/icons.svg' && !iconIds.has(hash)) problems.push(`${path}: icon "${hash}" is not in site/vendor/phosphor`);
    }
  }
  if (problems.length) throw new BuildError(`broken links in the build:\n  ${problems.join('\n  ')}`);
}

// The UI strings, the single place for every text the site shows apart from repository content.
function loadStrings() {
  const file = join(SITE, 'i18n', `${LOCALE}.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new BuildError(`site/i18n/${LOCALE}.json: ${error.message}`);
  }
}

function copyAssets(files, t) {
  for (const f of readdirSync(join(SITE, 'assets'))) files.set(`assets/${f}`, readFileSync(join(SITE, 'assets', f)));
  // The browser gets the same strings as a module, so client code needs no extra request for them.
  files.set('assets/i18n.js', `// Generated by site/build.mjs from site/i18n/${LOCALE}.json; edit that file instead.\nexport default ${JSON.stringify(t)};\n`);
  for (const f of readdirSync(join(SITE, 'vendor', 'fonts'))) files.set(`assets/fonts/${f}`, readFileSync(join(SITE, 'vendor', 'fonts', f)));
  files.set('assets/search-terms.json', readFileSync(join(SITE, 'search-terms.json')));
}

function build({ root, out, base, inventory }) {
  const t = loadStrings();
  const repo = readRepo(root, t);
  if (inventory) {
    if (claudeAvailable()) for (const plugin of repo.plugins) checkInventory(root, plugin);
    else if (process.env.CI) throw new BuildError('the claude CLI is required in CI for the inventory check');
    else warn('skipped the inventory check: claude CLI not found (https://code.claude.com/docs/en/setup)');
  }

  const buildInfo = buildCommit(root);
  const marketplace = repo.marketplace.name;
  const site = marketplace;
  const files = new Map();
  const items = [];
  const ids = new Set();
  const addItem = (item) => {
    if (ids.has(item.id)) throw new BuildError(`two components share the id ${item.id}`);
    ids.add(item.id);
    items.push(item);
    return item;
  };
  const md = (source, opts, pageRoot, pageDir) =>
    renderMarkdown(source, {
      root,
      github: GITHUB,
      branch: BRANCH,
      pageRoot,
      t,
      image: (path) => {
        if (path.startsWith('..') || !existsSync(join(root, path)) || !statSync(join(root, path)).isFile()) {
          throw new BuildError(`${opts.file}: image ${path} does not exist in the repository`);
        }
        files.set(`files/${path}`, readFileSync(join(root, path)));
        return posix.relative(pageDir, `files/${path}`);
      },
      ...opts,
    });

  const pages = [];
  for (const plugin of repo.plugins) {
    if (!NAME.test(plugin.name)) throw new BuildError(`.claude-plugin/marketplace.json: plugin name "${plugin.name}" can't be a URL path`);
    const pluginDir = `plugins/${plugin.name}/`;
    const common = { plugin: plugin.name, pluginVersion: plugin.version };
    const shared = { category: plugin.category };
    const readme = plugin.readme
      ? md(readFileSync(join(root, plugin.readme), 'utf8'), { file: plugin.readme, dropTitle: [plugin.name, plugin.title], topLevel: 3 }, '../../', pluginDir)
      : null;

    addItem({
      id: `plugin:${plugin.name}`,
      type: 'plugin',
      name: plugin.name,
      title: plugin.title,
      ...common,
      description: plugin.description,
      ...shared,
      keywords: plugin.keywords,
      usage: '',
      badges: plugin.badges,
      url: pluginDir,
      source: `${GITHUB}/tree/${BRANCH}/${plugin.dir}`,
      updated: plugin.updated,
      headings: readme?.headings.map((h) => h.text) ?? [],
      text: readme?.text ?? '',
    });

    const rowsByType = {};
    const row = (type, r) => (rowsByType[type] ??= []).push(r);
    const componentPages = [];

    for (const c of [...plugin.skills, ...plugin.agents, ...plugin.commands]) {
      if (!NAME.test(c.name)) throw new BuildError(`${c.file}: name "${c.name}" can't be a URL path`);
      const url = `${pluginDir}${c.kind}s/${c.name}/`;
      const body = md(c.body, { file: c.file, topLevel: 3 }, '../../../../', url);
      const item = addItem({
        id: `${c.kind}:${plugin.name}/${c.name}`,
        type: c.kind,
        name: c.name,
        title: c.name,
        ...common,
        description: c.description,
        ...shared,
        keywords: c.keywords ?? [],
        usage: c.kind === 'agent' ? `${plugin.name}:${c.name}` : `/${plugin.name}:${c.name}`,
        badges: plugin.badges,
        url,
        source: `${GITHUB}/blob/${BRANCH}/${c.file}`,
        updated: plugin.updated,
        headings: body.headings.map((h) => h.text),
        text: body.text,
      });
      row(c.kind, { id: item.id, name: c.name, description: c.description, usage: item.usage, url });
      componentPages.push({ component: c, item, body: body.html });
    }

    const anchors = new Set();
    const anchor = (base) => {
      let a = base;
      for (let n = 2; anchors.has(a); n++) a = `${base}-${n}`;
      anchors.add(a);
      return a;
    };
    for (const h of plugin.hooks) {
      const a = anchor(`hook-${slug(h.event)}${h.matcher ? `-${slug(h.matcher)}` : ''}`);
      const usage = h.matcher ? `${h.event} · ${h.matcher}` : h.event;
      const item = addItem({
        id: `hook:${plugin.name}/${a.slice(5)}`,
        type: 'hook',
        name: h.event,
        title: `${h.event} hook`,
        ...common,
        description: h.description,
        ...shared,
        keywords: [],
        usage,
        badges: plugin.badges,
        url: `${pluginDir}#${a}`,
        source: `${GITHUB}/blob/${BRANCH}/${h.file}`,
        updated: plugin.updated,
        headings: [],
        text: '',
      });
      row('hook', { id: item.id, name: h.event, description: h.description, usage, anchor: a });
    }
    for (const [type, list, prefix] of [
      ['mcp-server', plugin.mcpServers, 'mcp'],
      ['lsp-server', plugin.lspServers, 'lsp'],
    ]) {
      for (const s of list) {
        const a = anchor(`${prefix}-${slug(s.name)}`);
        const usage = `${s.name} (${s.transport})`;
        const item = addItem({
          id: `${type}:${plugin.name}/${s.name}`,
          type,
          name: s.name,
          title: s.name,
          ...common,
          description: s.description,
          ...shared,
          keywords: [],
          usage,
          badges: plugin.badges,
          url: `${pluginDir}#${a}`,
          source: `${GITHUB}/blob/${BRANCH}/${s.file}`,
          updated: plugin.updated,
          headings: [],
          text: '',
        });
        row(type, { id: item.id, name: s.name, description: s.description, usage, anchor: a });
      }
    }

    pages.push({
      path: pluginDir,
      root: '../../',
      title: text(t, t.meta.pageTitle, { page: plugin.title, site }),
      description: plugin.description,
      current: 'plugin',
      body: pluginPage({ t, plugin, rowsByType, readme: readme?.html, marketplace }),
    });
    for (const { component, item, body } of componentPages) {
      pages.push({
        path: item.url,
        root: '../../../../',
        title: text(t, t.meta.componentTitle, { name: item.name, plugin: plugin.name, site }),
        description: item.description,
        current: 'component',
        body: componentPage({ t, plugin, component, item, rowsByType, body, marketplace }),
      });
    }
  }

  if (repo.guide) {
    const url = 'guides/installing/';
    const rendered = md(repo.guide.source, { file: repo.guide.file, dropTitle: true, topLevel: 2 }, '../../', url);
    addItem({
      id: 'guide:installing',
      type: 'guide',
      name: 'installing',
      title: t.guide.title,
      plugin: '',
      pluginVersion: '',
      description: rendered.headings.filter((h) => h.depth === 2).map((h) => h.text).join(' · '),
      category: '',
      keywords: [],
      usage: '',
      badges: [],
      url,
      source: `${GITHUB}/blob/${BRANCH}/${repo.guide.file}`,
      updated: repo.guide.updated,
      headings: rendered.headings.map((h) => h.text),
      text: rendered.text,
    });
    pages.push({
      path: url,
      root: '../../',
      title: text(t, t.meta.pageTitle, { page: t.guide.title, site }),
      description: t.meta.guideDescription,
      current: 'guide',
      body: guidePage({ t, guide: repo.guide, rendered }),
    });
  }

  pages.unshift({
    path: '',
    root: './',
    title: repo.marketplace.description ? text(t, t.meta.homeTitle, { site, description: repo.marketplace.description }) : site,
    description: repo.marketplace.description ?? site,
    current: 'home',
    body: home({ t, items, categories: repo.categories }),
  });
  pages.push({
    path: '404.html',
    root: base,
    title: text(t, t.meta.pageTitle, { page: t.notFound.title, site }),
    description: t.meta.notFoundDescription,
    current: 'not-found',
    body: notFoundPage({ t, root: base }),
  });

  for (const p of pages) {
    const file = p.path.endsWith('.html') ? p.path : `${p.path}index.html`;
    files.set(file, page({ ...p, t, site, build: buildInfo }));
  }

  const index = {
    version: 1,
    marketplace: { name: marketplace, repo: REPO },
    build: { commit: buildInfo.commit, date: buildInfo.date },
    categories: repo.categories,
    items,
  };
  const indexJson = JSON.stringify(index);
  files.set('index.json', indexJson);
  copyAssets(files, t);
  const sprite = iconSprite();
  files.set('assets/icons.svg', sprite.svg);

  checkLinks(files, sprite.ids, base);

  const gz = (s) => gzipSync(s).length;
  const indexSize = gz(indexJson);
  if (indexSize > INDEX_WARN_BYTES) warn(`index.json is ${Math.round(indexSize / 1024)} KB gzipped, over 250 KB`);
  const firstLoad = ['index.html', ...[...files.keys()].filter((f) => /^assets\/[^/]+\.(css|js)$/.test(f))].reduce((n, f) => n + gz(files.get(f)), 0);
  if (firstLoad > PAGE_WARN_BYTES) warn(`the home page loads ${Math.round(firstLoad / 1024)} KB of HTML, CSS and JavaScript gzipped, over 100 KB`);

  prepareOut(out, root);
  for (const [path, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const target = join(out, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return { pages: pages.length, items: items.length, indexSize, firstLoad };
}

try {
  const opts = options();
  const result = build(opts);
  console.log(
    `✔ Built ${result.pages} pages and ${result.items} index items into ${relative(process.cwd(), opts.out) || '.'} ` +
      `(index ${Math.round(result.indexSize / 102.4) / 10} KB, home page ${Math.round(result.firstLoad / 102.4) / 10} KB gzipped)`,
  );
} catch (error) {
  if (!(error instanceof BuildError)) throw error;
  console.error(`✘ ${error.message}`);
  process.exit(1);
}
