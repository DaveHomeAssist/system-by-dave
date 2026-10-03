#!/usr/bin/env node
'use strict';
/**
 * FMP hygiene probe: read-only checks of the live FMP suite.
 *
 * Covers the automatable part of docs/fmp-hygiene-routine.md: route and alias
 * status, 404 recovery, legacy origins, live release parity, cache-bust tokens,
 * indexing policy, link and script-built route integrity, shell links, public
 * contact-detail exposure, count agreement, index freshness, the
 * unauthenticated backend boundary, canonical release drift, and rendered
 * browser checks. It never signs in, submits,
 * saves, or writes to any service.
 *
 * Usage: node scripts/fmp_hygiene_probe.js [--base=https://housevideo.app]
 * The default base is the suite's canonical origin from scripts/domain-sites.json.
 *   [--output=report.json] [--markdown=report.md] [--skip-browser]
 *   [--skip-external] [--strict] [--no-sandbox]
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { originFor } = require('./domain_sites_lib');
const { modelContract } = require('./fmp_model_contract');

const site = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const hit = args.find(arg => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = name => args.includes(`--${name}`);
const BASE = option('base', originFor('fmp/')).replace(/\/$/, '');
// The preshow walk has a separate configured origin from camera operations.
// Routes are probed against whichever site scripts/domain-sites.json says now serves them.
const WALK_BASE = option('walk-base', originFor('fmpwalk/')).replace(/\/$/, '');
const baseFor = route => /^\/(?:fmpwalk|fmp-walk)(?:[\/?#]|$)/.test(route) ? WALK_BASE : BASE;
const releaseBase = dir => (dir === 'fmpwalk' ? WALK_BASE : BASE);
const ORIGINS = [...new Set([BASE, WALK_BASE])];
const ORIGIN_PATTERN = `(?:${[...ORIGINS.map(value => new URL(value).origin), 'https://systembydave.com'].map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
const CHROME = option('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const DEBUG_PORT = 9347;
const TIMEOUT_MS = 15000;

const RELEASES = ['fmp', 'fmpwalk'];
// fmp/ and fmpwalk/ are rebuilt by every fmp-suite export and must pin the same source commit.
// A release listed in FROZEN_RELEASES would stay at its pin instead; none is frozen since the walk
// was restored to the export on 2026-09-25 (docs/fmp-public-release.md).
const ACTIVE_RELEASES = ['fmp', 'fmpwalk'];
const FROZEN_RELEASES = {};
const MODEL_ROUTES = ['/fmp/models/atem-hd8-iso.html', '/fmp/models/p240.html', '/fmp/models/ccu4.html', '/fmp/ptz/SuperJoy-G1-Interactive-Guide.html'];
const ROUTES = [...MODEL_ROUTES, '/fmp/', '/fmp/camera/', '/fmp/camera/pit-center/', '/fmp/camera/front-of-house/', '/fmp/camera/pit-stage-left/', '/fmp/camera/catwalk/', '/fmp/guide/', '/fmp/house/', '/fmp/gear/', '/fmp/build/', '/fmp/ptz/', '/fmp/rig/', '/fmpwalk/', '/backfocus/'];
// Addresses operators plausibly type or were given; each should resolve or be deliberately retired.
// /fmp-index/ was retired to a redirect to the /fmp/ hub on 2026-09-18.
const ALIASES = ['/fmp-walk', '/fmp-walk/', '/fmp/walk/', '/fmp-index/'];
// /backfocus/ is an indexable public field guide; only FMP operational pages must stay noindex.
const NOINDEX_PAGES = ['/fmp-index/'];
const BROWSER_PAGES = [...MODEL_ROUTES, '/fmp/', '/fmpwalk/', '/fmp/rig/', '/fmp/guide/', '/fmp/camera/pit-center/', '/fmp/gear/', '/fmp/build/', '/fmp/ptz/'];
// Pages that still scroll the document (WEB-2), recorded in docs/fmp-open-issues-plan-2.md E1. Remove a route
// in the release that makes it fit; W8 warns on any other page that scrolls and on a listed page that now fits.
const WEB2_DEBT = [
  '/fmp/models/atem-hd8-iso.html', '/fmp/models/p240.html', '/fmp/models/ccu4.html', // 375×812 only
  '/fmp/ptz/SuperJoy-G1-Interactive-Guide.html', '/fmp/gear/', '/fmp/build/', '/fmp/ptz/' // both sizes
];
const LEGACY_ORIGINS = [/davehomeassist\.github\.io/i, /\.chatgpt\.site/i];
// Hosts that answer automated requests with a bot challenge (403/429) but loaded in a real browser.
// A challenged link is unverified by this run, so L3 reports grey rather than pass or warn; a 404,
// a 5xx or any other failure from these hosts still warns.
const BOT_PROTECTED = new Map([['aviewfrommyseat.com', 'loaded in a real browser on 2026-10-01; one photo page showed a Cloudflare check']]);
function classifyExternal(url, status) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if ([403, 429].includes(status) && BOT_PROTECTED.has(host)) return 'challenged';
  return status >= 400 || !status ? 'broken' : 'ok';
}
function externalStatus(broken, challenged) {
  return broken ? 'warn' : challenged ? 'grey' : 'pass';
}
const LEGACY_APP_URLS = ['https://davehomeassist.github.io/fmpwalk/', 'https://davehomeassist.github.io/fmpwalk/camera/pit-center/'];
// Pages that must offer a return to the FMP hub. The FMP suite is exempt from the
// system home link (docs/public-shell-contract.md rule 1): /fmp/ is its home.
const SHELL_PAGES = [...MODEL_ROUTES, '/fmp/', '/fmp/camera/pit-center/', '/fmp/guide/', '/fmp/gear/', '/fmp/build/', '/fmp/ptz/', '/fmp/rig/', '/fmpwalk/'];
const ALLOWED_EMAILS = ['avbydave@gmail.com'];
// No public FMP page links a Notion page; the walk's own Save to Notion receipt is the exception.
const NOTION_URL = /https?:\/\/(?:[\w-]+\.)*notion\.(?:so|site|com)\b/gi;
const NOTION_RECEIPT = 'fmpwalk/notion.js';
const HAND_MAINTAINED = ['/fmp-index/', '/fmp-walk/', '/switcher/', '/shader/', '/backfocus/'];
const CANONICAL_REPO = 'DaveHomeAssist/fmp-suite';

const findings = [];
const record = (id, lane, status, title, detail = '') => findings.push({ id, lane, status, title, detail });
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const unique = values => [...new Set(values)];

async function get(url, { method = 'GET', redirect = 'follow' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { method, redirect, signal: controller.signal, cache: 'no-store', headers: { 'user-agent': 'system-by-dave-fmp-hygiene/1.0' } });
    const body = method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(await response.arrayBuffer());
    return { status: response.status, url: response.url, headers: response.headers, body };
  } catch (error) {
    return { status: 0, url, error: error.name === 'AbortError' ? 'timeout' : error.message, body: Buffer.alloc(0) };
  } finally {
    clearTimeout(timer);
  }
}

const statusCache = new Map();
function statusOf(url) {
  if (!statusCache.has(url)) statusCache.set(url, get(url));
  return statusCache.get(url);
}

async function checkRoutes() {
  const broken = [];
  for (const route of ROUTES) {
    const res = await statusOf(baseFor(route) + route);
    if (res.status !== 200) broken.push(`${route} → ${res.status || res.error}`);
  }
  record('R1', 'routes', broken.length ? 'fail' : 'pass', 'Published FMP routes return 200', broken.join('; ') || `${ROUTES.length} routes`);

  const dead = [];
  for (const alias of ALIASES) {
    const res = await statusOf(baseFor(alias) + alias);
    if (res.status !== 200) dead.push(`${alias} → ${res.status || res.error}`);
  }
  record('R2', 'routes', dead.length ? 'warn' : 'pass', 'Typed and legacy FMP addresses resolve', dead.join('; ') || `${ALIASES.length} aliases resolve`);

  const missing = `${BASE}/fmp/camera/hygiene-probe-missing/`;
  const notFound = await get(missing);
  const recovery = [...notFound.body.toString('utf8').matchAll(/<(?:a|link)\s[^>]*href=["']([^"'#]+)["']/g)].map(match => new URL(match[1], missing).href).filter(url => url.startsWith(BASE));
  const deadRecovery = [];
  for (const url of unique(recovery)) {
    const res = await statusOf(url);
    if (res.status >= 400 || res.status === 0) deadRecovery.push(`${url.replace(BASE, '')} (${res.status || res.error})`);
  }
  record('R3', 'routes', deadRecovery.length ? 'fail' : 'pass', '404 page recovery links work from a nested FMP path', deadRecovery.join('; ') || `${unique(recovery).length} links`);

  const legacyLive = [];
  for (const url of LEGACY_APP_URLS) {
    const res = await get(url);
    if (res.status === 200) legacyLive.push(`${url} (200${/data-setup-test-only="true"/.test(res.body.toString('utf8')) || !url.includes('/camera/') ? '' : ', no SETUP TEST guard'})`);
  }
  record('R4', 'routes', legacyLive.length ? 'warn' : 'pass', 'Legacy app origins are retired or show a moved notice', legacyLive.join('; ') || 'retired');
}

async function checkRelease() {
  const provenance = {};
  for (const dir of RELEASES) {
    const local = JSON.parse(fs.readFileSync(path.join(site, dir, 'source_provenance.json'), 'utf8'));
    provenance[dir] = local;
    const res = await get(`${releaseBase(dir)}/${dir}/source_provenance.json`);
    let live = null;
    try { live = JSON.parse(res.body.toString('utf8')); } catch {}
    const same = live && live.sourceCommit === local.sourceCommit && live.artifactSha256 === local.artifactSha256;
    record(`P1-${dir}`, 'release', same ? 'pass' : 'fail', `Live /${dir}/ provenance matches main`, same ? `source ${local.sourceCommit.slice(0, 12)}` : `live ${live ? live.sourceCommit : res.status} vs repo ${local.sourceCommit}`);

    const drift = [];
    for (const [name, expected] of Object.entries(local.files)) {
      const file = await get(`${releaseBase(dir)}/${dir}/${name}`);
      if (file.status !== 200 || sha256(file.body) !== expected) drift.push(`${name} (${file.status})`);
    }
    record(`P2-${dir}`, 'release', drift.length ? 'fail' : 'pass', `Live /${dir}/ files match provenance hashes`, drift.join('; ') || `${Object.keys(local.files).length} files`);

    const tokens = [];
    for (const name of Object.keys(local.files).filter(file => /\.(?:html|js)$/.test(file))) {
      const source = fs.readFileSync(path.join(site, dir, name), 'utf8');
      const pattern = /(?:src=|href=|from\s*|import\s*\(\s*)["']([^"'?#]+\.(?:js|css))\?v=([\w-]+)["']/g;
      for (const [, target, token] of source.matchAll(pattern)) {
        let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), target));
        const base = source.match(/<base href="([^"]+)"/);
        if (base && name.endsWith('.html')) resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), base[1], target));
        const expected = local.files[resolved];
        if (!expected) continue;
        if (!expected.startsWith(token)) tokens.push(`${dir}/${name} → ${resolved}?v=${token} (file ${expected.slice(0, 16)})`);
      }
    }
    record(`P3-${dir}`, 'release', tokens.length ? 'warn' : 'pass', `/${dir}/ cache-bust tokens match the files they load`, unique(tokens).join('; ') || 'all hashed tokens match');
  }

  const commit = provenance.fmp.sourceCommit;
  const pins = releasePins(provenance);
  record('P5', 'release', pins.status, 'Active releases share one export; frozen releases stay at their pin', pins.detail);
  try {
    const gh = args => execFileSync('gh', ['api', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const compare = JSON.parse(gh([`repos/${CANONICAL_REPO}/compare/${commit}...main`, '--jq', '{ahead_by,behind_by,status}']));
    const ahead = compare.ahead_by || 0;
    // A release cut from a PR head leaves main one merge commit ahead with the same files.
    const trees = ahead ? { released: gh([`repos/${CANONICAL_REPO}/commits/${commit}`, '--jq', '.commit.tree.sha']), main: gh([`repos/${CANONICAL_REPO}/commits/main`, '--jq', '.commit.tree.sha']) } : {};
    const verdict = releaseCurrency(commit, ahead, trees.released, trees.main);
    record('P4', 'release', verdict.status, 'Released source commit is current with canonical main', verdict.detail);
  } catch {
    record('P4', 'release', 'grey', 'Released source commit is current with canonical main', `gh could not compare ${CANONICAL_REPO}; check access`);
  }
}

/** P4: main ahead of the released commit warns, unless main's files are identical (a merge commit only). */
function releaseCurrency(commit, ahead, releasedTree, mainTree) {
  const short = String(commit).slice(0, 12);
  if (!ahead) return { status: 'pass', detail: `released ${short} is main` };
  if (releasedTree && releasedTree === mainTree) return { status: 'pass', detail: `main is ${ahead} commit(s) ahead of released ${short} with identical files (tree ${String(mainTree).slice(0, 12)})` };
  return { status: 'warn', detail: `${CANONICAL_REPO} main is ${ahead} commit(s) ahead of released ${short}` };
}

