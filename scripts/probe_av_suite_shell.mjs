import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/* AV Suite shell (docs/av-suite-shell.md): one console at /av/. Every Rail
   identity recalls its views in place, specialist tools open as chrome-less
   panels, views mix applications, each application saves only its own key,
   and the page never scrolls at any size in either palette. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://suite-probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); }
});
await new Promise(ready => server.listen(0, '127.0.0.1', ready));
const BASE = process.env.AV_SUITE_BASE || `http://127.0.0.1:${server.address().port}`;
const args = process.argv.slice(2);
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const url = `${BASE}/av/?sbdShow=Gala&sbdVenue=Hall&sbdDate=2026-10-13&sbdOperator=Dave&sbdPhase=show&private=drop`;
const heading = () => page.locator('.suite-header h1');
const rail = ref => page.locator(`.sbd-rail__entry[data-rail-ref="${ref}"]`);
const tabs = () => page.getByRole('tab');
const button = name => page.getByRole('button', { name, exact: true });
const storage = key => page.evaluate(k => localStorage.getItem(k), key);
const IDENTITIES = [
  ['console:audio', 'Audio', 'Channels'],
  ['console:show-control', 'Show Control', 'Calling'],
  ['console:show-ops', 'Show Ops', 'Operations'],
  ['console:front-office', 'Front Office', 'Desk'],
  ['console:shop', 'The Shop', 'Work'],
  ['console:infrastructure', 'Infrastructure', 'Systems'],
  ['console:lighting', 'Lighting', 'Patch'],
  ['console:av-video', 'AV Video', 'Routing'],
];
const expectedMode = width => width < 720 ? 'phone' : width < 1100 ? 'tablet' : 'desktop';
async function assertNoOverflow(width, height, label) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(mode => document.querySelector('.console-shell')?.classList.contains(`mode-${mode}`), expectedMode(width));
  const metrics = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
  assert.ok(metrics.sw <= metrics.cw + 1, `horizontal overflow at ${width}x${height} (${label})`);
  assert.ok(metrics.sh <= metrics.ch + 1, `vertical overflow at ${width}x${height} (${label})`);
  assert.equal(await page.locator('.console-strip').count(), 1, `one view strip at ${width}x${height}`);
}

try {
  await page.goto(url);
  await heading().waitFor();
  // The console opens on an empty Workspace: no application, no panels, one Add panel.
  assert.equal(await heading().textContent(), 'AV by Dave');
  assert.equal(await page.locator('[data-sbd-rail-host]').getAttribute('data-rail-state'), 'ready');
  assert.equal(await page.locator('.console-strip').count(), 1, 'exactly one console strip');
  assert.equal(await page.locator('.console-empty').count(), 1, 'the Workspace view starts empty');
  assert.equal(await page.locator('.console-panel').count(), 0);
  assert.equal(await page.locator('.sbd-rail__toolbox').getAttribute('aria-current'), 'page', 'Workspace is current on the Rail');
  assert.equal(new URL(await page.locator('.sbd-rail__toolbox').getAttribute('href'), BASE).pathname, '/av/');
  assert.equal(await page.locator('iframe').count(), 0, 'no application iframes on the empty view');
  assert.equal(await storage('sbd.avSuite.workspace.v1'), null, 'opening the shell writes no views');

  // 1. Every Rail identity recalls in place: same URL, its own views, one set of controls.
  for (const [ref, label, firstView] of IDENTITIES) {
    await rail(ref).click();
    await page.waitForFunction(text => document.querySelector('.suite-header h1')?.textContent === text, label);
    assert.equal(new URL(page.url()).pathname, '/av/', `${label} stays on /av/`);
    assert.equal(await rail(ref).getAttribute('aria-current'), 'page', `${label} is current on the Rail`);
    assert.equal(await page.locator('.sbd-rail__entry[aria-current="page"]').count(), 1);
    assert.equal((await tabs().allTextContents())[0].replace(/\s+$/, ''), firstView, `${label} shows its own views`);
    assert.equal(await page.getByRole('button', { name: /Add panel/ }).count(), 1, `${label}: one Add panel`);
    assert.equal(await page.locator('.console-panel iframe').count(), 0, `${label} panels are native`);
    assert.ok(await page.locator('.console-panel').count() >= 1, `${label} renders panels`);
  }
  await rail('console:av-calculator').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'AV Calculator');
  const calculatorFrame = page.locator('.console-panel iframe');
  await calculatorFrame.waitFor();
  const calculatorSrc = new URL(await calculatorFrame.getAttribute('src'), BASE);
  assert.equal(calculatorSrc.pathname, '/av-calculator.html');
  assert.equal(calculatorSrc.searchParams.get('sbdEmbed'), 'panel');
  assert.equal(calculatorSrc.searchParams.get('sbdShow'), 'Gala');
  assert.equal(calculatorSrc.searchParams.has('private'), false, 'unknown query data is not forwarded');
  assert.equal(await page.locator('.suite-app-open').getAttribute('target'), '_blank');
  await page.frameLocator('.console-panel iframe').locator('html[data-sbd-embed="panel"]').waitFor();
  assert.equal(await page.frameLocator('.console-panel iframe').locator('.sbd-public-nav, nav.sbd-nav, .console-strip').count(), 0, 'embedded tool hides its page navigation and mounts no console of its own');
  await page.frameLocator('.console-panel iframe').locator('#audioCard').waitFor({ state: 'visible', timeout: 15000 });
  assert.ok(await page.frameLocator('.console-panel iframe').locator('#calculatorSource').isVisible(), 'embedded calculator shows its plain cards instead of a blank page');

  // 1b. The Rail's Workspace entry recalls the empty view in place.
  await page.locator('.sbd-rail__toolbox').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'AV by Dave');
  assert.equal(new URL(page.url()).pathname, '/av/', 'Workspace stays on /av/');
  assert.equal(await page.locator('.console-empty').count(), 1);
  assert.equal(await page.locator('.sbd-rail__toolbox').getAttribute('aria-current'), 'page');
  assert.equal(await page.locator('.sbd-rail__entry[aria-current="page"]').count(), 0);

  // 2. Specialist tools from All apps open in the shell too.
  await page.locator('.sbd-rail__all').click();
  const allApps = page.locator('#sbdRailAllApps');
  await allApps.waitFor({ state: 'visible' });
  await allApps.locator('[data-rail-ref="tool:throwline"]').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'Throwline');
  assert.equal(new URL(page.url()).pathname, '/av/');
  const throwlineSrc = new URL(await page.locator('.console-panel iframe').getAttribute('src'), BASE);
  assert.equal(throwlineSrc.pathname, '/ProjectorThrow/');
  assert.equal(throwlineSrc.searchParams.get('sbdEmbed'), 'panel');

  // 3. A mixed view: Lighting fixtures next to Video routing, stored by the shell and restored after reload.
  await rail('console:av-video').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'AV Video');
  await page.getByRole('button', { name: 'Inspector options' }).click();
  await page.getByRole('menuitem', { name: 'Change panel…' }).click();
  const chooser = page.getByRole('dialog', { name: 'Add panel' });
  assert.deepEqual((await chooser.getByRole('group', { name: 'Panel categories' }).locator('button').allTextContents()).slice(0, 3), ['AV Video', 'Audio', 'Show Control'], 'chooser groups panels by application');
  await chooser.getByRole('button', { name: 'Lighting', exact: true }).click();
  await chooser.locator('.console-choices button').filter({ hasText: 'Fixtures' }).click();
  assert.equal(await page.locator('.console-panel[data-app="Lighting"][data-panel="fixtures"]').count(), 1);
  assert.equal(await page.locator('.console-panel[data-app="AV Video"][data-panel="flow"]').count(), 1);
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: 'Store as new view' }).click();
  const stored = JSON.parse(await storage('sbd.avSuite.workspace.v1'));
  assert.equal(stored.version, 1);
  const mixed = stored.views.find(view => view.panels.some(panel => panel.type === 'lighting:fixtures') && view.panels.some(panel => panel.type === 'video:flow'));
  assert.ok(mixed, 'mixed view stored by the shell');
  assert.equal(await storage('sbd.avVideo.v1'), null, 'storing a view writes no application document');
  assert.equal(await storage('sbd.avLighting.v1'), null);
  await page.reload();
  await heading().waitFor();
  await page.waitForSelector('.console-panel[data-app="Lighting"][data-panel="fixtures"]');
  assert.equal(await page.locator('.console-panel[data-app="AV Video"][data-panel="flow"]').count(), 1, 'mixed view restored after reload');

  // 4. Save writes only the active application's key; Lighting edits stay in the Lighting document.
  await page.locator('.console-panel[data-app="Lighting"] button', { hasText: 'Add fixture' }).click();
  await rail('console:lighting').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'Lighting');
  assert.match(await page.locator('.suite-plan').textContent(), /Unsaved/);
  await page.locator('.suite-actions button.primary').click();
  await page.waitForFunction(() => /Saved/.test(document.querySelector('.suite-plan')?.textContent || ''));
  assert.equal(JSON.parse(await storage('sbd.avLighting.v1')).items.length, 1, 'Lighting saved one fixture');
  assert.equal(await storage('sbd.avVideo.v1'), null, 'Lighting Save never writes the Video plan');
  assert.equal(await storage('sbd.avAudio.v1'), null);

  // 5. No page scrolling at phone, short landscape, tablet, desktop and ultrawide sizes in both palettes.
  for (const theme of ['dark', 'light']) {
    await page.evaluate(value => { document.documentElement.dataset.avTheme = value; }, theme);
    for (const [width, height] of [[375, 667], [667, 375], [680, 700], [1024, 690], [1100, 600], [1366, 650], [1440, 900], [3440, 1440]]) await assertNoOverflow(width, height, theme);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  assert.equal(await page.getByRole('navigation', { name: 'Panels' }).isVisible(), true, 'phone panel switcher');
  assert.equal(await page.locator('.sbd-rail-launcher').isVisible(), true, 'phone Apps launcher');
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.deepEqual(errors, []);
  console.log('AV Suite shell verification passed: nine Rail identities recall in place with one console, Calculator and Throwline embed as chrome-less panels, a mixed Lighting + Video view stores and restores through the shell, Save writes only the active application, and no page overflow at eight sizes in both palettes.');
} finally {
  await context.close();
  await browser.close();
  await new Promise(done => server.close(done));
}
