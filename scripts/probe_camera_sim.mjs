#!/usr/bin/env node
// Browser acceptance probe for the FMP Camera Simulator (docs/fmp-camera-simulator.md).
// Serves the repository, drives camera-sim/ in Chromium with Playwright and checks the
// release gates: one camera state for monitor/model/cone, stop/interrupt/limit/focus-loss
// behaviour, preset tolerances, keyboard/mouse/touch operation, exercises, venue changes,
// export/import, storage and WebGL failure, the offline file, layouts and theme.
//
// Usage: node scripts/probe_camera_sim.mjs [--no-sandbox]   (CHROME_CHANNEL=chrome to use Chrome)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const results = [];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
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
const BASE = `http://127.0.0.1:${server.address().port}`;
const PAGE = `${BASE}/camera-sim/?diagnostics=1`;

const baseArgs = ['--ignore-gpu-blocklist', ...(args.includes('--no-sandbox') ? ['--no-sandbox'] : [])];
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...baseArgs] });

function record(ok, name, detail = '') {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'ok' : 'not ok'} - ${name}${detail ? `: ${detail}` : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(true, name, typeof detail === 'string' ? detail : '');
  } catch (error) {
    record(false, name, error instanceof Error ? error.message : String(error));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function open(options = {}) {
  const context = await (options.browser || browser).newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...options.context });
  // First-run tip blocks pointer events until dismissed; seed done unless a test opts in.
  if (!options.keepOnboarding) {
    await context.addInitScript(() => {
      try { localStorage.setItem('fmpCameraSim.onboarding.v1', 'done'); } catch {}
    });
  }
  if (options.init) await context.addInitScript(options.init);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  await page.goto(options.url || PAGE);
  await page.waitForFunction(() => window.__fmpCameraSim && window.__fmpCameraSim.state().renderStatus !== 'starting', null, { timeout: 30000 });
  // New software-rendered contexts compile the instanced seating shaders; motion deadlines stay unchanged.
  await page.waitForTimeout(options.settle ?? 600);
  return { context, page, problems };
}

const sim = (page) => ({
  snapshot: () => page.evaluate(() => window.__fmpCameraSim.snapshot()),
  state: () => page.evaluate(() => window.__fmpCameraSim.state()),
  frame: () => page.evaluate(() => window.__fmpCameraSim.frame()),
  render: () => page.evaluate(() => window.__fmpCameraSim.render()),
});

async function waitStill(page, timeout = 15000) {
  await page.waitForFunction(() => {
    const s = window.__fmpCameraSim.snapshot();
    return !s.moving && !s.recall;
  }, null, { timeout, polling: 50 });
}

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

async function focusWorkspace(page) {
  // If the first-run tip is still open (e.g. offline file without init seed), dismiss it.
  const tip = page.locator('dialog.onboarding-dialog[open]');
  if (await tip.count()) {
    await tip.getByRole('button', { name: 'Skip' }).click();
    await tip.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  // Clicking the monitor heading gives the page focus without activating a control.
  await page.locator('#monitor-title').click();
}

async function monitorPixels(page) {
  return page.evaluate(
    () =>
      new Promise((done) => {
        requestAnimationFrame(() => {
          const source = document.querySelector('[data-testid="monitor-canvas"]');
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 36;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(source, 0, 0, 64, 36);
          const data = ctx.getImageData(0, 0, 64, 36).data;
          let sum = 0;
          let sumSquares = 0;
          const n = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            sum += y;
            sumSquares += y * y;
          }
          const mean = sum / n;
          done({ mean, variance: sumSquares / n - mean * mean });
        });
      }),
  );
}

/** Whether the page drew with its own DM Sans face (not a locally installed copy or a fallback). */
async function dmSansLoaded(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((face) => face.family.replace(/["']/g, '') === 'DM Sans' && face.status === 'loaded');
  });
}

/** A vertical scroll container on the breadcrumb draws a scrollbar wherever scrollbars always show. */
async function breadcrumbScrollsVertically(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.sbd-site-return');
    return ['auto', 'scroll'].includes(getComputedStyle(nav).overflowY) && nav.scrollHeight > nav.clientHeight;
  });
}

/** Shows a side-panel tab, opening the panel only if it is closed (the Settings button toggles). */
async function showTab(page, name) {
  const tab = page.getByRole('tab', { name, exact: true });
  if (!(await tab.isVisible())) await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await tab.click();
}

async function exportProject(page) {
  await showTab(page, 'Session');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export session (.json)' }).click()]);
  const path = await download.path();
  return JSON.parse(await readFile(path, 'utf8'));
}

async function importProject(page, project, name = 'probe-session.json') {
  await showTab(page, 'Session');
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
}

async function closePanel(page) {
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible()) await close.click();
}

// ------------------------------------------------------------------------------------------
// 0. First-run tip
// ------------------------------------------------------------------------------------------
{
  const { context, page } = await open({ keepOnboarding: true });
  await check('first-run tip opens and Skip dismisses it', async () => {
    const tip = page.locator('dialog.onboarding-dialog[open]');
    await tip.waitFor({ state: 'visible', timeout: 10000 });
    assert((await tip.getByRole('heading', { level: 2 }).textContent() || '').includes('Quick start'), 'tip title');
    await tip.getByRole('button', { name: 'Skip' }).click();
    await tip.waitFor({ state: 'hidden', timeout: 5000 });
    assert((await page.evaluate(() => localStorage.getItem('fmpCameraSim.onboarding.v1'))) === 'done', 'tip not persisted');
  });
  await context.close();
}