/** W8: document scroll (WEB-2) on any page outside WEB2_DEBT warns, and so does a listed page that now fits. */
function pageScroll(pages, debt = WEB2_DEBT) {
  const over = metrics => Boolean(metrics) && metrics.scrollHeight > metrics.clientHeight + 2;
  const scrolling = pages.filter(page => over(page.desktop) || over(page.phone))
    .map(page => ({ route: page.route, sizes: [over(page.desktop) && '1440×900', over(page.phone) && '375×812'].filter(Boolean) }));
  const fresh = scrolling.filter(page => !debt.includes(page.route));
  const known = scrolling.filter(page => debt.includes(page.route));
  const fixed = debt.filter(route => pages.some(page => page.route === route) && !scrolling.some(page => page.route === route));
  const list = items => items.map(page => `${page.route} (${page.sizes.join(', ')})`).join('; ');
  const parts = [];
  if (fresh.length) parts.push(`new page scroll: ${list(fresh)}`);
  if (fixed.length) parts.push(`now fits, remove from WEB2_DEBT: ${fixed.join(', ')}`);
  if (known.length) parts.push(`recorded debt: ${list(known)}`);
  return { status: fresh.length || fixed.length ? 'warn' : 'pass', detail: parts.join(' · ') || `${pages.length} pages fit` };
}

