import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { FAMILIES, serveFamilies } from './av-family-probe.mjs';
const require = createRequire(import.meta.url);
const registry = require('../js/sbd-registry.js').SBD_REGISTRY;
const server = await serveFamilies();
const base = process.env.AV_ROUTES_BASE || server.base;
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
let browser;
try {
  browser = await chromium.launch({ headless: true, ...channel, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}${process.env.AV_ROUTES_BASE ? '/' : '/av/'}`);
  await page.locator('.suite-header h1').waitFor();
  assert.equal(await page.locator('.suite-header h1').textContent(), 'AV by Dave');
  assert.equal(await page.locator('.console-empty').count(), 1);
  assert.equal(await page.locator('.console-panel').count(), 0);
  const identities = ['audio', 'show-control', 'show-ops', 'front-office', 'shop', 'infrastructure', 'lighting', 'av-video', 'av-calculator'];
  for (const id of identities) assert.equal(await page.locator(`.sbd-rail__entry[data-rail-ref="console:${id}"]`).count(), 1, `${id} identity`);
  await page.locator('.sbd-rail__all').click();
  await page.locator('#sbdRailAllApps [data-rail-ref="tool:throwline"]').click();
  await page.locator('.console-panel iframe').waitFor();
  assert.equal(new URL(await page.locator('.console-panel iframe').getAttribute('src'), base).pathname, '/ProjectorThrow/');
  assert.equal(await page.locator('.console-strip').count(), 1);
  await page.frameLocator('.console-panel iframe').locator('html[data-sbd-embed="panel"]').waitFor();
  console.log('PASS console entry: empty Workspace, nine original Rail identities, Throwline panel');
  const retired = registry.tools.filter(tool => tool.retired);
  assert.equal(retired.length, 34);
  // Abort shell asset loads here: redirect evidence comes from actual browser
  // navigation, while pack rendering is covered by the shell/family probes.
  await page.route('**/av/assets/**', route => route.abort());
  const routes = [...retired.map(tool => [tool.href, tool.retired]), ...Object.entries(FAMILIES).map(([pack, family]) => [`${family.route}/`, pack])];
  for (const [route, pack] of routes) {
    if (!process.env.AV_FAMILY_REDIRECTS && !retired.some(tool => tool.href === route)) continue;
    await page.goto(`${base}/${route.replace(/^\//, '')}?sbdShow=Route%20fixture&private=discard#old`);
    await page.waitForURL(url => url.pathname === '/av/' && url.searchParams.get('app') === pack);
    const url = new URL(page.url());
    assert.equal(url.hash, '');
    assert.equal(url.searchParams.has('private'), false);
    if (!retired.some(tool => tool.href === route)) assert.equal(url.searchParams.get('sbdShow'), 'Route fixture');
    console.log(`PASS redirect ${route} -> /av/?app=${pack}`);
  }
  assert.deepEqual(errors, []);
} finally { await browser?.close(); await server.close(); }
