#!/usr/bin/env node
'use strict';

/*
 * Browser-level regression probe for Throwline Stage 3D calculation modeling.
 * Drives the real page in headless Chromium over the DevTools protocol and checks the
 * rendered readouts for: the audited production link, exact optical-stop snapping,
 * URL trust for FIELD VERIFIED transfers, field-stamp calibration against the planned
 * basis, direction-aware lens-shift limits, and room-boundary conflicts.
 *
 * Usage: node scripts/probe_throwline_stage3d.js [--base=http://127.0.0.1:8000/] [--chrome=/path/to/chrome] [--no-sandbox]
 * Without --base the probe serves the repository root itself on a random port.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

if (typeof WebSocket === 'undefined') {
  console.error('This probe requires a Node runtime with global WebSocket support.');
  process.exit(1);
}

const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith('--base='));
const chromeArg = args.find((arg) => arg.startsWith('--chrome='));
const root = path.resolve(__dirname, '..');
const chromeCandidates = [
  chromeArg ? chromeArg.slice('--chrome='.length) : '',
  process.env.CHROME_BIN || '',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'
].filter(Boolean);
const chromeBin = chromeCandidates.find((candidate) => fs.existsSync(candidate));

const AUDIT_QUERY = 'mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=7.3229&min=0.978&max=1.32';
const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log(`ok - ${name}`);
  else { failures.push(name); console.log(`not ok - ${name}${detail ? ` :: ${JSON.stringify(detail)}` : ''}`); }
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      // still starting
    }
    await delay(250);
  }
  throw new Error(`${url} did not become reachable.`);
}

async function startStaticServer() {
  const port = 8700 + Math.floor(Math.random() * 300);
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
  await waitForHttp(`http://127.0.0.1:${port}/ProjectorThrow/Stage3D.html`);
  return { server, baseUrl: `http://127.0.0.1:${port}/` };
}

async function main() {
  if (!chromeBin) throw new Error(`Chrome binary not found. Tried: ${chromeCandidates.join(', ')}`);
  let baseUrl = baseArg ? baseArg.slice('--base='.length).replace(/\/?$/, '/') : '';
  let staticServer = null;
  if (!baseUrl) { staticServer = await startStaticServer(); baseUrl = staticServer.baseUrl; }
  const stageUrl = (query) => `${baseUrl}ProjectorThrow/Stage3D.html?${query}`;

  const port = 9500 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-throwline-stage-probe-'));
  // Root containers (CI runners, remote sessions) cannot use Chrome's sandbox; local operator runs keep it on.
  const sandboxFlags = args.includes('--no-sandbox') || (typeof process.getuid === 'function' && process.getuid() === 0) ? ['--no-sandbox'] : [];
  // A remote --base behind an egress proxy: Chrome does not read HTTPS_PROXY on its own, so hand it the proxy
  // explicitly (its CA is expected in the browser trust store); local bases stay direct.
  const remoteBase = !/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(baseUrl);
  const proxyFlags = remoteBase && process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`, '--proxy-bypass-list=127.0.0.1;localhost'] : [];
  const chrome = spawn(chromeBin, [
    ...sandboxFlags, ...proxyFlags,
    '--headless=new', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-background-networking', '--disable-component-update', '--no-default-browser-check', '--no-first-run',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeStderr = '';
  chrome.stderr.on('data', (chunk) => { chromeStderr += chunk; });
  chrome.on('exit', (code, signal) => { if (code !== null && code !== 0) console.error(`Chrome exited early (${code}${signal ? ` ${signal}` : ''}):\n${chromeStderr.split('\n').filter((line) => !/dbus/.test(line)).slice(0, 12).join('\n')}`); });

  try {
    await waitForHttp(`http://127.0.0.1:${port}/json/version`);
    const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

    let sequence = 0;
    const exceptions = [];
    const pending = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') { exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text || 'Runtime exception'); return; }
      if (!message.id || !pending.has(message.id)) return;
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(JSON.stringify(message.error))); else callbacks.resolve(message.result);
    };
    const cdp = (method, params = {}) => { const id = sequence += 1; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

    async function evaluate(expression) {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    async function open(query) {
      await cdp('Page.navigate', { url: stageUrl(query) });
      let ready = false;
      for (let attempt = 0; attempt < 160 && !ready; attempt += 1) {
        ready = await evaluate(`Boolean(document.getElementById('fRatio') && document.getElementById('provenanceBadge')?.textContent && document.documentElement.dataset.calculationMode)`);
        if (!ready) await delay(125);
      }
      if (!ready) throw new Error(`Stage 3D never became ready at ${stageUrl(query)}: ${await evaluate('JSON.stringify({ href: location.href, title: document.title, readyState: document.readyState })')}`);
      await delay(150);
      return readout();
    }
    const READOUT = `(() => { const text = (id) => document.getElementById(id)?.textContent.trim() || ''; return {
      mode: document.documentElement.dataset.calculationMode || '', projection: document.documentElement.dataset.projectionState || '',
      badge: text('provenanceBadge'), gate: text('stageCalculationGate'), ratio: text('fRatio'), image: text('fImg'), spill: text('fSpill'), shift: text('fShift'),
      shiftColor: document.getElementById('fShift')?.style.color || '', distance: text('dv'), alert: text('collisionAlert'), summary: text('sceneSummary'), lens: text('fLens') }; })()`;
    const readout = () => evaluate(READOUT);
    const click = async (id) => { await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`); await delay(120); return readout(); };
    const setInput = async (id, value, eventName = 'input') => { await evaluate(`(() => { const input = document.getElementById(${JSON.stringify(id)}); input.value = ${JSON.stringify(String(value))}; input.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true })); })()`); await delay(120); return readout(); };

    // 1. The exact audited production link, interpreted in feet.
    const audit = await open(AUDIT_QUERY);
    check('audit link resolves as a manual estimate', audit.mode === 'manual' && audit.badge === 'MANUAL ESTIMATE', audit);
    check('audit link reports the required ratio 0.366:1', audit.ratio === '0.366:1', audit);
    check('audit link verdict is undershoot', audit.projection === 'undershoot', audit);
    check('audit link image is 7\' 5¾" × 4\' 8¼"', audit.image === '7\' 5¾" × 4\' 8¼"', audit);
    check('audit link reports the +77.5% vertical shift with unknown limits', audit.shift === '+77.5% V · limits unknown', audit);
    check('audit link has no spatial conflicts in the default 40 × 40 × 20 room', audit.alert === 'No spatial conflicts', audit);

    // 2. Snap controls must land inside the envelope.
    const wide = await click('bw');
    check('snap wide lands at 19\' 6¾" and fits', wide.distance === '19\' 6¾"' && ['near-limit', 'safe'].includes(wide.projection), wide);
    const tele = await click('bt');
    check('snap tele lands at 26\' 4¾" and fits', tele.distance === '26\' 4¾"' && ['near-limit', 'safe'].includes(tele.projection), tele);
    const mid = await click('bm');
    check('snap mid lands in the conservative band', mid.projection === 'safe', mid);

    // 3. Field stamp keeps the planned basis: 12 ft throw / 10 ft image on a 20 ft raster corrects the mark to 24 ft.
    await setInput('measuredDistance', 12);
    await setInput('measuredWidth', 10);
    await setInput('verifiedBy', 'Probe');
    const stamped = await click('stampVerification');
    check('stamped unit is FIELD VERIFIED', stamped.badge === 'FIELD VERIFIED' && stamped.mode === 'field_verified', stamped);
    check('stamped unit at the old mark reads undershoot against the corrected 24 ft mark', stamped.projection === 'undershoot', stamped);
    const corrected = await click('bw');
    check('snapping the stamped unit moves it to exactly 24\' 0"', corrected.distance === '24\' 0"' && corrected.projection === 'safe', corrected);
    check('driving edit after the stamp returns the unit to a manual estimate', corrected.badge === 'MANUAL ESTIMATE', corrected);

    // 4. URL trust for field verification.
    const forged = await open('mode=field_verified&ratio=1.2&stamp=verified');
    check('a bare ratio plus stamp does not assert FIELD VERIFIED', forged.badge !== 'FIELD VERIFIED' && forged.mode === 'manual' && /re-stamp/i.test(forged.gate), forged);
    const evidence = await open('mode=field_verified&ratio=1.2&stamp=2026-09-04T12%3A00%3A00.000Z&md=12&mw=10&vb=Dave&w=20&basisW=20&rasterAr=1.6&dist=24');
    check('a planner transfer carrying its measurement is FIELD VERIFIED at the corrected mark', evidence.badge === 'FIELD VERIFIED' && evidence.projection === 'safe', evidence);
    const mismatch = await open('mode=field_verified&ratio=1.5&stamp=2026-09-04T12%3A00%3A00.000Z&md=12&mw=10&w=20&basisW=20&dist=24');
    check('a ratio that disagrees with its measurement is demoted', mismatch.badge !== 'FIELD VERIFIED', mismatch);
    const noRatio = await open('mode=field_verified&stamp=2026-09-04T12%3A00%3A00.000Z');
    check('a field transfer without any ratio is blocked', noRatio.mode === 'blocked' && noRatio.projection !== 'safe', noRatio);

    // 5. Direction-aware lens shift.
    const downward = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=14&dist=22&min=0.978&max=1.32&su=10&sd=80');
    check('a −35% downward shift is within the 80% down limit', downward.shift === '-35.0% V' && downward.shiftColor === 'var(--info)', downward);
    const upward = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=2&dist=22&min=0.978&max=1.32&su=10&sd=80');
    check('an upward shift beyond the 10% up limit is flagged', /exceeds up limit/.test(upward.shift) && upward.shiftColor === 'var(--safety)', upward);
    const lateral = await setInput('px', -6);
    check('horizontal shift is reported alongside vertical', /H/.test(lateral.shift) && /\+/.test(lateral.shift.split('·')[1] || ''), lateral);

    // 6. Room boundaries.
    const tall = await open('mode=manual&w=20&bottom=10&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=22&min=0.978&max=1.32');
    const lowCeiling = await setInput('roomH', 8);
    check('an 8 ft ceiling under a 21 ft screen top is a spatial conflict', /screen extends above ceiling/.test(lowCeiling.alert), lowCeiling);
    const restored = await setInput('roomH', 30);
    check('raising the ceiling clears the conflict', restored.alert === 'No spatial conflicts', restored);
    const outside = await setInput('px', 30);
    check('a projector outside the room width is a spatial conflict', /outside room width/.test(outside.alert), outside);

    check('no uncaught browser exceptions', exceptions.length === 0, exceptions);
  } finally {
    chrome.kill('SIGKILL');
    if (staticServer) staticServer.server.kill('SIGKILL');
    fs.rmSync(profile, { recursive: true, force: true });
  }

  if (failures.length) { console.error(`Throwline Stage 3D probe failed: ${failures.length} check(s).`); process.exit(1); }
  console.log(`Throwline Stage 3D probe passed (${AUDIT_QUERY}).`);
}

main().catch((error) => { console.error(error); process.exit(1); });