// ------------------------------------------------------------------------------------------
// 1. Load, render and one shared camera state
// ------------------------------------------------------------------------------------------
{
  const { context, page, problems } = await open();
  const s = sim(page);
  await check('page loads with its metadata and no script errors', async () => {
    assert((await page.title()) === 'Camera Simulator | FMP Video Operations', `title ${await page.title()}`);
    assert((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'robots meta is not noindex');
    assert((await page.locator('link[rel="canonical"]').getAttribute('href')) === 'https://housevideo.app/camera-sim/', 'canonical');
    assert((await page.locator('h1').count()) === 1, 'expected exactly one h1');
    assert(problems.length === 0, problems.join(' | '));
  });
  await check('the FMP suite face (DM Sans) loads from the page itself, and the breadcrumb never scrolls vertically', async () => {
    assert(await dmSansLoaded(page), 'DM Sans did not load; the page is drawn in a fallback face');
    assert(!(await breadcrumbScrollsVertically(page)), 'the breadcrumb is a vertical scroll container with overflow (stray scrollbar)');
    const theme = await page.locator('meta[name="theme-color"]').getAttribute('content');
    assert(theme === '#eee8df', `light visit theme-color ${theme}`);
  });
  await check('first Tab reaches the skip link, which targets the workspace', async () => {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => ({ cls: document.activeElement?.className, href: document.activeElement?.getAttribute('href') }));
    assert(active.cls === 'sbd-skip-link' && active.href === '#sim-workspace', JSON.stringify(active));
    await page.keyboard.press('Enter');
    assert((await page.evaluate(() => document.activeElement?.id)) === 'sim-workspace', 'skip link did not move focus to the workspace');
  });
  await check('first light visit and the theme toggle', async () => {
    assert((await page.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'first visit is not light');
    await page.getByRole('button', { name: 'Dark mode' }).click();
    assert((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'toggle did not switch to dark');
    assert((await page.evaluate(() => localStorage.getItem('fmpTheme'))) === 'dark', 'fmpTheme not saved');
    await page.getByRole('button', { name: 'Dark mode' }).click();
  });
  await check('the monitor draws a live picture', async () => {
    assert((await s.state()).renderStatus === 'ok', 'renderStatus is not ok');
    const pixels = await monitorPixels(page);
    assert(pixels.variance > 20, `monitor looks uniform (variance ${pixels.variance.toFixed(1)})`);
    const before = (await s.render()).monitorFrames;
    await sleep(500);
    assert((await s.render()).monitorFrames > before, 'monitor frames are not advancing');
    return `luma mean ${pixels.mean.toFixed(0)}, variance ${pixels.variance.toFixed(0)}`;
  });
  await check('one camera state drives the monitor, the P240 model and the cone', async () => {
    await focusWorkspace(page);
    await page.keyboard.down('Shift');
    await hold(page, 'ArrowRight', 400);
    await hold(page, 'ArrowDown', 400);
    await page.keyboard.up('Shift');
    await waitStill(page);
    // Compare against a frame drawn after the camera settled, however slowly this renderer runs.
    const settledAt = (await s.render()).monitorFrames;
    await page.waitForFunction((n) => window.__fmpCameraSim.render().monitorFrames >= n + 2, settledAt, { timeout: 15000 });
    const frame = await s.frame();
    const render = await s.render();
    const forward = [frame.forward.x, frame.forward.y, frame.forward.z];
    for (const [label, vector] of [['monitor', render.monitorForward], ['model', render.modelForward], ['cone', render.coneAxis]]) {
      vector.forEach((v, i) => assert(near(v, forward[i], 1e-4), `${label} axis ${i} ${v} vs ${forward[i]}`));
    }
    render.coneApex.forEach((v, i) => assert(near(v, [frame.position.x, frame.position.y, frame.position.z][i], 1e-3), 'cone apex is not the lens'));
    render.modelPosition.forEach((v, i) => assert(near(v, render.monitorPosition[i], 1e-6), 'model is not at the lens'));
    const pose = (await s.snapshot()).pose;
    return `pan ${pose.pan.toFixed(2)}°, tilt ${pose.tilt.toFixed(2)}°`;
  });
  await context.close();
}

// ------------------------------------------------------------------------------------------
// 2. Keyboard operation: continuous motion, stop, presets, interruption, limits, speed, home
// ------------------------------------------------------------------------------------------
{
  const { context, page } = await open();
  const s = sim(page);
  await focusWorkspace(page);
  await check('keyboard: a held key keeps moving and release stops within the stopping time', async () => {
    const start = (await s.snapshot()).pose.pan;
    await page.keyboard.down('ArrowRight');
    await sleep(500);
    const midway = (await s.snapshot()).pose.pan;
    await sleep(500);
    const later = (await s.snapshot()).pose.pan;
    await page.keyboard.up('ArrowRight');
    assert(midway > start && later > midway, `pan did not keep increasing (${start}, ${midway}, ${later})`);
    await sleep(350);
    const stopped = await s.snapshot();
    assert(stopped.velocity.pan === 0 && !stopped.moving, `still moving after release: ${stopped.velocity.pan}`);
    await sleep(400);
    assert((await s.snapshot()).pose.pan === stopped.pose.pan, 'pan drifted after stopping');
  });
  await check('keyboard: store, move away, and recall lands within tolerance', async () => {
    await page.keyboard.press('Shift+Digit1');
    await page.waitForFunction(() => window.__fmpCameraSim.state().presets.some((p) => p.slot === 1));
    const preset = (await s.state()).presets.find((p) => p.slot === 1);
    await hold(page, 'ArrowUp', 700);
    await hold(page, 'KeyE', 600);
    await waitStill(page);
    await page.keyboard.press('Digit1');
    await sleep(80);
    assert((await s.snapshot()).recall !== null, 'recall did not start');
    await waitStill(page);
    const pose = (await s.snapshot()).pose;
    assert(near(pose.pan, preset.pan, 0.01) && near(pose.tilt, preset.tilt, 0.01) && near(pose.lens, preset.lens, 0.001), `landed ${JSON.stringify(pose)} vs ${JSON.stringify(preset)}`);
  });
  await check('keyboard: manual input interrupts a recall immediately', async () => {
    await hold(page, 'ArrowLeft', 900);
    await waitStill(page);
    await page.keyboard.press('Digit1');
    await sleep(150);
    assert((await s.snapshot()).recall !== null, 'recall did not start');
    await page.keyboard.down('ArrowDown');
    const after = await s.snapshot();
    await page.keyboard.up('ArrowDown');
    assert(after.recall === null, 'recall continued after manual input');
    assert(after.input.tilt < 0, 'manual input was not applied');
  });
  await check('keyboard: speed keys change the level; H returns home', async () => {
    const before = (await s.snapshot()).speeds.pan;
    await page.keyboard.press('BracketRight');
    const after = (await s.snapshot()).speeds.pan;
    assert(after === Math.min(8, before + 1), `pan speed ${before} -> ${after}`);
    await page.keyboard.press('KeyH');
    await waitStill(page);
    const pose = (await s.snapshot()).pose;
    assert(near(pose.pan, 0, 1e-9) && near(pose.tilt, 0, 1e-9) && near(pose.lens, 0, 1e-9), `home pose ${JSON.stringify(pose)}`);
  });
  await check('keyboard: pan stops at the configured limit', async () => {
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('BracketRight');
    await page.keyboard.down('Shift');
    await hold(page, 'ArrowRight', 2600);
    await page.keyboard.up('Shift');
    await sleep(300);
    const snap = await s.snapshot();
    assert(snap.pose.pan === 175 && snap.atLimit.pan === 'max' && snap.velocity.pan === 0, `pan ${snap.pose.pan}, limit ${snap.atLimit.pan}`);
    assert((await page.getByTestId('readout-state').textContent()).includes('limit'), 'readout does not show the limit');
    await page.keyboard.press('KeyH');
    await waitStill(page);
  });
  await check('focus loss stops commanded movement', async () => {
    await page.keyboard.down('ArrowRight');
    await sleep(400);
    assert((await s.snapshot()).input.pan > 0, 'key did not drive');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await sleep(300);
    const snap = await s.snapshot();
    await page.keyboard.up('ArrowRight');
    assert(snap.input.pan === 0 && snap.velocity.pan === 0, `still commanded after blur: input ${snap.input.pan}, velocity ${snap.velocity.pan}`);
  });
  await check('a hidden page halts motion and stops the clock', async () => {
    await page.keyboard.down('ArrowLeft');
    await sleep(300);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hidden = await s.snapshot();
    await sleep(500);
    const later = await s.snapshot();
    await page.keyboard.up('ArrowLeft');
    assert((await s.state()).hidden === true, 'store is not hidden');
    assert(!hidden.moving && hidden.velocity.pan === 0, 'motion did not halt');
    assert(later.time === hidden.time && later.pose.pan === hidden.pose.pan, 'the clock kept running while hidden');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(300);
    assert((await s.state()).hidden === false, 'did not resume');
  });
  await context.close();
}

// ------------------------------------------------------------------------------------------
// 3. Mouse operation
// ------------------------------------------------------------------------------------------
{
  const { context, page } = await open();
  const s = sim(page);
  await check('mouse: dragging the joystick moves the camera and releasing stops it', async () => {
    const box = await page.getByRole('application', { name: 'Pan and tilt joystick' }).boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + box.width * 0.45, cy - box.height * 0.2, { steps: 4 });
    await sleep(700);
    const moving = await s.snapshot();
    await page.mouse.up();
    assert(moving.input.pan > 0.5 && moving.input.tilt > 0, `input ${JSON.stringify(moving.input)}`);
    assert(moving.velocity.pan > 0, 'no pan velocity');
    await sleep(350);
    const stopped = await s.snapshot();
    assert(stopped.input.pan === 0 && !stopped.moving, 'did not stop after mouse release');
  });
  await check('mouse: hold T to zoom, Store then a preset key, Home and recall', async () => {
    const tele = page.getByRole('button', { name: 'Zoom in (tele), hold' });
    const box = await tele.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await sleep(700);
    await page.mouse.up();
    await waitStill(page);
    const zoomed = (await s.snapshot()).pose;
    assert(zoomed.lens > 0, 'T did not zoom in');
    await page.getByRole('button', { name: 'Store', exact: true }).click();
    await page.getByRole('button', { name: 'Store current shot in preset 2' }).click();
    await page.waitForFunction(() => window.__fmpCameraSim.state().presets.some((p) => p.slot === 2));
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await waitStill(page);
    assert((await s.snapshot()).pose.lens === 0, 'Home did not return to wide');
    await page.getByRole('button', { name: /^Recall preset 2/ }).click();
    await waitStill(page);
    assert(near((await s.snapshot()).pose.lens, zoomed.lens, 0.001), 'preset 2 did not restore the lens');
  });
  await check('mouse: a clicked control keeps Space as Stop, and Esc stops from a text field', async () => {
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await sleep(80);
    assert((await s.snapshot()).recall !== null || (await s.snapshot()).pose.lens === 0, 'Home did not start');
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert(focused !== 'Home', 'the Home button took keyboard focus from a mouse click');
    await page.getByRole('button', { name: /^Recall preset 2/ }).click();
    await sleep(120);
    assert((await s.snapshot()).recall !== null, 'recall did not start');
    await page.keyboard.press('Space');
    assert((await s.snapshot()).recall === null, 'Space did not stop the recall after a mouse click');
    await page.keyboard.press('KeyH');
    await waitStill(page);
    await showTab(page, 'Venue');
    await focusWorkspace(page);
    await page.keyboard.press('Digit2');
    await sleep(120);
    assert((await s.snapshot()).recall !== null, 'recall did not start from the keyboard');
    await page.getByRole('group', { name: /Camera to downstage edge/ }).getByLabel('Value').focus();
    await page.keyboard.press('Escape');
    assert((await s.snapshot()).recall === null, 'Esc in a text field did not stop the camera');
  });
  await check('mouse: leaving the window releases a joystick drag', async () => {
    const box = await page.getByRole('application', { name: 'Pan and tilt joystick' }).boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + box.width * 0.4, cy, { steps: 3 });
    await sleep(300);
    assert((await s.snapshot()).input.pan > 0.4, 'drag did not drive');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await sleep(350);
    const snap = await s.snapshot();
    await page.mouse.up();
    assert(snap.input.pan === 0 && !snap.moving, `joystick still driving after blur: ${JSON.stringify(snap.input)}`);
  });
  await check('mouse: a quick tap on T says T and W are held; the rocker is a pointer-only duplicate', async () => {
    const tele = page.getByRole('button', { name: 'Zoom in (tele), hold' });
    await tele.click();
    await page.getByTestId('status-line').getByText('Hold T or W to keep zooming').waitFor({ timeout: 5000 });
    assert((await page.getByRole('application', { name: /zoom rocker/i }).count()) === 0, 'the pointer-only rocker is exposed to assistive technology');
    assert((await page.locator('.zoom-track').getAttribute('aria-hidden')) === 'true', 'rocker is not aria-hidden');
    const width = await page.locator('.zoom-track').evaluate((track) => {
      const before = getComputedStyle(track, '::before');
      return track.getBoundingClientRect().width - parseFloat(before.left) - parseFloat(before.right);
    });
    assert(width >= 44, `rocker touch target ${width}px wide`);
    const described = await page.getByRole('application', { name: 'Pan and tilt joystick' }).evaluate((pad) =>
      (pad.getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? `missing #${id}`),
    );
    assert(described.length === 3 && described[1].startsWith('Pan') && described[2].startsWith('Tilt'), `joystick description ${JSON.stringify(described)}`);
    return described.slice(1).join(' · ');
  });
  await check('mouse: right-click a stored preset key to rename it, then clear it', async () => {
    await focusWorkspace(page);
    await page.keyboard.press('Shift+Digit5');
    await page.waitForFunction(() => window.__fmpCameraSim.state().presets.some((p) => p.slot === 5));
    const key = page.locator('.preset-key').nth(4);
    const menu = page.getByRole('menu', { name: 'Preset 5 actions' });
    await key.click({ button: 'right' });
    await menu.waitFor();
    assert(await menu.getByRole('menuitem', { name: 'Rename' }).evaluate((item) => item === document.activeElement), 'the menu did not take focus');
    await menu.getByRole('menuitem', { name: 'Rename' }).click();
    const field = page.getByLabel('Name for preset 5');
    await field.fill('Safe wide');
    await field.press('Enter');
    await page.waitForFunction(() => window.__fmpCameraSim.state().presets.find((p) => p.slot === 5)?.name === 'Safe wide');
    assert(((await key.textContent()) || '').includes('Safe wide'), 'the key does not show the new name');
    await key.click({ button: 'right' });
    await menu.getByRole('menuitem', { name: 'Clear' }).click();
    await page.waitForFunction(() => !window.__fmpCameraSim.state().presets.some((p) => p.slot === 5));
    assert(((await key.textContent()) || '').includes('Empty'), 'the cleared key does not read Empty');
  });
  await check('mouse: orbiting the venue view never moves the camera', async () => {
    const before = await s.snapshot();
    const box = await page.getByTestId('venue-canvas').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6, { steps: 8 });
    await page.mouse.up();
    await sleep(200);
    const after = await s.snapshot();
    assert(JSON.stringify(after.pose) === JSON.stringify(before.pose) && !after.moving, 'camera moved when the venue view was orbited');
  });
  await context.close();
}

