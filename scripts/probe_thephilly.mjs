#!/usr/bin/env node
// Browser probe for /thephilly/, the noindex prototype of The Philly magazine site.
// Checks: the viewport-locked board never scrolls the page on the main routes at three widths;
// nothing leaves the site's origin until the Cheesesteak Radar is opened (fonts and the QR
// generator are self-hosted); the skip link is first and works; the Sounds QR codes render;
// the radar opens the heatmap at /cheesesteaks/ on demand and removes it on close; the theme
// toggle works; no uncaught page errors.
//
// Usage: node scripts/probe_thephilly.mjs [--no-sandbox] [--screens <dir>]
//   CHROME_CHANNEL=chrome  use installed Chrome;  CHROME_BIN=<path>  use a specific binary
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const screens = args.includes('--screens') ? resolve(args[args.indexOf('--screens') + 1]) : '';
if (screens) await mkdir(screens, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.geojson': 'application/json' };

const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT)) throw new Error('outside root');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const PAGE = `${ORIGIN}/thephilly/`;

const launchOptions = { headless: true };
if (process.env.CHROME_CHANNEL) launchOptions.channel = process.env.CHROME_CHANNEL;
else if (process.env.CHROME_BIN) launchOptions.executablePath = process.env.CHROME_BIN;
if (args.includes('--no-sandbox')) launchOptions.args = ['--no-sandbox'];
const browser = await chromium.launch(launchOptions);

const failures = [];
let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function check(name, fn, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const outside = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // The probe never reaches a real third party: outside requests are recorded and refused.
  await page.route((url) => url.origin !== ORIGIN, (route) => { outside.push(route.request().url()); return route.abort(); });
  try {
    await fn(page, outside);
    assert(!errors.length, `page errors: ${errors.join(' | ')}`);
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name}: ${error.message}`);
  } finally {
    await context.close();
  }
}
const open = async (page, hash = '') => {
  await page.goto(PAGE + hash);
  await page.waitForSelector('[data-panel]:not([hidden])');
  await page.evaluate(() => document.fonts.ready);
};

console.log('The Philly prototype probe');

const SIZES = [['desktop 1440x900', { width: 1440, height: 900 }], ['breakpoint 680x900', { width: 680, height: 900 }], ['phone 375x812', { width: 375, height: 812 }]];
const ROUTES = ['issue', 'read', 'sounds', 'scene', 'threads', 'advertise', 'story-food-finders', 'artist-face-my-flow'];
for (const [label, viewport] of SIZES) {
  await check(`no page scroll or overflow on ${ROUTES.length} routes at ${label}`, async (page) => {
    await open(page);
    for (const route of ROUTES) {
      await page.evaluate((hash) => { location.hash = hash; }, route);
      await page.waitForTimeout(120);
      const m = await page.evaluate(() => {
        const d = document.documentElement;
        return { v: d.scrollHeight - d.clientHeight, h: d.scrollWidth - d.clientWidth, panel: [...document.querySelectorAll('[data-panel]')].filter((p) => !p.hidden).length };
      });
      assert(m.panel === 1, `#${route}: expected one visible panel, found ${m.panel}`);
      assert(m.v <= 1, `#${route}: page scrolls vertically by ${m.v}px`);
      assert(m.h <= 1, `#${route}: page overflows horizontally by ${m.h}px`);
    }
    if (screens) await page.screenshot({ path: join(screens, `thephilly-${label.split(' ')[0]}.png`) });
  }, viewport);
}

