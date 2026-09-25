#!/usr/bin/env node
// Page manifest for a domain site (housevideo.app by default): every page it publishes, what
// each page says about itself, whether search engines may fetch and list it, where it is
// edited, and how the pages link to each other.
//
// The site is staged from this checkout the way the Pages workflow stages it
// (stage_domain_sites.mjs --out, never --site-root, which rewrites pages in place). Each page is
// then read twice: as published HTML for its head, robots rules and static links, and in a
// headless browser for the links its scripts build after load. The two link counts stay
// separate, because counting only the HTML makes pages that build their navigation look like
// dead ends.
//
//   npm run manifest:housevideo -- [--out <dir>] [--site <id>] [--no-browser]
//
// Writes <site>-manifest.json and <site>-manifest.md to --out (default: a temporary directory).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { robotsRules, robotsAllows } from './stage_domain_sites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘' };
const decode = (text) => text
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// The document head only. An inline SVG in the body has its own <title>, which is the
// figure's accessible name, not the page's.
function headOf(html) {
  const start = html.search(/<head\b/i);
  const end = html.search(/<\/head>/i);
  if (start !== -1 && end > start) return html.slice(start, end);
  const body = html.search(/<body\b/i);
  return body === -1 ? html : html.slice(0, body);
}

function headTitle(html) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(headOf(html));
  return match ? plain(match[1]) : '';
}

function metaContent(html, key) {
  for (const tag of headOf(html).match(/<meta\b[^>]*>/gi) || []) {
    const named = new RegExp(`\\b(?:name|property)\\s*=\\s*["']${key.replace(/[.:]/g, '\\$&')}["']`, 'i');
    if (!named.test(tag)) continue;
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
    return content ? decode(content[1]) : '';
  }
  return '';
}

