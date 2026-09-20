#!/usr/bin/env node
// Stage the sites this repository publishes on other domains.
//
// scripts/domain-sites.json names each site, the pages that move to it, and the
// browser storage its tools own. For every site this script copies those pages
// plus every asset they reference into <out>/<site-id>/, adds the site's own
// home redirect, 404 page, robots.txt, CNAME, provenance and data-transfer page,
// then checks that every local reference resolves inside the staged site.
//
// With --site-root <dir> (the staged systembydave.com webroot), a site whose
// "cutover" is true has its pages replaced by redirect stubs that offer to move
// saved browser data first. Before cutover the webroot is left untouched.
//
//   node scripts/stage_domain_sites.mjs --out _sites --site-root _site   # CI
//   node scripts/stage_domain_sites.mjs --check                          # gate
//
// Local testing only: --simulate stages every site as if cut over, pointing the
// stubs and the transfer handshake at local servers given by --source-origin and
// --site-origin <id>=<origin>. Stale canonical links are warnings in simulation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = 'scripts/domain-sites.json';
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', '_site', '_sites']);
const SKIP_FILES = new Set(['.DS_Store', '.agent-claim']);
const TRANSFER_ASSETS = ['js/domain-storage.js', 'js/domain-transfer.js', 'css/domain-move.css'];
const RETIRED_WORKER = 'av-suite-worker.js';

function parseArgs(argv) {
  const args = { siteOrigins: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return next;
    };
    if (arg === '--check') args.check = true;
    else if (arg === '--out') args.out = value();
    else if (arg === '--site-root') args.siteRoot = value();
    else if (arg === '--simulate') args.simulate = true;
    else if (arg === '--source-origin') args.sourceOrigin = value();
    else if (arg === '--site-origin') {
      const [id, origin] = value().split('=');
      if (!id || !origin) throw new Error('--site-origin expects <id>=<origin>');
      args.siteOrigins[id] = origin.replace(/\/+$/, '');
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.check && (args.out || args.siteRoot)) throw new Error('--check stages into a temporary directory; do not combine it with --out or --site-root.');
  if (args.simulate && !args.sourceOrigin) throw new Error('--simulate needs --source-origin and a --site-origin for every site, so stubs never name a real domain.');
  return args;
}

const abs = (rel) => path.join(ROOT, rel);
const read = (rel) => fs.readFileSync(abs(rel), 'utf8');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function loadRegistry() {
  const context = {};
  context.window = context;
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('js/sbd-registry.js'), context, { filename: 'js/sbd-registry.js' });
  if (!context.SBD_REGISTRY) throw new Error('js/sbd-registry.js did not define SBD_REGISTRY.');
  return context.SBD_REGISTRY;
}

function listTree(rel) {
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name) || SKIP_FILES.has(entry.name)) continue;
      const child = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), `${child}/`);
      else if (entry.isFile()) out.push(child);
    }
  };
  walk(abs(rel), rel);
  return out.sort();
}

