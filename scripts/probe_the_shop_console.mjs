import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { KEY, SOURCES, emptyPlan, stageLegacy } from '../the-shop/model.mjs';

// Synthetic records and disposable browser contexts only, including on live URLs.
const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://probe').pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.SHOP_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.SHOP_OUTPUT || join(tmpdir(), 'the-shop-console-evidence');
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.SHOP_CHROME ? { executablePath: process.env.SHOP_CHROME } : {};
const draftKey = 'sbd.shop.draft.v1', layoutKey = 'sbd.shop.layout.v1';
const fixture = { ...emptyPlan(), name: 'Synthetic shop', items: stageLegacy('gear-prep', { schema: SOURCES['gear-prep'].schema, items: Array.from({ length: 20 }, (_, i) => ({ id: `gear-${i}`, item: `Camera kit ${i + 1}`, qty: '3', owner: 'Video', status: 'loaded', notes: 'Retain original notes' })) }) };
const panels = [['Worklist', 'worklist'], ['Item inspector', 'inspector'], ['Plan/Import', 'plan'], ['Backup', 'backup']];
const read = (page, key = KEY) => page.evaluate(key => localStorage.getItem(key), key);
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const quick = (page, name) => button(page.locator('.console-quick'), name).click();
const panel = (page, type) => page.locator(`.console-panel[data-panel="${type}"]`);
const jsonFile = value => ({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
const contexts = [], errors = [], passed = [];
let browser, page;
async function fresh(viewport = { width: 1440, height: 900 }, init) {
  const context = await browser.newContext({ viewport, hasTouch: true, acceptDownloads: true }); contexts.push(context);
  if (init) await context.addInitScript(init);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/the-shop/`); await page.locator('.console-shell').waitFor();
  return { page, context };
}
async function seed(page, value = fixture) { await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value }); await page.reload(); }
async function save(page) {
  if (!await page.locator('#saveBtn').isVisible()) await button(page, 'Shop controls').click();
  await page.locator('#saveBtn').click();
  await page.waitForFunction(() => /Saved to this browser|Recovered plan saved/.test(document.getElementById('footerMessage').textContent));
  if (await button(page, 'Back to panels').isVisible()) await button(page, 'Back to panels').click();
}
async function exportPlan(page) { await quick(page, 'Backup'); const downloaded = page.waitForEvent('download'); await button(panel(page, 'backup'), 'Export JSON').click(); return JSON.parse(await readFile(await (await downloaded).path(), 'utf8')); }
async function reachable(control, label = String(control)) {
  await control.scrollIntoViewIfNeeded();
  const r = await control.evaluate(element => {
    const box = element.getBoundingClientRect(); let top = 0, bottom = innerHeight, left = 0, right = innerWidth;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      if (/(hidden|auto|scroll|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (node instanceof HTMLDialogElement && node.matches(':modal')) break;
    }
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { width: box.width, height: box.height, inside: box.top >= top - 1 && box.bottom <= bottom + 1 && box.left >= left - 1 && box.right <= right + 1, hit: hit === element || element.contains(hit) };
  });
  assert.ok(r.width >= 44 && r.height >= 44 && r.inside && r.hit, `${label}: ${JSON.stringify(r)}`);
}
async function noOverflow(scope, label) {
  const bounds = await scope.locator('html').evaluate(el => ({ h: el.scrollHeight, ch: el.clientHeight, w: el.scrollWidth, cw: el.clientWidth }));
  assert.ok(bounds.h <= bounds.ch && bounds.w <= bounds.cw, `${label}: ${JSON.stringify(bounds)}`);
}
function pass(name) { passed.push(name); console.log(`PASS ${name}`); }
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...channel, args: ['--no-sandbox'] });
  const primary = await fresh(); page = primary.page;
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(nodes => nodes.map(n => n.dataset.panel)), ['worklist', 'inspector']);
  assert.equal(await read(page), null); assert.equal(await read(page, layoutKey), null);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  await seed(page); await page.locator('.row').first().click();
  await page.getByLabel('Owner', { exact: true }).fill('Operator'); await page.getByLabel('Blocker', { exact: true }).fill('Check batteries');
  await page.getByLabel('Packed quantity', { exact: true }).fill('0');
  await quick(page, 'Backup'); await page.locator('#saveBtn').click();
  assert.match(await page.locator('#footerMessage').textContent(), /Apply item changes/);
  assert.equal(JSON.parse(await read(page)).items[0].owner, 'Video');
  await quick(page, 'Item inspector'); assert.equal(await page.getByLabel('Owner', { exact: true }).inputValue(), 'Operator');
  await button(page, 'Apply changes').click(); await save(page);
  let saved = JSON.parse(await read(page)); assert.equal(saved.items[0].packedQty, 0); assert.equal(saved.items[0].status, 'ready'); assert.equal(saved.items[0].blocker, 'Check batteries');
  assert.deepEqual(saved.items[0].original, fixture.items[0].original);
  await quick(page, 'Worklist'); await page.locator('#search').fill('batteries'); assert.equal(await page.locator('.row').count(), 1);
  await page.locator('#statusFilter').selectOption('hold'); assert.equal(await page.locator('.row').count(), 0);
  await page.locator('#statusFilter').selectOption('all'); await page.locator('#phaseFilter').selectOption('strike'); assert.equal(await page.locator('.row').count(), 0);
  await page.locator('#phaseFilter').selectOption('all'); await page.locator('#search').fill('');
  pass('working panel edits, pending form preservation, explicit Apply/Save, unknown versus zero, filters and independent blocker/status');

  await button(page, 'Worklist options').click(); await page.getByRole('menuitem', { name: 'Close panel', exact: true }).click(); assert.equal(await panel(page, 'worklist').count(), 0);
  assert.deepEqual(JSON.parse(await read(page)), saved); await quick(page, 'Worklist');
  await button(page, 'Maximize Worklist').click(); assert.equal(await page.locator('.console-panel').count(), 1); await button(page, 'Restore Worklist').click();
  await button(page, 'Worklist options').click(); await page.getByRole('menuitem', { name: 'Move and size…', exact: true }).click(); await page.getByRole('menuitem', { name: 'Narrower', exact: true }).click(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Worklist options');
  assert.equal(await button(page, 'Worklist options').evaluate(el => el === document.activeElement), true);
  await button(page, 'View options').click(); await page.getByRole('menuitem', { name: 'Store as new view', exact: true }).click();
  assert.deepEqual(JSON.parse(await read(page)), saved); await save(page); saved = JSON.parse(await read(page)); assert.ok(saved.workspace.views.length > 2);
  await page.reload(); assert.deepEqual(JSON.parse(await read(page)), saved); assert.deepEqual(await exportPlan(page), saved);
  pass('close/reopen, maximize, keyboard resize, stored views, explicit Save and export/reload metadata parity');

  const imports = (await fresh()).page;
  for (const [kind, spec] of Object.entries(SOURCES)) {
    const original = { id: `source-${kind}`, item: `${spec.label} case`, qty: '3', custom: { retained: true } };
    const raw = JSON.stringify({ schema: spec.schema, items: [original] });
    await imports.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: spec.key, raw });
    await quick(imports, 'Plan/Import'); await button(imports, 'Import source').click(); await imports.locator('#sourceKind').selectOption(kind);
    await button(imports, 'Preview saved source').click(); await button(imports, 'Add previewed rows').click();
    assert.equal(await read(imports), null); await quick(imports, 'Worklist'); assert.ok(await imports.getByRole('button', { name: new RegExp(spec.label+' case') }).count());
    assert.equal(await read(imports, spec.key), raw);
  }
  await save(imports); const copied = JSON.parse(await read(imports)); assert.equal(copied.items.length, 4); assert.ok(copied.items.every(item => item.original.custom.retained));
  pass('all four reviewed legacy source imports preserve originals and source bytes, with no implicit Save');

  await quick(page, 'Plan/Import'); await page.getByLabel('Plan name').fill('Unsaved recovery plan');
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc.name === 'Unsaved recovery plan', draftKey);
  assert.deepEqual(JSON.parse(await read(page)), saved); await page.reload(); assert.match(await page.getByRole('region', { name: 'Draft recovery' }).textContent(), /Unsaved draft available/);
  await button(page, 'Restore draft').click(); await quick(page, 'Plan/Import'); assert.equal(await page.getByLabel('Plan name').inputValue(), 'Unsaved recovery plan'); await save(page);
  await page.waitForFunction(key => localStorage.getItem(key) === null, draftKey);
  const other = await primary.context.newPage(); other.on('dialog', dialog => dialog.accept()); await other.goto(`${base}/the-shop/`); await other.locator('.console-shell').waitFor();
  await quick(page, 'Plan/Import'); await page.getByLabel('Plan name').fill('First tab'); await save(page);
  await quick(other, 'Plan/Import'); await other.getByLabel('Plan name').fill('Second tab'); await other.locator('#saveBtn').click();
  await other.waitForFunction(() => document.getElementById('footerMessage').textContent.includes('another tab')); assert.equal(JSON.parse(await read(other)).name, 'First tab');
  assert.equal((await exportPlan(other)).name, 'Second tab'); await other.close();
  const malformed = (await fresh()).page; await malformed.evaluate(key => localStorage.setItem(key, '{bad draft'), draftKey); await malformed.reload();
  await quick(malformed, 'Plan/Import'); await malformed.getByLabel('Plan name').fill('Exportable');
  await malformed.waitForFunction(() => document.getElementById('footerMessage').textContent.includes('Draft recovery unavailable'));
  assert.equal(await read(malformed, draftKey), '{bad draft'); assert.equal((await exportPlan(malformed)).name, 'Exportable');
  pass('reviewed draft restore and cleanup, stale-tab Save refusal, exportable conflict edits and malformed draft preservation');

  const refused = (await fresh()).page; await seed(refused); await quick(refused, 'Plan/Import'); await refused.getByLabel('Plan name').fill('Storage refused');
  const before = await read(refused);
  await refused.evaluate(key => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === key) throw Error('Synthetic quota'); return original.call(this, k, v); }; }, KEY);
  await refused.locator('#saveBtn').click(); await refused.waitForFunction(() => document.getElementById('footerMessage').textContent.includes('Synthetic quota'));
  assert.equal(await read(refused), before); assert.equal((await exportPlan(refused)).name, 'Storage refused');
  const unavailable = (await fresh(undefined, () => { Storage.prototype.getItem = () => { throw new DOMException('Synthetic denied storage', 'SecurityError'); }; })).page;
  assert.match(await unavailable.locator('#footerMessage').textContent(), /unavailable/); assert.equal(await button(panel(unavailable, 'worklist'), 'Add item').isDisabled(), true);
  pass('refused Save preserves current work for export; denied storage reports failure without fabricating a saved plan');

  await page.reload(); await quick(page, 'Worklist'); await page.locator('.row').first().click();
  const sizes = [{ width: 1440, height: 900 }, { width: 1100, height: 900 }, { width: 1024, height: 768 }, { width: 720, height: 900 }, { width: 680, height: 812 }, { width: 375, height: 812 }, { width: 844, height: 390 }, { width: 320, height: 256 }, { width: 3840, height: 1080 }];
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    if (await page.locator('html').getAttribute('data-av-theme') !== theme) await page.locator('.shop-header').getByRole('button', { name: theme === 'light' ? 'Light mode' : 'Dark mode' }).click();
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForFunction(({ width, height }) => Boolean(document.querySelector(`.console-shell.mode-${height < 500 || width < 720 ? 'phone' : width < 1100 ? 'tablet' : 'desktop'}`)), size);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const [name, type] of panels) {
        await reachable(button(page.locator('.console-quick'), name), `${size.width} ${name} switcher`); await quick(page, name); await noOverflow(page, `${theme}/${size.width}/${name}`); assert.equal(await panel(page, type).count(), 1);
        if (type === 'worklist') { await reachable(page.locator('#search')); await reachable(page.locator('#phaseFilter')); await reachable(page.locator('#statusFilter')); await reachable(page.locator('.row').last()); }
        if (type === 'inspector') { await reachable(page.getByLabel('Packed quantity', { exact: true })); await reachable(button(page, 'Apply changes')); }
        if (type === 'plan') { await reachable(page.getByLabel('Plan name')); await reachable(button(page, 'Import source')); }
        if (type === 'backup') { await reachable(button(panel(page, type), 'Export JSON')); await reachable(button(page, 'Restore backup')); }
      }
      await button(page, 'Restore backup').click(); await reachable(page.locator('#sourceKind')); await reachable(page.locator('#importFile')); await reachable(button(page, 'Add previewed rows')); await button(page, 'Close import').click();
      if (size.height < 500) { await button(page, 'Shop controls').click(); await reachable(page.locator('#saveBtn')); await reachable(button(page, 'Back to panels')); await button(page, 'Back to panels').click(); }
      await quick(page, 'Worklist'); if ([320, 375, 1024, 1440, 3840].includes(size.width)) await page.screenshot({ path: join(output, `shop-${theme}-${size.width}.png`) });
    }
  }
  pass('four working panels and imports reachable with 44px controls in two themes at nine viewport sizes');

  await page.setViewportSize({ width: 1440, height: 900 }); const beforeOffline = await read(page);
  await page.evaluate(async () => { await navigator.serviceWorker.register('/av-suite-worker.js', { scope: '/', updateViaCache: 'none' }); await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  assert.equal(await page.evaluate(async () => { const cache = await caches.open(`sbd-av-suite-${window.SBD_REGISTRY.version}`); return (await Promise.all(['/the-shop/', '/the-shop/assets/the-shop.js', '/the-shop/assets/index.css'].map(path => cache.match(path)))).every(Boolean); }), true);
  await primary.context.setOffline(true); await page.reload(); await quick(page, 'Worklist'); assert.equal(await page.locator('.row').count(), 20); assert.equal(await read(page), beforeOffline); await primary.context.setOffline(false);
  pass('published entry and native assets cached; saved working plan reopened offline');

  const embedded = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true }); contexts.push(embedded);
  const host = await embedded.newPage(); host.on('dialog', dialog => dialog.accept()); host.on('pageerror', error => errors.push(error.message)); host.setDefaultTimeout(10000);
  await host.goto(`${base}/av-video/?sbdShow=Context%20only&private=do-not-forward`);
  await host.locator('.sbd-rail__entry[data-rail-ref="console:shop"]').tap();
  const frame = host.frameLocator('iframe[title="The Shop application"]'); await frame.locator('.console-shell').waitFor();
  assert.equal(new URL(host.url()).pathname, '/av-video/'); assert.equal(await frame.locator('.shop-nav').isVisible(), false); assert.equal(await frame.locator('.sbd-rail').isVisible(), false);
  await quick(frame, 'Plan/Import'); assert.match(await frame.getByLabel('Read-only show context').textContent(), /Context only/);
  await frame.getByLabel('Plan name').fill('Embedded Shop'); await frame.locator('#saveBtn').tap();
  await host.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.name === 'Embedded Shop', KEY); assert.equal(await read(host, 'sbd.avVideo.v1'), null);
  for (const size of [{ width: 1024, height: 768 }, { width: 680, height: 812 }, { width: 375, height: 812 }, { width: 3840, height: 1080 }]) {
    await host.setViewportSize(size); await quick(frame, 'Plan/Import'); await reachable(frame.getByLabel('Plan name')); await noOverflow(frame, `embedded ${size.width}`); await noOverflow(host, `host ${size.width}`);
    await frame.getByLabel('Plan name').fill(`Touch Shop ${size.width}`); await quick(frame, 'Backup'); await reachable(button(panel(frame, 'backup'), 'Save plan')); await button(panel(frame, 'backup'), 'Save plan').tap();
    await host.waitForFunction(({ key, name }) => JSON.parse(localStorage.getItem(key) || 'null')?.name === name, { key: KEY, name: `Touch Shop ${size.width}` }); assert.equal(await read(host, 'sbd.avVideo.v1'), null);
    if (size.width === 1024) await host.screenshot({ path: join(output, 'shop-embedded-tablet.png') });
  }
  assert.equal((await host.locator('iframe[title="The Shop application"]').getAttribute('src')).includes('private='), false);
  await host.evaluate(() => localStorage.setItem('av-theme-mode.v1', 'light')); await frame.locator('html[data-av-theme="light"]').waitFor();
  pass('real AV Video embedding, independent Save, allowed context, shared theme and phone/tablet/ultrawide touch controls');
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'result.json'), JSON.stringify({ at: new Date().toISOString(), base, browser: browser.version(), passed, physicalDevices: 'not tested', processRestartAndPowerLoss: 'not tested' }, null, 2));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'shop-failure.png') }).catch(() => {});
  await writeFile(join(output, 'failure.json'), JSON.stringify({ at: new Date().toISOString(), passed, error: String(error), errors }, null, 2)).catch(() => {});
  throw error;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
