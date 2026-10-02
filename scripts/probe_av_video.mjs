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
const original = JSON.stringify({ schema: 'system-by-dave.signal-flow.v1', meta: { showName: 'Fixture show', audioLead: 'Preserved' }, routes: [{ id: 'legacy-1', source: 'Camera legacy', destination: 'Screen legacy', processor: 'DA', system: 'video', format: 'SDI', connector: 'BNC', route: 'Legacy route', status: 'verified', backup: 'Spare', notes: '\n  Original notes  \n' }] });
const patchOriginal = JSON.stringify({ meta: { v1: 'Operator' }, items: [{ source: 'Patch source', destination: 'Record', input: 'SDI 1', converter: 'Scaler', route: 'Record feed', type: 'record', status: 'issue', notes: 'Patch notes' }] });
async function exportPlan() {
  const pending = page.waitForEvent('download'); await button('Export').click();
  const file = await pending; return JSON.parse(await readFile(await file.path(), 'utf8'));
}
async function assertContained(width, height) {
  await page.setViewportSize({ width, height });
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth), `page overflow at ${width}x${height}`);
  for (const control of await page.locator('button:visible, select:visible, .shell-nav a:visible').all()) {
    const box = await control.boundingBox(); assert.ok(box.height >= 44, `short touch target: ${await control.textContent()}`);
  }
}
try {
  await page.goto(url);
  await page.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null, 'opening the app must not write a plan');
  assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'light');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to video workspace');
  await button('Try a sample plan').click();
  await button('Edit route').click();
  await page.getByLabel('Source', { exact: true }).fill('Camera edited in flow');
  await button('Patch').click();
  assert.ok((await page.locator('.route-card').first().textContent()).includes('Camera edited in flow'));
  await page.getByLabel('Switcher / device input').fill('Input 9');
  await button('Signal flow').click();
  await page.locator('.device-port-labels').filter({ hasText: 'Input 9' }).first().waitFor();
  assert.equal(await page.locator('.react-flow__node').filter({hasText:'Production switcher'}).count(), 1);
  await save(); await page.reload(); await button('Edit route').click();
  assert.equal(await page.getByLabel('Source', { exact: true }).inputValue(), 'Camera edited in flow');
  assert.equal(await page.getByLabel('Switcher / device input').inputValue(), 'Input 9');
  await goProject(); await page.getByRole('checkbox', { name: /Patch view/ }).uncheck();
  assert.equal(await button('Patch').count(), 0);
  await page.getByRole('checkbox', { name: /Backup details/ }).uncheck();
  await button('Signal flow').click(); await button('Edit route').click();
  assert.equal(await page.getByLabel('Switcher / device input').count(), 0);
  assert.equal(await page.getByLabel('Backup route', { exact: true }).count(), 0);
  assert.equal(await page.locator('.react-flow__node').filter({hasText:'HDMI to SDI'}).count(), 0);
  const hidden = await exportPlan(); assert.equal(hidden.routes[0].input, 'Input 9'); assert.equal(hidden.routes[0].backup, 'Camera 2 wide');
  await save(); await page.reload(); await goProject();
  assert.equal(await page.getByRole('checkbox', { name: /Patch view/ }).isChecked(), false);
  await page.getByRole('checkbox', { name: /Patch view/ }).check(); await page.getByRole('checkbox', { name: /Backup details/ }).check();
  await save();
  await page.evaluate(({ original, patchOriginal }) => { localStorage.setItem('signal-flow.v1', original); localStorage.setItem('sbd.videoPatch.v1', patchOriginal); }, { original, patchOriginal });
  await button('Import saved Signal Flow').click(); await page.getByRole('dialog').waitFor();
  await button('Cancel').click(); assert.equal((await readSaved()).routes.length, 4);
  await button('Import saved Signal Flow').click(); await button('Add routes to plan').click();
  await goProject(); await button('Import saved Video Patch').click(); await button('Add routes to plan').click();
  await save();
  const combined = await readSaved(); assert.equal(combined.routes.length, 6); assert.equal(combined.imports.length, 2);
  assert.equal(combined.routes[4].notes, '\n  Original notes  \n');
  assert.equal(combined.routes[5].input, 'SDI 1');
  assert.equal(await page.evaluate(() => localStorage.getItem('signal-flow.v1')), original);
  assert.equal(await page.evaluate(() => localStorage.getItem('sbd.videoPatch.v1')), patchOriginal);
  await goProject(); await button('Import saved Signal Flow').click(); await button('Add routes to plan').click();
  assert.match(await page.getByRole('status').textContent(), /already imported/);
  assert.equal((await readSaved()).routes.length, 6);
  // A source changed after preview must not be applied.
  await button('Import saved Signal Flow').click();
  await page.evaluate(() => localStorage.setItem('signal-flow.v1', '{}'));
  await button('Add routes to plan').click();
  assert.match(await page.getByRole('status').textContent(), /changed after preview/);
  assert.equal((await readSaved()).routes.length, 6);
  // Full JSON round trip, including imported originals and all optional data.
  const exported = await exportPlan();
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await button('Replace with backup').click(); await save();
  assert.deepEqual(await readSaved(), exported);
  // Reject unrelated files without changing the saved plan.
  await goProject();
  await page.locator('input[type=file]').setInputFiles({ name: 'foreign.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"foreign","items":[]}') });
  await page.getByRole('status').filter({ hasText: 'Choose an AV Video' }).waitFor();
  assert.deepEqual(await readSaved(), exported);
  // Stale-tab writer cannot overwrite a later save.
  const second = await context.newPage(); await second.goto(url); await second.getByRole('button', { name: 'Edit route', exact: true }).click(); await second.getByLabel('Source', { exact: true }).fill('Later tab source');
  await second.getByRole('button', { name: /^Save/ }).click();
  await button('Signal flow').click(); await button('Edit route').click(); await page.getByLabel('Source', { exact: true }).fill('Stale tab source'); await save();
  assert.match(await page.getByRole('status').textContent(), /another tab/);
  assert.equal((await readSaved()).routes[0].source, 'Later tab source');
  await second.close();
  // Dismiss the native leave warning while deliberately discarding the stale draft.
  page.once('dialog', d => d.accept()); await page.reload();
  const shots = process.env.AV_VIDEO_SCREENSHOTS || '/tmp/av-video-proof'; await mkdir(shots, { recursive: true });
  for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [3440, 1440]]) {
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Theme', { exact: true }).selectOption(theme);
      await button('Signal flow').click(); await assertContained(width, height);
      if (width === 1440 || width === 375) await page.screenshot({ path: `${shots}/${width}-${theme}.png` });
      await button('Edit route').click(); await assertContained(width, height);
      assert.ok(await page.getByLabel('Source', { exact: true }).isVisible());
      await button('Back to diagram').click();
      await button('Patch').click(); await assertContained(width, height);
      await page.getByRole('button', { name: /^Checks/ }).click(); await assertContained(width, height);
      await goProject(); await assertContained(width, height);
    }
  }
  // Broken saved data fails closed, and opening the default Toolbox leaves Show Console alone.
  const broken = await browser.newContext(); const bad = await broken.newPage();
  await bad.goto(url); await bad.evaluate(key => localStorage.setItem(key, 'broken saved source'), key); await bad.reload();
  await bad.getByRole('button', { name: 'Add route', exact: true }).click(); await bad.getByRole('button', { name: /^Save/ }).click();
  assert.match(await bad.getByRole('status').textContent(), /blocked/);
  assert.equal(await bad.evaluate(key => localStorage.getItem(key), key), 'broken saved source');
  await broken.close();
  const toolbox = await browser.newContext(); const hub = await toolbox.newPage();
  await hub.goto(`${BASE}/av-suite.html`); await hub.locator('#shopOfficeView').waitFor();
  assert.equal(await hub.locator('#avApp').getAttribute('data-entry'), 'toolbox');
  assert.ok(await hub.locator('#toolboxGroups a[data-tool=av-video]').isVisible());
  assert.equal(await hub.locator('#toolboxGroups a[data-tool=signal-flow]').count(), 0);
  assert.equal(await hub.locator('#toolboxGroups a[data-tool=video-patch]').count(), 0);
  assert.equal(await hub.evaluate(() => localStorage.getItem('av-suite-dashboard.v1')), null);
  await hub.evaluate(() => navigator.serviceWorker.ready);
  await hub.locator('#toolboxGroups a[data-tool=av-video]').click(); await hub.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  await toolbox.setOffline(true); await hub.reload();
  await hub.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  await hub.getByRole('button', { name: 'Add route', exact: true }).click();
  await hub.getByLabel('Source', { exact: true }).fill('Offline camera');
  await hub.getByRole('button', { name: /^Save/ }).click();
  await hub.reload(); await hub.getByRole('button', { name: 'Edit route', exact: true }).click(); assert.equal(await hub.getByLabel('Source', { exact: true }).inputValue(), 'Offline camera');
  await toolbox.setOffline(false);
  await toolbox.close();
  assert.deepEqual(errors, []);
  console.log(`AV Video browser verification passed: shared route edits, persistence, imports, export, module scope, stale writes, corrupt storage, Toolbox, offline edit/reload, themes and 4 viewport sizes (${BASE}). Screenshots: ${shots}`);
} finally {
  await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve));
}