/** P5: active releases ship from one export; a frozen release must not move off its pin. */
function releasePins(provenance, active = ACTIVE_RELEASES, frozen = FROZEN_RELEASES) {
  const short = sha => String(sha).slice(0, 12);
  const pinned = unique(active.map(dir => provenance[dir].sourceCommit));
  const moved = Object.entries(frozen).filter(([dir, sha]) => provenance[dir].sourceCommit !== sha);
  const problems = [
    ...(pinned.length > 1 ? [`active releases pin ${active.map(dir => `${dir} ${short(provenance[dir].sourceCommit)}`).join(' vs ')}`] : []),
    ...moved.map(([dir, sha]) => `${dir} moved to ${short(provenance[dir].sourceCommit)}; it is frozen at ${short(sha)}`)
  ];
  if (problems.length) return { status: 'fail', detail: problems.join('; ') };
  return { status: 'pass', detail: [...active.map(dir => `${dir} ${short(provenance[dir].sourceCommit)}`), ...Object.entries(frozen).map(([dir, sha]) => `${dir} frozen at ${short(sha)}`)].join('; ') };
}

async function checkIndexing() {
  const pages = unique([...RELEASES.flatMap(dir => {
    const files = Object.keys(JSON.parse(fs.readFileSync(path.join(site, dir, 'source_provenance.json'), 'utf8')).files);
    return files.filter(name => name.endsWith('index.html')).map(name => `/${dir}/${name.replace(/index\.html$/, '')}`);
  }), ...NOINDEX_PAGES]);
  const indexable = [];
  for (const page of pages) {
    const res = await statusOf(baseFor(page) + page);
    if (!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(res.body.toString('utf8'))) indexable.push(page);
  }
  record('I1', 'indexing', indexable.length ? 'fail' : 'pass', 'Every FMP page carries noindex', indexable.join('; ') || `${pages.length} pages`);

  // Each origin disallows the FMP routes it actually serves: the walk and its typed
  // alias moved, so they are the walk origin's rules, not the hub's.
  const missing = [];
  for (const route of ['/fmp/', '/fmpwalk/', '/fmp-index/', '/fmp-walk/']) {
    const origin = baseFor(route);
    const robots = (await get(`${origin}/robots.txt`)).body.toString('utf8');
    if (!robots.includes(`Disallow: ${route}`)) missing.push(`${origin}${route}`);
  }
  record('I2', 'indexing', missing.length ? 'fail' : 'pass', 'Live robots.txt disallows FMP routes', missing.join('; ') || 'all present');

  const listed = [];
  for (const origin of ORIGINS) {
    const sitemap = (await get(`${origin}/sitemap.xml`)).body.toString('utf8');
    listed.push(...(sitemap.match(/<loc>[^<]*\/(?:fmp|fmpwalk|fmp-index|fmp-walk)\/[^<]*<\/loc>/g) || []));
  }
  record('I3', 'indexing', listed.length ? 'fail' : 'pass', 'Live sitemap excludes FMP routes', listed.join('; ') || 'none listed');
}

