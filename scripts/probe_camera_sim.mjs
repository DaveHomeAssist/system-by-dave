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
  if (options.init) await context.addInitScript(options.init);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  await page.goto(options.url || PAGE);
  await page.waitForFunction(() => window.__fmpCameraSim && window.__fmpCameraSim.state().renderStatus !== 'starting', null, { timeout: 15000 });
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
    await page.getByText('Unsupported project version 2').waitFor();
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

await check('the standalone offline file runs from disk with networking disabled', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
  await context.close();
});

// ------------------------------------------------------------------------------------------
// 7. Layouts
// ------------------------------------------------------------------------------------------
for (const [label, viewport, expectation] of [
  ['desktop 1440', { width: 1440, height: 900 }, 'venue'],
  ['680 px breakpoint', { width: 680, height: 900 }, 'rail'],
  ['phone 390', { width: 390, height: 844 }, 'rail'],
  ['ultrawide 32:9', { width: 3840, height: 1080 }, 'docked'],
]) {
  await check(`layout ${label}: no horizontal overflow and the right navigation`, async () => {
    const { context, page } = await open({ context: { viewport } });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
    if (expectation === 'venue') assert(await page.getByTestId('venue-canvas').isVisible(), 'venue view hidden on desktop');
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

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} camera simulator checks passed.`);
process.exit(failed.length ? 1 : 0);
