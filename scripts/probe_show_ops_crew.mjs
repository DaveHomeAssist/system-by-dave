import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const source = {
  schema: 'system-by-dave.crew-call.v1', exportedAt: '2026-10-09T04:00:00Z',
  meta: { showName: 'Crew Import Test', client: 'Synthetic client', venue: 'Test hall', showDate: '2026-10-09', advanceLead: 'PM', loadIn: '07:00', handoffTo: 'Caller' },
  items: [
    { id: 'crew-a', section: 'audio', name: 'A1', role: 'Audio Lead', call: '07:30', location: 'FOH', meal: '12:30', release: '18:00', phone: '555-0101', status: 'on-site', notes: 'Synthetic record' },
    { id: 'crew-b', section: 'stage', name: 'Stagehand', role: 'Labor', call: '08:00', location: 'Dock', meal: '13:00', release: '17:00', phone: '555-0102', status: 'problem', notes: 'Needs access' },
    { id: 'crew-c', section: 'video', name: 'V1', role: 'Video Lead', call: '07:00', location: 'Video world', meal: '12:00', release: '18:30', phone: '555-0103', status: 'wrapped', notes: 'Released' }
  ]
};
const raw = JSON.stringify(source);
const sourceKey = 'crew-call.v1';
const targetKey = 'sbd.showOps.document.v1';
const captureDir = process.env.SHOW_OPS_CAPTURE_DIR;

const server = createServer(async (request, response) => {
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://probe').pathname).replace(/^\/+/, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    if (relative.split('/').includes('..')) throw new Error('Invalid path');
    const path = resolve(root, relative);
    if (!path.startsWith(`${root}${sep}`) || !(await stat(path)).isFile()) throw new Error('Invalid file');
    response.writeHead(200, { 'content-type': `${mime[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'cache-control': 'no-store' });
    response.end(await readFile(path));
  } catch { response.writeHead(404, { 'content-type': 'text/plain' }); response.end('not found'); }
});
await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
const base = `http://127.0.0.1:${server.address().port}`;
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
let browser;
const errors = [];
const open = async (viewport, savedSource = raw) => {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/show-ops/`, { waitUntil: 'domcontentloaded' });
  if (savedSource) await page.evaluate(([key, value]) => localStorage.setItem(key, value), [sourceKey, savedSource]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  return { context, page };
};
const backup = page => page.locator('[data-tab="backup"]').click();
const storage = page => page.evaluate(key => localStorage.getItem(key), targetKey);
const assertFit = async page => {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth <= document.documentElement.clientWidth, height: document.documentElement.scrollHeight <= document.documentElement.clientHeight }));
  assert.deepEqual(dimensions, { width: true, height: true });
};

try {
  browser = await chromium.launch({ headless: true, ...channel, args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
  for (const viewport of [{ width: 375, height: 812 }, { width: 680, height: 800 }, { width: 844, height: 390 }, { width: 320, height: 256 }, { width: 1440, height: 900 }, { width: 3840, height: 1080 }]) {
    const { context, page } = await open(viewport);
    await backup(page);
    await page.locator('#crew-saved').click();
    assert.match(await page.locator('#crew-preview').innerText(), /1 wrapped excluded/);
    assert.equal(await page.locator('input[name="crew-call-row"]').count(), 2);
    assert.match(await page.locator('#crew-preview').innerText(), /555-0101/);
    await assertFit(page);
    if (captureDir && [375, 1440, 3840].includes(viewport.width)) {
      await mkdir(captureDir, { recursive: true });
      await page.screenshot({ path: join(captureDir, `crew-preview-${viewport.width}x${viewport.height}.png`) });
    }
    await page.locator('#cancel-crew').click();
    assert.equal(await storage(page), null);
    await page.locator('#crew-saved').click();
    await page.locator('input[name="crew-call-row"][value="crew-b"]').uncheck();
    await page.locator('#confirm-crew').click();
    assert.equal(await page.locator('#dirty').innerText(), 'Unsaved edits');
    assert.equal(await storage(page), null);
    assert.equal(await page.locator('.record').count(), 1);
    assert.equal(await page.locator('.record select[data-field="status"]').inputValue(), 'Called');
    assert.match(await page.locator('.source-fields').innerText(), /Original Crew Call: on-site/);
    await page.locator('#save').click();
    const saved = JSON.parse(await storage(page));
    assert.equal(saved.crewCallSources[0].raw, raw);
    assert.equal(saved.crew[0].crewSource.snapshot.phone, '555-0101');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="crew"]').click();
    assert.equal(await page.locator('.record').count(), 1);
    await backup(page);
    await page.locator('#crew-saved').click();
    assert.equal(await page.locator('input[name="crew-call-row"]').count(), 1);
    await page.locator('#cancel-crew').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(exported.crewCallSources[0].raw, raw);
    await assertFit(page);
    await page.locator('#theme').click();
    const firstTheme = await page.locator('html').getAttribute('data-av-theme');
    await assertFit(page);
    await page.locator('#theme').click();
    const secondTheme = await page.locator('html').getAttribute('data-av-theme');
    assert.deepEqual([firstTheme, secondTheme].sort(), ['dark', 'light']);
    await assertFit(page);
    await context.close();
    console.log(`PASS saved/cancel/select/save/reload/export/theme/viewport ${viewport.width}x${viewport.height}`);
  }
  {
    const { context, page } = await open({ width: 375, height: 812 });
    await backup(page);
    await page.locator('#crew-saved').click();
    assert.equal(await page.locator('input[name="crew-call-row"]').count(), 2);
    await page.evaluate(key => localStorage.setItem(key, 'changed after preview'), sourceKey);
    await page.locator('#confirm-crew').click();
    assert.match(await page.locator('#notice').innerText(), /changed after preview/);
    assert.equal(await storage(page), null);
    await page.locator('#crew-file').setInputFiles({ name: 'crew-call.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    await page.locator('#confirm-crew').click();
    assert.equal(await page.locator('.record').count(), 2);
    assert.equal(await storage(page), null);
    await page.locator('#save').click();
    const saved = await storage(page);
    await context.close();
    const restored = await open({ width: 375, height: 812 }, null);
    await backup(restored.page);
    await restored.page.locator('#import').setInputFiles({ name: 'show-ops.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
    await restored.page.locator('#confirm-import').click();
    assert.equal(await restored.page.locator('#dirty').innerText(), 'Unsaved edits');
    await restored.page.locator('#save').click();
    assert.equal(JSON.parse(await storage(restored.page)).crewCallSources[0].raw, raw);
    await restored.context.close();
    console.log('PASS file preview/confirm/backup restore');
  }
  {
    const { context, page } = await open({ width: 375, height: 812 });
    await backup(page);
    await page.locator('#crew-saved').click();
    await page.evaluate(key => localStorage.setItem(key, '{}'), targetKey);
    await page.locator('#confirm-crew').click();
    assert.match(await page.locator('#notice').innerText(), /changed after preview/);
    assert.equal(await storage(page), '{}');
    await context.close();
    console.log('PASS stale target guard');
  }
  {
    const { context, page } = await open({ width: 375, height: 812 }, null);
    const invalid = structuredClone(source); invalid.items[0].status = 'unknown';
    await backup(page);
    await page.locator('#crew-file').setInputFiles({ name: 'bad-crew-call.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
    assert.match(await page.locator('#notice').innerText(), /invalid, unsupported or duplicate/);
    assert.equal(await page.locator('#crew-preview input').count(), 0);
    assert.equal(await storage(page), null);
    await context.close();
    console.log('PASS rejected file leaves target untouched');
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