function canonicalOf(html) {
  const tag = (headOf(html).match(/<link\b[^>]*>/gi) || []).find((link) => /\brel\s*=\s*["']canonical["']/i.test(link));
  const href = tag && /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
  return href ? href[1] : '';
}

function firstHeading(html) {
  const body = html.slice(Math.max(0, html.search(/<body\b/i)));
  const match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body);
  return match ? plain(match[1]) : '';
}

// The address a staged file is served at.
const routeOf = (rel) => (rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`);

// The staged page an address on this site serves, or null.
function pageFor(pathname, pages) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  for (const candidate of [clean || 'index.html', clean.endsWith('/') ? `${clean}index.html` : `${clean}/index.html`]) {
    if (pages.has(candidate)) return candidate;
  }
  return null;
}

// Links written in the page's HTML, resolved to pages on the same site. Script and style
// bodies are not links, and neither are links a script builds later.
function staticLinks(html, rel, pages, origin) {
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const targets = new Set();
  for (const [, href] of markup.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    let url;
    try { url = new URL(decode(href), `${origin}${routeOf(rel)}`); } catch { continue; }
    if (url.origin !== origin) continue;
    const target = pageFor(url.pathname, pages);
    if (target && target !== rel) targets.add(target);
  }
  return [...targets].sort();
}

function listFiles(dir, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...listFiles(dir, `${rel}/`));
    else files.push(rel);
  }
  return files.sort();
}

// Where a staged file is edited: a file identical to this checkout's copy comes from the
// repository (the managed exports are named for their source); anything else was written by
// the publishing step.
function editedIn(rel, bytes) {
  const source = path.join(ROOT, rel);
  if (!fs.existsSync(source) || !fs.readFileSync(source).equals(bytes)) return { where: 'Publishing step', changed: '' };
  const changed = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
  const where = rel.startsWith('fmp/') ? 'fmp-suite export' : rel.startsWith('camera-sim/') ? 'Simulator build' : 'system-by-dave';
  return { where, changed };
}

async function runtimeLinks(dir, pages, origin) {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { return null; }
  const server = http.createServer((request, response) => {
    const rel = pageFor(new URL(request.url, 'http://local').pathname, new Set(listFiles(dir)))
      || decodeURIComponent(new URL(request.url, 'http://local').pathname).replace(/^\/+/, '');
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404).end(); return; }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.csv': 'text/csv' }[path.extname(file)];
    response.writeHead(200, { 'content-type': type || 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
    : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
  const browser = await chromium.launch({ headless: true, ...channel });
  const results = {};
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    // Nothing leaves the machine: sign-in, the backend and other domains are not contacted.
    await context.route((url) => !url.href.startsWith(base), (route) => route.abort());
    for (const rel of [...pages].sort()) {
      const page = await context.newPage();
      try {
        await page.goto(`${base}${routeOf(rel)}`, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(600);
        const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((link) => link.href));
        const targets = new Set();
        for (const href of hrefs) {
          const url = new URL(href);
          const own = url.origin === base ? origin : url.origin;
          if (own !== origin) continue;
          const target = pageFor(url.pathname, pages);
          if (target && target !== rel) targets.add(target);
        }
        results[rel] = { links: [...targets].sort(), landed: new URL(page.url()).origin === base ? routeOf(pageFor(new URL(page.url()).pathname, pages) || rel) : page.url() };
      } catch (error) {
        results[rel] = { links: null, error: String(error.message || error).split('\n')[0] };
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  return results;
}

function stage(siteId) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'site-manifest-'));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/stage_domain_sites.mjs'), '--out', out], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  const dir = path.join(out, siteId);
  if (!fs.existsSync(dir)) throw new Error(`No staged site ${siteId}.`);
  return { out, dir };
}

async function buildManifest({ siteId = 'housevideo', browser = true } = {}) {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/domain-sites.json'), 'utf8'));
  const site = config.sites.find((entry) => entry.id === siteId);
  if (!site) throw new Error(`Unknown site ${siteId}.`);
  const origin = `https://${site.domain}`;
  const { out, dir } = stage(siteId);
  try {
    const files = listFiles(dir);
    const pages = new Set(files.filter((file) => /\.html?$/i.test(file)));
    const robotsText = fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8');
    const rules = robotsRules(robotsText);
    const sitemapFile = path.join(dir, 'sitemap.xml');
    const sitemap = fs.existsSync(sitemapFile)
      ? [...fs.readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname) : [];
    const runtime = browser ? await runtimeLinks(dir, pages, origin) : null;
    const records = [];
    for (const rel of pages) {
      const bytes = fs.readFileSync(path.join(dir, rel));
      const html = bytes.toString('utf8');
      const route = routeOf(rel);
      const robotsMeta = metaContent(html, 'robots');
      const fetchable = robotsAllows(rules, route);
      records.push({
        route,
        file: rel,
        title: headTitle(html),
        description: metaContent(html, 'description'),
        heading: firstHeading(html),
        canonical: canonicalOf(html),
        robotsMeta,
        robotsTxt: fetchable ? 'allowed' : 'blocked',
        inSitemap: sitemap.includes(route),
        searchEngines: fetchable && !/noindex/i.test(robotsMeta) ? 'Indexed' : fetchable ? 'Noindex' : 'Noindex · blocked',
        bytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        ...editedIn(rel, bytes),
        staticLinksOut: staticLinks(html, rel, pages, origin)
      });
    }
    for (const record of records) {
      record.staticLinksIn = records.filter((other) => other.staticLinksOut.includes(record.file)).map((other) => other.file).sort();
      const found = runtime?.[record.file];
      record.runtimeLinksOut = found?.links ?? null;
      if (found?.error) record.runtimeError = found.error;
      if (found?.landed && found.landed !== record.route) record.runtimeLandedOn = found.landed;
    }
    records.sort((a, b) => a.route.localeCompare(b.route));
    const supporting = files.filter((file) => !pages.has(file));
    const source = JSON.parse(fs.readFileSync(path.join(dir, 'source.json'), 'utf8'));
    return {
      schema: 'system-by-dave.site-manifest.v1',
      site: site.id,
      domain: site.domain,
      sourceCommit: source.sourceCommit,
      artifactSha256: source.artifactSha256,
      pages: records,
      supportingFiles: { count: supporting.length, bytes: supporting.reduce((sum, file) => sum + fs.statSync(path.join(dir, file)).size, 0) },
      robotsTxt: robotsText,
      sitemap,
      runtimeLinks: runtime ? 'counted in a headless browser after load; other domains blocked' : 'not measured (--no-browser or Playwright unavailable)'
    };
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const cell = (text) => String(text).replace(/\|/g, '\\|');

function markdown(manifest) {
  const lines = [
    `# ${manifest.domain} page manifest`,
    '',
    `Staged from system-by-dave ${manifest.sourceCommit.slice(0, 7)} (artifact ${manifest.artifactSha256.slice(0, 8)}). ${manifest.pages.length} pages, ${manifest.supportingFiles.count} supporting files (${kb(manifest.supportingFiles.bytes)}).`,
    `Static links are written in the page's HTML. Runtime links are ${manifest.runtimeLinks}.`,
    '',
    '| Route | Title | Search engines | Edited in | Size | Changed | Static out · in | Runtime out |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  ];
  for (const page of manifest.pages) {
    const runtime = page.runtimeLinksOut === null ? (page.runtimeError ? 'error' : '—')
      : `${page.runtimeLinksOut.length}${page.runtimeLandedOn ? ` (redirected to ${cell(page.runtimeLandedOn)})` : ''}`;
    lines.push(`| ${cell(page.route)} | ${cell(page.title)} | ${page.searchEngines}${page.inSitemap ? ' · sitemap' : ''} | ${page.where} | ${kb(page.bytes)} | ${page.changed || '—'} | ${page.staticLinksOut.length} · ${page.staticLinksIn.length} | ${runtime} |`);
  }
  lines.push('', '## robots.txt', '', '```text', manifest.robotsTxt.trimEnd(), '```', '');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const argv = process.argv.slice(2);
  const option = (name) => { const at = argv.indexOf(name); return at === -1 ? null : argv[at + 1]; };
  const siteId = option('--site') || 'housevideo';
  const outDir = path.resolve(option('--out') || fs.mkdtempSync(path.join(os.tmpdir(), `${siteId}-manifest-`)));
  const manifest = await buildManifest({ siteId, browser: !argv.includes('--no-browser') });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${siteId}-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${siteId}-manifest.md`), markdown(manifest));
  console.log(`${manifest.domain}: ${manifest.pages.length} pages written to ${outDir}`);
}

export { headOf, headTitle, metaContent, canonicalOf, firstHeading, routeOf, pageFor, staticLinks, buildManifest, markdown };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
