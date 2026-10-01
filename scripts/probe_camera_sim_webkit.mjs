#!/usr/bin/env node
// WebKit smoke for the FMP Camera Simulator. Field devices are iPads and iPhones, while the full
// acceptance probe (scripts/probe_camera_sim.mjs) runs in Chromium only (camera-sim audit Q1).
// This checks the published camera-sim/ in Playwright's WebKit with phone and tablet emulation:
// it starts, reports a render status, raises no page errors, fits the screen, and a held arrow
// key moves the camera. It is a smoke check, not a second acceptance suite, and emulated WebKit
// is not physical Safari.
//
// Usage: node scripts/probe_camera_sim_webkit.mjs   (needs `npx playwright install webkit`)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  let file = join(ROOT, decodeURIComponent(new URL(request.url, 'http://probe').pathname));
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const PAGE = `http://127.0.0.1:${server.address().port}/camera-sim/?diagnostics=1`;

const browser = await webkit.launch({ headless: true });
const results = [];
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
for (const name of ['iPhone 13', 'iPad Pro 11 landscape']) {
  const context = await browser.newContext({ ...devices[name] });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  const check = async (label, fn) => {
    try { const detail = await fn(); results.push({ ok: true, label: `${name}: ${label}`, detail }); }
    catch (error) { results.push({ ok: false, label: `${name}: ${label}`, detail: error.message }); }
  };
  await check('starts and reports a render status', async () => {
    await page.goto(PAGE);
    await page.waitForFunction(() => window.__fmpCameraSim && window.__fmpCameraSim.state().renderStatus !== 'starting', null, { timeout: 30000 });
    const status = await page.evaluate(() => window.__fmpCameraSim.state().renderStatus);
    // Without WebGL the simulator must say so rather than fail; either outcome is a working page.
    if (!['ok', 'unavailable'].includes(status)) throw new Error(`render status ${status}`);
    return `render ${status}; ${await page.evaluate(() => window.__fmpCameraSim.release().version)}`;
  });
  await check('fits the screen without horizontal scrolling', async () => {
    const { width, scroll } = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    if (scroll > width + 1) throw new Error(`scrollWidth ${scroll} > ${width}`);
    return `${width}px`;
  });
  await check('a held arrow key pans the camera', async () => {
    const tip = page.locator('dialog.onboarding-dialog[open]');
    if (await tip.count()) await tip.getByRole('button', { name: 'Skip' }).click();
    // Touching the monitor focuses the workspace (ui/keepFocus.ts); phones hide the monitor heading.
    await page.locator('#sim-workspace').focus();
    const pan = () => page.evaluate(() => window.__fmpCameraSim.snapshot().pose.pan);
    const start = await pan();
    await page.keyboard.down('ArrowRight'); await sleep(600); await page.keyboard.up('ArrowRight');
    const end = await pan();
    if (!(end > start)) throw new Error(`pan ${start} -> ${end}`);
    return `pan ${start.toFixed(2)}° -> ${end.toFixed(2)}°`;
  });
  await check('raises no page errors', async () => {
    if (problems.length) throw new Error(problems.slice(0, 3).join(' | '));
    return 'none';
  });
  await context.close();
}
await browser.close();
server.close();
for (const r of results) console.log(`${r.ok ? 'ok' : 'not ok'} - ${r.label}${r.detail ? `: ${r.detail}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ webkitSmoke: failed ? 'FAIL' : 'PASS', checks: results.length, failed }));
process.exit(failed ? 1 : 0);