// ------------------------------------------------------------------------------------------
// 4. Tablet touch operation
// ------------------------------------------------------------------------------------------
{
  const { context, page } = await open({ context: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } });
  const s = sim(page);
  const cdp = await context.newCDPSession(page);
  await check('tablet: the monitor takes priority and the venue view starts collapsed', async () => {
    const frame = await page.locator('.monitor-frame').boundingBox();
    assert(frame.width >= 700, `monitor is only ${frame.width.toFixed(0)} px wide`);
    assert((await page.getByTestId('venue-canvas').isVisible()) === false, 'venue view is not collapsed');
  });
  await check('touch: dragging the joystick moves the camera; a cancelled touch stops it', async () => {
    const pad = page.getByRole('application', { name: 'Pan and tilt joystick' });
    await pad.scrollIntoViewIfNeeded();
    const box = await pad.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 4; i += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - (box.width * 0.4 * i) / 4, y }] });
    }
    await sleep(600);
    const moving = await s.snapshot();
    assert(moving.input.pan < -0.5 && moving.velocity.pan < 0, `touch input ${JSON.stringify(moving.input)}`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await sleep(350);
    const stopped = await s.snapshot();
    assert(stopped.input.pan === 0 && !stopped.moving, 'touch cancel did not stop the camera');
  });
  await check('touch: tapping Store, a preset key, Home and the preset recalls it', async () => {
    const posed = (await s.snapshot()).pose;
    await page.getByRole('button', { name: 'Store', exact: true }).tap();
    await page.getByRole('button', { name: 'Store current shot in preset 5' }).tap();
    await page.waitForFunction(() => window.__fmpCameraSim.state().presets.some((p) => p.slot === 5));
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await waitStill(page);
    await page.getByRole('button', { name: /^Recall preset 5/ }).tap();
    await waitStill(page);
    const pose = (await s.snapshot()).pose;
    assert(near(pose.pan, posed.pan, 0.01) && near(pose.tilt, posed.tilt, 0.01), `recalled ${JSON.stringify(pose)} vs ${JSON.stringify(posed)}`);
  });
  await context.close();
}

