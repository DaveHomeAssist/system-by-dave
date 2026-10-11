import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  let file = join(ROOT, decodeURIComponent(new URL(request.url, 'http://probe').pathname));
  if (!file.startsWith(`${ROOT}/`)) { response.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const BASE = process.env.AV_VIDEO_BASE || `http://127.0.0.1:${server.address().port}`;
const engine = process.env.SHOW_CONTROL_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ headless: true, ...(process.env.CHROME_PATH && engine === chromium ? { executablePath: process.env.CHROME_PATH } : {}), args: engine === chromium ? ['--no-sandbox'] : [] });
const LAYOUT = 'sbd.avVideo.layout.v1', VIDEO = 'sbd.avVideo.v1', RUN = 'sbd.showControl.v1';
const snapshot = { id: 'suite-show-control-app', type: 'suite-show-control', x: 0, y: 0, w: 6, h: 8 };
const fixture = { title: 'Video calling desk layout check', rows: [
  { id: 'v1', number: 'V1', action: 'Roll the opening video and verify the confidence feed. '.repeat(8), owner: 'Video', notes: 'A long operator note remains readable inside the cue area. '.repeat(8) },
  { id: 'v2', number: 'V2', action: 'Camera one to program', owner: 'Video' },
] };
const cases = [
  { width: 1280, height: 720, name: 'resized-desktop', customized: true },
  { width: 1024, height: 768, name: 'tablet', fullWidth: true },
  { width: 680, height: 812, name: 'breakpoint', fullWidth: true },
  { width: 375, height: 812, name: 'phone', fullWidth: true },
  { width: 1440, height: 900, name: 'desktop' },
  { width: 3840, height: 1080, name: 'ultrawide' },
];

async function contained(page, frame, label) {
  const layout = await frame.evaluate(() => {
    const box = selector => {
      const element = document.querySelector(selector), rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height, width: rect.width };
    };
    const root = document.documentElement;
    return { root: { height: root.scrollHeight <= root.clientHeight, width: root.scrollWidth <= root.clientWidth }, run: box('#run'), grid: box('#run .grid'), primary: box('.primary'), tabs: box('.tabs'), headerVisible: document.querySelector('.shell > header').checkVisibility() };
  });
  assert.deepEqual(layout.root, { height: true, width: true }, `${label}: embedded page containment`);
  assert.ok(layout.grid.top >= layout.run.top - 1 && layout.grid.bottom <= layout.run.bottom + 1, `${label}: cue grid escapes the Run view: ${JSON.stringify(layout)}`);
  assert.ok(layout.primary.top >= layout.grid.top - 1 && layout.primary.bottom <= layout.grid.bottom + 1, `${label}: cue card escapes its grid`);
  assert.equal(layout.headerVisible, false, `${label}: embedded navigation must not repeat the host navigation`);
  for (const selector of ['#save', '#export', '#go', '#hold', '#resume', '[data-tab="run"]', '[data-tab="setup"]', '[data-tab="log"]']) {
    const control = frame.locator(selector);
    await control.scrollIntoViewIfNeeded();
    const result = await control.evaluate(element => {
      const r = element.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { width: r.width, height: r.height, hit: !!hit && (hit === element || element.contains(hit)), bottom: r.bottom, viewport: innerHeight };
    });
    assert.ok(result.width >= 44 && result.height >= 44, `${label}: touch target ${selector}: ${JSON.stringify(result)}`);
    assert.ok(result.hit && result.bottom <= result.viewport + 1, `${label}: covered or clipped control ${selector}: ${JSON.stringify(result)}`);
  }
  assert.deepEqual(await page.evaluate(() => ({ height: document.documentElement.scrollHeight <= document.documentElement.clientHeight, width: document.documentElement.scrollWidth <= document.documentElement.clientWidth })), { height: true, width: true }, `${label}: host page containment`);
}

