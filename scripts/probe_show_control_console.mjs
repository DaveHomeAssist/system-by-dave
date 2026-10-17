import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { STORE, CUE_KEY, fromCueSheet, logEvent } from '../show-control/model.mjs';

// Every write and fault injection targets synthetic data in disposable contexts.
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
const base = process.env.SHOW_CONTROL_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.SHOW_CONTROL_OUTPUT || join(tmpdir(), 'show-control-console-evidence');
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.SHOW_CONTROL_BROWSER ? { executablePath: process.env.SHOW_CONTROL_BROWSER } : {};
const draftKey = 'sbd.showControl.draft.v1', layoutKey = 'sbd.showControl.layout.v1';
const source = JSON.stringify({ title: 'Acceptance calling desk', rows: [
  { number: '001', action: 'Doors open', time: '08:00', owner: 'Caller', notes: 'Stand by house lights', custom: { retained: true } },
  { number: '002', action: 'Walk on', owner: 'Stage manager', notes: 'Confirm stage clear' },
  { number: '003', action: 'Presentation', owner: 'Video', notes: 'Caller approval only' },
] });
const legacy = logEvent(logEvent(fromCueSheet(source), 'Go', '2026-10-09T12:00:00Z'), 'Hold', '2026-10-09T12:01:00Z');
const forge = { version: 7, name: 'Synthetic CueForge show', modifiedAt: '2026-10-09T12:00:00Z', settings: { credential: 'must-not-copy' }, cueLists: [
  { id: 'first', name: 'First', cues: [{ id: 'one', number: '1', name: 'First cue', type: 'audio', notes: 'First note', properties: { path: 'do-not-retain.wav' } }] },
  { id: 'second', name: 'Second', cues: [{ id: 'two', number: '2', name: 'Second cue', type: 'video', notes: 'Second note', trigger: { arm: true } }] },
] };
const read = (page, key = STORE) => page.evaluate(key => localStorage.getItem(key), key);
const quick = (page, name) => page.locator('.console-quick').getByRole('button', { name, exact: true }).click();
const panel = (page, type) => page.locator(`.console-panel[data-panel="${type}"]`);
const button = (page, name) => page.getByRole('button', { name, exact: true });
const jsonFile = value => ({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
const calls = page => panel(page, 'deck');
const errors = [], passed = [], contexts = [];
let browser, page;
let acceptReplacement = true;
async function fresh(viewport = { width: 1440, height: 900 }, init) {
  const context = await browser.newContext({ viewport, acceptDownloads: true, hasTouch: true });
  contexts.push(context);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.type() === 'confirm' && !acceptReplacement ? dialog.dismiss() : dialog.accept());
  await page.goto(`${base}/show-control/`);
  await page.locator('.console-shell').waitFor();
  return { context, page };
}
async function reachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    let top = 0, bottom = innerHeight, left = 0, right = innerWidth;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      if (/(hidden|auto|scroll|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      // Modal dialogs are in the browser top layer, outside ancestor clipping.
      // Their own bounds and center hit-testing still apply.
      if (node instanceof HTMLDialogElement && node.matches(':modal')) break;
    }
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { width: box.width, height: box.height, inside: box.top >= top - 1 && box.bottom <= bottom + 1 && box.left >= left - 1 && box.right <= right + 1, hit: hit === element || element.contains(hit) };
  });
  assert.ok(result.width >= 44 && result.height >= 44 && result.inside && result.hit, `Unreachable ${locator}: ${JSON.stringify(result)}`);
}
async function openImport(page, kind) {
  await quick(page, kind === 'restore' ? 'Document' : 'Setup');
  const launcher = button(page, kind === 'restore' ? 'Document controls' : 'Setup and imports');
  if (await launcher.isVisible()) await launcher.click();
  await button(page, kind === 'restore' ? 'Restore backup' : kind === 'forge' ? 'Review CueForge file' : 'Review Cue Sheet').click();
}
async function exportRun(page) {
  await quick(page, 'Document');
  const download = page.waitForEvent('download'); await button(page, 'Export backup').click();
  return JSON.parse(await readFile(await (await download).path(), 'utf8'));
}
async function noOverflow(page, label) {
  const bounds = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(bounds.h <= bounds.ch && bounds.w <= bounds.cw, `${label}: ${JSON.stringify(bounds)}`);
}
function pass(name) { passed.push(name); console.log(`PASS ${name}`); }
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...channel, args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
  const primary = await fresh(); page = primary.page;
  await page.locator('[data-sbd-rail-host][data-rail-state="ready"]').waitFor();
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(nodes => nodes.map(n => n.dataset.panel)), ['deck', 'cues', 'log']);
  await page.waitForTimeout(500);
  assert.equal(await read(page), null); assert.equal(await read(page, layoutKey), null);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORE, value: JSON.stringify(legacy) });
  await page.reload();
  assert.match(await calls(page).textContent(), /002.*Walk on/s);
  assert.equal(await button(calls(page), 'Log Go →').isDisabled(), true);
  await button(calls(page), 'Log Resume').click(); await button(calls(page), 'Log Go →').click();
  assert.match(await calls(page).textContent(), /003.*Presentation/s);
  await button(page, 'Save run').click();
  let saved = JSON.parse(await read(page));
  assert.equal(saved.current, 2); assert.equal(saved.held, false); assert.equal(saved.events.length, 4);
  assert.deepEqual(saved.cues[0].sourceRow, JSON.parse(source).rows[0]); assert.equal(saved.workspace, undefined);
  await button(page, 'On Deck options').click(); await page.getByRole('menuitem', { name: 'Close panel', exact: true }).click();
  assert.equal(await calls(page).count(), 0); assert.deepEqual(JSON.parse(await read(page)), saved);
  await quick(page, 'On Deck'); assert.match(await calls(page).textContent(), /003.*Presentation/s);
  await button(page, 'Maximize On Deck').click(); assert.equal(await page.locator('.console-panel').count(), 1);
  await button(page, 'Restore On Deck').click();
  await button(page, 'On Deck options').click(); await page.getByRole('menuitem', { name: 'Move and size…', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Narrower', exact: true }).click(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'On Deck options', null, { timeout: 2000 });
  await button(page, 'View options').click(); await page.getByRole('menuitem', { name: 'Store as new view', exact: true }).click();
  assert.deepEqual(JSON.parse(await read(page)), saved, 'view storage still requires explicit Save');
  await button(page, 'Save run').click(); saved = JSON.parse(await read(page));
  assert.ok(saved.workspace.views.length > 2); await page.reload();
  assert.deepEqual(JSON.parse(await read(page)), saved);
  pass('legacy run, cue selection, Hold/Resume/Go, source rows, closed panel, keyboard size, maximize and saved views');

  await quick(page, 'Setup'); await button(page, 'Add a cue').click();
  await page.getByLabel('Cue number', { exact: true }).fill('004');
  await button(page, 'Next field').click(); await page.getByLabel('Action', { exact: true }).fill('Curtain call');
  await button(page, 'Add to run').click();
  await quick(page, 'Cues'); assert.equal(await panel(page, 'cues').locator('.call-cue').count(), 4);
  await quick(page, 'Notes'); await page.getByLabel('Operator notes', { exact: true }).fill('Synthetic operator notes');
  await button(page, 'Save run').click();
  await page.evaluate(({ key, source }) => localStorage.setItem(key, source), { key: CUE_KEY, source });
  await openImport(page, 'sheet'); await button(page, 'Preview local Cue Sheet').click();
  const beforeImport = await read(page);
  await button(page, 'Cancel preview').click(); assert.equal(await read(page), beforeImport);
  await button(page, 'Preview local Cue Sheet').click();
  await page.evaluate(key => localStorage.setItem(key, localStorage.getItem(key) + ' '), CUE_KEY);
  await button(page, 'Copy selected cues').click(); assert.match(await page.locator('.call-dialog-status').textContent(), /source Cue Sheet changed/);
  assert.equal(await read(page), beforeImport);
  await button(page, 'Cancel preview').click(); await button(page, 'Preview local Cue Sheet').click();
  acceptReplacement = false; await button(page, 'Copy selected cues').click(); acceptReplacement = true;
  assert.match(await page.locator('.call-dialog-status').textContent(), /Replacement canceled/); assert.equal(await read(page), beforeImport);
  await button(page, 'Copy selected cues').click(); assert.equal(await read(page), beforeImport);
  await button(page, 'Save run').click();
  assert.equal(await read(page, CUE_KEY), source + ' '); assert.deepEqual(JSON.parse(await read(page)).workspace, saved.workspace);
  await openImport(page, 'forge'); await page.getByLabel('CueForge show file', { exact: true }).setInputFiles(jsonFile(forge));
  await page.getByLabel('Cue list', { exact: true }).selectOption('second');
  assert.match(await page.getByRole('region', { name: 'Import preview' }).textContent(), /Second cue/);
  assert.doesNotMatch(await page.getByRole('region', { name: 'Import preview' }).textContent(), /First cue/);
  await button(page, 'Copy selected cues').click(); await button(page, 'Save run').click();
  const exported = await exportRun(page);
  assert.equal(exported.source.listId, 'second'); assert.deepEqual(exported.cues[0].sourceRow, { id: 'two', number: '2', name: 'Second cue', type: 'video', notes: 'Second note' });
  assert.doesNotMatch(JSON.stringify(exported), /must-not-copy|do-not-retain|trigger|credential|properties/);
  await openImport(page, 'forge');
  await page.getByLabel('CueForge show file', { exact: true }).setInputFiles(jsonFile({ ...forge, cueLists: [forge.cueLists[0], forge.cueLists[0]] }));
  await page.waitForFunction(() => document.querySelector('.call-dialog-status').textContent.includes('duplicate cue list ID'));
  assert.equal(await button(page, 'Copy selected cues').count(), 0); assert.deepEqual(JSON.parse(await read(page)), exported);
  await button(page, 'Close dialog').click();
  await openImport(page, 'restore'); await page.getByLabel('Backup JSON').setInputFiles(jsonFile({ ...exported, workspace: { version: 2, views: [] } }));
  await page.waitForFunction(() => document.querySelector('.call-dialog-status').textContent.includes('version'));
  assert.equal(await button(page, 'Restore this backup').count(), 0);
  await page.getByLabel('Backup JSON').setInputFiles(jsonFile(exported)); await button(page, 'Restore this backup').click(); await button(page, 'Save run').click();
  assert.deepEqual(JSON.parse(await read(page)), exported);
  pass('six working panels, manual cues, exact selected-list import, source guards, cancellation, safe provenance and backup round trip');

  await quick(page, 'Notes'); await page.getByLabel('Operator notes').fill('Recover unsaved notes');
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc.notes === 'Recover unsaved notes', draftKey);
  await page.reload(); await button(page, 'Restore draft').click(); await quick(page, 'Notes');
  assert.equal(await page.getByLabel('Operator notes').inputValue(), 'Recover unsaved notes'); assert.notEqual(JSON.parse(await read(page)).notes, 'Recover unsaved notes');
  await button(page, 'Save run').click(); await page.waitForFunction(key => localStorage.getItem(key) === null, draftKey);
  await page.getByLabel('Operator notes').fill('Discard these notes');
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc.notes === 'Discard these notes', draftKey);
  await page.reload(); await button(page, 'Discard draft').click(); await quick(page, 'Notes');
  assert.equal(await page.getByLabel('Operator notes').inputValue(), 'Recover unsaved notes');
  const stale = await primary.context.newPage(); stale.on('dialog', d => d.accept());
  await stale.goto(`${base}/show-control/`); await quick(stale, 'Notes');
  await page.getByLabel('Operator notes').fill('New saved notes'); await button(page, 'Save run').click();
  await stale.getByLabel('Operator notes').fill('Stale notes'); await button(stale, 'Save run').click();
  assert.match(await stale.locator('#notice').textContent(), /Another tab changed/); assert.equal(JSON.parse(await read(page)).notes, 'New saved notes');
  await stale.close();
  pass('draft restore/discard, explicit save cleanup and stale-tab save rejection');

  const safety = (await fresh({ width: 375, height: 812 })).page;
  await safety.evaluate(key => localStorage.setItem(key, '{damaged'), STORE); await safety.reload();
  assert.equal(await button(safety, 'Save run').isDisabled(), true); await quick(safety, 'Document');
  assert.equal(await button(safety, 'Replace damaged saved run').isDisabled(), true);
  const damagedDownload = safety.waitForEvent('download'); await button(safety, 'Download unreadable saved data').click();
  assert.equal(await readFile(await (await damagedDownload).path(), 'utf8'), '{damaged');
  await safety.evaluate(key => localStorage.setItem(key, '{newer damaged'), STORE);
  await button(safety, 'Replace damaged saved run').click(); assert.match(await safety.locator('#notice').textContent(), /Another tab changed/);
  assert.equal(await read(safety), '{newer damaged'); await safety.reload(); await quick(safety, 'Document');
  const secondDownload = safety.waitForEvent('download'); await button(safety, 'Download unreadable saved data').click(); await secondDownload;
  await button(safety, 'Replace damaged saved run').click(); assert.equal(await read(safety), null);
  await safety.evaluate(({ key, draftKey, doc }) => {
    localStorage.setItem(key, JSON.stringify(doc)); localStorage.setItem(draftKey, JSON.stringify({ v: 1, console: 'show-control', at: new Date().toISOString(), baseline: null, doc }));
  }, { key: STORE, draftKey, doc: exported });
  await safety.reload(); await safety.waitForFunction(key => localStorage.getItem(key) === null, draftKey);
  assert.deepEqual(JSON.parse(await read(safety)), exported);
  await safety.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Synthetic quota refusal', 'QuotaExceededError'); }; });
  await quick(safety, 'Notes'); await safety.getByLabel('Operator notes').fill('Export after refusal'); await button(safety, 'Save run').click();
  assert.match(await safety.locator('#notice').textContent(), /Save failed/); assert.deepEqual(JSON.parse(await read(safety)), exported);
  await safety.waitForFunction(() => document.querySelector('#notice').textContent.includes('Draft'));
  assert.equal((await exportRun(safety)).notes, 'Export after refusal');
  const unavailable = (await fresh(undefined, () => { Storage.prototype.getItem = () => { throw new DOMException('Synthetic denied storage', 'SecurityError'); }; })).page;
  assert.equal(await button(unavailable, 'Save run').isDisabled(), true); assert.match(await unavailable.locator('#notice').textContent(), /unavailable/);
  assert.equal(await button(calls(unavailable), 'Log Go →').isDisabled(), true);
  pass('damaged-byte export and guarded replacement, matching-draft cleanup, refused storage and export, unavailable storage');

  const sizes = [{ width: 1440, height: 900 }, { width: 1100, height: 900 }, { width: 720, height: 900 }, { width: 680, height: 812 }, { width: 375, height: 812 }, { width: 844, height: 390 }, { width: 320, height: 256 }, { width: 3840, height: 1080 }];
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    if (await page.locator('html').getAttribute('data-av-theme') !== theme) await page.locator('#theme').click();
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const [name, type] of [['On Deck', 'deck'], ['Cues', 'cues'], ['Notes', 'notes'], ['Call Log', 'log'], ['Setup', 'setup'], ['Document', 'document']]) {
        await quick(page, name); await noOverflow(page, `${theme}/${size.width}/${name}`);
        assert.equal(await panel(page, type).count(), 1);
        if (type === 'deck') {
          for (const label of ['Log Go →', 'Log Hold', 'Log Resume']) await reachable(button(calls(page), label));
          assert.equal(await calls(page).locator('h2').evaluate(element => {
            const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
            return box.top >= parent.top && box.top + Math.min(box.height, 16) <= parent.bottom;
          }), true, 'Current cue must be visible before a caller can press Go');
        }
        if (type === 'cues') await reachable(panel(page, 'cues').locator('.call-cue').last());
        if (type === 'notes') await reachable(page.getByLabel('Operator notes'));
        if (type === 'setup' || type === 'document') {
          const target = button(page, size.height < 500 ? type === 'setup' ? 'Setup and imports' : 'Document controls' : type === 'setup' ? 'Add a cue' : 'Export backup');
          await reachable(target);
          if (size.height < 500) { await target.click(); await reachable(button(page, type === 'setup' ? 'Add a cue' : 'Export backup')); await button(page, 'Close dialog').click(); }
        }
      }
      await openImport(page, 'restore'); await reachable(page.getByLabel('Backup JSON')); await button(page, 'Close dialog').click();
      await openImport(page, 'forge'); await page.getByLabel('CueForge show file').setInputFiles(jsonFile(forge));
      await page.getByLabel('Cue list', { exact: true }).waitFor(); await reachable(page.getByLabel('Cue list', { exact: true }));
      await reachable(button(page, 'Copy selected cues')); await reachable(button(page, 'Cancel preview')); await button(page, 'Close dialog').click();
      if (size.height < 500) {
        await button(page, 'Show controls').click(); await reachable(button(page, 'Save run')); await reachable(page.locator('#theme')); await reachable(button(page, 'Back to panels')); await button(page, 'Back to panels').click();
      }
      await quick(page, 'On Deck');
      if ([320, 375, 1440, 3840].includes(size.width)) await page.screenshot({ path: join(output, `show-control-${theme}-${size.width}.png`) });
    }
  }
  pass('all six panels and import dialogs reachable in both themes at eight viewport sizes');
  await page.setViewportSize({ width: 1440, height: 900 });
  const beforeOffline = await read(page);
  await page.evaluate(async () => { await navigator.serviceWorker.register('/av-suite-worker.js', { scope: '/', updateViaCache: 'none' }); await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  assert.equal(await page.evaluate(async () => {
    const cache = await caches.open(`sbd-av-suite-${window.SBD_REGISTRY.version}`);
    return (await Promise.all(['/show-control/', '/show-control/assets/show-control.js', '/show-control/assets/index.css'].map(path => cache.match(path)))).every(Boolean);
  }), true);
  await primary.context.setOffline(true); await page.reload(); await quick(page, 'Notes');
  assert.equal(await page.getByLabel('Operator notes').inputValue(), JSON.parse(beforeOffline).notes); assert.equal(await read(page), beforeOffline);
  await primary.context.setOffline(false); pass('entry and built assets cached, saved run reopened offline');

  assert.deepEqual(errors, []);
  await writeFile(join(output, 'result.json'), JSON.stringify({ at: new Date().toISOString(), base, browser: browser.version(), passed, physicalDevices: 'not tested', processRestartAndPowerLoss: 'not tested' }, null, 2));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'show-control-failure.png') }).catch(() => {});
  await writeFile(join(output, 'failure.json'), JSON.stringify({ at: new Date().toISOString(), passed, error: String(error), errors }, null, 2)).catch(() => {});
  throw error;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