// ------------------------------------------------------------------------------------------
// 5. Export, import, exercises and venue changes
// ------------------------------------------------------------------------------------------
{
  const { context, page } = await open();
  const s = sim(page);
  let template;
  await check('export carries versioned records with evidence and source notes', async () => {
    template = await exportProject(page);
    assert(template.schema === 'fmp-camera-simulator.project' && template.version === 1, 'project schema');
    assert(template.venue.schema === 'fmp-camera-simulator.venue' && template.camera.schema === 'fmp-camera-simulator.camera' && template.session.schema === 'fmp-camera-simulator.session', 'record schemas');
    const width = template.venue.dimensions.stageWidth;
    assert(width.status === 'estimated' && width.note.includes('Stage & Pit'), 'stage width provenance');
    assert(template.venue.dimensions.cameraHeight.status === 'demo', 'camera height is not a demo value');
    assert(template.camera.behaviour.status === 'uncalibrated', 'behaviour is not marked uncalibrated');
  });
  await check('import round-trips settings, provenance and presets', async () => {
    const project = structuredClone(template);
    // Explicit legacy geometry keeps the saved safe-wide exercise fixture meaningful.
    project.venue.dimensions.stageWidth.value = 61 * 0.3048;
    project.venue.dimensions.stageDepth.value = 75 * 0.3048;
    project.venue.dimensions.cameraHeight = { value: 11.5824, status: 'measured', note: 'Probe: laser from catwalk rail to deck' };
    project.camera.behaviour.curveExponent = 2.4;
    project.session.presets = [
      { slot: 1, name: 'Safe wide', cameraId: project.camera.id, pan: 0, tilt: -13.5, lens: 0.221, savedAt: '2026-09-23T07:00:00.000Z' },
      { slot: 2, name: 'Lead', cameraId: project.camera.id, pan: 0, tilt: -12.8, lens: 0.76, savedAt: '2026-09-23T07:01:00.000Z' },
    ];
    project.session.performer = { ...project.session.performer, pathId: 'cross', walkSpeed: 3, pauseS: 0 };
    project.session.exerciseSettings.follow.countdownS = 0;
    await importProject(page, project);
    await page.waitForFunction(() => window.__fmpCameraSim.state().presets.length === 2);
    assert(!(await s.state()).unsettled.includes('Camera height above stage'), 'measured height still flagged');
    const again = await exportProject(page);
    for (const key of ['venue', 'camera']) assert(JSON.stringify(again[key]) === JSON.stringify(project[key]), `${key} changed in the round trip`);
    assert(JSON.stringify(again.session.presets) === JSON.stringify(project.session.presets), 'presets changed in the round trip');
    assert(JSON.stringify(again.session.performer) === JSON.stringify(project.session.performer), 'performer changed in the round trip');
  });
  await check('an unsupported or malformed import is rejected and the session is kept', async () => {
    await importProject(page, { ...template, version: 2 }, 'future.json');
    // The Session panel lists the problem and the status line names it too.
    await page.getByText('Unsupported project version 2').first().waitFor();
    assert(((await page.getByTestId('status-line').textContent()) || '').includes('project.version'), 'the announcement does not name the problem');
    const bad = structuredClone(template);
    bad.venue.dimensions.stageWidth.value = -4;
    bad.session.presets = [{ slot: 12, name: 'x', cameraId: 'y', pan: 0, tilt: 0, lens: 0, savedAt: 'now' }];
    await importProject(page, bad, 'broken.json');
    await page.getByText('venue.dimensions.stageWidth.value').first().waitFor();
    assert((await s.state()).presets.length === 2, 'rejected import changed the presets');
  });
  await closePanel(page);
  await check('exercise: establish a wide shot completes and resets', async () => {
    await page.getByRole('button', { name: 'Exercises' }).click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await waitStill(page);
    const home = (await s.snapshot()).pose;
    assert(home.pan === 0 && home.tilt === 0 && home.lens === 0, 'exercise did not start from home');
    assert((await s.state()).exercise.status === 'running', 'wide shot completed from home');
    // Inside and outside marks differ in shape as well as colour: outside is dashed and hollow.
    const marks = await page.evaluate(() =>
      [...document.querySelectorAll('.ov-marker')]
        .filter((group) => group.style.display !== 'none' && group.getAttribute('transform'))
        .map((group) => {
          const circle = getComputedStyle(group.querySelector('circle'));
          return { out: group.classList.contains('is-out'), dash: circle.strokeDasharray, fill: circle.fill };
        }),
    );
    assert(marks.length > 0, 'no framing marks drawn');
    for (const mark of marks) {
      assert(mark.out ? mark.dash !== 'none' : mark.dash === 'none' && mark.fill !== 'rgba(0, 0, 0, 0.35)', `mark ${JSON.stringify(mark)} relies on colour alone`);
    }
    await focusWorkspace(page);
    await page.keyboard.press('Digit1');
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.status === 'complete', null, { timeout: 15000 });
    await page.getByTestId('exercise-wide-progress').getByText('Complete. The wide shot is established.').waitFor();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    assert((await s.state()).exercise === null, 'reset left the exercise active');
  });
  await check('exercise: follow a performer runs to a result and resets', async () => {
    await page.getByRole('button', { name: 'Start' }).nth(1).click();
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.status === 'complete', null, { timeout: 30000 });
    const result = (await s.state()).exercise.result;
    assert(result && typeof result.metrics.onTargetPct === 'number' && typeof result.metrics.meanErrorPct === 'number', 'no follow metrics');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    return `on target ${result.metrics.onTargetPct}%, mean error ${result.metrics.meanErrorPct}%`;
  });
  await check('exercise: save and recall two shots completes within tolerance', async () => {
    await page.getByRole('button', { name: 'Start' }).nth(2).click();
    await focusWorkspace(page);
    await page.keyboard.press('KeyH');
    await waitStill(page);
    const checks = async () => (await s.state()).exercise.checks.map((c) => c.done);
    // Full-speed moves (Shift) keep every step well clear of the distinct/away thresholds even if
    // a slow renderer delays key events.
    const move = async (key, ms) => {
      await page.keyboard.down('Shift');
      await hold(page, key, ms);
      await page.keyboard.up('Shift');
      await waitStill(page);
    };
    await page.keyboard.press('Shift+Digit3');
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.checks[0]?.done === true, null, { timeout: 5000 });
    await move('ArrowRight', 1200);
    await page.keyboard.press('Shift+Digit4');
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.checks[1]?.done === true, null, { timeout: 5000 }).catch(async () => {
      throw new Error(`shot B not accepted: ${(await s.state()).exercise.note}`);
    });
    await move('ArrowLeft', 2000);
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.checks[2]?.done === true, null, { timeout: 5000 }).catch(async () => {
      throw new Error(`did not register moving away: ${JSON.stringify(await checks())}`);
    });
    await page.keyboard.press('Digit3');
    await waitStill(page);
    await page.keyboard.press('Digit4');
    await waitStill(page);
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.status === 'complete', null, { timeout: 5000 }).catch(async () => {
      throw new Error(`not complete: ${JSON.stringify(await checks())} ${(await s.state()).exercise.note}`);
    });
    const result = (await s.state()).exercise.result;
    assert(result.passed && result.metrics.maxPanTiltDeviationDeg <= 0.1, JSON.stringify(result.metrics));
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
  });
  // Suggestions (src/app/training.ts, shader/fmp-training.js, docs/camera-training-links.md).
  const MARK = '(DS[RCL]|CS[RL]?|US[RCL])';
  const SUGGESTED = new RegExp(`^(Wide|(Mid|Tight) · ${MARK}|Off stage · pan [+−]\\d+°)$`);
  await check('suggestions: results reach the shared record and the exercise list marks the next one', async () => {
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem('fmpTraining.v1')));
    assert(record && record.sim.wide?.passed === true && record.sim.recall?.passed === true && record.sim.follow?.tries === 1, JSON.stringify(record));
    assert(Object.keys(record).every((key) => ['schema', 'prefs', 'last', 'practice', 'sim'].includes(key)), `unexpected fields: ${Object.keys(record)}`);
    assert(Object.values(record.sim).every((entry) => Object.keys(entry).every((key) => ['passed', 'tries', 'at'].includes(key))), 'unexpected entry fields');
    assert((await page.getByTestId('exercise-wide-next').count()) === 0 && (await page.getByTestId('exercise-recall-next').count()) === 0, 'a passed exercise is still marked');
    if (record.sim.follow.passed) {
      await page.getByTestId('next-step').getByRole('link', { name: 'Next: Shading practice · Match two cameras' }).waitFor({ timeout: 3000 });
      return 'all three passed: Shading practice suggested';
    }
    const pill = (await page.getByTestId('exercise-follow-next').textContent()) || '';
    assert(pill === 'Try again', `follow reads ${pill}`);
    return 'follow marked Try again';
  });
  await check('suggestions: an unnamed preset shows a name read from the shot, and Rename starts from it', async () => {
    const key = page.getByRole('button', { name: /^Recall preset 3, / });
    const label = await key.locator('.preset-name').textContent();
    assert(SUGGESTED.test(label || ''), `preset 3 reads ${label}`);
    assert(await key.locator('.preset-name.is-suggested').count() === 1, 'the suggested name is not marked as such');
    await closePanel(page);
    await key.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const field = page.locator('.preset-rename');
    const draft = await field.evaluate((input) => ({ value: input.value, start: input.selectionStart, end: input.selectionEnd }));
    assert(draft.value === label && draft.start === 0 && draft.end === label.length, `rename draft ${JSON.stringify(draft)}`);
    await field.press('Escape');
    assert((await s.state()).presets.find((p) => p.slot === 3).name === '', 'cancelling Rename stored the suggestion');
    return label;
  });
  await check('suggestions: Session continues in Shading practice; Off hides the marks and forgets; Forget keeps the choice', async () => {
    await page.evaluate(() => window.FmpTraining.recordStep(undefined, 'practice', 'match-cameras', { passed: false, score: 64 }));
    await showTab(page, 'Session');
    const link = page.getByTestId('practice-continue');
    assert(/Continue in Shading practice · next: Match two cameras, best 64/.test((await link.textContent()) || ''), await link.textContent());
    assert((await link.getAttribute('href')) === '/shader/practice.html', await link.getAttribute('href'));
    const label = await page.locator('.preset-key.has-preset').filter({ hasText: /^3/ }).locator('.preset-name').textContent();
    assert((await page.locator('#preset-name-3').getAttribute('placeholder')) === label, 'the Session name hint differs from the pad');
    await page.getByLabel('Suggest next steps').selectOption('off');
    const off = await page.evaluate(() => JSON.parse(localStorage.getItem('fmpTraining.v1')));
    assert(off.prefs.suggestions === 'off' && Object.keys(off.sim).length === 0 && Object.keys(off.practice).length === 0, JSON.stringify(off));
    assert((await page.getByTestId('practice-continue').count()) === 0, 'Continue still shown with suggestions off');
    assert(((await page.getByRole('button', { name: /^Recall preset 3, / }).textContent()) || '').includes('Stored'), 'preset 3 still suggests a name');
    await page.getByRole('button', { name: 'Forget training history' }).click();
    const forgotten = await page.evaluate(() => JSON.parse(localStorage.getItem('fmpTraining.v1')));
    assert(forgotten.prefs.suggestions === 'off', 'Forget turned suggestions back on');
    await showTab(page, 'Exercises');
    assert((await page.locator('[data-testid$="-next"]').count()) === 0, 'exercise marks shown with suggestions off');
    await showTab(page, 'Session');
    await page.getByLabel('Suggest next steps').selectOption('on');
    await showTab(page, 'Exercises');
  });
  await check('changing venue dimensions changes the framing; invalid geometry is refused', async () => {
    await page.getByRole('tab', { name: 'Venue' }).click();
    const before = await s.frame();
    const field = page.getByRole('group', { name: /Camera to downstage edge/ }).getByLabel('Value');
    await field.fill('130');
    await field.press('Enter');
    await page.waitForFunction(() => Math.abs(window.__fmpCameraSim.state().geometry.camera.upstage + 39.624) < 1e-3);
    const after = await s.frame();
    assert(after.position.z > before.position.z + 6, `camera did not move back (${before.position.z} -> ${after.position.z})`);
    await field.fill('5');
    await field.press('Enter');
    await page.getByText('Must be between 20 ft and 400 ft.').waitFor();
    assert(Math.abs((await s.state()).geometry.camera.upstage + 39.624) < 1e-3, 'invalid distance was applied');
  });
  await check('mount and heading evidence stay independent; source references survive reload', async () => {
    await showTab(page, 'Venue');
    const height = page.getByRole('group', { name: /Camera height above stage/ });
    await height.getByLabel('Evidence method', { exact: true }).selectOption('field-measurement');
    const sources = height.getByLabel('Source identifiers (comma separated)', { exact: true });
    await sources.fill('laser-survey-01, deck-datum');
    await sources.press('Tab');
    const exported = await exportProject(page);
    assert(exported.venue.version === 6, 'wrong venue version');
    assert(exported.venue.mount.status === 'confirmed' && exported.venue.mount.headingEvidence.status === 'demo', 'mount observation settled heading');
    assert(exported.venue.dimensions.cameraHeight.provenance.method === 'field-measurement', 'method not stored');
    assert(exported.venue.dimensions.cameraHeight.provenance.sourceIds.join(',') === 'laser-survey-01,deck-datum', 'references not stored');
    await sleep(800);
    await page.reload();
    await page.waitForFunction(() => window.__fmpCameraSim?.state().renderStatus === 'ok');
    const reloaded = await exportProject(page);
    assert(JSON.stringify(reloaded.venue) === JSON.stringify(exported.venue), 'provenance lost on reload');
    const invalid = structuredClone(reloaded);
    invalid.venue.mount.headingEvidence.provenance = { method: 'photo', sourceIds: [42] };
    await importProject(page, invalid);
    const retained = await exportProject(page);
    assert(JSON.stringify(retained.venue) === JSON.stringify(reloaded.venue), 'invalid provenance replaced venue');
    await showTab(page, 'Venue');
    const editedHeight = page.getByRole('group', { name: /Camera height above stage/ }).getByLabel('Value', { exact: true });
    await editedHeight.fill('39');
    await editedHeight.press('Enter');
    const edited = await exportProject(page);
    assert(edited.venue.dimensions.cameraHeight.status === 'demo', 'editing retained stale measured confidence');
    assert(edited.venue.dimensions.cameraHeight.provenance.method === 'operator' && edited.venue.dimensions.cameraHeight.provenance.sourceIds.length === 0, 'editing retained stale references');
  });
  await check('profile preview cancels safely, applies explicitly and survives reload', async () => {
    const before = await exportProject(page);
    await page.getByRole('tab', { name: 'Venue' }).click();
    await page.getByRole('button', { name: 'Preview profile update' }).click();
    await page.getByRole('button', { name: 'Cancel profile update' }).click();
    const cancelled = await exportProject(page);
    assert(JSON.stringify(cancelled.venue) === JSON.stringify(before.venue), 'cancel changed venue');
    await page.getByRole('tab', { name: 'Venue' }).click();
    await page.getByRole('button', { name: 'Preview profile update' }).click();
    await page.getByRole('button', { name: 'Apply profile update' }).click();
    const applied = await exportProject(page);
    assert(near(applied.venue.dimensions.stageWidth.value, 113 * 0.3048, 1e-9), 'width not applied');
    assert(near(applied.venue.dimensions.stageDepth.value, 61 * 0.3048, 1e-9), 'depth not applied');
    assert(applied.venue.mount.orientation === 'inverted', 'mount not applied');
    assert(JSON.stringify(applied.session.presets) === JSON.stringify(before.session.presets), 'presets changed');
    assert(JSON.stringify(applied.venue.dimensions.cameraHeight) === JSON.stringify(before.venue.dimensions.cameraHeight), 'measured height changed');
    await sleep(800);
    await page.reload();
    await page.waitForFunction(() => window.__fmpCameraSim?.state().renderStatus === 'ok');
    const restored = await exportProject(page);
    assert(JSON.stringify(restored.venue) === JSON.stringify(applied.venue), 'profile not restored');
  });
  await context.close();
}

