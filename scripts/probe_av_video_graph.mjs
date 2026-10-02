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
async function choosePreset(label, value) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('listbox', { name: label, exact: true }).locator(`[role="option"][data-value="${value}"]`).click();
}
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
  await button('↶ Undo').click(); await save();
  assert.equal((await saved()).graphPositions['device:Camera%201'], undefined, 'one Undo reverses the entire drag');
  await button('↷ Redo').click(); await save();
  assert.deepEqual((await saved()).graphPositions['device:Camera%201'], position);
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
  await choosePreset('Format', '1080p59.94');
  await choosePreset('Connector', '3G SDI');
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
  await button('Edit route').click();
  const source = page.getByLabel('Source', { exact: true });
  const beforeTyping = await source.inputValue();
  await source.fill(''); await source.pressSequentially(`${beforeTyping} renamed`);
  await button('↶ Undo').click(); assert.equal(await source.inputValue(), beforeTyping);
  await button('↷ Redo').click(); assert.equal(await source.inputValue(), `${beforeTyping} renamed`);
  await button('↶ Undo').click();
  const format = page.getByRole('combobox', { name: 'Format', exact: true });
  const connector = page.getByRole('combobox', { name: 'Connector', exact: true });
  assert.equal(await format.evaluate(el => el.tagName), 'BUTTON');
  assert.equal(await connector.evaluate(el => el.tagName), 'BUTTON');
  await choosePreset('Format', '1080p60');
  await button('↶ Undo').click(); assert.equal(await format.getAttribute('data-value'), '1080p59.94');
  await button('↷ Redo').click(); assert.equal(await format.getAttribute('data-value'), '1080p60');
  await choosePreset('Connector', 'HDMI');
  await button('↶ Undo').click(); assert.equal(await connector.getAttribute('data-value'), '3G SDI');
  // Keyboard navigation changes the model only when confirmed, and Escape cancels.
  await format.focus(); await format.press('ArrowDown'); await format.press('Home');
  await format.press('ArrowDown'); await format.press('Escape');
  assert.equal(await format.getAttribute('data-value'), '1080p60');
  assert.equal(await page.getByRole('listbox').count(), 0);
  await format.press('Enter'); await format.press('Home'); await format.press('ArrowDown'); await format.press('Enter');
  assert.equal(await format.getAttribute('data-value'), '720p50');
  await button('↶ Undo').click();
  await connector.focus(); await connector.press('h'); await connector.press('d'); await connector.press('m'); await connector.press('Enter');
  assert.equal(await connector.getAttribute('data-value'), 'HDMI');
  await button('↶ Undo').click();
  await choosePreset('Format', 'custom');
  await page.getByLabel('Custom width', { exact: true }).fill('3840');
  await page.getByLabel('Custom height', { exact: true }).fill('1080');
  await page.getByLabel('Custom frame rate', { exact: true }).fill('59.94');
  await button('Apply custom format').click(); await save();
  assert.equal((await saved()).routes[0].format, '3840x1080p59.94');
  const ledRaw = JSON.stringify({ ledMode: 'layout', ledCabinetPixelsWide: 256, ledCabinetPixelsHigh: 128, ledCabinetRotation: '0', ledCabinetsWide: 12, ledCabinetsHigh: 4, ledRefreshHz: 59.94, ledProductName: 'Test LED wall' });
  await page.evaluate(raw => localStorage.setItem('avCalculator.v1', raw), ledRaw);
  await button('Use saved LED wall').click(); await save();
  assert.equal((await saved()).routes[0].format, '3072x512p59.94');
  assert.equal(await page.evaluate(() => localStorage.getItem('avCalculator.v1')), ledRaw);
  await button('↶ Undo').focus();
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+z`); await save();
  assert.equal((await saved()).routes[0].format, '3840x1080p59.94');
  await page.keyboard.press(`${modifier}+Shift+z`); await save();
  assert.equal((await saved()).routes[0].format, '3072x512p59.94');
  page.once('dialog', dialog => dialog.accept()); await button('Remove route').click(); await save();
  assert.equal((await saved()).routes.length, 5);
  await button('↶ Undo').click(); await save(); assert.equal((await saved()).routes.length, 6);
  await button('Back to diagram').click();
  const shots = process.env.AV_VIDEO_SCREENSHOTS || '/tmp/av-video-graph-proof'; await mkdir(shots, { recursive: true });
  for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [3440, 1440]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Theme', { exact: true }).selectOption(theme);
      await button('Fit View').click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      if (width === 1440 || width === 375) await page.screenshot({ path: `${shots}/${width}-${theme}.png` });
      await button('Edit route').click();
      for (const label of ['Format', 'Connector']) {
        const field = page.getByRole('combobox', { name: label, exact: true });
        await field.click();
        const menu = page.getByRole('listbox', { name: label, exact: true });
        await field.evaluate(el => el.closest('.editor-scroll').dispatchEvent(new Event('scroll')));
        assert.equal(await menu.isVisible(), true, 'a queued inspector scroll must not dismiss the menu');
        const bounds = await menu.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height,
          `${label} popup must remain inside ${width}x${height}: ${JSON.stringify(bounds)}`);
        assert.equal(await menu.evaluate(el => el.parentElement === document.body), true, 'menu is drawn inside the page');
        const selected = menu.locator('[aria-selected="true"]');
        const selectedBox = await selected.boundingBox();
        assert.ok(selectedBox.y >= bounds.y && selectedBox.y + selectedBox.height <= bounds.y + bounds.height, 'selected option starts visible');
        if (width === 375 && theme === 'light' && label === 'Format') await page.screenshot({ path: `${shots}/anchored-format-phone.png` });
        await field.press('Escape');
        assert.equal(await menu.count(), 0);
        assert.equal(await field.evaluate(el => el === document.activeElement), true);
      }
      await button('Back to diagram').click();
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await button('Fit View').click();
  const zoomBefore = await page.locator('.react-flow__viewport').getAttribute('style');
  await button('Zoom In').click();
  assert.notEqual(await page.locator('.react-flow__viewport').getAttribute('style'), zoomBefore);
  await button('Toggle overview').click(); assert.ok(await page.locator('.react-flow__minimap').isVisible());
  assert.deepEqual(errors, []);
  console.log(`AV Video graph browser passed: shared devices, trace, drag/save/reload, shared rename, keyboard connection, port dragging, patch parity, SVG export, format/connector presets, custom LED raster, undo/redo, zoom, overview and responsive themes (${BASE}).`);
} finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
