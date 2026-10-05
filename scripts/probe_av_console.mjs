import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end();
    return;
  }
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
const BASE = process.env.AV_VIDEO_BASE || `http://127.0.0.1:${server.address().port}`;

const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });

const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const key = 'sbd.avVideo.v1';
const url = `${BASE}/av-video/`;
const button = name => page.getByRole('button', { name, exact: true });
const tab = name => page.getByRole('tab', { name, exact: true });
const save = () => page.getByRole('button', { name: /^Save/ }).click();
const readSaved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const panels = () => page.locator('.console-panel').evaluateAll(es => es.map(e => e.dataset.panel));
try {
  await page.goto(url);
  await button('Try a sample plan').click(); await save();
  // Default views come from the console; the plan stores none until asked.
  assert.deepEqual(await page.getByRole('tab').allTextContents(), ['Routing', 'Projection', 'Troubleshooting', 'Show', 'Project']);
  assert.deepEqual(await panels(), ['flow', 'patch', 'inspector']);
  assert.equal((await readSaved()).workspace, undefined, 'default views are not written into the plan');
  // Panel buttons bring a panel forward, switching to the view that holds it.
  await page.getByRole('button', { name: /^Checks/ }).click(); assert.equal(await tab('Troubleshooting').getAttribute('aria-selected'), 'true');
  // Close a panel from its menu: records are untouched and the panel can be re-added by keyboard.
  await tab('Routing').click();
  const before = (await readSaved()).routes.length;
  await page.getByRole('button', { name: 'Patch options' }).click();
  await page.getByRole('menuitem', { name: 'Close panel' }).click();
  assert.deepEqual(await panels(), ['flow', 'inspector']);
  assert.match(await page.getByRole('status').textContent(), /records and module are untouched/);
  await button('＋ Add panel').focus(); await page.keyboard.press('Enter');
  const chooser = page.getByRole('dialog', { name: 'Add panel' });
  await chooser.getByRole('button', { name: /^Checks/ }).count().then(n => assert.equal(n, 0, 'Utilities are behind their category'));
  await chooser.getByRole('button', { name: 'Utilities', exact: true }).click();
  await chooser.getByRole('button', { name: /^Checks/ }).click();
  assert.deepEqual((await panels()).sort(), ['checks', 'flow', 'inspector']);
  // Escape closes a menu and returns focus to its trigger.
  const options = page.getByRole('button', { name: 'Signal Flow options' });
  await options.click(); await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('menu').count(), 0);
  assert.equal(await options.evaluate(el => el === document.activeElement), true);
  // Move and size by explicit commands; panels never overlap.
  await page.getByRole('button', { name: 'Checks options' }).click();
  await page.getByRole('menuitem', { name: 'Move and size…' }).click();
  await page.getByRole('menuitem', { name: 'Taller' }).click();
  await page.getByRole('menuitem', { name: 'Done' }).click(); await page.keyboard.press('Escape');
  // Store the arrangement in the plan: a document edit that needs Save.
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: 'Update “Routing”' }).click();
  assert.match(await page.getByRole('button', { name: /^Save/ }).textContent(), /•/);
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: 'Store as new view' }).click();
  await save();
  const stored = (await readSaved()).workspace;
  assert.equal(stored.version, 1); assert.equal(stored.views.length, 6);
  assert.deepEqual(stored.views[0].panels.map(p => p.type).sort(), ['checks', 'flow', 'inspector']);
  assert.equal((await readSaved()).routes.length, before, 'view edits never change records');
  await page.reload();
  assert.deepEqual(await page.getByRole('tab').allTextContents(), ['Routing', 'Projection', 'Troubleshooting', 'Show', 'Project', 'Routing 6']);
  assert.deepEqual((await panels()).sort(), ['checks', 'flow', 'inspector']);
  // Rename and delete a view; deleting never deletes records.
  await tab('Routing 6').click();
  await page.getByRole('button', { name: 'View options' }).click(); await page.getByRole('menuitem', { name: 'Rename…' }).click();
  await page.getByLabel('View name').fill('Load-in'); await page.getByRole('menuitem', { name: 'Rename' }).click();
  assert.equal(await tab('Load-in').count(), 1);
  await page.getByRole('button', { name: 'View options' }).click(); await page.getByRole('menuitem', { name: 'Delete view' }).click();
  assert.equal(await tab('Load-in').count(), 0); await save();
  assert.equal((await readSaved()).routes.length, before);
  // Live panels: Cut swaps program and preview; nothing is inferred and the plan never changes.
  await tab('Show').click();
  assert.deepEqual((await panels()).sort(), ['bus', 'flow', 'multiview']);
  const savedPlan = JSON.stringify(await readSaved());
  const pgmTile = page.locator('.mv-tile.mv-program .mv-showing');
  assert.equal(await pgmTile.textContent(), 'Camera 1');
  assert.match(await page.locator('.mv-tile', { hasText: 'IMAG screens' }).textContent(), /AUX 1 · not assigned/);
  await page.getByRole('button', { name: 'Cut', exact: true }).click();
  assert.equal(await pgmTile.textContent(), 'Slides laptop');
  assert.match(await page.locator('.mv-tile', { hasText: 'Stream encoder' }).textContent(), /Slides laptop/);
  await page.getByLabel('AUX 1 source').selectOption({ label: 'Camera 1' });
  assert.match(await page.locator('.mv-tile', { hasText: 'IMAG screens' }).textContent(), /Camera 1/);
  assert.doesNotMatch(await page.getByRole('button', { name: /^Save/ }).textContent(), /•/, 'live bus state is not a plan edit');
  assert.equal(JSON.stringify(await readSaved()), savedPlan);
  await page.getByRole('button', { name: 'Close panel' }).count(); // layout operations leave live state alone
  await page.getByRole('button', { name: 'Multiview options' }).click(); await page.getByRole('menuitem', { name: 'Maximize' }).click();
  assert.equal(await pgmTile.textContent(), 'Slides laptop');
  await page.getByRole('button', { name: 'Restore Multiview' }).click();
  // Disabling a module hides its panels, keeps them in the view, and says so.
  await button('Project').click(); await page.getByRole('checkbox', { name: /Route checks/ }).uncheck();
  await tab('Routing').click();
  assert.deepEqual((await panels()).sort(), ['flow', 'inspector']);
  await page.locator('.console-notice').waitFor();
  await button('Project').click(); await page.getByRole('checkbox', { name: /Route checks/ }).check();
  await tab('Routing').click(); assert.equal((await panels()).includes('checks'), true);
  // Maximize and restore return the exact arrangement.
  const layout = await page.locator('.console-panel').evaluateAll(es => es.map(e => e.getAttribute('style')));
  await page.getByRole('button', { name: 'Maximize Signal Flow' }).click(); assert.deepEqual(await panels(), ['flow']);
  await page.getByRole('button', { name: 'Restore Signal Flow' }).click();
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(es => es.map(e => e.getAttribute('style'))), layout);
  // Lock: dragging is off, menu commands still work.
  await button('Unlocked').click(); assert.equal(await page.locator('.console-bar.can-drag').count(), 0);
  await button('Locked').click();
  // Phone: one panel at a time with a bottom switcher; the desktop arrangement is kept.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForFunction(() => document.querySelectorAll('.console-panel').length === 1);
  await page.locator('.console-quick').getByRole('button', { name: /^Checks/ }).click();
  assert.deepEqual(await panels(), ['checks']);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'phone page overflow');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => document.querySelectorAll('.console-panel').length === 3);
  assert.deepEqual((await panels()).sort(), ['checks', 'flow', 'inspector']);
  // Draft store: unsaved record edits survive a reload as an offer, never applied silently.
  await tab('Routing').click();
  await page.getByLabel('Source', { exact: true }).fill('Draft camera');
  await page.waitForFunction(() => localStorage.getItem('sbd.avVideo.draft.v1') !== null);
  assert.ok(JSON.parse(await page.evaluate(() => localStorage.getItem('sbd.consoleDrafts.v1')))['av-video'], 'rail draft index names AV Video');
  const savedBefore = JSON.stringify(await readSaved());
  page.once('dialog', d => d.accept()); await page.reload();
  await page.getByRole('alert').filter({ hasText: 'Unsaved edits' }).waitFor();
  assert.notEqual(await page.getByLabel('Source', { exact: true }).inputValue(), 'Draft camera', 'a draft is offered, not applied');
  assert.equal(JSON.stringify(await readSaved()), savedBefore, 'the saved plan is untouched by drafts');
  await button('Restore draft').click();
  await page.waitForFunction(() => !document.querySelector('.draft-offer'));
  assert.equal(await page.getByLabel('Source', { exact: true }).inputValue(), 'Draft camera');
  assert.match(await page.getByRole('button', { name: /^Save/ }).textContent(), /•/);
  page.once('dialog', d => d.accept()); await page.reload();
  await button('Discard draft').click();
  await page.waitForFunction(() => !document.querySelector('.draft-offer'));
  assert.equal(await page.evaluate(() => localStorage.getItem('sbd.avVideo.draft.v1')), null);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('sbd.consoleDrafts.v1')))['av-video'], undefined);
  // Unstored layout and the current view are kept on this device across reloads.
  await tab('Troubleshooting').click();
  await page.getByRole('button', { name: 'Checks options' }).click(); await page.getByRole('menuitem', { name: 'Close panel' }).click();
  await page.reload();
  // The tab carries an "arrangement changed" marker until the view is stored.
  assert.equal(await page.getByRole('tab', { name: /^Troubleshooting/ }).getAttribute('aria-selected'), 'true');
  assert.deepEqual((await panels()).sort(), ['flow', 'inspector']);
  assert.equal(JSON.stringify(await readSaved()), savedBefore, 'layout state never writes the plan');
  assert.deepEqual(errors, []);
  console.log(`AV console workspace verification passed: default views, panel buttons, chooser by keyboard, menus and Escape focus, move/size, store/update/rename/delete views with Save, reload, module-hidden panels, maximize/restore, lock, phone switcher, draft restore/discard and layout persistence (${BASE}).`);
} finally {
  await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve));
}
