import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    let file = resolve(ROOT, '.' + decodeURIComponent(new URL(request.url, 'http://probe').pathname));
    if (!file.startsWith(ROOT + sep)) { response.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const BASE = process.env.AV_VIDEO_BASE || `http://127.0.0.1:${server.address().port}`;
const engine = process.env.SHOW_CONTROL_BROWSER === 'webkit' ? webkit : chromium;
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
let browser;
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

const panelNames = ['On Deck', 'Cues', 'Notes', 'Call Log', 'Setup/Import', 'Backup'];
const button = (frame, name) => frame.getByRole('button', { name, exact: true });
async function reachable(control, label) {
  await control.scrollIntoViewIfNeeded();
  const result = await control.evaluate(element => {
    const r = element.getBoundingClientRect();
    let top = 0, bottom = innerHeight, left = 0, right = innerWidth;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      if (/(hidden|auto|scroll|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (node instanceof HTMLDialogElement && node.matches(':modal')) break;
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { width: r.width, height: r.height, hit: hit === element || element.contains(hit), inside: r.top >= top - 1 && r.bottom <= bottom + 1 && r.left >= left - 1 && r.right <= right + 1 };
  });
  assert.ok(result.width >= 44 && result.height >= 44, `${label}: touch target: ${JSON.stringify(result)}`);
  assert.ok(result.hit && result.inside, `${label}: covered or clipped control: ${JSON.stringify(result)}`);
}
async function quick(frame, name) {
  const control = frame.locator('.console-quick').getByRole('button', { name, exact: true });
  await reachable(control, `Panel switcher ${name}`);
  await control.click();
}
async function showSave(frame, click = false) {
  if (!await frame.locator('#save').isVisible()) {
    await reachable(button(frame, 'Show controls'), 'Show controls');
    await button(frame, 'Show controls').click();
  }
  await reachable(frame.locator('#save'), 'Save run');
  if (click) await frame.locator('#save').click();
  if (await button(frame, 'Back to panels').isVisible()) {
    await reachable(button(frame, 'Back to panels'), 'Back to panels');
    await button(frame, 'Back to panels').click();
  }
}
async function actions(frame, name) {
  await quick(frame, name);
  const launcher = button(frame, name === 'Backup' ? 'Backup controls' : 'Setup and imports');
  if (await launcher.isVisible()) { await reachable(launcher, name); await launcher.click(); }
}
async function contained(page, frame, label) {
  await quick(frame, 'On Deck');
  const layout = await frame.evaluate(() => {
    const box = selector => {
      const element = document.querySelector(selector), rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height, width: rect.width };
    };
    const root = document.documentElement;
    return {
      root: { height: root.scrollHeight <= root.clientHeight, width: root.scrollWidth <= root.clientWidth },
      run: box('.call-app'), grid: box('.console-grid'), primary: box('.console-panel[data-panel="deck"]'),
      details: box('.call-cue-detail'), deck: box('.call-deck'),
      navVisible: document.querySelector('.call-nav').checkVisibility(),
      railVisible: document.querySelector('.sbd-rail-host').checkVisibility(),
    };
  });
  assert.deepEqual(layout.root, { height: true, width: true }, `${label}: embedded page containment`);
  assert.ok(layout.grid.top >= layout.run.top - 1 && layout.grid.bottom <= layout.run.bottom + 1, `${label}: cue grid escapes the Run view: ${JSON.stringify(layout)}`);
  assert.ok(layout.primary.top >= layout.grid.top - 1 && layout.primary.bottom <= layout.grid.bottom + 1, `${label}: cue card escapes its grid`);
  assert.ok(layout.details.top >= layout.deck.top - 1 && layout.details.bottom <= layout.deck.bottom + 1, `${label}: long cue escapes its bounded detail area`);
  assert.equal(layout.navVisible, false, `${label}: embedded navigation must not repeat the host navigation`);
  assert.equal(layout.railVisible, false, `${label}: embedded Rail must not repeat the host Rail`);
  for (const name of ['Log Go →', 'Log Hold', 'Log Resume']) await reachable(button(frame, name), `${label}: ${name}`);
  for (const name of panelNames) {
    await reachable(frame.locator('.console-quick').getByRole('button', { name, exact: true }), `${label}: ${name}`);
  }
  await showSave(frame);
  assert.deepEqual(await page.evaluate(() => ({ height: document.documentElement.scrollHeight <= document.documentElement.clientHeight, width: document.documentElement.scrollWidth <= document.documentElement.clientWidth })), { height: true, width: true }, `${label}: host page containment`);
}

try {
  browser = await engine.launch({ headless: true, ...(engine === chromium ? channel : {}), args: engine === chromium ? ['--no-sandbox'] : [] });
  for (const viewport of cases) {
    console.log(`Checking embedded Show Control: ${viewport.name} ${viewport.width}x${viewport.height}`);
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, acceptDownloads: true, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(({ customized, snapshot, LAYOUT }) => {
      localStorage.setItem('av-theme-mode.v1', 'light');
      localStorage.setItem(LAYOUT, JSON.stringify({ v: 1, viewId: 'suite-show-control', live: customized ? { 'suite-show-control': [snapshot] } : {}, locked: false }));
    }, { customized: viewport.customized, snapshot, LAYOUT });
    await page.goto(`${BASE}/av-video/`);
    const iframe = page.locator('iframe[title="Show Control application"]');
    await iframe.waitFor();
    const frame = await iframe.elementHandle().then(handle => handle.contentFrame());
    await frame.locator('.console-shell').waitFor();
    const videoBefore = await page.evaluate(key => localStorage.getItem(key), VIDEO);
    if (viewport.fullWidth) {
      const widths = await page.evaluate(() => ({ panel: document.querySelector('.console-panel').getBoundingClientRect().width, grid: document.querySelector('.console-grid').clientWidth }));
      assert.ok(widths.panel >= widths.grid - 32, `${viewport.name}: single application wastes half the workspace: ${JSON.stringify(widths)}`);
    }
    await contained(page, frame, `${viewport.name} empty`);
    await actions(frame, 'Setup/Import');
    await reachable(button(frame, 'Review Cue Sheet'), 'Review Cue Sheet');
    await button(frame, 'Review Cue Sheet').click();
    await frame.getByLabel('Cue Sheet JSON', { exact: true }).setInputFiles({ name: 'layout-cues.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await reachable(button(frame, 'Copy selected cues'), 'Copy selected cues');
    await button(frame, 'Copy selected cues').click();
    await contained(page, frame, `${viewport.name} long cue`);
    assert.equal(await frame.locator('.call-cue-detail h2').textContent(), `V1 · ${fixture.rows[0].action}`);
    await button(frame, 'Log Hold').click();
    assert.equal(await button(frame, 'Log Go →').isDisabled(), true);
    await button(frame, 'Log Resume').click();
    await button(frame, 'Log Go →').click();
    await showSave(frame, true);
    const saved = await frame.evaluate(key => localStorage.getItem(key), RUN);
    assert.equal(JSON.parse(saved).current, 1);
    assert.equal(JSON.parse(saved).events.length, 3);
    assert.deepEqual(JSON.parse(saved).cues[0].sourceRow, fixture.rows[0]);
    await actions(frame, 'Backup');
    await reachable(button(frame, 'Export backup'), 'Export backup');
    const download = page.waitForEvent('download');
    await button(frame, 'Export backup').click();
    const backup = await download;
    assert.deepEqual(JSON.parse(await readFile(await backup.path(), 'utf8')), JSON.parse(saved));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), VIDEO), videoBefore, 'Show Control operations must not save the AV Video plan');
    if (await frame.locator('.call-dialog[open]').count()) await button(frame, 'Close dialog').click();
    await page.getByLabel('Theme', { exact: true }).selectOption('dark');
    await frame.waitForFunction(() => document.documentElement.dataset.avTheme === 'dark' && document.querySelector('#theme').textContent === 'Light mode');
    await contained(page, frame, `${viewport.name} dark theme`);
    await page.getByLabel('Theme', { exact: true }).selectOption('light');
    await frame.waitForFunction(() => document.documentElement.dataset.avTheme === 'light' && document.querySelector('#theme').textContent === 'Dark mode');
    await quick(frame, 'Cues');
    const cue = frame.getByRole('button', { name: 'Select cue V1:', exact: false });
    await cue.click();
    await quick(frame, 'Notes');
    await reachable(frame.getByLabel('Operator notes', { exact: true }), 'Operator notes');
    await frame.getByLabel('Operator notes', { exact: true }).fill('Operator note entered from the embedded panel.');
    await quick(frame, 'Call Log');
    assert.equal(await frame.locator('.call-event').count(), 3);
    await contained(page, frame, `${viewport.name} panel selection`);
    if (viewport.customized) {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForFunction(() => document.querySelector('.console-shell').classList.contains('mode-tablet'));
      const widths = await page.evaluate(() => ({ panel: document.querySelector('.console-panel').getBoundingClientRect().width, grid: document.querySelector('.console-grid').clientWidth }));
      assert.ok(widths.panel >= widths.grid - 32, 'customized single tablet panel fills the workspace');
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
  const result = { result: 'pass', observedAt: new Date().toISOString(), base: BASE, browser: browser.version(), channel: engine === chromium ? channel : 'webkit', cases, coverage: 'Native six panels, empty and long cues, touch targets, Hold/Resume/Go, independent Save/Export, source rows, host themes, tablet width and preserved desktop arrangements' };
  if (process.env.SCREENSHOT_DIR) await writeFile(join(process.env.SCREENSHOT_DIR, 'show-control-embed-results.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
