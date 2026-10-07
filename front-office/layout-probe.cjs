const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    if (error) return response.writeHead(404).end();
    response.setHeader('Content-Type', file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    response.end(body);
  });
});
function color(value) { const hex = String(value).trim().match(/^#([0-9a-f]{6})$/i); if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)); const rgb = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return rgb ? rgb.slice(1, 4).map(Number) : null; }
function contrast(a, b) { const first = color(a), second = color(b); assert.ok(first && second, `colors ${a} / ${b}`); const lum = channels => channels.map(channel => { const v = channel / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); const l1 = lum(first), l2 = lum(second); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); }
async function checkContrast(page, label) { const colors = await page.evaluate(() => { const style = selector => getComputedStyle(document.querySelector(selector)); return { body: style('body').backgroundColor, text: style('body').color, muted: style('.intro').color, accent: style('.eyebrow').color, button: style('#save').backgroundColor, buttonText: style('#save').color }; }); assert.ok(contrast(colors.body, colors.text) >= 4.5, `${label} body text`); assert.ok(contrast(colors.body, colors.muted) >= 4.5, `${label} muted text`); assert.ok(contrast(colors.body, colors.accent) >= 4.5, `${label} accent text`); assert.ok(contrast(colors.button, colors.buttonText) >= 4.5, `${label} Save control`); }
const boxes = [[1440, 900], [375, 812], [844, 390], [320, 256], [3840, 1080]];
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/front-office/`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  try {
    for (const [width, height] of boxes) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      assert.equal(await page.locator('#boot-status').isHidden(), true);
      assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'light');
      assert.equal(await page.locator('#tab-clients').getAttribute('aria-selected'), 'true');
      const metrics = await page.evaluate(() => {
        const root = document.documentElement, panel = document.querySelector('#panel-clients');
        const panelBox = panel.getBoundingClientRect(), tabs = document.querySelector('.tab-list').getBoundingClientRect();
        return { x: root.scrollWidth - root.clientWidth, y: root.scrollHeight - root.clientHeight, panelTop: panelBox.top, panelBottom: panelBox.bottom, tabsTop: tabs.top, tabsBottom: tabs.bottom, avBg: getComputedStyle(root).getPropertyValue('--av-bg').trim() };
      });
      assert.deepEqual([metrics.x, metrics.y], [0, 0], `${width}×${height} document overflow`);
      assert.equal(metrics.avBg, '#eee8df');
      await checkContrast(page, `${width} light`);
      assert.ok(metrics.panelTop >= 0 && metrics.panelBottom <= height + 1 && metrics.panelBottom > metrics.panelTop, `${width}×${height} panel bounds`);
      assert.ok(metrics.tabsTop >= 0 && metrics.tabsBottom <= height + 1, `${width}×${height} tab bounds`);
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'dark');
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--av-bg').trim()), '#0c1016');
      await checkContrast(page, `${width} dark`);
      if (width === 1440) { await page.reload(); assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'dark', 'saved theme restored'); }
      await page.locator('#tab-clients').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-venues');
      assert.equal(await page.locator('#panel-venues').isVisible(), true);
      assert.deepEqual(errors, []);
      if (width === 1440 || width === 375) {
        await page.locator('#theme-toggle').click(); // System
        await page.locator('#theme-toggle').click(); // Light
        await page.locator('#tab-clients').click();
        await page.screenshot({ path: path.join(__dirname, `layout-${width}-light.png`) });
        await page.locator('#theme-toggle').click();
        await page.screenshot({ path: path.join(__dirname, `layout-${width}-dark.png`) });
      }
      await page.close();
    }
    const compact = await browser.newPage({ viewport: { width: 320, height: 256 } });
    await compact.goto(url);
    await compact.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    const errorBounds = await compact.locator('.tab-list').boundingBox();
    assert.ok(errorBounds.y >= 0 && errorBounds.y + errorBounds.height <= 256, 'error message keeps compact tabs reachable');
    await compact.close();
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.addInitScript(() => {
      const clients = Array.from({ length: 500 }, (_, i) => ({ id: `fixture-${i}`, name: `Client ${i}`, contact: '', notes: '' }));
      localStorage.setItem('sbd.frontOffice.document.v1', JSON.stringify({ version: 1, clients, venues: [], jobs: [] }));
    });
    await page.goto(url);
    await page.locator('#tab-clients').click();
    await page.locator('#panel-clients').focus();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);
    const scrolled = await page.locator('#panel-clients').evaluate(panel => ({ top: panel.scrollTop, max: panel.scrollHeight - panel.clientHeight, root: document.documentElement.scrollHeight - document.documentElement.clientHeight }));
    assert.ok(scrolled.max > 0 && scrolled.top > 0, 'client records scroll within their panel');
    assert.equal(scrolled.root, 0, 'long records never scroll the page');
    await page.close();
    const printable = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await printable.goto(url); await printable.emulateMedia({ media: 'print' });
    assert.equal(await printable.evaluate(() => getComputedStyle(document.body).overflow), 'visible');
    assert.equal(await printable.evaluate(() => getComputedStyle(document.querySelector('#panel-jobs')).display), 'block');
    await printable.close();
    console.log('PASS Front Office light/dark, tabs/focus, bounded panels and long-list scroll at five viewports');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