async function checkLinks() {
  const pages = unique([...ROUTES]);
  const internal = new Map();
  const external = new Map();
  const legacy = [];
  const baseFragments = [];
  for (const page of pages) {
    const res = await statusOf(baseFor(page) + page);
    if (res.status !== 200) continue;
    const html = res.body.toString('utf8');
    const baseHref = (html.match(/<base href="([^"]+)"/) || [])[1];
    const baseUrl = new URL(baseHref || '.', baseFor(page) + page).href;
    if (baseHref && /href=["']#[^"']+["']/.test(html)) baseFragments.push(`${page} (<base href="${baseHref}"> sends #fragment links to ${new URL(baseHref, baseFor(page) + page).pathname})`);
    const refs = [...html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g)].map(match => match[1]);
    // Relative route literals built by page scripts (for example "./camera/" + target + "/").
    const literals = [...html.matchAll(/["'](\.{1,2}\/[a-z0-9-]+\/)["']/g)].map(match => match[1]);
    for (const ref of [...refs, ...literals]) {
      if (/^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(ref) || ref.includes('${')) continue;
      let url;
      try { url = new URL(ref, literals.includes(ref) ? baseFor(page) + page : baseUrl); } catch { continue; }
      url.hash = '';
      if (LEGACY_ORIGINS.some(pattern => pattern.test(url.host))) legacy.push(`${page} → ${url.href}`);
      const bucket = ORIGINS.some(value => url.origin === new URL(value).origin) ? internal : external;
      if (!bucket.has(url.href)) bucket.set(url.href, new Set());
      bucket.get(url.href).add(page);
    }
  }

  const brokenInternal = [];
  for (const [url, from] of internal) {
    const res = await statusOf(url);
    if (res.status >= 400 || res.status === 0) brokenInternal.push(`${[...from].join(', ')} → ${url.replace(BASE, '')} (${res.status || res.error})`);
  }
  record('L1', 'links', brokenInternal.length ? 'fail' : 'pass', 'Same-origin links, assets, and script-built routes resolve', brokenInternal.join('; ') || `${internal.size} targets`);
  record('L2', 'links', legacy.length ? 'fail' : 'pass', 'No links to legacy or private origins', unique(legacy).join('; ') || 'none');
  record('L4', 'links', baseFragments.length ? 'fail' : 'pass', 'In-page (#) links stay on pages that use <base>', baseFragments.join('; ') || 'none');

  if (flag('skip-external')) {
    record('L3', 'links', 'grey', 'External references respond', 'skipped by --skip-external');
    return;
  }
  const brokenExternal = [], challenged = [];
  for (const [url, from] of external) {
    if (/accounts\.google\.com|googleapis\.com|mail\.google\.com|run\.app/.test(url) || LEGACY_ORIGINS.some(pattern => pattern.test(url))) continue;
    const res = await statusOf(url);
    const kind = classifyExternal(url, res.status);
    if (kind === 'challenged') challenged.push(`${url} (${res.status}; ${BOT_PROTECTED.get(new URL(url).hostname.replace(/^www\./, ''))})`);
    else if (kind === 'broken') brokenExternal.push(`${[...from].join(', ')} → ${url} (${res.status || res.error})`);
  }
  const reachable = `${external.size - challenged.length} targets respond` + (challenged.length ? `; ${challenged.length} unverified behind a bot challenge: ${challenged.join('; ')}` : '');
  record('L3', 'links', externalStatus(brokenExternal.length, challenged.length), 'External references respond (bot blocks need a manual look)', brokenExternal.join('; ') || reachable);
}

async function checkContent() {
  const shellGaps = [];
  for (const page of SHELL_PAGES) {
    const html = (await statusOf(baseFor(page) + page)).body.toString('utf8');
    const gaps = [];
    // Links may be relative or name the probed origin or systembydave.com absolutely.
    if (page !== '/fmp/' && !new RegExp(`href=["']${ORIGIN_PATTERN}?/fmp/["']`).test(html)) gaps.push('no /fmp/ return');
    if (gaps.length) shellGaps.push(`${page}: ${gaps.join(', ')}`);
  }
  record('S1', 'navigation', shellGaps.length ? 'warn' : 'pass', 'Pages link back to the FMP hub', shellGaps.join('; ') || `${SHELL_PAGES.length} pages`);

  // Report counts and file names only; never print the matched values.
  const exposed = [];
  const notion = [];
  const counts = new Map();
  const countMismatches = [];
  const { componentsFor } = modelContract(site);
  for (const dir of RELEASES) {
    const files = Object.keys(JSON.parse(fs.readFileSync(path.join(site, dir, 'source_provenance.json'), 'utf8')).files).filter(name => /\.(?:html|js)$/.test(name));
    for (const name of files) {
      const text = (await get(`${releaseBase(dir)}/${dir}/${name}`)).body.toString('utf8');
      const emails = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) || []).filter(email => !ALLOWED_EMAILS.includes(email.toLowerCase()) && !/\.(?:png|webp|jpg|svg|js)$/i.test(email));
      const phones = text.match(/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g) || [];
      if (emails.length || phones.length) exposed.push(`${dir}/${name}: ${unique(emails).length} email(s), ${unique(phones).length} phone number(s)`);
      if (`${dir}/${name}` !== NOTION_RECEIPT && (text.match(NOTION_URL) || []).length) notion.push(`${dir}/${name}: ${(text.match(NOTION_URL) || []).length}`);
      if (!name.includes('/vendor/')) for (const [, number] of text.matchAll(/\b(\d{2,4})[- ](?:part|component)s?\b/g)) {
        counts.set(number, [...(counts.get(number) || []), `${dir}/${name}`]);
        if (Number(number) !== componentsFor(name)) countMismatches.push(`${dir}/${name}: ${number} differs from its model catalog`);
      }
    }
  }
  record('S2', 'privacy', exposed.length ? 'fail' : 'pass', 'Public FMP files carry no personal contact details', exposed.join('; ') || 'none found');
  record('C1', 'content', countMismatches.length ? 'fail' : 'pass', 'Equipment component counts match their owning catalogs', countMismatches.join('; ') || [...counts].map(([number, files]) => `${number} in ${unique(files).join(', ')}`).join('; ') || 'no count claims');

  for (const page of HAND_MAINTAINED) {
    const text = (await statusOf(baseFor(page) + page)).body.toString('utf8');
    if ((text.match(NOTION_URL) || []).length) notion.push(`${page}: ${(text.match(NOTION_URL) || []).length}`);
  }
  record('S3', 'privacy', notion.length ? 'fail' : 'pass', 'Public FMP pages link no Notion pages', notion.join('; ') || 'none found');
}

