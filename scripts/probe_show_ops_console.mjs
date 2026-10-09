import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://probe').pathname));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.SHOW_OPS_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.SHOW_OPS_OUTPUT || join(tmpdir(), 'show-ops-console-evidence');
await mkdir(output, { recursive: true });
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.SHOW_OPS_BROWSER ? { executablePath: process.env.SHOW_OPS_BROWSER } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', dialog => dialog.accept());
const key = 'sbd.showOps.document.v1', draftKey = 'sbd.showOps.draft.v1', layoutKey = 'sbd.showOps.layout.v1';
const read = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
const quick = (page, name) => page.locator('.console-quick').getByRole('button', { name, exact: true }).click();
const setup = async (page, field) => { await quick(page, 'Setup'); await page.getByRole('combobox', { name: 'Setup field' }).selectOption(field); };
const panel = (page, name) => page.locator(`.console-panel[data-panel="${name}"]`);
async function reachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  assert.equal(await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    let top = 0, bottom = innerHeight, left = 0, right = innerWidth;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      if (/(hidden|auto|scroll|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    }
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.height >= 44 && box.width >= 44 && box.top >= top - 1 && box.bottom <= bottom + 1 && box.left >= left - 1 && box.right <= right + 1 && (hit === element || element.contains(hit));
  }), true, `Control clipped or occluded: ${locator}`);
}
const notice = () => page.locator('#notice').textContent();
const jsonFile = raw => ({ name: 'source.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
const schemas = { room: 'room-check', task: 'show-task-board', crew: 'crew-call' };
const fields = {
  task: ['showName', 'client', 'venue', 'room', 'showDate', 'boardLead', 'showCaller', 'shift', 'handoffTime'],
  crew: ['showName', 'client', 'venue', 'showDate', 'advanceLead', 'loadIn', 'handoffTo'],
};
const meta = type => ({ ...Object.fromEntries((fields[type] || ['showName', 'venue', 'room', 'showDate']).map(field => [field, ''])), showName: 'Acceptance show', showDate: '2026-10-09', venue: 'Hall' });
const fixtures = {
  room: { schema: 'system-by-dave.room-check.v1', meta: meta('room'), items: [{ id: 'r1', area: 'room', check: 'Sightlines', owner: 'Lead', due: '08:00', priority: 'normal', status: 'ready', blocker: '', notes: 'Keep room original', extra: 'Retain unknown field' }] },
  task: { schema: 'system-by-dave.show-task-board.v1', meta: meta('task'), items: [{ id: 't1', area: 'video', task: 'Check confidence monitor', owner: 'V1', priority: 'high', due: '08:00', status: 'blocked', source: 'Advance', blocker: 'Missing aux', notes: 'Keep task original' }, { id: 't2', area: 'video', task: 'Already done', owner: '', priority: 'normal', due: '', status: 'done', source: '', blocker: '', notes: '' }] },
  crew: { schema: 'system-by-dave.crew-call.v1', meta: meta('crew'), items: [{ id: 'c1', section: 'audio', name: 'Synthetic operator', role: 'A1', call: '08:00', location: 'Hall', meal: '12:00', release: '18:00', phone: '555-0100', status: 'on-site', notes: 'Keep crew original' }] },
};
const target = { room: ['rooms', 'Needs check', 'roomCheckSources'], task: ['tasks', 'Open', 'taskBoardSources'], crew: ['crew', 'Called', 'crewCallSources'] };
try {
  await page.goto(`${base}/show-ops/`);
  await page.locator('[data-sbd-rail-host][data-rail-state="ready"]').waitFor();
  assert.equal(new URL(await page.locator('.sbd-rail [aria-current="page"]').getAttribute('href'), base).pathname, '/show-ops/');
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(nodes => nodes.map(n => n.dataset.panel)), ['rooms', 'crew', 'tasks']);
  await page.waitForTimeout(500);
  assert.equal(await read(page, key), null, 'fresh visit must not save a document');
  assert.equal(await read(page, layoutKey), null, 'fresh visit must not write a layout');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  await quick(page, 'Setup');
  await page.locator('#name').fill('Acceptance show'); await setup(page, 'date'); await page.locator('#date').fill('2026-10-09');
  await quick(page, 'Rooms');
  await panel(page, 'rooms').locator('[name="name"]').fill('Main room');
  await panel(page, 'rooms').locator('[name="detail"]').fill('Check lectern');
  await panel(page, 'rooms').getByRole('button', { name: 'Add room', exact: true }).click();
  await panel(page, 'rooms').locator('[data-field="status"]').selectOption('Ready');
  await panel(page, 'crew').locator('[name="name"]').fill('Crew lead');
  await panel(page, 'crew').getByRole('button', { name: 'Add crew member', exact: true }).click();
  await panel(page, 'tasks').locator('[name="name"]').fill('Open doors');
  await panel(page, 'tasks').getByRole('button', { name: 'Add task', exact: true }).click();
  await quick(page, 'Handoff');
  assert.match(await panel(page, 'handoff').textContent(), /Open doors/);
  assert.doesNotMatch(await panel(page, 'handoff').textContent(), /Main room/);
  await page.locator('#save').click();
  const saved = await read(page, key);
  assert.equal(JSON.parse(saved).workspace, undefined);
  await page.reload();
  assert.equal(await page.locator('#show-title').textContent(), 'Acceptance show');
  await quick(page, 'Rooms');
  await page.getByRole('button', { name: 'Crew options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Close panel', exact: true }).click();
  assert.equal(await panel(page, 'crew').count(), 0);
  assert.equal(await read(page, key), saved, 'close is presentation only');
  await page.getByRole('button', { name: '＋ Add panel', exact: true }).click();
  await page.getByRole('dialog', { name: 'Add panel' }).getByRole('button', { name: /^Crew/ }).click();
  assert.equal(await panel(page, 'crew').locator('.record').count(), 1, 'reopening retains records');
  await page.getByRole('button', { name: 'Maximize Rooms' }).click();
  assert.equal(await page.locator('.console-panel').count(), 1);
  await page.getByRole('button', { name: 'Restore Rooms' }).click();
  await page.getByRole('button', { name: 'Rooms options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Move and size…' }).click();
  await page.getByRole('menuitem', { name: 'Narrower', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Rooms options' }).evaluate(e => e === document.activeElement), true);
  await page.getByRole('button', { name: 'View options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Store as new view', exact: true }).click();
  assert.equal(await read(page, key), saved, 'storing a view still needs Save');
  await page.locator('#save').click();
  const stored = JSON.parse(await read(page, key));
  assert.equal(stored.workspace.views.length, 4);
  await page.reload();
  assert.equal(await page.getByRole('tab', { name: 'Operations 4', exact: true }).count(), 1);
  assert.equal(JSON.parse(await read(page, key)).crew[0].name, 'Crew lead');

  for (const type of ['room', 'task', 'crew']) {
    const raw = JSON.stringify(fixtures[type]), sourceKey = `${schemas[type]}.v1`;
    await page.evaluate(({ sourceKey, raw }) => localStorage.setItem(sourceKey, raw), { sourceKey, raw });
    await quick(page, 'Backup');
    const before = await read(page, key);
    await page.locator(`#${type}-saved`).click();
    assert.equal(await page.locator(`#${type}-preview input[type="checkbox"]`).count(), 1);
    await page.locator(`#cancel-${type}`).click();
    assert.equal(await read(page, key), before);
    await page.locator(`#${type}-saved`).click();
    await page.evaluate(({ sourceKey, raw }) => localStorage.setItem(sourceKey, raw + ' '), { sourceKey, raw });
    await page.locator(`#confirm-${type}`).click();
    assert.match(await notice(), /changed after preview/);
    assert.equal(await read(page, key), before);
    await page.evaluate(({ sourceKey, raw }) => localStorage.setItem(sourceKey, raw), { sourceKey, raw });
    await page.locator(`#${type}-file`).setInputFiles(jsonFile('{bad'));
    await page.waitForFunction(() => /parse|JSON|Unexpected/.test(document.querySelector('#notice').textContent));
    assert.equal(await page.locator(`#confirm-${type}`).count(), 0);
    await page.locator(`#${type}-file`).setInputFiles(jsonFile(raw));
    await page.locator(`#confirm-${type}`).click();
    assert.equal(await read(page, key), before, 'copy is unsaved');
    await page.locator('#save').click();
    const next = JSON.parse(await read(page, key));
    const [collection, status, history] = target[type];
    assert.equal(next[collection].at(-1).status, status);
    assert.equal(next[history][0].raw, raw);
    assert.equal(next.workspace.views.length, 4, 'copy retains stored views');
    assert.equal(await read(page, sourceKey), raw, 'copy leaves original byte-identical');
    await quick(page, 'Backup'); await page.locator(`#${type}-saved`).click();
    assert.match(await notice(), /already copied|No new active/);
  }
  await quick(page, 'Backup');
  const downloading = page.waitForEvent('download'); await page.locator('#export').click();
  const exported = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
  assert.deepEqual(exported, JSON.parse(await read(page, key)));
  await page.locator('#import').setInputFiles(jsonFile(JSON.stringify({ ...exported, workspace: { version: 2, views: [] } })));
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('version'));
  assert.equal(await page.locator('#confirm-import').count(), 0);
  await page.locator('#import').setInputFiles(jsonFile(JSON.stringify(exported)));
  await page.locator('#cancel-import').click();
  assert.equal(await page.locator('#import').inputValue(), '');
  await page.locator('#import').setInputFiles(jsonFile(JSON.stringify(exported)));
  await page.locator('#confirm-import').click(); await page.locator('#save').click();

  await setup(page, 'notes'); await page.locator('#notes').fill('Recover this unsaved briefing');
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc.notes === 'Recover this unsaved briefing', draftKey);
  await page.reload();
  await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
  await setup(page, 'notes');
  assert.equal(await page.locator('#notes').inputValue(), 'Recover this unsaved briefing');
  assert.notEqual(JSON.parse(await read(page, key)).notes, 'Recover this unsaved briefing');
  await page.locator('#save').click();
  await page.waitForFunction(key => localStorage.getItem(key) === null, draftKey);

  const stale = await context.newPage(); stale.on('dialog', d => d.accept());
  await stale.goto(`${base}/show-ops/`); await setup(stale, 'notes');
  await page.locator('#notes').fill('Changed in first tab'); await page.locator('#save').click();
  await stale.locator('#notes').fill('Stale tab edit'); await stale.locator('#save').click();
  assert.match(await stale.locator('#notice').textContent(), /Another tab changed/);
  assert.equal(JSON.parse(await read(page, key)).notes, 'Changed in first tab');
  await stale.close();

  const sizes = [{ width: 1440, height: 900 }, { width: 1100, height: 800 }, { width: 900, height: 700 }, { width: 680, height: 812 }, { width: 375, height: 812 }, { width: 844, height: 390 }, { width: 320, height: 256 }, { width: 3840, height: 1080 }];
  for (const theme of ['light', 'dark']) {
    if (await page.locator('html').getAttribute('data-av-theme') !== theme) await page.locator('#theme').click();
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const name of ['Rooms', 'Crew', 'Tasks', 'Setup', 'Handoff', 'Backup']) {
        await quick(page, name);
        const bounds = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        assert.ok(bounds.h <= bounds.ch && bounds.w <= bounds.cw, JSON.stringify({ theme, size, name, bounds }));
        assert.equal(await panel(page, name.toLowerCase()).count(), 1);
        if (['Rooms', 'Crew', 'Tasks'].includes(name)) {
          await reachable(panel(page, name.toLowerCase()).locator('[name="name"]'));
          await reachable(panel(page, name.toLowerCase()).locator('.record').last().getByRole('button', { name: /^Remove / }));
        } else if (name === 'Setup') {
          for (const field of ['identity', 'date', 'notes', 'tools']) {
            await page.getByRole('combobox', { name: 'Setup field' }).selectOption(field);
            await reachable(panel(page, 'setup').locator('.ops-form input, .ops-form textarea, .ops-form select'));
          }
        } else if (name === 'Backup') {
          await reachable(page.locator('#export'));
          await reachable(page.locator('#crew-file'));
          await page.locator('.ops-backup').evaluate(e => e.scrollTop = 0);
        }
      }
      if (size.height < 500) {
        await page.getByRole('button', { name: 'Show controls', exact: true }).click();
        await reachable(page.locator('#save')); await reachable(page.locator('#theme'));
        await page.getByRole('button', { name: 'Back to panels', exact: true }).click();
      }
      if ([320, 375, 1440, 3840].includes(size.width)) await page.screenshot({ path: join(output, `show-ops-${theme}-${size.width}.png`) });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await quick(page, 'Rooms');
  await page.screenshot({ path: join(output, 'show-ops-operations.png') });
  const safetyContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const safety = await safetyContext.newPage(); safety.on('dialog', d => d.accept());
  await safety.goto(`${base}/show-ops/`);
  await safety.evaluate(key => localStorage.setItem(key, '{broken'), key); await safety.reload();
  assert.equal(await safety.locator('#save').isDisabled(), true);
  assert.equal(await read(safety, key), '{broken');
  await quick(safety, 'Backup');
  assert.equal(await safety.getByRole('button', { name: 'Download original saved bytes' }).count(), 1);
  await safety.evaluate(() => localStorage.clear()); await safety.reload();
  await safety.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Synthetic full storage', 'QuotaExceededError'); }; });
  await setup(safety, 'notes'); await safety.locator('#notes').fill('Keep this unsaved text');
  await safety.locator('#save').click();
  assert.match(await safety.locator('#notice').textContent(), /Save failed/);
  assert.equal(await read(safety, key), null);
  await safety.waitForFunction(() => document.querySelector('#notice').textContent.includes('Draft'));
  await quick(safety, 'Backup');
  const failedSaveExport = safety.waitForEvent('download'); await safety.locator('#export').click();
  assert.equal(JSON.parse(await readFile(await (await failedSaveExport).path(), 'utf8')).notes, 'Keep this unsaved text');
  await safetyContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS Show Ops console: six functional panels, view/save/reload, source guards and exact provenance, export/restore, drafts, stale tabs, two themes and eight viewport sizes.');
} catch (error) {
  await page.screenshot({ path: join(output, 'show-ops-failure.png') });
  throw error;
} finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
