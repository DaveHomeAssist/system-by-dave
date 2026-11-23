import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { stagePublicSite } from './stage_public_site.mjs';

const require = createRequire(import.meta.url);
const { publishForbidden } = require('./verify_private_exposure.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir) {
  const out = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) out.push(rel);
    }
  };
  walk(dir, '');
  return out.sort();
}

function stageLegacy(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  execFileSync('rsync', [
    '-a',
    '--exclude=.git',
    '--exclude=.github',
    '--exclude=_site',
    '--exclude=_sites',
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=package.json',
    '--exclude=package-lock.json',
    '--exclude=/flooring-contract-review.html',
    '--exclude=/house',
    '--exclude=/cross-project-*',
    '--exclude=.agent-claim',
    '--exclude=/apps/av-workbook',
    '--exclude=/av-workbook/assets',
    `${ROOT}/`,
    `${outDir}/`
  ]);
}

function exists(dir, rel) {
  const clean = rel.replace(/^\.\//, '').replace(/\/+$/, '');
  if (!clean) return fs.existsSync(path.join(dir, 'index.html'));
  const absolute = path.join(dir, clean);
  if (fs.existsSync(absolute)) return true;
  return fs.existsSync(path.join(absolute, 'index.html')) || fs.existsSync(`${absolute}.html`);
}

function localTarget(page, raw) {
  const url = raw.trim();
  if (!url || url.length > 180 || /[\s{}();]/.test(url)) return '';
  if (/^(?:#|mailto:|tel:|data:|javascript:|blob:)/i.test(url)) return '';
  let pathname = url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    if (!url.startsWith('https://systembydave.com/')) return '';
    pathname = url.slice('https://systembydave.com/'.length);
  }
  pathname = pathname.split('#')[0].split('?')[0];
  if (!pathname) return '';
  const rel = pathname.startsWith('/')
    ? pathname.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(page), pathname));
  if (!rel || rel.startsWith('../')) return '';
  return rel;
}

test('the Pages publish keeps public pages and drops internal files', () => {
  const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-legacy-'));
  const nextDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-public-'));
  try {
    stageLegacy(legacyDir);
    stagePublicSite(nextDir);
    const legacy = new Set(listFiles(legacyDir));
    const next = listFiles(nextDir);
    const published = new Set(next);
    const dropped = [...legacy].filter((file) => !published.has(file));
    const added = next.filter((file) => !legacy.has(file));
    console.log(`publish files: before ${legacy.size}, after ${published.size}, dropped ${dropped.length}, added ${added.length}`);
    assert.deepEqual(added, [], `publish added files the previous deploy did not ship: ${added.slice(0, 8).join(', ')}`);

    const unexplained = dropped.filter((file) => !publishForbidden(file));
    assert.deepEqual(unexplained, [], `dropped a file that is not internal: ${unexplained.slice(0, 8).join(', ')}`);
    const leaked = next.filter((file) => publishForbidden(file));
    assert.deepEqual(leaked, [], `published an internal file: ${leaked.slice(0, 8).join(', ')}`);

    for (const rel of [
      'index.html', 'tools.html', 'privacy-policy.html', 'project-registry.html', 'robots.txt',
      'sitemap.xml', 'CNAME', '.nojekyll', 'manifest.json', 'command53/index.html',
      'field-kit/index.html', 'av-home/index.html', 'demos/index.html',
      'apps/projctl/public/index.html',
      'equipment-lab/data/models/cartoni.maxima30.reference/checklist.md',
      'systembydave/assets/img/08_storyboard_scripts.md'
    ]) {
      assert.equal(exists(nextDir, rel), true, `public file missing from the publish: ${rel}`);
    }
    for (const rel of ['career-market.html', 'AGENTS.md', 'CLAUDE.md', 'docs/launch/checkout.md', 'scripts/verify_private_exposure.js', 'remote-desktop-spec-v2-2026-07-11.md', 'apps/av-audio/index.html']) {
      assert.equal(published.has(rel), false, `internal file still published: ${rel}`);
    }

    const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
    const missingRoutes = routes.filter((route) => !exists(nextDir, route.slice(1)));
    assert.deepEqual(missingRoutes, [], `sitemap routes missing from the publish: ${missingRoutes.slice(0, 8).join(', ')}`);

    const domain = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/domain-sites.json'), 'utf8'));
    const domainMissing = [];
    for (const site of domain.sites) {
      for (const entry of [...(site.pages || []), ...(site.assets || []), site.landingPage].filter(Boolean)) {
        if (!exists(nextDir, entry)) domainMissing.push(`${site.id}:${entry}`);
      }
    }
    assert.deepEqual(domainMissing, [], `domain-site inputs missing: ${domainMissing.slice(0, 8).join(', ')}`);

    const context = { self: {} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sbd-registry.js'), 'utf8'), context, { filename: 'js/sbd-registry.js' });
    const registry = context.self.SBD_REGISTRY;
    const registryMissing = [...registry.tools.map((tool) => tool.href).filter((href) => !exists(nextDir, href))];
    assert.deepEqual(registryMissing, [], `registry tools missing: ${registryMissing.slice(0, 8).join(', ')}`);
    const offlineMissing = [...registry.offlineAssets().map((asset) => asset.replace(/^\.\//, '')).filter((asset) => !exists(nextDir, asset))];
    assert.deepEqual(offlineMissing, [], `offline assets missing: ${offlineMissing.slice(0, 8).join(', ')}`);

    const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    const advertised = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((match) => match[1].replace(/^\//, ''));
    const absentDisallow = advertised.filter((rel) => rel && !exists(nextDir, rel));
    assert.deepEqual(absentDisallow, [], `robots.txt advertises a path the publish does not ship: ${absentDisallow.join(', ')}`);

    const broken = [];
    const queue = ['index.html'];
    const seen = new Set(queue);
    while (queue.length) {
      const page = queue.shift();
      const absolute = path.join(nextDir, page);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        broken.push(page);
        continue;
      }
      if (!page.endsWith('.html')) continue;
      const html = fs.readFileSync(absolute, 'utf8');
      const refs = [...html.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)].map((match) => localTarget(page, match[1])).filter(Boolean);
      for (const rel of refs) {
        const file = rel.endsWith('/') ? `${rel}index.html` : rel;
        if (legacy.has(file) && !published.has(file)) broken.push(`${page} -> ${file}`);
        if (file.endsWith('.html') && published.has(file) && !seen.has(file)) {
          seen.add(file);
          queue.push(file);
        }
      }
    }
    assert.deepEqual(broken, [], `a shipped page links to a file the publish dropped: ${broken.slice(0, 8).join(', ')}`);
  } finally {
    fs.rmSync(legacyDir, { recursive: true, force: true });
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
});