async function checkBackend() {
  const config = fs.readFileSync(path.join(site, 'fmp', 'notion-config.js'), 'utf8');
  const endpoint = (config.match(/NOTION_API_URL\s*=\s*'([^']*)'/) || [])[1];
  if (!endpoint) {
    record('B1', 'backend', 'grey', 'Notion API endpoint configured', 'empty endpoint: saves are disabled');
    return;
  }
  const health = await get(`${endpoint}/health`);
  let body = {};
  try { body = JSON.parse(health.body.toString('utf8')); } catch {}
  record('B1', 'backend', health.status === 200 ? 'pass' : 'fail', 'Notion API health responds', `${health.status || health.error}${body.version ? ` · version ${body.version}` : ''}`);
  const unsigned = await get(`${endpoint}/api/connection`);
  record('B2', 'backend', unsigned.status === 401 ? 'pass' : 'fail', 'Unsigned API requests are rejected', `GET /api/connection without a token → ${unsigned.status || unsigned.error} (expected 401)`);
}

class CDP {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result || {});
        return;
      }
      (this.listeners.get(message.method) || []).forEach(handler => handler(message.params || {}));
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) {
    this.listeners.set(method, [...(this.listeners.get(method) || []), handler]);
  }
  close() {
    this.socket.close();
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.exceptionDetails ? null : result.result.value;
}

