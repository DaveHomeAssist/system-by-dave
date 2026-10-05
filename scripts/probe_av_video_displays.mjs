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
const goProject = () => button('Project').click();
const save = () => page.getByRole('button', { name: /^Save/ }).click();
const readSaved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const fixture = {
  schema: 'system-by-dave.display-plan.v1', meta: { showName: 'Display import', handoffTo: 'Projection lead' },
  items: [{ id: 'display-old', display: 'IMAG screens', type: 'led-wall', input: 'SDI 1', processor: 'LED processor', resolution: '3840 × 1080', aspect: '32:9', refresh: '59.94 Hz', route: 'CAM 1 → IMAG', backup: 'Backup processor', status: 'tested', notes: '\n  Original display notes\n', extra: 'retain' }]
};
const projection = { items: [{ screen: 'Main screen', surface: 'front', size: '16 × 9 ft', aspect: '16:9', projector: 'Laser 12K', lens: '1.2–1.8', throw: '24 ft', position: 'FOH', input: 'SDI 1', route: 'SLIDES → Screen', blend: 'None', backup: 'Spare projector', status: 'lined', notes: 'Check focus at rehearsal' }], meta: { projectionLead: 'Taylor', handoffTo: 'Night operator' } };
const raw = JSON.stringify(fixture);
async function exportPlan() {
  const pending = page.waitForEvent('download'); await button('Export').click();
  return JSON.parse(await readFile(await (await pending).path(), 'utf8'));
}
try {
  await page.goto(url);
  await goProject();
  await page.getByLabel('Plan name', { exact: true }).fill('Configured empty show');
  await page.getByLabel('Venue', { exact: true }).fill('Chosen venue');
  await page.getByLabel('Video lead', { exact: true }).fill('Chosen lead'); await save();
  await page.locator('input[type=file]').setInputFiles({ name: 'display.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await button('Add destinations to plan').click(); await save();
  assert.equal((await readSaved()).title, 'Configured empty show');
  assert.deepEqual((await readSaved()).meta, { venue: 'Chosen venue', videoLead: 'Chosen lead' });
  await goProject(); page.once('dialog', dialog => dialog.accept()); await button('Load sample').click(); await save();
  await page.evaluate(({ raw, projection }) => { localStorage.setItem('display-plan.v1', raw); localStorage.setItem('sbd.projectionPlan.v1', JSON.stringify(projection)); }, { raw, projection });
  await goProject(); await button('Import saved Display Plan').click(); await page.getByRole('dialog').waitFor();
  await button('Cancel').click(); assert.equal((await readSaved()).displays.length, 0);
  await button('Import saved Display Plan').click(); await button('Add destinations to plan').click();
  await page.getByRole('heading', { name: 'Displays & Projection', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Display name', { exact: true }).inputValue(), 'IMAG screens');
  assert.equal(await page.getByRole('combobox', { name: 'Linked route', exact: true }).getAttribute('data-value'), '');
  const firstRoute = (await readSaved()).routes[0];
  await page.getByRole('combobox', { name: 'Linked route', exact: true }).click();
  await page.getByRole('listbox', { name: 'Linked route', exact: true }).getByRole('option', { name: 'CAM 1 → IMAG', exact: true }).click();
  await button('Trace linked route').click();
  assert.equal(await page.locator('.console-panel.is-focused[data-panel=flow]').count(), 1, 'tracing a linked route brings Signal Flow forward');
  await button('Displays').click();
  await page.getByLabel('Destination notes', { exact: true }).fill('Operator edit\nkeeps spacing  ');
  await save(); await page.reload(); await button('Displays').click();
  await page.getByRole('button', { name: /IMAG screens.*tested/ }).click();
  assert.equal(await page.getByLabel('Destination notes', { exact: true }).inputValue(), 'Operator edit\nkeeps spacing  ');
  assert.equal(await page.getByRole('combobox', { name: 'Linked route', exact: true }).getAttribute('data-value'), firstRoute.id);
  await goProject(); await button('Import saved Projection Plan').click(); await button('Add destinations to plan').click();
  assert.equal(await page.getByLabel('Throw distance', { exact: true }).inputValue(), '24 ft');
  await save();
  const combined = await readSaved();
  assert.equal(combined.displays.length, 2); assert.equal(combined.imports.length, 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('display-plan.v1')), raw);
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('sbd.projectionPlan.v1'))), projection);
  await goProject(); await button('Import saved Display Plan').click(); await button('Add destinations to plan').click();
  assert.match(await page.getByRole('status').textContent(), /already imported/);
  await button('Import saved Projection Plan').click();
  await page.evaluate(() => localStorage.setItem('sbd.projectionPlan.v1', '{}'));
  await button('Add destinations to plan').click();
  assert.match(await page.getByRole('status').textContent(), /changed after preview/);
  assert.deepEqual(await readSaved(), combined);
  await page.getByLabel('Displays & Projection', { exact: false }).uncheck(); await save();
  assert.equal(await button('Displays').count(), 0);
  const hidden = await exportPlan(); assert.deepEqual(hidden.displays, combined.displays);
  await page.goto(`${url}?view=displays`); await page.locator('.console-panel[data-panel=project]').waitFor();
  assert.equal(await page.getByRole('tab', { name: 'Project', exact: true }).getAttribute('aria-selected'), 'true', 'a disabled-module link opens Project without enabling it');
  assert.match(await page.getByRole('status').textContent(), /disabled.*Enable it in Project/);
  await page.getByLabel('Displays & Projection', { exact: false }).check(); await save();
  await button('Displays').click();
  await page.getByRole('button', { name: /Main screen.*lined/ }).click();
  await page.getByLabel('Destination notes', { exact: true }).fill('Revised projection note');
  await page.getByLabel('Destination notes', { exact: true }).blur();
  await button('↶ Undo').click(); assert.equal(await page.getByLabel('Destination notes', { exact: true }).inputValue(), projection.items[0].notes);
  await button('↷ Redo').click(); await save();
  const exported = await exportPlan();
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await button('Replace with backup').click(); await save(); assert.deepEqual(await readSaved(), exported);
  const csvPending = page.waitForEvent('download'); await button('Export CSV').click();
  const csv = await readFile(await (await csvPending).path(), 'utf8');
  assert.ok(csv.includes('throwDistance')); assert.ok(csv.includes('24 ft')); assert.ok(csv.includes('Operator edit\nkeeps spacing  '));
  // A deleted route must leave an explicit repairable reference, never silently reassign a destination.
  await button('Signal flow').click(); await button('Edit route').click();
  page.once('dialog', dialog => dialog.accept()); await button('Remove route').click();
  await page.getByRole('button', { name: /^Checks/ }).click();
  await page.getByRole('button', { name: /IMAG screens.*Linked route was removed/ }).click();
  assert.equal(await page.getByRole('combobox', { name: 'Linked route', exact: true }).getAttribute('data-value'), firstRoute.id);
  await button('↶ Undo').click(); await save();
  const shots = process.env.AV_VIDEO_SCREENSHOTS || '/tmp/av-video-displays-proof'; await mkdir(shots, { recursive: true });
  for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [3440, 1440]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Theme', { exact: true }).selectOption(theme);
      await button('Project').click(); await button('Displays').click();
      if (width <= 680) await button('Back to destinations').click();
      await page.getByRole('button', { name: /Main screen.*lined/ }).click();
      assert.equal(await page.getByLabel('Throw distance', { exact: true }).inputValue(), '24 ft');
      const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth <= innerWidth, h: document.documentElement.scrollHeight <= innerHeight }));
      assert.deepEqual(fits, { w: true, h: true }, `${width} ${theme} containment`);
      await page.getByLabel('Screen name', { exact: true }).focus(); await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'INPUT');
      if (width === 1440 || width === 375) await page.screenshot({ path: `${shots}/${width}-${theme}-editor.png` });
      if (width <= 680) await button('Back to destinations').click();
      if (width === 1440 || width === 375) await page.screenshot({ path: `${shots}/${width}-${theme}-list.png` });
    }
  }
  // Prime the suite service worker, then prove that the same destination data edits and reloads offline.
  await page.goto(`${BASE}/av-suite.html`); await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto(url); await button('Displays').click();
  await context.setOffline(true); await page.reload(); await button('Displays').click();
  await page.getByRole('button', { name: /Main screen.*lined/ }).click();
  await page.getByLabel('Throw distance', { exact: true }).fill('25 ft'); await save();
  await page.reload(); await button('Displays').click(); await page.getByRole('button', { name: /Main screen.*lined/ }).click();
  assert.equal(await page.getByLabel('Throw distance', { exact: true }).inputValue(), '25 ft');
  await context.setOffline(false);
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Add display').click(); await page.getByLabel('Display name', { exact: true }).fill('Confidence monitor');
  await page.getByRole('combobox', { name: 'Destination status', exact: true }).click();
  await page.getByRole('listbox', { name: 'Destination status', exact: true }).getByRole('option', { name: 'cabled', exact: true }).click();
  await save(); assert.equal((await readSaved()).displays.at(-1).status, 'cabled');
  await button('Duplicate destination').click(); await save(); assert.equal((await readSaved()).displays.length, 4);
  page.once('dialog', dialog => dialog.accept()); await button('Remove destination').click(); await save();
  assert.equal((await readSaved()).displays.length, 3); assert.equal((await readSaved()).routes.length, 4);
  await button('Add projection').click(); await page.getByLabel('Screen name', { exact: true }).fill('Overflow screen');
  await save(); assert.equal((await readSaved()).displays.at(-1).kind, 'projection');
  assert.deepEqual(errors, []);
  console.log(`AV Video Displays verification passed: legacy field parity, import cancel/repeat/stale protection, route link/trace/deletion, persistence, hidden modules, undo, export/restore/CSV, keyboard, 4 viewport sizes, both themes and offline editing (${BASE}). Screenshots: ${shots}`);
} catch (error) {
  console.error(await page.locator("main").innerText());
  await page.screenshot({ path: "/tmp/av-video-displays-failure.png" });
  throw error;
} finally {
  await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve));
}
