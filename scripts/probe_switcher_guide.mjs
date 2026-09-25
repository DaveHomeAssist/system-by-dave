#!/usr/bin/env node
// Browser probe for the ATEM HD8 ISO interactive guide (docs/fmp-public-release.md). The guide is
// generated from the exported model page by scripts/build_switcher_guide.mjs; this checks that it
// renders the same explorer as /fmp/models/atem-hd8-iso.html without the old inline payload, that
// the offline copy opens from disk with no network, and that both fall back without WebGL.
//
// Usage: node scripts/probe_switcher_guide.mjs [--no-sandbox]
//        (CHROME_CHANNEL=chrome to use Chrome, or CHROME_BIN=/path/to/chrome for a specific binary)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const results = [];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer(async (request, response) => {
  let file = join(ROOT, decodeURIComponent(new URL(request.url, 'http://probe').pathname));
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const BASE = `http://127.0.0.1:${server.address().port}`;
const OFFLINE = pathToFileURL(join(ROOT, 'switcher/guide/atem-hd8-iso-guide-offline.html')).href;

const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const launch = (extra = []) => chromium.launch({ headless: true, ...channel, args: [...(args.includes('--no-sandbox') ? ['--no-sandbox'] : []), ...extra] });

function record(ok, name, detail = '') {
  results.push({ ok, name });
  console.log(`${ok ? 'ok' : 'not ok'} - ${name}${detail ? `: ${detail}` : ''}`);
}
async function check(name, fn) {
  try { record(true, name, (await fn()) || ''); } catch (error) { record(false, name, error.message); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

// Opens a page and reports what an operator would see plus what it cost to load.
async function open(browser, url, options = {}) {
  try {
    return await visit(browser, url, options);
  } catch (error) {
    return { status: '', parts: 0, diagram: false, skip: null, parent: '', inlineImages: 0, errors: [error.message.split('\n')[0]], requests: [] };
  }
}
async function visit(browser, url, options) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: Boolean(options.offline) });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => requests.push(request.url()));
  page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => /MODEL|DIAGRAM|WEBGL|2D/i.test(document.getElementById('atem-render-status')?.textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    status: document.getElementById('atem-render-status')?.textContent || '',
    parts: document.getElementById('atem-select')?.options.length ?? [...document.querySelectorAll('select')].map((select) => select.options.length).sort((a, b) => b - a)[0],
    diagram: !document.getElementById('atem-diagram')?.hidden,
    skip: document.querySelector('body > a.sbd-skip-link')?.getAttribute('href'),
    parent: document.querySelector('.sbd-site-return a')?.getAttribute('href') || '',
    inlineImages: [...document.querySelectorAll('img[src^="data:"]')].length
  }));
  await context.close();
  return { ...state, errors, requests };
}

const browser = await launch();
const model = await open(browser, `${BASE}/fmp/models/atem-hd8-iso.html`);
const guide = await open(browser, `${BASE}/switcher/guide/`);
const offline = await open(browser, OFFLINE, { offline: true });
await browser.close();

await check('the guide renders the same explorer as the model page', () => {
  assert(model.errors.length === 0, `model page errors: ${model.errors.join('; ')}`);
  assert(guide.errors.length === 0, guide.errors.join('; '));
  assert(guide.status === model.status && /MODEL/.test(guide.status), `status ${guide.status} vs ${model.status}`);
  assert(guide.parts === model.parts && guide.parts > 200, `components ${guide.parts} vs ${model.parts}`);
  assert(guide.skip === '#atem-explorer', `skip link ${guide.skip}`);
  assert(guide.parent === '/fmp/', `site bar parent ${guide.parent}`);
  return `${guide.parts} menu entries`;
});

await check('the guide loads shared files and no photos until one is opened', () => {
  const html = guide.requests.filter((url) => url.endsWith('/switcher/guide/'));
  const photos = guide.requests.filter((url) => /\.(png|webp)(\?|$)/.test(url));
  const shared = guide.requests.filter((url) => url.includes('/fmp/models/'));
  assert(html.length === 1 && photos.length === 0, `photos at load: ${photos.join(', ')}`);
  assert(shared.length >= 6, `expected the shared /fmp/models/ assets, got ${shared.length}`);
  return `${guide.requests.length} requests`;
});

await check('the offline copy opens from disk with no network', () => {
  assert(offline.errors.length === 0, offline.errors.join('; '));
  assert(offline.requests.every((url) => url.startsWith('file:') || url.startsWith('data:')), `network requests: ${offline.requests.filter((url) => !url.startsWith('file:') && !url.startsWith('data:')).join(', ')}`);
  assert(offline.status === model.status && offline.parts === model.parts, `offline ${offline.status} ${offline.parts}`);
  assert(offline.skip === '#atem-explorer', `skip link ${offline.skip}`);
  assert(offline.parent === 'https://housevideo.app/fmp/', `site bar parent ${offline.parent}`);
});

const noWebgl = await launch(['--disable-webgl', '--disable-3d-apis']);
const guideFallback = await open(noWebgl, `${BASE}/switcher/guide/`);
const offlineFallback = await open(noWebgl, OFFLINE, { offline: true });
await noWebgl.close();

await check('without WebGL both show the diagram and keep the component menu', () => {
  for (const [name, state] of [['guide', guideFallback], ['offline', offlineFallback]]) {
    assert(state.diagram, `${name}: diagram not shown (${state.status})`);
    assert(state.parts === model.parts, `${name}: ${state.parts} menu entries`);
    assert(!state.errors.some((error) => !/WebGL/i.test(error)), `${name}: ${state.errors.join('; ')}`);
  }
});

server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} switcher guide checks passed`);
process.exit(failed.length ? 1 : 0);