// ------------------------------------------------------------------------------------------
// 6. Failure paths
// ------------------------------------------------------------------------------------------
await check('storage failure keeps the session usable and offers export', async () => {
  const { context, page } = await open({
    init: () => {
      Storage.prototype.setItem = () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      };
    },
  });
  await focusWorkspace(page);
  await page.keyboard.press('Shift+Digit6');
  await page.getByText('Browser storage is full or blocked').first().waitFor({ timeout: 5000 });
  assert(await page.getByRole('button', { name: 'Export session', exact: true }).isVisible(), 'no export offered');
  assert((await sim(page).state()).presets.some((p) => p.slot === 6), 'preset was not kept in the session');
  await context.close();
});

{
  const noWebgl = await chromium.launch({ headless: true, ...channel, args: ['--disable-webgl', '--disable-3d-apis', ...baseArgs] });
  await check('without WebGL the monitor explains the failure and presents no picture', async () => {
    const { context, page } = await open({ browser: noWebgl });
    await page.getByText('3D view unavailable.').first().waitFor();
    assert((await sim(page).state()).renderStatus === 'unavailable', 'render status is not unavailable');
    await focusWorkspace(page);
    await hold(page, 'ArrowRight', 500);
    assert((await sim(page).snapshot()).pose.pan > 0, 'controls stopped working without WebGL');
    await context.close();
  });
  await noWebgl.close();
}

