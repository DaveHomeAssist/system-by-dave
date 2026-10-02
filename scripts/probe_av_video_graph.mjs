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

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const button = name => page.getByRole('button', { name, exact: true });
const node = label => page.locator('.react-flow__node').filter({ has: page.locator('.device-title strong', { hasText: label }) });
const save = () => page.getByRole('button', { name: /^Save/ }).click();
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('sbd.avVideo.v1')));
async function add(label, role) {
  await button('Add device').click();
  const dialog = page.getByRole('dialog', { name: 'Add device' });
  await dialog.getByLabel('Device name').fill(label);
  await dialog.getByLabel('Device role').selectOption(role);
  await dialog.getByRole('button', { name: 'Add to diagram', exact: true }).click();
  await node(label).waitFor(); await button('Fit View').click();
}
try {
  await page.goto(`${BASE}/av-video/`);
  await button('Try a sample plan').click();
  await page.locator('.react-flow__node').first().waitFor(); await button('Fit View').click();
  assert.equal(await node('Production switcher').count(), 1);
  assert.equal(await page.locator('.react-flow__node').count(), 8);
  assert.equal(await page.locator('.react-flow__edge').count(), 7);
  await page.getByLabel('Select route to trace').selectOption({ label: 'SLIDES → Screen' });
  assert.equal(await page.locator('.wire-traced').count(), 3);
  assert.equal(await page.locator('.wire-dimmed').count(), 4);
  await button('Trace path').click();
  const camera = node('Camera 1').locator('.device-title');
  const box = await camera.boundingBox();
  await page.mouse.move(box.x + 80, box.y + 15); await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 50, { steps: 12 }); await page.mouse.up();
  await save();
  const position = (await saved()).graphPositions['device:Camera%201'];
  assert.ok(position.x > 50, 'dragging must persist a new device position');
  await page.reload(); await node('Production switcher').locator('.device-title').dblclick();
  const rename = page.getByRole('dialog', { name: 'Rename shared device' });
  await rename.getByLabel('Device name').fill('Main switcher');
  await rename.getByRole('button', { name: 'Rename device', exact: true }).click();
  await save();
  assert.equal(await node('Main switcher').count(), 1);
  assert.equal(await node('Production switcher').count(), 0);
  assert.deepEqual((await saved()).graphPositions['device:Camera%201'], position);
  assert.ok((await saved()).routes.slice(0, 2).every(r => r.processor === 'Main switcher'));
  assert.ok((await saved()).routes.slice(2).every(r => r.source === 'Main switcher'));
  await add('Camera 2', 'source');
  await node('Camera 2').locator('.device-title').click();
  await page.getByLabel('Connect to device').selectOption({ label: 'Main switcher' });
  await button('Connect').click();
  assert.equal(await page.getByLabel('Source', { exact: true }).inputValue(), 'Camera 2');
  assert.equal(await page.getByLabel('Destination', { exact: true }).inputValue(), 'Main switcher');
  await page.getByLabel('Switcher / device input').fill('Switcher input 2');
  await page.getByLabel('Format', { exact: true }).fill('1080p59.94');
  await page.getByLabel('Connector', { exact: true }).fill('3G SDI');
  await button('Patch').click();
  assert.equal(await page.locator('.route-card').count(), 5);
  assert.equal(await page.getByLabel('Switcher / device input').inputValue(), 'Switcher input 2');
  await button('Signal flow').click();
  await add('Preview monitor', 'destination');
  const from = node('Main switcher').locator('.react-flow__handle.source[data-handleid="new-out"]');
  const to = node('Preview monitor').locator('.react-flow__handle.target[data-handleid="new-in"]');
  await from.hover(); await page.mouse.down();
  await to.hover(); await page.mouse.up();
  await page.getByLabel('Source', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Source', { exact: true }).inputValue(), 'Main switcher');
  assert.equal(await page.getByLabel('Destination', { exact: true }).inputValue(), 'Preview monitor');
  await page.getByLabel('Source output', { exact: true }).fill('Aux 1');
  await page.getByLabel('Switcher / device input').fill('HDMI 1');
  await save(); assert.equal((await saved()).routes.length, 6);
  await button('Back to diagram').click();
  const download = page.waitForEvent('download'); await button('Export diagram').click();
  const svg = await readFile(await (await download).path(), 'utf8');
  assert.ok(svg.includes('<svg')); assert.ok(svg.includes('Preview monitor')); assert.ok(svg.includes('Main switcher'));
  await page.reload(); await node('Camera 2').waitFor();
  assert.equal((await saved()).routes.length, 6);
  assert.deepEqual((await saved()).graphPositions['device:Camera%201'], position);
  const shots = process.env.AV_VIDEO_SCREENSHOTS || '/tmp/av-video-graph-proof'; await mkdir(shots, { recursive: true });
  for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [3440, 1440]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Theme', { exact: true }).selectOption(theme);
      await button('Fit View').click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      if (width === 1440 || width === 375) await page.screenshot({ path: `${shots}/${width}-${theme}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await button('Fit View').click();
  const zoomBefore = await page.locator('.react-flow__viewport').getAttribute('style');
  await button('Zoom In').click();
  assert.notEqual(await page.locator('.react-flow__viewport').getAttribute('style'), zoomBefore);
  await button('Toggle overview').click(); assert.ok(await page.locator('.react-flow__minimap').isVisible());
  assert.deepEqual(errors, []);
  console.log(`AV Video graph browser passed: shared devices, trace, drag/save/reload, shared rename, keyboard connection, port dragging, patch parity, SVG export, zoom, overview and responsive themes (${BASE}).`);
} finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