await check('nothing leaves the origin before the radar is opened; fonts and QR codes are self-hosted', async (page, outside) => {
  await open(page, '#sounds');
  await page.waitForSelector('svg.qr');
  const state = await page.evaluate(() => ({
    qrFn: typeof window.qrcode === 'function',
    qr: document.querySelectorAll('svg.qr').length,
    fallback: document.querySelectorAll('.qr-fallback').length,
    loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')),
    thirdPartyTags: [...document.querySelectorAll('script[src],link[rel~="stylesheet"],link[rel~="preconnect"],link[rel~="preload"],img[src],iframe[src]')].map((n) => n.getAttribute('src') || n.getAttribute('href')).filter((u) => /^(https?:)?\/\//i.test(u || ''))
  }));
  assert(state.qrFn, 'window.qrcode is not defined (vendor/qrcode.js did not load)');
  assert(state.qr >= 6 && state.fallback === 0, `expected 6 or more QR codes and no fallbacks, found ${state.qr} and ${state.fallback}`);
  for (const family of ['Anton', 'Alfa Slab One', 'IBM Plex Mono', 'Source Serif 4']) assert(state.loaded.includes(family), `font "${family}" did not load from /thephilly/fonts (loaded: ${[...new Set(state.loaded)].join(', ') || 'none'})`);
  assert(!state.thirdPartyTags.length, `third-party references in the page: ${state.thirdPartyTags.join(', ')}`);
  assert(!outside.length, `requests left the origin: ${outside.join(', ')}`);
});

await check('skip link is the first focus stop and moves focus to the magazine; breadcrumb returns home', async (page) => {
  await open(page);
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => ({ cls: document.activeElement.className, href: document.activeElement.getAttribute('href') }));
  assert(first.cls === 'sbd-skip-link' && first.href === '#stage', `first Tab stop is ${JSON.stringify(first)}`);
  const box = await page.locator('.sbd-skip-link').boundingBox();
  assert(box && box.y >= 0 && box.height >= 44, `skip link is not visible and 44px tall on focus: ${JSON.stringify(box)}`);
  await page.keyboard.press('Enter');
  assert(await page.evaluate(() => document.activeElement.id === 'stage'), 'focus did not move to #stage');
  const crumbs = await page.evaluate(() => ({
    home: document.querySelector('.sbd-site-return a')?.getAttribute('href'),
    current: document.querySelector('.sbd-site-return [aria-current="page"]')?.textContent.trim(),
    height: document.querySelector('.sbd-site-return a')?.getBoundingClientRect().height
  }));
  assert(crumbs.home === '/' && /The Philly/.test(crumbs.current) && crumbs.height >= 44, `breadcrumb is ${JSON.stringify(crumbs)}`);
});

await check('Cheesesteak Radar opens the heatmap on demand and removes it on close', async (page, outside) => {
  await open(page, '#story-food-finders');
  await page.waitForSelector('.radar');
  const note = await page.locator('.radar .radar-note').textContent();
  assert(/Real shops/.test(note) && /Not a complete list/.test(note), `the radar note does not describe the heatmap's data: ${note}`);
  assert(await page.locator('#radar-frame iframe').count() === 0, 'the map frame exists before the radar is opened');
  const toggle = page.locator('#radar-toggle');
  assert(await toggle.getAttribute('aria-expanded') === 'false', 'toggle should start collapsed');
  await toggle.click();
  assert(await toggle.getAttribute('aria-expanded') === 'true' && /Close/.test(await toggle.textContent()), 'toggle did not switch to the open state');
  const frame = page.frameLocator('#radar-frame iframe');
  await frame.getByRole('heading', { name: /Follow the heat/i }).waitFor({ timeout: 15000 });
  assert(await page.locator('#radar-frame iframe').getAttribute('src') === '/cheesesteaks/', 'the frame does not point at /cheesesteaks/');
  const links = await page.locator('.radar-actions a').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  assert(links.join() === '/cheesesteaks/,/cheesesteaks/rankings/', `full-map links are ${links}`);
  if (screens) await page.screenshot({ path: join(screens, 'thephilly-radar-open.png') });
  await toggle.click();
  assert(await toggle.getAttribute('aria-expanded') === 'false' && await page.locator('#radar-frame iframe').count() === 0, 'closing the radar did not remove the frame');
  // Opening it is what contacts the map tile host; the page itself contacted nothing else.
  assert(outside.every((u) => new URL(u).hostname === 'tile.openstreetmap.org'), `unexpected outside requests: ${outside.join(', ')}`);
}, { width: 1440, height: 900 });

await check('theme toggle switches and remembers the choice', async (page) => {
  await open(page);
  const toggle = page.locator('#theme-toggle');
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await toggle.click();
  const after = await page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('thephilly-theme') }));
  assert(after.theme !== before && after.stored === after.theme, `theme went ${before} -> ${JSON.stringify(after)}`);
  await page.reload();
  assert(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === after.theme, 'theme was not restored after reload');
});

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed, ${passed} passed` : `\nall ${passed} passed`);
process.exit(failures.length ? 1 : 0);