const PAGE_STATE = `(() => {
  const visible = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const controls = [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,[role=button]')].filter(visible);
  // A native checkbox/radio label is part of its actual clickable target.
  const small = controls.filter(el => ![el, ...(el.matches('[type=checkbox],[type=radio]') ? [...(el.labels || [])] : [])].some(target => { const r = target.getBoundingClientRect(); return visible(target) && r.width >= 44 && r.height >= 44; }));
  const skip = document.querySelector('a[href^="#"][class*="skip"]');
  const target = skip && document.getElementById(skip.getAttribute('href').slice(1));
  const paint = [document.body, document.documentElement].map(el => (getComputedStyle(el).backgroundColor.match(/\\d+(\\.\\d+)?/g) || []).map(Number)).find(rgba => rgba.length >= 3 && (rgba.length < 4 || rgba[3] > 0)) || [255, 255, 255];
  const luminance = (0.2126 * paint[0] + 0.7152 * paint[1] + 0.0722 * paint[2]) / 255;
  const themeControl = [...document.querySelectorAll('button,select')].some(el => /theme|dark|light|day|night|display mode/i.test((el.getAttribute('aria-label') || '') + ' ' + el.textContent));
  return {
    h1: document.querySelectorAll('h1').length,
    skip: Boolean(skip), skipTarget: Boolean(target),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight,
    smallControls: small.length,
    smallExamples: small.slice(0, 4).map(el => ((el.getAttribute('aria-label') || el.textContent || el.type || '').trim().replace(/\\s+/g, ' ').slice(0, 40)) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)),
    unnamed: controls.filter(el => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent.trim() || el.title || (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) || el.closest('label'))).length,
    canvases: document.querySelectorAll('canvas').length,
    dark: luminance < 0.45,
    themeControl
  };
})()`;

