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
const key = 'sbd.avVideo.v1', draft = 'sbd.avVideo.draft.v1', url = `${BASE}/av-video/`;
const button = name => page.getByRole('button', { name, exact: true });
const save = () => page.getByRole('button', { name: /^Save/ }).click();
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const waitDraft = () => page.waitForTimeout(750);
const camera = { schema: 'system-by-dave.camera-shot-list.v1', meta: { showName: 'Rehearsal', venue: 'Hall', date: '2026-10-05', director: 'A', td: 'B' }, shots: [{ id: 'old-shot', number: '001', cue: 'Open', camera: 'Camera 1', type: 'IMAG', subject: 'Presenter', framing: 'MCU', movement: 'Follow', preset: '3', status: 'hold', notes: '  Original\nnotes', extra: { retained: true } }, { number: '002', cue: 'Close', camera: 'Camera 2', subject: 'Wide', status: 'ready' }] };
const playback = { schema: 'system-by-dave.playback-check.v1', meta: { showName: 'Playback show', venue: 'Hall', showDate: '2026-10-05', playbackOp: 'C', tdName: 'D', audioLead: 'E' }, cues: [{ id: 'old-cue', cue: 'V01', file: 'Opening.mov', type: 'video', duration: '01:02:03:04', aspect: '16:9', audio: 'embedded', destination: 'Center screen', status: 'pending', backup: 'Second server', notes: 'check "levels"\n  original', extra: 'retain' }, { cue: 'V02', file: 'Sting.wav', type: 'audio', duration: '2m30s', destination: 'PA', status: 'ready' }] };
const rawCamera = JSON.stringify(camera), rawPlayback = JSON.stringify(playback);
async function importFile(raw, apply) {
  await button('Project').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'sheet.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await page.getByRole('dialog').waitFor(); await button(apply).click();
}
async function download(name) {
  const pending = page.waitForEvent('download'); await button(name).click();
  return readFile(await (await pending).path(), 'utf8');
}
async function pick(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('listbox', { name: label, exact: true }).getByRole('option', { name: option, exact: true }).click();
}
try {
  await page.goto(url); await button('Try a sample plan').click(); await save();
  const original = await saved();
  // Older saved view lists must still offer both new panel types without rewriting on open.
  const old = { ...original, workspace: { version: 1, views: [{ id: 'custom', name: 'Custom', panels: [{ id: 'old-flow', type: 'flow', x: 0, y: 0, w: 12, h: 8 }] }] } };
  delete old.shots; delete old.cues; delete old.modules.cameras; delete old.modules.playback;
  await page.evaluate(({ key, old, camera, playback }) => { localStorage.setItem(key, JSON.stringify(old)); localStorage.setItem('camera-shot-list.v1', camera); localStorage.setItem('playback-check.v1', playback); }, { key, old, camera: rawCamera, playback: rawPlayback });
  await page.reload(); await button('Cameras').click(); await page.getByRole('heading', { name: 'Cameras', exact: true }).waitFor();
  assert.deepEqual(await saved(), old, 'opening older plans never saves defaults');
  await button('Project').click(); await button('Import saved Camera Shot List').click(); await button('Cancel').click();
  assert.deepEqual(await saved(), old);
  await button('Import saved Camera Shot List').click(); await button('Add shots to plan').click();
  assert.equal(await page.getByLabel('Shot Camera', { exact: true }).inputValue(), 'Camera 1');
  await save(); let doc = await saved();
  for (const [field, value] of Object.entries(camera.shots[0])) if (!['id', 'extra'].includes(field)) assert.equal(doc.shots[0][field], value, `camera ${field}`);
  console.log('PASS camera import and legacy workspace reachability');
  assert.equal(doc.imports[0].raw, rawCamera); assert.equal(doc.title, original.title);
  await pick('Cameras linked route', 'CAM 1 → IMAG'); await button('Trace linked route').click();
  assert.equal(await page.locator('.console-panel.is-focused[data-panel=flow]').count(), 1);
  await button('Cameras').click(); await button('Take next').click(); await save();
  assert.equal((await saved()).shots[0].status, 'taken');
  await page.getByRole('button', { name: /Undo/ }).click(); await save(); assert.equal((await saved()).shots[0].status, 'hold');
  await page.getByRole('button', { name: /Redo/ }).click(); await save(); assert.equal((await saved()).shots[0].status, 'taken');
  await button('Duplicate shot').click(); await button('Move shot down').click(); await save();
  assert.equal((await saved()).shots.length, 3); assert.equal((await saved()).shots[1].number, '002');
  await page.getByLabel('Shot notes', { exact: true }).fill('Operator edit\n  exact'); await save();
  const csv = await download('Export shots CSV'); assert.ok(csv.includes('preset') && csv.includes('Operator edit\n  exact'));
  page.once('dialog', dialog => dialog.accept()); await button('Remove shot').click(); await save(); assert.equal((await saved()).shots.length, 2);
  await importFile(rawPlayback, 'Add cues to plan'); await save(); doc = await saved();
  for (const [field, value] of Object.entries(playback.cues[0])) if (!['id', 'extra'].includes(field)) assert.equal(doc.cues[0][field], value, `playback ${field}`);
  console.log('PASS camera actions, order, CSV and playback field parity');
  assert.equal(doc.imports[1].raw, rawPlayback);
  await button('Mark next ready played').click(); await save();
  assert.equal((await saved()).cues[0].status, 'pending'); assert.equal((await saved()).cues[1].status, 'played');
  await page.getByRole('button', { name: /V01.*Opening.mov/ }).click();
  assert.equal(await page.getByLabel('Playback Duration', { exact: true }).inputValue(), '01:02:03:04');
  await page.getByLabel('Playback Duration', { exact: true }).fill('TBD'); await save();
  assert.ok((await download('Export cues CSV')).includes('"TBD"'));
  await page.getByLabel('Playback File', { exact: true }).fill('Unsaved.mov'); await waitDraft();
  await page.reload(); await button('Restore draft').focus(); await page.keyboard.press('Enter'); await button('Playback').click(); await save();
  assert.equal((await saved()).cues[0].file, 'Unsaved.mov');
  assert.equal((await saved()).cues[0].duration, 'TBD');
  // Imports never mutate source stores; duplicates and stale previews never replace newer work.
  await button('Project').click(); await button('Import saved Camera Shot List').click(); await button('Add shots to plan').click();
  assert.match(await page.getByRole('status').textContent(), /already imported/);
  await button('Import saved Playback Check').click(); await page.evaluate(() => localStorage.setItem('playback-check.v1', '{}')); await button('Add cues to plan').click();
  assert.match(await page.getByRole('status').textContent(), /changed after preview/);
  assert.equal(await page.evaluate(() => localStorage.getItem('camera-shot-list.v1')), rawCamera);
  console.log('PASS playback actions, recovery and import guards');
  const beforeHide = await saved();
  await page.getByRole('checkbox', { name: /Cameras/ }).uncheck();
  await page.getByRole('checkbox', { name: /Playback/ }).uncheck(); await save();
  const backup = JSON.parse(await download('Export'));
  assert.deepEqual(backup.shots, beforeHide.shots); assert.deepEqual(backup.cues, beforeHide.cues);
  assert.deepEqual(backup.imports, beforeHide.imports);
  await page.goto(`${url}?view=cameras`); assert.match(await page.getByRole('status').textContent(), /disabled/);
  assert.equal(await page.locator('[data-panel=cameras]').count(), 0);
  await page.getByRole('checkbox', { name: /Cameras/ }).check(); await page.getByRole('checkbox', { name: /Playback/ }).check(); await save();
  for (const theme of ['light', 'dark']) for (const width of [375, 680, 719, 720, 1099, 1100, 1440, 3440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption(theme);
    for (const panel of ['Cameras', 'Playback']) {
      // Tabs remain reachable when the desktop quick toolbar is replaced on phones.
      await page.getByRole('tab', { name: panel, exact: true }).click();
      await page.locator(`[data-panel=${panel.toLowerCase()}]`).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${panel} ${theme} ${width}: page overflow`);
      if (width < 720) for (const control of await page.locator('.console-quick button').all()) {
        await control.scrollIntoViewIfNeeded();
        assert.ok(await control.evaluate(el => el.scrollWidth <= el.clientWidth), 'phone panel label is not clipped');
      }
      const noun = panel === 'Cameras' ? 'shot' : 'cue';
      const back = button(`Back to ${noun}s`); if (await back.isVisible()) await back.click();
      await page.locator(`[data-panel=${panel.toLowerCase()}] .route-card`).first().click();
      const input = page.getByLabel(panel === 'Cameras' ? 'Shot Camera' : 'Playback File', { exact: true });
      await input.focus(); assert.equal(await input.evaluate(el => el === document.activeElement), true);
      const box = await input.boundingBox(); assert.ok(box && box.x >= 0 && box.x + box.width <= width, `${panel} editor containment at ${width}`);
      if (process.env.AV_VIDEO_EVIDENCE_DIR && ((width === 1440 && theme === 'light') || (width === 375 && theme === 'dark'))) {
        await mkdir(process.env.AV_VIDEO_EVIDENCE_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.AV_VIDEO_EVIDENCE_DIR, `${panel}-${theme}-${width}.png`) });
      }
    }
  }
  console.log('PASS hidden modules, keyboard and responsive themes');
  await page.setViewportSize({ width: 1440, height: 900 }); await save();
  const full = await saved(); await importFile(JSON.stringify(full), 'Replace with backup'); await save(); assert.deepEqual(await saved(), full);
  await page.goto(`${BASE}/av-suite.html`);
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Offline registration timed out')), 30000))]));
  await page.goto(url);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await context.setOffline(true); await page.reload(); await button('Playback').click();
  await page.getByRole('button', { name: /V01.*Unsaved.mov/ }).click(); await page.getByLabel('Cue notes', { exact: true }).fill('Offline operator'); await save(); await page.reload();
  assert.equal((await saved()).cues[0].notes, 'Offline operator'); await context.setOffline(false);
  assert.deepEqual(errors, []); console.log('PASS Cameras/Playback: imports, field parity, order/actions, undo, CSV/backup, recovery, modules, keyboard, themes, responsive and offline');
} finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