try {
  for (const viewport of cases) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, acceptDownloads: true, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(({ customized, snapshot, LAYOUT }) => {
      localStorage.setItem('av-theme-mode.v1', 'light');
      localStorage.setItem(LAYOUT, JSON.stringify({ v: 1, viewId: 'suite-show-control', live: customized ? { 'suite-show-control': [snapshot] } : {}, locked: false }));
    }, { customized: viewport.customized, snapshot, LAYOUT });
    await page.goto(`${BASE}/av-video/`);
    const iframe = page.locator('iframe[title="Show Control application"]');
    await iframe.waitFor();
    const frame = await iframe.elementHandle().then(handle => handle.contentFrame());
    await frame.locator('main[aria-busy="false"]').waitFor();
    const videoBefore = await page.evaluate(key => localStorage.getItem(key), VIDEO);
    if (viewport.fullWidth) {
      const widths = await page.evaluate(() => ({ panel: document.querySelector('.console-panel').getBoundingClientRect().width, grid: document.querySelector('.console-grid').clientWidth }));
      assert.ok(widths.panel >= widths.grid - 32, `${viewport.name}: single application wastes half the workspace: ${JSON.stringify(widths)}`);
    }
    await contained(page, frame, `${viewport.name} empty`);
    await frame.getByRole('tab', { name: 'Setup', exact: true }).click();
    await frame.locator('#cue-file').setInputFiles({ name: 'layout-cues.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await frame.getByRole('button', { name: 'Copy imported cues', exact: true }).click();
    await frame.getByRole('tab', { name: 'Run', exact: true }).click();
    await contained(page, frame, `${viewport.name} long cue`);
    await frame.locator('#hold').click();
    assert.equal(await frame.locator('#go').isDisabled(), true);
    await frame.locator('#resume').click();
    await frame.locator('#go').click();
    await frame.locator('#save').click();
    const saved = await frame.evaluate(key => localStorage.getItem(key), RUN);
    assert.equal(JSON.parse(saved).current, 1);
    assert.equal(JSON.parse(saved).events.length, 3);
    const download = page.waitForEvent('download');
    await frame.locator('#export').click();
    const backup = await download;
    assert.deepEqual(JSON.parse(await readFile(await backup.path(), 'utf8')), JSON.parse(saved));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), VIDEO), videoBefore, 'Show Control operations must not save the AV Video plan');
    await page.getByLabel('Theme', { exact: true }).selectOption('dark');
    await frame.waitForFunction(() => document.documentElement.dataset.avTheme === 'dark');
    await contained(page, frame, `${viewport.name} dark theme`);
    await page.getByLabel('Theme', { exact: true }).selectOption('light');
    await frame.waitForFunction(() => document.documentElement.dataset.avTheme === 'light');
    if (await frame.locator('.phone-panels').isVisible()) {
      await frame.locator('[data-phone="cues"]').click();
      await frame.getByRole('button', { name: 'Select cue V1:', exact: false }).click();
      await frame.locator('[data-phone="notes"]').click();
      await frame.locator('#notes').fill('Operator note entered from the embedded panel.');
      await frame.locator('[data-phone="on-deck"]').click();
      await contained(page, frame, `${viewport.name} panel selection`);
    }
    if (viewport.customized) {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForFunction(() => document.querySelector('.console-shell').classList.contains('mode-tablet'));
      await contained(page, frame, 'customized panel on tablet');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForFunction(() => document.querySelector('.console-shell').classList.contains('mode-desktop'));
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).live['suite-show-control'][0], LAYOUT), snapshot, 'responsive presentation must preserve the desktop arrangement');
    }
    if (process.env.SCREENSHOT_DIR) {
      await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `show-control-embed-${viewport.name}.png`) });
    }
    assert.deepEqual(errors, [], `${viewport.name}: browser errors`);
    await context.close();
  }
  console.log('Show Control embedded layout passed: empty and long cues, six viewport sizes, resized desktop, tablet width, touch targets, Hold/Resume/Go, independent Save/Export and preserved arrangements.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