await check('a failure while drawing the interface shows a recovery screen that keeps the saved session', async () => {
  const { context, page } = await open();
  try {
    await focusWorkspace(page);
    await page.keyboard.press('Shift+Digit3');
    await page.waitForFunction(() => (localStorage.getItem('fmpCameraSim.v1') || '').includes('"slot": 3'), null, { timeout: 5000 });
    // Break one browser API only after the theme boot script has run, so React throws while rendering.
    await context.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (document.readyState !== 'loading') throw new Error('probe: matchMedia is broken');
        return real(query);
      };
    });
    await page.reload();
    const crash = page.getByTestId('sim-crash');
    await crash.waitFor({ timeout: 15000 });
    assert(((await crash.getByRole('heading', { level: 1 }).textContent()) || '').includes('The simulator stopped'), 'no crash heading');
    assert(((await crash.textContent()) || '').includes('probe: matchMedia is broken'), 'the error is not named');
    // Leaving the page saved the session once more, so compare with what is stored now.
    const saved = await page.evaluate(() => localStorage.getItem('fmpCameraSim.v1'));
    assert(saved?.includes('"slot": 3'), 'the saved session was lost in the crash');
    const [download] = await Promise.all([page.waitForEvent('download'), crash.getByRole('button', { name: 'Export the saved session' }).click()]);
    assert((await readFile(await download.path(), 'utf8')) === saved, 'the export is not the saved session');
    await crash.getByRole('button', { name: 'Set the saved session aside and start fresh' }).click();
    await page.getByTestId('sim-crash').waitFor({ timeout: 15000 });
    const storage = await page.evaluate(() => ({
      session: localStorage.getItem('fmpCameraSim.v1'),
      copies: Object.keys(localStorage).filter((key) => key.startsWith('fmpCameraSim.v1.unreadable.')),
    }));
    assert(storage.session === null && storage.copies.length === 1, `after setting aside: ${JSON.stringify(storage)}`);
    assert((await page.getByRole('button', { name: 'Export the saved session' }).count()) === 0, 'still offers a session that was set aside');
  } finally {
    await context.close();
  }
});

await check('a lost graphics context pauses the picture and a restored one brings it back', async () => {
  const { context, page } = await open();
  try {
    const lost = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="monitor-canvas"]');
      const gl = canvas.getContext('webgl2');
      window.__probeContext = gl?.getExtension('WEBGL_lose_context') ?? null;
      window.__probeContext?.loseContext();
      return Boolean(window.__probeContext);
    });
    assert(lost, 'WEBGL_lose_context is not available');
    await page.getByText('Picture paused: the browser reset its graphics.').first().waitFor({ timeout: 5000 });
    assert((await sim(page).state()).renderStatus === 'lost', 'render status is not lost');
    await page.evaluate(() => window.__probeContext.restoreContext());
    await page.waitForFunction(() => window.__fmpCameraSim.state().renderStatus === 'ok', null, { timeout: 10000 });
    const frames = (await sim(page).render()).monitorFrames;
    await page.waitForFunction((n) => window.__fmpCameraSim.render().monitorFrames > n + 3, frames, { timeout: 15000 });
    const pixels = await monitorPixels(page);
    assert(pixels.variance > 20, `the picture did not come back (variance ${pixels.variance.toFixed(1)})`);
    assert((await page.getByText('Picture paused').count()) === 0, 'the pause notice stayed up');
    return `luma variance ${pixels.variance.toFixed(0)} after restore`;
  } finally {
    await context.close();
  }
});

await check('the standalone offline file runs from disk with networking disabled', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    try { localStorage.setItem('fmpCameraSim.onboarding.v1', 'done'); } catch {}
  });
  await context.setOffline(true);
  const page = await context.newPage();
  const requests = [];
  const problems = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto(`${pathToFileURL(join(ROOT, 'camera-sim/fmp-camera-simulator-offline.html')).href}?diagnostics=1`);
  await page.waitForFunction(() => window.__fmpCameraSim?.state().renderStatus === 'ok', null, { timeout: 15000 });
  await focusWorkspace(page);
  await hold(page, 'ArrowRight', 600);
  assert((await sim(page).snapshot()).pose.pan > 0, 'offline copy did not respond');
  assert(requests.every((url) => url.startsWith('file:') || url.startsWith('data:')), `network requests: ${requests.filter((u) => !u.startsWith('file:')).join(', ')}`);
  assert(problems.length === 0, problems.join(' | '));
  assert((await page.locator('a[href="https://housevideo.app/fmp/"]').count()) > 0, 'suite link is not absolute');
  assert(await dmSansLoaded(page), 'the offline copy did not load its inlined DM Sans');
  await showTab(page, 'Session');
  for (const href of ['https://housevideo.app/shader/practice.html', 'https://housevideo.app/fmp/rig/?equipment=rig&part=body']) {
    assert((await page.locator(`a[href="${href}"]`).count()) > 0, `the offline copy does not link ${href}`);
  }
  await context.close();
});

await check('bowl inspector edits rendered treads and pitch together; side view preserves PTZ and helpers stay out of monitor', async () => {
  const { context, page } = await open();
  const before = await sim(page).snapshot();
  await page.getByRole('button', { name: 'Side elevation', exact: true }).click();
  const after = await sim(page).snapshot();
  assert(JSON.stringify(before.pose) === JSON.stringify(after.pose), 'overview preset moved PTZ');
  await showTab(page, 'Venue');
  const inspector = page.getByTestId('bowl-inspector');
  await inspector.scrollIntoViewIfNeeded();
  assert(await inspector.isVisible(), 'missing inspector');
  const initial = await sim(page).render();
  const elevation = inspector.getByLabel('Rise per row, segment 1', { exact: true });
  await elevation.fill('0.2'); await elevation.press('Enter');
  await page.waitForFunction(y => window.__fmpCameraSim.render().bowlMaxTreadY > y + 1, initial.bowlMaxTreadY);
  assert((await inspector.getByTestId('bowl-pitch-table').innerText()).includes('12.53°'), 'pitch failed to track new rise');
  const render = await sim(page).render();
  assert(render.monitorHelperCount === 0, 'overview label leaked into monitor');
  assert(render.monitorFrames > 0 && render.overviewFrames > 0, 'missing rendered view');
  await context.close();
});

await check('shell cutaway preserves monitor obstructions; show package clears independently of FOH and house LEDs', async () => {
  const { context, page, problems } = await open();
  try {
  const before = await sim(page).render(), pose = (await sim(page).snapshot()).pose;
  assert(before.monitorShellCount > 0 && before.overviewShellCount === 0, 'default physical shell/cutaway mismatch');
  await page.getByRole('button', {name:'Shell cutaway', exact:true}).click();
  await page.waitForFunction(() => window.__fmpCameraSim.render().overviewShellCount > 0);
  const closed = await sim(page).render();
  assert(closed.monitorShellCount === before.monitorShellCount, 'cutaway changed monitor shell');
  await page.getByRole('button', {name:'Shell cutaway', exact:true}).click();
  await showTab(page, 'Venue');
  const settings = page.getByTestId('structure-settings');
  await settings.getByLabel('Fixture', {exact:true}).selectOption('Stage Right LED');
  assert(await settings.getByLabel('LED pitch', {exact:true}).inputValue() === '10.0', 'side pitch');
  await settings.getByLabel('Fixture', {exact:true}).selectOption('D1 lawn delay');
  assert(await settings.getByLabel('LED pitch', {exact:true}).inputValue() === '8.0', 'delay pitch');
  assert(await settings.getByLabel('Pixel space width', {exact:true}).inputValue() === '1600', 'pixel space');
  await settings.getByRole('button', {name:'Clear show package'}).click();
  await page.waitForFunction(() => window.__fmpCameraSim.render().showMeshCount === 0);
  await settings.getByLabel('Fixture', {exact:true}).selectOption('Front of House');
  assert(await settings.getByLabel('Fixture enabled').isChecked(), 'FOH lost on show clear');
  assert(JSON.stringify((await sim(page).snapshot()).pose) === JSON.stringify(pose), 'equipment change moved PTZ');
  assert((await sim(page).render()).monitorHelperCount === 0, 'fixture labels leaked into monitor');
  await settings.getByRole('button', {name:'Load demo concert'}).click();
  await page.waitForFunction(() => window.__fmpCameraSim.render().showMeshCount > 0);
  assert(problems.length === 0, problems.join(' | '));
  } finally { await context.close(); }
});