async function auditPage(route, scheme) {
  const created = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' }).then(res => res.json());
  const cdp = new CDP(created.webSocketDebuggerUrl);
  await cdp.open();
  const consoleIssues = [];
  const failedRequests = [];
  cdp.on('Runtime.consoleAPICalled', event => {
    if (['error', 'warning', 'assert'].includes(event.type)) consoleIssues.push(`${event.type}: ${(event.args || []).map(arg => arg.value ?? arg.description ?? '').join(' ').slice(0, 160)}`);
  });
  cdp.on('Runtime.exceptionThrown', event => consoleIssues.push(`exception: ${(event.exceptionDetails.exception?.description || event.exceptionDetails.text || '').split('\n')[0].slice(0, 160)}`));
  cdp.on('Log.entryAdded', event => { if (event.entry.level === 'error') consoleIssues.push(`log: ${event.entry.text.slice(0, 160)}`); });
  cdp.on('Network.responseReceived', event => { if (event.response.status >= 400) failedRequests.push(`${event.response.status} ${event.response.url}`); });
  cdp.on('Network.loadingFailed', event => { if (!event.canceled) failedRequests.push(`${event.errorText} ${event.requestId}`); });
  await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable'].map(method => cdp.send(method)));
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Storage.clearDataForOrigin', { origin: baseFor(route), storageTypes: 'all' });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const started = Date.now();
  await cdp.send('Page.navigate', { url: baseFor(route) + route });
  for (let i = 0; i < 60 && (await evaluate(cdp, 'document.readyState')) !== 'complete'; i += 1) await wait(250);
  const loadMs = Date.now() - started;
  await wait(2500);
  const desktop = await evaluate(cdp, PAGE_STATE);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await wait(600);
  const phone = await evaluate(cdp, PAGE_STATE);
  // WEB-2 names 375×812 as its phone size; measure it once, in the light run.
  let web2Phone = null;
  if (scheme === 'light') {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    await wait(600);
    web2Phone = await evaluate(cdp, '({ scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight })');
  }
  cdp.close();
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${created.id}`).catch(() => {});
  return { route, scheme, loadMs, desktop, phone, web2Phone, consoleIssues: unique(consoleIssues), failedRequests: unique(failedRequests) };
}

/** W8 only: document scroll at 1440×900 and 375×812 for a published route the full audit does not load. */
async function scrollAudit(route) {
  const created = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' }).then(res => res.json());
  const cdp = new CDP(created.webSocketDebuggerUrl);
  await cdp.open();
  await Promise.all(['Page.enable', 'Runtime.enable'].map(method => cdp.send(method)));
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: baseFor(route) + route });
  for (let i = 0; i < 60 && (await evaluate(cdp, 'document.readyState')) !== 'complete'; i += 1) await wait(250);
  await wait(1500);
  const metrics = '({ scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight })';
  const desktop = await evaluate(cdp, metrics);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await wait(600);
  const phone = await evaluate(cdp, metrics);
  cdp.close();
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${created.id}`).catch(() => {});
  return { route, desktop, phone };
}