function expandEntry(entry) {
  const rel = entry.replace(/^\.\//, '');
  if (!rel) throw new Error(`Empty site entry "${entry}".`);
  if (rel.endsWith('/')) {
    if (!fs.existsSync(abs(rel)) || !fs.statSync(abs(rel)).isDirectory()) throw new Error(`${rel} is not a directory.`);
    return listTree(rel);
  }
  if (!fs.existsSync(abs(rel)) || !fs.statSync(abs(rel)).isFile()) throw new Error(`${rel} does not exist.`);
  return [rel];
}

// Pages move with the site: at cutover systembydave.com serves redirect stubs in
// their place. Assets are copies; systembydave.com keeps serving its own.
function siteEntries(site, registry) {
  const pages = new Set();
  const assets = new Set();
  for (const entry of site.pages || []) expandEntry(entry).forEach((file) => pages.add(file));
  if (site.registry) {
    // The registry's offline list is what the suite's service worker caches:
    // every HTML page in it moves with the site; everything else is copied.
    for (const tool of registry.tools) expandEntry(tool.href).forEach((file) => pages.add(file));
    for (const asset of offlineAssets(registry)) {
      expandEntry(asset).forEach((file) => {
        if (pages.has(file)) return;
        if (/\.html?$/i.test(file)) pages.add(file);
        else assets.add(file);
      });
    }
  }
  for (const entry of site.assets || []) expandEntry(entry).forEach((file) => assets.add(file));
  for (const file of TRANSFER_ASSETS) assets.add(file);
  return { pages, assets };
}

function offlineAssets(registry) {
  return typeof registry.offlineAssets === 'function' ? registry.offlineAssets() : registry.baseAssets;
}

// A service worker install fails outright when any cached URL is missing, so
// every offline asset must be part of the staged site.
function checkOffline(site, registry, files) {
  if (!site.registry) return [];
  return offlineAssets(registry).map((asset) => asset.replace(/^\.\//, '')).map((asset) => (
    asset.endsWith('/') ? `${asset}index.html` : asset
  )).filter((file) => !files.has(file)).map((file) => `the registry's offline asset ${file} is not in the staged site; the service worker would fail to install.`);
}

function storagePolicy(site, registry) {
  const keys = new Set(site.storage.keys || []);
  if (site.storage.registryKeys) {
    for (const tool of registry.tools) for (const item of tool.storageKeys || []) keys.add(item.key);
  }
  return {
    keys: [...keys].sort(),
    prefixes: [...(site.storage.prefixes || [])].sort(),
    indexedDB: [...(site.storage.indexedDB || [])].sort()
  };
}

// ---------- reference extraction ----------

const HTML_ATTR = /\s(?:href|src|poster|action|data-src|data-href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const HTML_SRCSET = /\ssrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const HTML_STYLE_ATTR = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const META_REFRESH = /<meta[^>]+http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"'\s>]+)/gi;
const SCRIPT_BLOCK = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const META_TAG = /<meta\b[^>]*>/gi;
const SOURCE_URL = /https:\/\/(?:www\.)?systembydave\.com\/[^"'\\\s<>)]*/g;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi;
const CSS_IMPORT = /@import\s+(?:"([^"]+)"|'([^']+)')/gi;
const JS_REFS = [
  /\b(?:import|export)\s[^'";]*?\bfrom\s*(["'])([^"']+)\1/g,
  /\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g,
  /\bimport\s*(["'])([^"']+)\1/g,
  /\bnew\s+(?:Shared)?Worker\s*\(\s*(["'])([^"']+)\1/g,
  /\bserviceWorker\.register\s*\(\s*(["'])([^"']+)\1/g,
  /\bnew\s+URL\s*\(\s*(["'])([^"']+)\1\s*,\s*import\.meta\.url/g
];
// Script-built navigation is only unambiguous when it is root-relative: a
// relative string in shared code resolves against whichever page runs it.
const JS_ROOT_LINKS = [
  /\.href\s*=\s*(["'])(\/[^"']*)\1/g,
  /\blocation(?:\.href)?\s*=\s*(["'])(\/[^"']*)\1/g,
  /\blocation\.(?:assign|replace)\s*\(\s*(["'])(\/[^"']*)\1/g,
  /\bwindow\.open\s*\(\s*(["'])(\/[^"']*)\1/g,
  /\bfetch\s*\(\s*(["'])(\/[^"']*)\1/g
];
const IMPORT_SCRIPTS = /\bimportScripts\s*\(([^)]*)\)/g;

function htmlRefs(text) {
  const refs = [];
  const inline = [];
  const styles = [];
  const markup = text
    .replace(SCRIPT_BLOCK, (whole, attrs, body) => {
      if (/\btype\s*=\s*["']importmap["']/i.test(attrs)) {
        try {
          const map = JSON.parse(body);
          for (const scope of [map.imports || {}, ...Object.values(map.scopes || {})]) refs.push(...Object.values(scope));
        } catch {
          // An unparsable import map is the page's own bug; the browser rejects it too.
        }
      } else if (/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs)) {
        // Structured data names canonical URLs; only systembydave.com ones matter here.
        refs.push(...(body.match(SOURCE_URL) || []));
      } else if (!/\bsrc\s*=/i.test(attrs) && !/\btype\s*=\s*["'](?:application\/json|text\/(?:template|plain))["']/i.test(attrs)) {
        inline.push(body);
      }
      return `<script${attrs}></script>`;
    })
    .replace(STYLE_BLOCK, (whole, body) => {
      styles.push(body);
      return '';
    });
  for (const m of markup.matchAll(HTML_ATTR)) refs.push(m[1] ?? m[2]);
  for (const m of markup.matchAll(HTML_SRCSET)) {
    for (const candidate of (m[1] ?? m[2]).split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) refs.push(url);
    }
  }
  for (const m of markup.matchAll(META_REFRESH)) refs.push(m[1]);
  // og:url and twitter:url name the page's canonical address like rel=canonical does.
  for (const [tag] of markup.matchAll(META_TAG)) {
    if (!/(?:property|name)\s*=\s*["'](?:og:url|twitter:url)["']/i.test(tag)) continue;
    const content = tag.match(/\scontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (content) refs.push(content[1] ?? content[2]);
  }
  for (const m of markup.matchAll(HTML_STYLE_ATTR)) refs.push(...cssRefs(m[1] ?? m[2]));
  for (const body of styles) refs.push(...cssRefs(body));
  for (const body of inline) refs.push(...jsRefs(body));
  return refs;
}

function cssRefs(text) {
  const refs = [];
  for (const m of text.matchAll(CSS_URL)) refs.push(m[1] ?? m[2] ?? m[3]);
  for (const m of text.matchAll(CSS_IMPORT)) refs.push(m[1] ?? m[2]);
  return refs;
}

function jsRefs(text) {
  const refs = [];
  for (const pattern of JS_REFS) for (const m of text.matchAll(pattern)) refs.push(m[2]);
  for (const m of text.matchAll(IMPORT_SCRIPTS)) {
    for (const s of m[1].matchAll(/(["'])([^"']+)\1/g)) refs.push(s[2]);
  }
  for (const pattern of JS_ROOT_LINKS) for (const m of text.matchAll(pattern)) refs.push(m[2]);
  // Bare specifiers resolve through an import map; only paths are files.
  return refs.filter((ref) => /^(?:\.{1,2}\/|\/)/.test(ref));
}

function manifestRefs(text) {
  try {
    const manifest = JSON.parse(text);
    return [manifest.start_url, manifest.scope, ...(manifest.icons || []).map((icon) => icon.src)].filter(Boolean);
  } catch {
    return [];
  }
}

function referencesIn(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.html', '.htm', '.css', '.js', '.mjs', '.webmanifest'].includes(ext) && !file.endsWith('manifest.json')) return [];
  const text = read(file);
  if (ext === '.html' || ext === '.htm') return htmlRefs(text);
  if (ext === '.css') return cssRefs(text);
  if (ext === '.js' || ext === '.mjs') return jsRefs(text);
  return manifestRefs(text);
}

// ---------- resolution ----------

const SOURCE_HOSTS = new Set(['systembydave.com', 'www.systembydave.com']);

function isDirectory(rel) {
  return rel === '' || (fs.existsSync(abs(rel)) && fs.statSync(abs(rel)).isDirectory());
}

function resolveRef(file, raw, site) {
  let ref = String(raw || '').trim();
  if (!ref || ref.startsWith('#')) return { kind: 'skip' };
  if (/\$\{|\{\{|<%|['"]\s*\+|\+\s*['"]|\\/.test(ref)) return { kind: 'skip' };
  if (ref.startsWith('//')) ref = `https:${ref}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref) && !/^https?:/i.test(ref)) return { kind: 'skip' };
  let pathname;
  if (/^https?:/i.test(ref)) {
    let url;
    try { url = new URL(ref); } catch { return { kind: 'skip' }; }
    const host = url.host.toLowerCase();
    if (SOURCE_HOSTS.has(host)) return { kind: 'source', path: decodeURIComponent(url.pathname) };
    if (host !== site.domain && host !== `www.${site.domain}`) return { kind: 'skip' };
    pathname = decodeURIComponent(url.pathname);
  } else {
    const clean = ref.split(/[?#]/)[0];
    if (!clean) return { kind: 'skip' };
    let decoded;
    try { decoded = decodeURIComponent(clean); } catch { decoded = clean; }
    pathname = decoded.startsWith('/') ? decoded : `/${path.posix.join(path.posix.dirname(file), decoded)}`;
    if (decoded.endsWith('/') && !pathname.endsWith('/')) pathname += '/';
  }
  const normalized = path.posix.normalize(pathname);
  if (normalized.startsWith('/..') || normalized.startsWith('..')) return { kind: 'escape', path: normalized };
  let rel = normalized.replace(/^\/+/, '');
  if (rel === '' || rel === '.' || rel === 'index.html') return { kind: 'home' };
  if (rel.endsWith('/') || isDirectory(rel)) rel = `${rel.replace(/\/+$/, '')}/index.html`;
  return { kind: 'local', path: rel };
}

function routeFor(file) {
  return file.endsWith('/index.html') ? file.slice(0, -'index.html'.length) : file;
}

// Walk every reference from the site's files. Referenced assets join the site;
// a reference to a systembydave.com page the site does not carry is an error,
// because it would 404 on the new domain.
function movedSiteFor(rel, movedIndex) {
  const clean = rel.replace(/^\/+/, '');
  return movedIndex.get(clean) || movedIndex.get(`${clean.replace(/\/+$/, '')}/`) || movedIndex.get(`${clean.replace(/\/+$/, '')}/index.html`) || null;
}

function closeSite(site, entries, generated, movedIndex, simulate) {
  const files = new Set([...entries.pages, ...entries.assets]);
  const queue = [...files];
  const problems = [];
  const warnings = [];
  while (queue.length) {
    const file = queue.shift();
    for (const raw of referencesIn(file)) {
      const target = resolveRef(file, raw, site);
      if (target.kind === 'skip' || target.kind === 'home') continue;
      if (target.kind === 'escape') {
        problems.push(`${file}: "${raw}" climbs above the site root.`);
        continue;
      }
      if (target.kind === 'source') {
        // An absolute systembydave.com link keeps working until the page it names
        // moves; from then on it must name the page's new domain directly.
        const moved = movedSiteFor(target.path, movedIndex);
        if (moved && moved.cutover) {
          (simulate ? warnings : problems).push(`${file}: "${raw}" points at systembydave.com, but that page moved; use https://${moved.site.domain}${target.path}.`);
        }
        continue;
      }
      const rel = target.path;
      if (files.has(rel) || generated.has(rel)) continue;
      if (!fs.existsSync(abs(rel))) {
        warnings.push(`${file}: "${raw}" -> ${rel} does not exist in the repository.`);
        continue;
      }
      if (/\.html?$/i.test(rel)) {
        problems.push(`${file}: "${raw}" links to the systembydave.com page /${routeFor(rel)}, which ${site.domain} does not serve. Link to https://systembydave.com/${routeFor(rel)} instead.`);
        continue;
      }
      files.add(rel);
      entries.assets.add(rel);
      queue.push(rel);
    }
  }
  return { files, problems, warnings };
}

// ---------- generated files ----------

function sourceCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const REDIRECT_STYLE = ':root{color-scheme:light dark}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#fff;color:#1b1b1b;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}main{max-width:34rem}a{color:#9a4525;display:inline-block;padding:12px 4px}.skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px}@media (prefers-color-scheme:dark){body{background:#0f1115;color:#eee}a{color:#f0a37f}}';

function homePage(site, origin) {
  const home = site.home;
  const title = escapeHtml(site.name);
  const description = escapeHtml(`${site.name} on ${site.domain}.`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${origin}${home}">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#FFFFFF">
<meta http-equiv="refresh" content="0; url=${home}">
<style>${REDIRECT_STYLE}</style>
<script>location.replace(${JSON.stringify(home)} + location.search + location.hash);</script>
</head>
<body>
<main>
<p><a href="${home}">Open ${title}</a>. Redirecting.<br><a href="https://systembydave.com/">System by Dave home</a></p>
</main>
</body>
</html>
`;
}

function notFoundPage(site) {
  const title = escapeHtml(site.name);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Page not found | ${title}</title>
<meta name="description" content="That address is not part of ${title}.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FFFFFF">
<link rel="stylesheet" href="/css/domain-move.css">
<style>${REDIRECT_STYLE}</style>
</head>
<body>
<a class="skip" href="#main">Skip to page content</a>
<main id="main" tabindex="-1">
<h1>Page not found</h1>
<p>That address is not part of ${title} on ${escapeHtml(site.domain)}.</p>
<p><a href="${site.home}">Open ${title}</a> · <a href="/">${escapeHtml(site.domain)} home</a> · <a href="https://systembydave.com/">System by Dave home</a></p>
</main>
</body>
</html>
`;
}

function transferPage(site, origin) {
  const title = escapeHtml(site.name);
  const domain = escapeHtml(site.domain);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>Move saved data | ${title}</title>
<meta name="description" content="Move ${title} data saved in this browser on systembydave.com to ${domain}.">
<link rel="canonical" href="${origin}/transfer.html">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FFFFFF">
<link rel="stylesheet" href="/css/domain-move.css">
<script src="/js/domain-transfer-config.js"></script>
<script src="/js/domain-storage.js" defer></script>
<script src="/js/domain-transfer.js" defer></script>
</head>
<body>
<a class="sbd-move-skip" href="#transfer">Skip to data transfer</a>
<main id="transfer" class="sbd-move" tabindex="-1">
<h1>Move saved ${title} data</h1>
<p id="transferStatus" class="sbd-move-status" role="status" aria-live="polite">Open this page from a systembydave.com ${title} page to move data automatically, or import a backup file below.</p>
<section id="transferResult" class="sbd-move-panel" hidden></section>
<section class="sbd-move-panel" aria-labelledby="backupHeading">
<h2 id="backupHeading">Import a backup file</h2>
<p>Choose a backup downloaded from systembydave.com. Anything already saved on ${domain} is kept unless you choose to replace it.</p>
<label class="sbd-move-file" for="backupFile">Backup file</label>
<input id="backupFile" type="file" accept="application/json,.json">
</section>
<p class="sbd-move-links"><a href="${site.home}">Open ${title}</a> · <a href="https://systembydave.com/">System by Dave home</a></p>
</main>
<noscript><p class="sbd-move">Moving saved data requires JavaScript.</p></noscript>
</body>
</html>
`;
}

// A route this site used to serve that now lives on another site. Bookmarks and typed
// addresses still resolve: the page is noindex, canonicalises to the new origin, and
// carries a real link for visitors without JavaScript or meta refresh.
function movedPage(target, name) {
  const title = escapeHtml(`${name} has moved`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${title}</title>
<meta name="description" content="${escapeHtml(`${name} now lives at ${target}.`)}">
<link rel="canonical" href="${escapeHtml(target)}">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#FFFFFF">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
<style>:root{color-scheme:light dark}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center}a{color:inherit}</style>
</head>
<body>
<main>
<h1>${title}</h1>
<p><a href="${escapeHtml(target)}">Open ${escapeHtml(name)}</a></p>
<p>Saved walk data stays in the browser it was entered on. Open the new address on that device to move it.</p>
</main>
</body>
</html>
`;
}

function stubPage(site, origin, file) {
  const route = routeFor(file);
  const target = `${origin}/${route}`;
  const title = escapeHtml(`${site.name} has moved to ${site.domain}`);
  const description = escapeHtml(`${site.name} now lives at ${site.domain}.`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${escapeHtml(target)}">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#FFFFFF">
<meta property="og:type" content="website">
<meta property="og:site_name" content="System by Dave">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(target)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<link rel="stylesheet" href="/css/domain-move.css">
<noscript><meta http-equiv="refresh" content="0; url=${escapeHtml(target)}"></noscript>
<script src="/js/domain-move-sites.js"></script>
<script src="/js/domain-storage.js"></script>
<script src="/js/domain-move.js" data-site="${escapeHtml(site.id)}"></script>
</head>
<body>
<a class="sbd-move-skip" href="#move">Skip to move details</a>
<main id="move" class="sbd-move" tabindex="-1">
<h1>${escapeHtml(site.name)} has moved</h1>
<p>This page now lives at <a id="moveTarget" href="${escapeHtml(target)}">${escapeHtml(`${site.domain}/${route}`)}</a>.</p>
<p id="moveStatus" class="sbd-move-status" role="status" aria-live="polite"></p>
<section id="movePanel" class="sbd-move-panel" hidden></section>
<p class="sbd-move-links"><a href="https://systembydave.com/">System by Dave home</a></p>
</main>
</body>
</html>
`;
}

const RETIRE_WORKER = `'use strict';

/* AV by Dave moved to avbydave.com. This replaces the old systembydave.com
   offline worker: it deletes the AV Suite caches, unregisters itself and
   reloads open pages so they reach the redirect. Generated by
   scripts/stage_domain_sites.mjs at cutover. */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(event){
  event.waitUntil(caches.keys().then(function(names){
    return Promise.all(names.filter(function(name){ return name.indexOf('sbd-av-suite-')===0; }).map(function(name){ return caches.delete(name); }));
  }).then(function(){
    return self.registration.unregister();
  }).then(function(){
    return self.clients.matchAll({type:'window'});
  }).then(function(clients){
    clients.forEach(function(client){ if('navigate' in client) client.navigate(client.url); });
  }));
});
`;

function robots(site, origin, cutover, hasSitemap) {
  // Until cutover the new domain mirrors pages whose canonical URLs still name
  // systembydave.com; keep crawlers out so the mirror never competes with them.
  if (!cutover) return 'User-agent: *\nDisallow: /\n';
  const disallow = (site.robotsDisallow || []).map((route) => `Disallow: ${route}\n`).join('');
  return `User-agent: *\nAllow: /\n${disallow}${hasSitemap ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`;
}

function writeFile(dir, rel, data) {
  const target = path.join(dir, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}

function stageSite(site, closed, policy, options) {
  const dir = path.join(options.out, site.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const file of [...closed.files].sort()) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(abs(file), target);
  }
  const origin = options.siteOrigins[site.id] || `https://${site.domain}`;
  const sourceOrigin = options.sourceOrigin || options.config.origin;
  writeFile(dir, 'index.html', homePage(site, origin));
  for (const [route, targetId] of Object.entries(site.movedTo || {})) {
    const moved = options.config.sites.find((entry) => entry.id === targetId);
    if (!moved) throw new Error(`${site.id} movedTo names unknown site ${targetId}.`);
    const movedOrigin = options.siteOrigins[moved.id] || `https://${moved.domain}`;
    writeFile(dir, `${route}index.html`, movedPage(`${movedOrigin}/${route}`, moved.name));
  }
  writeFile(dir, '404.html', notFoundPage(site));
  writeFile(dir, 'transfer.html', transferPage(site, origin));
  writeFile(dir, 'js/domain-transfer-config.js', `window.SBD_DOMAIN_TRANSFER=${JSON.stringify({
    site: site.id, name: site.name, domain: site.domain, home: site.home, sourceOrigin, ...policy
  })};\n`);
  let hasSitemap = false;
  if (options.cutover) {
    execFileSync('python3', [path.join(ROOT, 'scripts/gen_sitemap.py'), '--site', site.id, '--out', path.join(dir, 'sitemap.xml')], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    hasSitemap = fs.existsSync(path.join(dir, 'sitemap.xml'));
  }
  writeFile(dir, 'robots.txt', robots(site, origin, options.cutover, hasSitemap));
  writeFile(dir, 'CNAME', `${site.domain}\n`);
  writeFile(dir, '.nojekyll', '');
  const hashes = {};
  const listing = [];
  const walk = (base, prefix) => {
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(path.join(base, entry.name), `${rel}/`);
      else listing.push(rel);
    }
  };
  walk(dir, '');
  for (const rel of listing.sort()) hashes[rel] = sha256(fs.readFileSync(path.join(dir, rel)));
  writeFile(dir, 'source.json', `${JSON.stringify({
    schema: 'system-by-dave.domain-site.v1',
    site: site.id,
    domain: site.domain,
    sourceRepository: options.config.sourceRepository,
    sourceCommit: options.commit,
    cutover: options.cutover,
    files: listing.length,
    artifactSha256: sha256(JSON.stringify(hashes))
  }, null, 2)}\n`);
  return { dir, files: listing.length + 1 };
}

// Replace the moved pages in the systembydave.com webroot with redirect stubs.
function applyCutover(siteRoot, site, entries, options) {
  const origin = options.siteOrigins[site.id] || `https://${site.domain}`;
  const removed = [];
  for (const file of entries.pages) {
    const target = path.join(siteRoot, file);
    if (/\.html?$/i.test(file)) fs.writeFileSync(target, stubPage(site, origin, file));
    else {
      fs.rmSync(target, { force: true });
      removed.push(file);
    }
  }
  if (site.registry) fs.writeFileSync(path.join(siteRoot, RETIRED_WORKER), RETIRE_WORKER);
  return removed;
}

// After cutover, nothing left on systembydave.com may load a file that moved.
function checkRemovedAssets(siteRoot, removed) {
  if (!removed.size) return [];
  const problems = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), `${rel}/`);
      else if (/\.(?:html?|css)$/i.test(entry.name)) {
        const text = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        const refs = /\.css$/i.test(entry.name) ? cssRefs(text) : htmlRefs(text);
        for (const raw of refs) {
          const clean = String(raw).split(/[?#]/)[0];
          if (!clean || /^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.startsWith('//')) continue;
          const resolved = path.posix.normalize(clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(rel), clean));
          if (removed.has(resolved)) problems.push(`${rel} loads ${resolved}, which moved off systembydave.com at cutover.`);
        }
      }
    }
  };
  walk(siteRoot, '');
  return problems;
}

function moveSitesScript(config, policies, options) {
  const sites = {};
  for (const site of config.sites) {
    sites[site.id] = {
      name: site.name,
      domain: site.domain,
      origin: options.siteOrigins[site.id] || `https://${site.domain}`,
      ...policies[site.id]
    };
  }
  return `window.SBD_DOMAIN_MOVES=${JSON.stringify(sites)};\n`;
}

// Every configured site needs a publish step that passes its own deploy key.
function checkWorkflow(config) {
  const workflow = read('.github/workflows/deploy-pages.yml');
  const problems = [];
  for (const site of config.sites) {
    if (!workflow.includes(`secrets.${site.deployKeySecret}`)) problems.push(`the Pages workflow never passes secrets.${site.deployKeySecret} for ${site.id}.`);
    if (!workflow.includes(`scripts/publish_domain_site.sh ${site.id} _sites/${site.id} ${site.repository} `)) problems.push(`the Pages workflow never publishes ${site.id} to ${site.repository}.`);
  }
  return problems;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(read(CONFIG_FILE));
  if (config.schema !== 'system-by-dave.domain-sites.v1') throw new Error(`${CONFIG_FILE} has an unknown schema.`);
  const workflowProblems = checkWorkflow(config);
  if (workflowProblems.length) {
    workflowProblems.forEach((problem) => console.error(`FAIL workflow: ${problem}`));
    process.exitCode = 1;
    return;
  }
  const registry = loadRegistry();
  const out = args.check ? fs.mkdtempSync(path.join(os.tmpdir(), 'domain-sites-')) : path.resolve(args.out || '_sites');
  if (args.simulate) {
    const missing = config.sites.filter((site) => !args.siteOrigins[site.id]).map((site) => site.id);
    if (missing.length) throw new Error(`--simulate needs --site-origin for: ${missing.join(', ')}`);
  }
  const options = { config, out, commit: sourceCommit(), siteOrigins: args.siteOrigins, sourceOrigin: args.sourceOrigin };
  const generated = new Set(['index.html', '404.html', 'transfer.html', 'robots.txt', 'sitemap.xml', 'CNAME', '.nojekyll', 'source.json', 'js/domain-transfer-config.js']);
  const policies = {};
  const movedIndex = new Map();
  const plans = [];
  let failed = false;
  const staged = [];

  for (const site of config.sites) {
    for (const key of ['id', 'name', 'domain', 'repository', 'deployKeySecret', 'home', 'storage']) {
      if (!site[key]) throw new Error(`${CONFIG_FILE}: site ${site.id || '?'} is missing "${key}".`);
    }
    const cutover = Boolean(site.cutover) || Boolean(args.simulate);
    const entries = siteEntries(site, registry);
    for (const file of entries.pages) {
      if (movedIndex.has(file)) throw new Error(`${file} is claimed by both ${movedIndex.get(file).site.id} and ${site.id}.`);
      movedIndex.set(file, { site, cutover });
      if (file.endsWith('/index.html')) movedIndex.set(routeFor(file), { site, cutover });
    }
    if (!entries.pages.has(site.home.replace(/^\//, '').replace(/\/$/, '/index.html'))) {
      throw new Error(`${site.id} home ${site.home} is not one of its pages.`);
    }
    policies[site.id] = storagePolicy(site, registry);
    plans.push({ site, entries, cutover });
  }

  for (const { site, entries, cutover } of plans) {
    const closed = closeSite(site, entries, generated, movedIndex, args.simulate);
    closed.problems.push(...checkOffline(site, registry, closed.files));
    closed.warnings.forEach((warning) => console.warn(`warn ${site.id}: ${warning}`));
    if (closed.problems.length) {
      failed = true;
      closed.problems.forEach((problem) => console.error(`FAIL ${site.id}: ${problem}`));
      continue;
    }
    const result = stageSite(site, closed, policies[site.id], { ...options, cutover });
    staged.push({ site, entries, cutover, result });
    console.log(`${site.id}: staged ${result.files} files for ${site.domain} (${entries.pages.size} moving pages/files, ${closed.files.size - entries.pages.size} shared assets, cutover ${cutover ? 'on' : 'off'})`);
  }
  if (failed) {
    console.error('Domain sites failed their reference check.');
    process.exitCode = 1;
    return;
  }

  if (args.siteRoot) {
    const siteRoot = path.resolve(args.siteRoot);
    const removed = new Set();
    for (const { site, entries, cutover } of staged) {
      if (!cutover) continue;
      applyCutover(siteRoot, site, entries, options).forEach((file) => removed.add(file));
      console.log(`${site.id}: systembydave.com now redirects ${[...entries.pages].filter((file) => /\.html?$/i.test(file)).length} pages to ${site.domain}`);
    }
    if (staged.some((item) => item.cutover)) {
      writeFile(siteRoot, 'js/domain-move-sites.js', moveSitesScript(config, policies, options));
      const problems = checkRemovedAssets(siteRoot, removed);
      if (problems.length) {
        problems.forEach((problem) => console.error(`FAIL systembydave.com: ${problem}`));
        process.exitCode = 1;
        return;
      }
    }
  }
  if (args.check) {
    fs.rmSync(out, { recursive: true, force: true });
    console.log('Domain sites verified.');
  }
}

export { CONFIG_FILE, read, loadRegistry, siteEntries, routeFor };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