await check('lawn elevation updates the mesh; reference views preserve PTZ and terrain survives export', async () => {
  const {context,page,problems}=await open();
  try {
    const pose=(await sim(page).snapshot()).pose;
    for(const name of ['House','Top','Side elevation','Behind camera','Lawn']) {
      await page.getByRole('button',{name,exact:true}).click();
      assert(JSON.stringify((await sim(page).snapshot()).pose)===JSON.stringify(pose), `${name} moved PTZ`);
    }
    const before=await sim(page).render();
    await showTab(page,'Venue');
    const input=page.getByTestId('terrain-settings').getByLabel('Lawn front elevation',{exact:true});
    await input.fill('15');await input.press('Enter');
    await page.waitForFunction(y=>window.__fmpCameraSim.render().terrainMaxY>y+1,before.terrainMaxY);
    const project=await exportProject(page);
    assert(project.venue.terrain.frontElevation.value===15,'terrain edit not exported');
    assert(project.venue.terrain.frontElevation.status==='demo','terrain edit became measured');
    assert((await sim(page).render()).monitorHelperCount===0,'terrain label leaked');
    assert(problems.length===0,problems.join(' | '));
  } finally {await context.close();}
});

// One release stamp (apps/fmp-camera-sim/CHANGELOG.md plus the source fingerprint) everywhere an
// operator or a file can show which build it came from.
await check('release stamp: Help, page metadata, offline file and exports agree', async () => {
  const { context, page, problems } = await open();
  try {
    const release = await page.evaluate(() => window.__fmpCameraSim.release());
    assert(/^\d+\.\d+\.\d+$/.test(release.version) && /^[0-9a-f]{8}$/.test(release.build), `release ${JSON.stringify(release)}`);
    const stamp = `${release.version}+${release.build}`;
    const meta = await page.locator('meta[name="fmp-camera-sim-version"]').getAttribute('content');
    assert(meta === stamp, `page stamp ${meta}, expected ${stamp}`);
    const offline = await readFile(join(ROOT, 'camera-sim/fmp-camera-simulator-offline.html'), 'utf8');
    assert(offline.includes(`<meta name="fmp-camera-sim-version" content="${stamp}"`), 'the offline file carries a different stamp');
    await page.getByRole('button', { name: 'Help and keyboard shortcuts' }).click();
    const help = (await page.getByTestId('help-release').textContent()) ?? '';
    assert(help.includes(release.version) && help.includes(release.build), `Help shows "${help}"`);
    await page.locator('.help-dialog').getByRole('button', { name: 'Close' }).click();
    const exported = await exportProject(page);
    assert(exported.app === `FMP Camera Simulator ${release.version} (build ${release.build})`, `export app "${exported.app}"`);
    assert(problems.length === 0, problems.join(' | '));
    return stamp;
  } finally {
    await context.close();
  }
});

// ------------------------------------------------------------------------------------------
// 6b. Links in and out (docs/camera-training-links.md)
// ------------------------------------------------------------------------------------------
await check('an exercise link starts that exercise once and leaves the rest of the address', async () => {
  const { context, page } = await open({ url: `${PAGE}&exercise=recall` });
  try {
    await page.waitForFunction(() => window.__fmpCameraSim.state().exercise?.id === 'recall', null, { timeout: 5000 });
    const address = new URL(page.url());
    assert(!address.searchParams.has('exercise') && address.searchParams.has('diagnostics'), `the address after the link is ${address.search}`);
    await page.reload();
    await page.waitForFunction(() => window.__fmpCameraSim && window.__fmpCameraSim.state().renderStatus !== 'starting', null, { timeout: 30000 });
    await page.waitForTimeout(300);
    assert((await sim(page).state()).exercise === null, 'a reload started the exercise again');
    return address.search;
  } finally {
    await context.close();
  }
});

await check('an exercise link that names no exercise is refused in the status line', async () => {
  const { context, page } = await open({ url: `${PAGE}&exercise=nope` });
  try {
    const status = await page.getByTestId('status-line').textContent();
    assert(/no exercise called “nope”/.test(status), `the status line reads: ${status}`);
    assert((await sim(page).state()).exercise === null, 'an exercise started');
    assert(!new URL(page.url()).searchParams.has('exercise'), 'the refused link stayed in the address');
  } finally {
    await context.close();
  }
});

await check('the Session panel links the other cameras and opens the P240 model at its lens', async () => {
  const { context, page } = await open();
  try {
    await showTab(page, 'Session');
    const hrefs = await page.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    for (const href of ['/shader/practice.html', '/fmp/rig/?equipment=rig&part=body', '/fmp/models/p240.html#part=p240.lens']) {
      assert(hrefs.includes(href), `the Session panel does not link ${href}`);
    }
    const section = await page.locator('section[aria-labelledby="other-cameras-title"]').textContent();
    assert(/Camera 4 is set from its own menus, not the shader panel/.test(section), 'the Other cameras section does not say how Camera 4 is set');
  } finally {
    await context.close();
  }
});

// ------------------------------------------------------------------------------------------
// 7. Layouts
// ------------------------------------------------------------------------------------------
for (const [label, viewport, expectation] of [
  ['desktop 1440', { width: 1440, height: 900 }, 'venue'],
  ['tablet 1024', { width: 1024, height: 768 }, 'tablet'],
  ['680 px breakpoint', { width: 680, height: 900 }, 'rail'],
  ['phone 390', { width: 390, height: 844 }, 'rail'],
  ['ultrawide 32:9', { width: 3840, height: 1080 }, 'docked'],
]) {
  await check(`layout ${label}: no horizontal overflow and the right navigation`, async () => {
    const { context, page } = await open({ context: { viewport } });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
    assert(!(await breadcrumbScrollsVertically(page)), 'the breadcrumb scrolls vertically (stray scrollbar)');
    if (expectation === 'venue') assert(await page.getByTestId('venue-canvas').isVisible(), 'venue view hidden on desktop');
    if (expectation === 'tablet') assert(await page.getByRole('button', { name: 'Settings', exact: true }).isVisible() && !(await page.getByTestId('venue-canvas').isVisible()), 'tablet header controls or collapsed overview missing');
    if (expectation === 'rail') assert(await page.getByRole('navigation', { name: 'Simulator sections' }).isVisible(), 'no bottom rail');
    if (expectation === 'docked') assert(await page.getByRole('tablist', { name: 'Simulator settings' }).isVisible(), 'side panel not docked');
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.sim-app button, .sim-app [role="tab"], .sbd-site-return a')]
        .filter((b) => b.offsetParent !== null)
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width < 43.5 || r.height < 43.5;
        })
        .map((b) => b.textContent.trim().slice(0, 24)),
    );
    assert(small.length === 0, `under 44 px: ${small.join(', ')}`);
    await context.close();
  });
}