async function checkBrowser() {
  if (flag('skip-browser') || !fs.existsSync(CHROME)) {
    record('W0', 'browser', 'grey', 'Rendered browser checks', flag('skip-browser') ? 'skipped by --skip-browser' : `Chrome not found at ${CHROME}`);
    return [];
  }
  const profile = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'fmp-hygiene-'));
  const chrome = spawn(CHROME, [
    ...(flag('no-sandbox') ? ['--no-sandbox'] : []),
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore' });
  const pages = [];
  const scrollOnly = [];
  try {
    for (let i = 0; i < 80; i += 1) {
      if (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then(res => res.ok, () => false)) break;
      await wait(250);
    }
    for (const route of BROWSER_PAGES) {
      pages.push(await auditPage(route, 'light'));
      pages.push(await auditPage(route, 'dark'));
    }
    // W8 covers every published route, including the ones the full audit above does not load.
    for (const route of ROUTES.filter(route => !BROWSER_PAGES.includes(route))) scrollOnly.push(await scrollAudit(route));
  } finally {
    chrome.kill('SIGTERM');
    await wait(500);
    fs.rmSync(profile, { recursive: true, force: true });
  }

  const light = pages.filter(page => page.scheme === 'light');
  const list = (items, fn) => items.map(fn).filter(Boolean);
  // A missing /favicon.ico is cosmetic; report it without failing the run.
  const cosmetic = text => /favicon\.ico/.test(text);
  const failedFor = page => page.failedRequests.filter(item => !cosmetic(item));
  const errorsFor = page => page.consoleIssues.filter(item => /^(?:error|exception|log|assert):/.test(item) && !(cosmetic(page.failedRequests.join(' ')) && !failedFor(page).length && /Failed to load resource/.test(item)));
  const consoleHits = list(light, page => page.consoleIssues.length && `${page.route}: ${page.consoleIssues.slice(0, 3).join(' | ')}`);
  record('W1', 'browser', light.some(page => errorsFor(page).length) ? 'fail' : consoleHits.length ? 'warn' : 'pass', 'No console errors or warnings on load', consoleHits.join('; ') || `${light.length} pages`);
  const requestHits = list(light, page => page.failedRequests.length && `${page.route}: ${page.failedRequests.slice(0, 3).join(' | ')}`);
  record('W2', 'browser', light.some(page => failedFor(page).length) ? 'fail' : requestHits.length ? 'warn' : 'pass', 'No failed network requests on load', requestHits.join('; ') || `${light.length} pages`);
  const overflow = list(light, page => (page.phone?.overflow || page.desktop?.overflow) && `${page.route} ${page.phone?.overflow ? '390px' : '1440px'}`);
  record('W3', 'browser', overflow.length ? 'fail' : 'pass', 'No horizontal overflow at 390px or 1440px', overflow.join('; ') || 'contained');
  const shell = list(light, page => {
    const gaps = [];
    if (!page.desktop?.skip || !page.desktop?.skipTarget) gaps.push('skip link/target');
    if (page.desktop?.h1 !== 1) gaps.push(`${page.desktop?.h1 ?? '?'} h1`);
    if (page.desktop?.unnamed) gaps.push(`${page.desktop.unnamed} unnamed controls`);
    return gaps.length && `${page.route}: ${gaps.join(', ')}`;
  });
  record('W4', 'browser', shell.length ? 'warn' : 'pass', 'Skip link, single h1, and named controls', shell.join('; ') || 'all pages');
  const targets = list(light, page => page.phone?.smallControls && `${page.route}: ${page.phone.smallControls} under 44px (${page.phone.smallExamples.join(', ')})`);
  record('W5', 'browser', targets.length ? 'warn' : 'pass', 'Phone controls meet 44px targets', targets.join('; ') || 'all pages');
  const theme = BROWSER_PAGES.map(route => {
    const lightRun = pages.find(page => page.route === route && page.scheme === 'light');
    const darkRun = pages.find(page => page.route === route && page.scheme === 'dark');
    const gaps = [];
    if (!lightRun?.desktop?.themeControl) gaps.push('no visible theme control');
    if (lightRun?.desktop?.dark) gaps.push('dark with a light system preference');
    if (darkRun?.desktop?.dark) gaps.push('follows dark system preference instead of defaulting to light');
    return gaps.length && `${route}: ${gaps.join(', ')}`;
  }).filter(Boolean);
  record('W6', 'browser', theme.length ? 'warn' : 'pass', 'Theme control present and first visit defaults to light (WEB-1)', theme.join('; ') || 'all pages');
  const rig = light.find(page => page.route === '/fmp/rig/');
  if (rig) record('W7', 'browser', rig.desktop?.canvases ? 'pass' : 'fail', 'Rig explorer renders a 3D canvas', `${rig.desktop?.canvases ?? 0} canvas · load ${rig.loadMs}ms`);
  const scroll = pageScroll([...light.map(page => ({ route: page.route, desktop: page.desktop, phone: page.web2Phone })), ...scrollOnly]);
  record('W8', 'browser', scroll.status, 'No page scroll at 1440×900 or 375×812 beyond the recorded WEB-2 debt', scroll.detail);
  return pages;
}

function render(report) {
  const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', grey: 'GREY' };
  const lines = [
    `# FMP hygiene probe — ${report.generatedAt.slice(0, 10)}`,
    '',
    `Traffic light: **${report.trafficLight}** · base ${report.base} · ${report.counts.fail} fail, ${report.counts.warn} warn, ${report.counts.grey} grey, ${report.counts.pass} pass`,
    '',
    'Automated, read-only evidence. It does not prove signed-in saves, email delivery, Notion readback, or physical venue acceptance.',
    '',
    '| Status | ID | Lane | Check | Detail |',
    '| --- | --- | --- | --- | --- |',
    ...report.findings.map(item => `| ${icon[item.status]} | ${item.id} | ${item.lane} | ${item.title} | ${String(item.detail).replace(/\|/g, '\\|')} |`),
    ''
  ];
  return lines.join('\n');
}

async function main() {
  await checkRoutes();
  await checkRelease();
  await checkIndexing();
  await checkLinks();
  await checkContent();
  await checkBackend();
  const pages = await checkBrowser();
  const counts = { fail: 0, warn: 0, grey: 0, pass: 0 };
  findings.forEach(item => { counts[item.status] += 1; });
  const trafficLight = counts.fail ? 'Red' : counts.warn ? 'Yellow' : counts.grey ? 'Grey' : 'Green';
  const report = { schema: 'fmp.hygiene.probe.v1', generatedAt: new Date().toISOString(), base: BASE, walkBase: WALK_BASE, trafficLight, counts, findings, pages };
  const markdown = render(report);
  if (option('output')) fs.writeFileSync(path.resolve(option('output')), `${JSON.stringify(report, null, 2)}\n`);
  if (option('markdown')) fs.writeFileSync(path.resolve(option('markdown')), markdown);
  process.stdout.write(markdown);
  if (flag('strict') && counts.fail) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 2;
  });
}

module.exports = { releasePins, releaseCurrency, pageScroll, classifyExternal, externalStatus, ACTIVE_RELEASES, FROZEN_RELEASES, WEB2_DEBT };