// Short screens: an iPad in landscape (1024 × 768, or about 1024 × 690 inside Safari, 1180 × 685
// for an 11-inch iPad in Chrome) and a 1366 × 768 laptop with browser chrome (about 1366 × 650).
// Stacked over the controls the 16:9 picture is height-bound: 1.8.0 kept it from collapsing to
// 2 px, but an iPad in Chrome still showed 232 × 130. With the venue view collapsed, the default
// on these screens, the controls sit beside the monitor, the whole column (Stop included) fits
// without scrolling even with wider text, and the readout keeps to one line where there is room.
// Showing the venue view puts it beside the monitor again, with a smaller but usable picture and
// every control reachable by scrolling the controls panel.
for (const [label, viewport, minWidth, minShownWidth] of [
  ['iPad landscape 1024 × 768', { width: 1024, height: 768 }, 390, 210],
  ['iPad Safari landscape 1024 × 690', { width: 1024, height: 690 }, 390, 172],
  ['iPad Chrome landscape 1180 × 685', { width: 1180, height: 685 }, 540, 172],
  ['laptop browser 1366 × 650', { width: 1366, height: 650 }, 590, 142],
]) {
  await check(`${label}: the controls sit beside a large picture and every control stays reachable`, async () => {
    const { context, page } = await open({ context: { viewport } });
    try {
      const picture = async () => page.locator('.monitor-frame').boundingBox();
      const measure = () =>
        page.evaluate(() => {
          const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
          const controls = document.querySelector('.controls-panel');
          const stop = [...document.querySelectorAll('.preset-actions button')].find((b) => b.textContent.trim() === 'Stop').getBoundingClientRect();
          return {
            monitor: rect('.monitor-panel'),
            controls: rect('.controls-panel'),
            controlsScroll: controls.scrollHeight - controls.clientHeight,
            controlsOverflow: controls.scrollWidth - controls.clientWidth,
            stopBottom: stop.bottom,
            readoutHeight: rect('.readout').height,
            readoutWidth: rect('.readout').width,
          };
        });
      assert(!(await page.getByTestId('venue-canvas').isVisible()), 'the venue view does not start collapsed');
      const collapsed = await picture();
      assert(collapsed && collapsed.width >= minWidth, `monitor picture ${Math.round(collapsed?.width ?? 0)} px wide, expected at least ${minWidth}`);
      const normal = await measure();
      // The page's CSP blocks injected stylesheets; CSSOM edits widen the text as iOS draws it.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('.sim-app, .sim-app *')) el.style.letterSpacing = '0.08em';
      });
      const wide = await measure();
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('.sim-app, .sim-app *')) el.style.letterSpacing = '';
      });
      for (const [name, m] of [['normal text', normal], ['wide text', wide]]) {
        assert(m.controls.left >= m.monitor.right && Math.abs(m.controls.top - m.monitor.top) <= 1, `${name}: the controls are not beside the monitor`);
        assert(m.controlsScroll <= 1 && m.controlsOverflow <= 1, `${name}: the controls column scrolls (${m.controlsScroll}px down, ${m.controlsOverflow}px across)`);
        assert(m.stopBottom <= viewport.height, `${name}: Stop ends at ${Math.round(m.stopBottom)}px, below the screen`);
        if (m.readoutWidth >= 520) assert(m.readoutHeight <= 40, `${name}: the readout wrapped (${Math.round(m.readoutHeight)}px)`);
      }
      const show = page.getByRole('button', { name: 'Show venue view', exact: true });
      await show.click();
      const shown = await picture();
      assert(shown && shown.width >= minShownWidth, `with the venue view shown the picture is ${Math.round(shown?.width ?? 0)} px wide, expected at least ${minShownWidth}`);
      const stop = page.getByRole('button', { name: 'Stop', exact: true });
      await stop.scrollIntoViewIfNeeded();
      const box = await stop.boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= viewport.height, 'Stop cannot be scrolled into view');
      assert((await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)) <= 1, 'the page itself scrolls');
      return `${Math.round(collapsed.width)} × ${Math.round(collapsed.height)}, ${Math.round(shown.width)} × ${Math.round(shown.height)} with the venue view`;
    } finally {
      await context.close();
    }
  });
}

// A desktop tall enough to start with the venue view beside the monitor: Expand monitor (F) moves
// the controls beside the monitor, which enlarges the picture (stacked, it was height-bound and
// Expand barely changed it), and Restore brings the venue view back.
await check('desktop 1440 × 900: Expand monitor enlarges the picture and Restore brings back the venue view', async () => {
  const { context, page } = await open();
  try {
    const width = async () => (await page.locator('.monitor-frame').boundingBox()).width;
    assert(await page.getByTestId('venue-canvas').isVisible(), 'venue view hidden on a 900 px desktop');
    const before = await width();
    await focusWorkspace(page);
    await page.keyboard.press('f');
    await page.waitForFunction(() => document.querySelector('.sim-app').dataset.expanded === 'true');
    const expanded = await width();
    assert(expanded >= before * 1.25, `Expand took the picture from ${Math.round(before)} to ${Math.round(expanded)} px wide`);
    const [monitor, controls] = await Promise.all(['.monitor-panel', '.controls-panel'].map((s) => page.locator(s).boundingBox()));
    assert(controls.x >= monitor.x + monitor.width, 'expanded, the controls are not beside the monitor');
    await page.getByRole('button', { name: 'Restore layout', exact: true }).click();
    assert(await page.getByTestId('venue-canvas').isVisible(), 'Restore did not bring the venue view back');
    assert(Math.abs((await width()) - before) <= 1, 'Restore did not return the picture to its size');
    return `${Math.round(before)} → ${Math.round(expanded)} px wide`;
  } finally {
    await context.close();
  }
});

// A phone in Safari shows about 613 pt of page (390 × 844 minus the URL bar and toolbar), and iOS
// draws the same CSS pixels about a tenth wider than desktop browsers. The Operate tab must keep
// the picture and the whole joystick pad on that first screen, with that slack, and the phone
// Settings tab must still offer Help, the theme toggle and the monitor guides.
for (const [label, viewport] of [
  ['phone 390 × 844', { width: 390, height: 844 }],
  ['phone in Safari 390 × 613', { width: 390, height: 613 }],
]) {
  await check(`${label}: picture and joystick share the first screen, even with wider text`, async () => {
    const { context, page } = await open({ context: { viewport } });
    const measure = () =>
      page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
        const flags = [...document.querySelectorAll('.sim-flags .flag')].map((flag) => flag.getBoundingClientRect());
        const nav = document.querySelector('.sbd-site-return');
        const head = document.querySelector('.monitor-panel .panel-head');
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          navOverflow: nav.scrollWidth - nav.clientWidth,
          flagRows: new Set(flags.map((r) => Math.round(r.top))).size,
          barHeight: rect('.sim-bar').height,
          headHidden: head.offsetParent === null,
          readoutHeight: rect('.readout').height,
          padBottom: rect('.joystick-pad').bottom,
          zoomBottom: rect('.zoom-buttons').bottom,
          railTop: rect('.mobile-rail').top,
        };
      });
    const normal = await measure();
    // The page's CSP blocks injected stylesheets; CSSOM edits are the honest way to widen text.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('.sim-app, .sim-app *, .sbd-site-return, .sbd-site-return *')) el.style.letterSpacing = '0.08em';
    });
    const wide = await measure();
    for (const [name, m] of [['normal text', normal], ['wide text', wide]]) {
      assert(m.overflow <= 1 && m.navOverflow <= 1, `${name}: horizontal overflow (page ${m.overflow}px, breadcrumb ${m.navOverflow}px)`);
      assert(m.flagRows === 1, `${name}: flags wrapped onto ${m.flagRows} rows`);
      assert(m.barHeight <= 60, `${name}: app bar is ${Math.round(m.barHeight)}px tall`);
      assert(m.headHidden, `${name}: monitor head shown on a phone`);
      assert(m.readoutHeight <= 30, `${name}: readout wrapped (${Math.round(m.readoutHeight)}px)`);
      assert(m.padBottom <= m.railTop, `${name}: joystick pad ends at ${Math.round(m.padBottom)}px, below the rail at ${Math.round(m.railTop)}px`);
      assert(m.zoomBottom <= m.railTop, `${name}: zoom buttons end at ${Math.round(m.zoomBottom)}px, below the rail at ${Math.round(m.railTop)}px`);
    }
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('.sim-app, .sim-app *, .sbd-site-return, .sbd-site-return *')) el.style.letterSpacing = '';
    });
    await page.getByRole('navigation', { name: 'Simulator sections' }).getByRole('button', { name: 'Settings' }).click();
    const utilities = page.getByRole('group', { name: 'Help, appearance and monitor guides' });
    assert(await utilities.isVisible(), 'phone Settings tab has no help/theme/guide controls');
    for (const name of ['Help and keyboard shortcuts', 'Dark mode', 'Safe area', 'Centre', 'Thirds']) {
      assert(await utilities.getByRole('button', { name, exact: true }).isVisible(), `phone utilities missing ${name}`);
    }
    await utilities.getByRole('button', { name: 'Thirds', exact: true }).click();
    assert((await exportProject(page)).session.preferences.guides.thirds === true, 'guide toggle on the Settings tab did not change the session');
    await context.close();
  });
}

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} camera simulator checks passed.`);
process.exit(failed.length ? 1 : 0);
