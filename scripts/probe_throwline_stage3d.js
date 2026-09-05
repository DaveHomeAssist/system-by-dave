#!/usr/bin/env node
'use strict';

/*
 * Browser-level regression probe for Throwline Stage 3D calculation modeling.
 * Drives the real page in headless Chromium over the DevTools protocol and checks the
 * rendered readouts and runtime boundaries for: the audited production link, exact
 * optical-stop snapping, visible field-validation errors, URL trust for FIELD VERIFIED
 * transfers, field-stamp calibration, direction-aware lens-shift limits, catalog shift limits with
 * the maker's combined up-and-sideways rule, room conflicts,
 * WebGL context recovery, export object names, and a real offline reload.
 *
 * Usage: node scripts/probe_throwline_stage3d.js [--base=http://127.0.0.1:8000/] [--chrome=/path/to/chrome] [--no-sandbox] [--no-webgl]
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

async function waitForPath(filePath, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) return filePath;
    await delay(100);
  }
  throw new Error(`Download did not finish: ${filePath}`);
}

function glbNodeNames(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(16) !== 0x4e4f534a) {
    throw new Error(`${filePath} is not a valid binary glTF file.`);
  }
  const jsonLength = buffer.readUInt32LE(12);
  const document = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  return (document.nodes || []).map((node) => node.name).filter(Boolean);
}

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
  const downloadDir = path.join(profile, 'downloads');
  fs.mkdirSync(downloadDir);
  // Root containers (CI runners, remote sessions) cannot use Chrome's sandbox; local operator runs keep it on.
  const sandboxFlags = args.includes('--no-sandbox') || (typeof process.getuid === 'function' && process.getuid() === 0) ? ['--no-sandbox'] : [];
  // A remote --base behind an egress proxy: Chrome does not read HTTPS_PROXY on its own, so hand it the proxy
  // explicitly (its CA is expected in the browser trust store); local bases stay direct.
  const remoteBase = !/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(baseUrl);
  const proxyFlags = remoteBase && process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`, '--proxy-bypass-list=127.0.0.1;localhost'] : [];
  // --no-webgl disables WebGL so the degraded renderer path is exercised: every numerical readout must match a WebGL run.
  const noWebgl = args.includes('--no-webgl');
  const chrome = spawn(chromeBin, [
    ...sandboxFlags, ...proxyFlags, ...(noWebgl ? ['--disable-3d-apis'] : []),
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
    await cdp('Network.enable');
    await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true });
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
        try {
          ready = await evaluate(`Boolean(document.getElementById('fRatio') && document.getElementById('provenanceBadge')?.textContent && document.documentElement.dataset.calculationMode)`);
        } catch (error) {
          ready = false;
        }
        if (!ready) await delay(125);
      }
      if (!ready) throw new Error(`Stage 3D never became ready at ${stageUrl(query)}: ${await evaluate('JSON.stringify({ href: location.href, title: document.title, readyState: document.readyState })')}`);
      await evaluate(`(() => { const dialog=document.getElementById('onboardingDialog'); if(dialog?.open)dialog.close(); })()`);
      await delay(150);
      return readout();
    }
    const READOUT = `(() => { const text = (id) => document.getElementById(id)?.textContent.trim() || ''; return {
      mode: document.documentElement.dataset.calculationMode || '', projection: document.documentElement.dataset.projectionState || '',
      badge: text('provenanceBadge'), gate: text('stageCalculationGate'), ratio: text('fRatio'), image: text('fImg'), spill: text('fSpill'), shift: text('fShift'),
      shiftColor: document.getElementById('fShift')?.style.color || '', distance: text('dv'), alert: text('collisionAlert'), summary: text('sceneSummary'), lens: text('fLens'),
      headline: text('hState'), note: text('hNote'), wide: text('hWide'), tele: text('hTele'), safeWidth: document.getElementById('bSafe')?.style.width || '', renderer: document.documentElement.dataset.renderer || 'ready', status: text('stageStatus'), aspect: document.getElementById('ar')?.selectedOptions[0]?.textContent.trim() || '' }; })()`;
    const readout = () => evaluate(READOUT);
    const click = async (id) => { await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`); await delay(120); return readout(); };
    const setInput = async (id, value, eventName = 'input') => { await evaluate(`(() => { const input = document.getElementById(${JSON.stringify(id)}); input.value = ${JSON.stringify(String(value))}; input.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true })); })()`); await delay(120); return readout(); };

    // 1. The exact audited production link, interpreted in feet.
    const audit = await open(AUDIT_QUERY);
    check('audit link resolves as a manual estimate', audit.mode === 'manual' && audit.badge === 'MANUAL ESTIMATE', audit);
    check('audit link reports the required ratio 0.366:1', audit.ratio === '0.366:1', audit);
    check('audit link verdict is undershoot', audit.projection === 'undershoot', audit);
    check('audit link image is 7\' 5¾" × 4\' 8¼"', audit.image === '7\' 5¾" × 4\' 8¼"', audit);
    check('audit link reports the +77.5% vertical shift with lens limits not set', audit.shift === '+77.5% V · lens limits not set', audit);
    check('audit link has no spatial conflicts in the default 40 × 40 × 20 room', audit.alert === 'Nothing in the way', audit);

    // 2. Snap controls must land inside the envelope.
    const wide = await click('bw');
    check('snap wide lands at 19\' 6¾" and fits', wide.distance === '19\' 6¾"' && ['near-limit', 'safe'].includes(wide.projection), wide);
    const tele = await click('bt');
    check('snap tele lands at 26\' 4¾" and fits', tele.distance === '26\' 4¾"' && ['near-limit', 'safe'].includes(tele.projection), tele);
    const mid = await click('bm');
    check('snap mid lands in the conservative band', mid.projection === 'safe', mid);

    // 3. Field errors are visible and actionable before a valid stamp is accepted.
    await evaluate(`document.getElementById('stampVerification').click()`);
    await delay(120);
    const invalidFieldStamp = await evaluate(`(() => { const error=document.getElementById('fieldVerificationError'); return { hidden:error.hidden, text:error.textContent.trim(), role:error.getAttribute('role'), focus:document.activeElement?.id, invalid:['measuredDistance','measuredWidth','verifiedBy'].map(id=>document.getElementById(id).getAttribute('aria-invalid')) }; })()`);
    check('blank Field Verify shows a visible alert', invalidFieldStamp.hidden === false && invalidFieldStamp.role === 'alert' && /measured throw/i.test(invalidFieldStamp.text), invalidFieldStamp);
    check('blank Field Verify marks every field invalid and focuses the first field', invalidFieldStamp.focus === 'measuredDistance' && invalidFieldStamp.invalid.every(value => value === 'true'), invalidFieldStamp);

    // 4. Field stamp keeps the planned basis: 12 ft throw / 10 ft image on a 20 ft raster corrects the mark to 24 ft.
    await setInput('measuredDistance', 12);
    await setInput('measuredWidth', 10);
    await setInput('verifiedBy', 'Probe');
    const stamped = await click('stampVerification');
    check('stamped unit is FIELD VERIFIED', stamped.badge === 'FIELD VERIFIED' && stamped.mode === 'field_verified', stamped);
    check('stamped unit at the old mark reads undershoot against the corrected 24 ft mark', stamped.projection === 'undershoot', stamped);
    const corrected = await click('bw');
    check('snapping the stamped unit moves it to exactly 24\' 0" as a nominal verify mark', corrected.distance === '24\' 0"' && corrected.projection === 'nominal' && /^Worth a look/.test(corrected.headline), corrected);
    check('driving edit after the stamp returns the unit to a manual estimate', corrected.badge === 'MANUAL ESTIMATE', corrected);
    check('the stamped readout used the measured mark with no verify band', stamped.wide === '24\' 0"' && stamped.safeWidth === '0%' && /^Needs a fix/.test(stamped.headline), stamped);

    // 5. URL trust for field verification.
    const forged = await open('mode=field_verified&ratio=1.2&stamp=verified');
    check('a bare ratio plus stamp does not assert FIELD VERIFIED', forged.badge !== 'FIELD VERIFIED' && forged.mode === 'manual' && /re-measure/i.test(forged.gate), forged);
    const evidence = await open('mode=field_verified&ratio=1.2&stamp=2026-09-04T12%3A00%3A00.000Z&md=12&mw=10&vb=Dave&w=20&basisW=20&rasterAr=1.6&dist=24');
    check('a planner transfer carrying its measurement is FIELD VERIFIED at the corrected mark', evidence.badge === 'FIELD VERIFIED' && evidence.projection === 'safe', evidence);
    const mismatch = await open('mode=field_verified&ratio=1.5&stamp=2026-09-04T12%3A00%3A00.000Z&md=12&mw=10&w=20&basisW=20&dist=24');
    check('a ratio that disagrees with its measurement is demoted', mismatch.badge !== 'FIELD VERIFIED', mismatch);
    const noRatio = await open('mode=field_verified&stamp=2026-09-04T12%3A00%3A00.000Z');
    check('a field transfer without any ratio is blocked', noRatio.mode === 'blocked' && noRatio.projection !== 'safe', noRatio);

    // 6. Direction-aware lens shift.
    const downward = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=14&dist=22&min=0.978&max=1.32&su=10&sd=80');
    check('a −35% downward shift is within the 80% down limit', downward.shift === '-35.0% V' && downward.shiftColor === 'var(--info)', downward);
    const upward = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=2&dist=22&min=0.978&max=1.32&su=10&sd=80');
    check('an upward shift beyond the 10% up limit is flagged', /more than the lens allows up/.test(upward.shift) && upward.shiftColor === 'var(--safety)', upward);
    const lateral = await setInput('px', -6);
    check('horizontal shift is reported alongside vertical', /H/.test(lateral.shift) && /\+/.test(lateral.shift.split('·')[1] || ''), lateral);

    // 6b. Up and sideways together. Sony publishes the combined range as a formula, so passing it is a fix; Panasonic only draws it, so it is a check.
    // Sony VPLL-Z8008 at 16:9, 19 ft on a 20 ft basis: image 20 × 11.25, screen centre 9.625 ft; lens at 6.25 ft = +30% up; x = −3 ft aims 15% right → 30/50 + 15/18 > 1.
    const sonyShift = await open('mode=verified_image_width&projector=PRJ-003&lens=LNS-010&profile=OPT-005&w=20&bottom=4&ar=1.7777778&basisW=20&rasterAr=1.7777778&lh=6.25&dist=19');
    check('a catalog pair carries the maker shift limits without any limits in the link', /^\+30\.0% V · limits from maker data$/.test(sonyShift.shift) && /^Ready/.test(sonyShift.headline), sonyShift);
    const sonyCombined = await setInput('px', -3);
    check('up and sideways past Sony’s published formula is a fix', /more than the lens allows up and sideways together/.test(sonyCombined.shift) && sonyCombined.shiftColor === 'var(--safety)' && /^Needs a fix · the lens can’t shift the picture that far up and to the right at the same time/.test(sonyCombined.headline), sonyCombined);
    // Panasonic ET-D3QT500 at 17:9, 50 ft: image 20 × 10.55, screen centre 9.27 ft; lens at 5.5 ft ≈ +35.8% up; x = −2.5 ft aims 12.5% right → oval use ≈ 1.11.
    await open('mode=verified_image_width&projector=PRJ-001&lens=LNS-004&profile=OPT-002&w=20&bottom=4&ar=1.8962963&basisW=20&rasterAr=1.8962963&lh=5.5&dist=50');
    await setInput('roomD', 60); // the PT-RQ50K body at a 50 ft mark needs more than the default 40 ft room
    const panaCombined = await setInput('px', -2.5);
    check('past the oval for a drawn-only Panasonic range is a check, not a fail', /may be more than the lens allows up and sideways together/.test(panaCombined.shift) && panaCombined.shiftColor === 'var(--hazard)' && /^Worth a look · the lens may not shift the picture that far up and to the right/.test(panaCombined.headline), panaCombined);
    const edited = await open('mode=verified_image_width&projector=PRJ-003&lens=LNS-010&profile=OPT-005&w=20&bottom=4&ar=1.7777778&basisW=20&rasterAr=1.7777778&lh=6.25&dist=19&su=40');
    check('a link that edits a limit is honoured over the catalog and no longer reads as maker data', edited.shift === '+30.0% V', edited);

    // 6c. Units: a link marked in metres is the same scene in feet, and the display can switch to metres.
    const metricLink = await open('mode=manual&u=m&w=6.096&bottom=1.2192&ar=1.777778&basisW=6.096&rasterAr=1.6&lh=1.8288&dist=6.7056&min=0.978&max=1.32');
    const measureFact = () => evaluate(`document.getElementById('fMeasure').textContent.trim()`);
    check('a link marked in metres reads as the same 20 ft / 22 ft scene', metricLink.distance === '22\' 0"' && metricLink.ratio === '1.100:1' && /link values read as metres/.test(await measureFact()), metricLink);
    const metricView = await click('unitToggle');
    check('the unit toggle shows the set mark and image in metres', metricView.distance === '6.71 m' && /^6\.10 m × 3\.81 m$/.test(metricView.image) && /^metres/.test(await measureFact()), metricView);
    await setInput('measuredDistance', 3.66); await setInput('measuredWidth', 3.05); await setInput('verifiedBy', 'Probe'); // 1.2:1 typed in metres, within the 0.01 step
    const metricStamp = await click('stampVerification');
    check('a stamp typed in metres is stored as the 1.2:1 ratio and marks 7.32 m', metricStamp.badge === 'FIELD VERIFIED' && metricStamp.wide === '7.32 m', metricStamp);
    const backToFeet = await click('unitToggle');
    check('switching back to feet keeps the same verified scene', backToFeet.wide === '24\' 0"' && backToFeet.badge === 'FIELD VERIFIED' && /^feet and inches/.test(await measureFact()), backToFeet);

    // 7. Room boundaries.
    const tall = await open('mode=manual&w=20&bottom=10&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=22&min=0.978&max=1.32');
    const lowCeiling = await setInput('roomH', 8);
    check('an 8 ft ceiling under a 21 ft screen top is a spatial conflict', /top of the screen is above the ceiling/.test(lowCeiling.alert), lowCeiling);
    const restored = await setInput('roomH', 30);
    check('raising the ceiling clears the conflict', restored.alert === 'Nothing in the way', restored);
    const outside = await setInput('px', 30);
    check('a projector outside the room width is a spatial conflict', /outside the side walls/.test(outside.alert), outside);

    // 8. Degraded renderer parity: with --no-webgl a live 2D plan replaces the 3D canvas and every fact stays identical.
    const rendererState = await open(AUDIT_QUERY);
    check(noWebgl ? 'renderer reports the live 2D fallback without WebGL' : 'renderer is ready with WebGL', noWebgl ? rendererState.renderer === 'unavailable' && /2D plan view is active/i.test(rendererState.status) : rendererState.renderer === 'ready', rendererState);
    let fallbackBefore = null;
    if (noWebgl) {
      fallbackBefore = await evaluate(`(() => { const fallback=document.getElementById('stageFallback'); const active=fallback.querySelector('[data-fallback-projector][data-active="true"]'); return { hidden:fallback.hidden, display:getComputedStyle(fallback).display, title:document.getElementById('stageFallbackTitle').textContent.trim(), description:document.getElementById('stageFallbackSvgDescription').textContent.trim(), projectors:fallback.querySelectorAll('[data-fallback-projector]').length, beams:fallback.querySelectorAll('.fallback-beam').length, transform:active?.getAttribute('transform')||'', webglDisplay:getComputedStyle(document.querySelector('three-d-stage')).display, unavailable3DControls:[...document.querySelectorAll('[data-cam],#resetView,#tenvelope,#tshift,#tdimensions')].map(control=>control.disabled), exports:[document.getElementById('mobileObj').disabled,document.getElementById('mobileGlb').disabled] }; })()`);
      check('no-WebGL mode visibly replaces the failed canvas with a populated 2D plan', fallbackBefore.hidden === false && fallbackBefore.display !== 'none' && fallbackBefore.webglDisplay === 'none' && fallbackBefore.title === '2D plan view active' && fallbackBefore.projectors > 0 && fallbackBefore.beams > 0 && /Active set mark/.test(fallbackBefore.description), fallbackBefore);
      check('2D fallback disables controls that only operate the 3D view', fallbackBefore.unavailable3DControls.length === 9 && fallbackBefore.unavailable3DControls.every(Boolean), fallbackBefore);
      check('2D fallback keeps model downloads disabled', fallbackBefore.exports.every(Boolean), fallbackBefore);
    }
    check('headline is the aggregate installation check, not the bare ratio fit', /^(Needs a fix|Worth a look|Ready)/.test(rendererState.headline) && /too close/i.test(rendererState.headline), rendererState);
    const slider = await setInput('d', 10);
    check('distance slider stays live and drives the readout', slider.distance === '10\' 0"' && slider.ratio === '0.500:1', slider);
    if (noWebgl) {
      const fallbackAfter = await evaluate(`(() => { const fallback=document.getElementById('stageFallback'); const active=fallback.querySelector('[data-fallback-projector][data-active="true"]'); return { setMark:fallback.dataset.activeSetMark, transform:active?.getAttribute('transform')||'', description:document.getElementById('stageFallbackSvgDescription').textContent.trim() }; })()`);
      check('2D fallback redraws from the same live scene state', fallbackAfter.setMark === '10' && fallbackAfter.transform !== fallbackBefore.transform && /Active set mark 10\' 0"/.test(fallbackAfter.description), { before:fallbackBefore, after:fallbackAfter });
    }

    // 9. A real WebGL loss must visibly pause and then recover the existing scene.
    if (!noWebgl) {
      const beforeLoss = await readout();
      const lossExtension = await evaluate(`(() => { const stage=document.querySelector('three-d-stage'); const gl=stage?._renderer?.getContext(); const extension=gl?.getExtension('WEBGL_lose_context'); if(!extension)return false; window.__throwlineWebglLoss=extension; extension.loseContext(); return true; })()`);
      check('browser exposes WEBGL_lose_context for the runtime recovery regression', lossExtension === true, { lossExtension });
      let lostState = null;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        lostState = await evaluate(`(() => { const stage=document.querySelector('three-d-stage'); return { renderer:document.documentElement.dataset.renderer, fallbackHidden:stage.shadowRoot.querySelector('.err').hidden, fallback:stage.shadowRoot.querySelector('.err').textContent.trim(), exports:[...stage.shadowRoot.querySelectorAll('.toolbar button')].map(button=>button.disabled), ratio:document.getElementById('fRatio').textContent.trim(), mobile:[document.getElementById('mobileObj').disabled,document.getElementById('mobileGlb').disabled] }; })()`);
        if (lostState.renderer === 'recovering') break;
        await delay(100);
      }
      check('WebGL loss shows the recovery fallback without losing calculated facts', lostState?.renderer === 'recovering' && lostState.fallbackHidden === false && /3D view paused/.test(lostState.fallback) && lostState.ratio === beforeLoss.ratio, lostState);
      check('WebGL loss disables every model export', lostState?.exports.every(Boolean) && lostState?.mobile.every(Boolean), lostState);
      if (lossExtension) await evaluate(`window.__throwlineWebglLoss.restoreContext()`);
      let recoveredState = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        recoveredState = await evaluate(`(() => { const stage=document.querySelector('three-d-stage'); return { renderer:document.documentElement.dataset.renderer, fallbackHidden:stage.shadowRoot.querySelector('.err').hidden, exports:[...stage.shadowRoot.querySelectorAll('.toolbar button')].map(button=>button.disabled), status:document.getElementById('stageStatus').textContent.trim() }; })()`);
        if (recoveredState.renderer === 'ready') break;
        await delay(100);
      }
      check('WebGL restoration returns the same scene to ready state', recoveredState?.renderer === 'ready' && recoveredState.fallbackHidden === true && recoveredState.exports.every(value => value === false) && /recovered/i.test(recoveredState.status), recoveredState);

      // 10. Actual OBJ and GLB downloads must contain the object names promised in the UI.
      await evaluate(`document.querySelector('three-d-stage').runExport('obj')`);
      await waitForPath(path.join(downloadDir, 'throwline-stage.obj'));
      await waitForPath(path.join(downloadDir, 'throwline-stage.mtl'));
      await evaluate(`document.querySelector('three-d-stage').runExport('glb')`);
      await waitForPath(path.join(downloadDir, 'throwline-stage.glb'));
      const objNames = [...fs.readFileSync(path.join(downloadDir, 'throwline-stage.obj'), 'utf8').matchAll(/^o (.+)$/gm)].map(match => match[1]);
      const glbNames = glbNodeNames(path.join(downloadDir, 'throwline-stage.glb'));
      const promisedNames = ['screen', 'projector_body', 'lens_barrel', 'cart'];
      check('OBJ export uses every promised object name', promisedNames.every(name => objNames.includes(name)) && !objNames.includes('screen_surface'), { promisedNames, objNames });
      check('GLB export uses every promised object name', promisedNames.every(name => glbNames.includes(name)) && !glbNames.includes('screen_surface'), { promisedNames, glbNames });
    }

    // 11. Transfer bounds are not silently narrowed: a 50 ft screen at an 80 ft throw stays out of range.
    const wide50 = await open('mode=manual&w=50&bottom=4&ar=1.777778&basisW=50&rasterAr=1.6&lh=6&dist=80&min=0.978&max=1.32');
    check('a 50 ft screen / 80 ft throw transfer is preserved and reads overshoot', wide50.ratio === '1.600:1' && wide50.projection === 'overshoot' && wide50.distance === '80\' 0"', wide50);
    const custom = await open('mode=manual&w=20&bottom=4&ar=2&basisW=20&rasterAr=2&lh=6&dist=22&min=0.978&max=1.32');
    check('a custom 2.000:1 aspect shows as the selected option', /2\.000:1/.test(custom.aspect), custom);

    // 12. Fixed lens: no safe interior, nominal verify band, no negative safe bar.
    const fixed = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=13&min=0.65&max=0.65');
    check('a fixed 0.65:1 lens at 13 ft reads as a nominal verify mark with an empty safe band', fixed.projection === 'nominal' && /one set distance/i.test(fixed.note) && fixed.safeWidth === '0%', fixed);
    const tol10 = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=21&min=0.978&max=1.32&tolPct=10');
    check('a transferred 10% tolerance narrows the safe band so 21 ft is near-limit', tol10.projection === 'near-limit' && /10%/.test(tol10.note), tol10);
    const tol5 = await open('mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=21&min=0.978&max=1.32');
    check('the default 5% tolerance keeps 21 ft inside the safe band', tol5.projection === 'safe', tol5);

    // 13. Verified catalog transfers: the maker's width-based ratio for the chosen picture shape, and a block for other shapes.
    const verified = await open('mode=verified_image_width&projector=PRJ-001&lens=LNS-004&profile=OPT-002&w=20&bottom=4&ar=1.8962963&basisW=20&rasterAr=1.8962963&lh=6&dist=50');
    check('a verified Panasonic pair opens MANUFACTURER VERIFIED with the 17:9 ratio 2.00–3.41', verified.badge === 'MANUFACTURER VERIFIED' && verified.wide === '40\' 0"' && verified.tele === '68\' 2½"' && verified.projection === 'safe', verified);
    const variant = await open('mode=verified_image_width&projector=PRJ-001&lens=LNS-004&profile=OPT-002&w=20&bottom=4&ar=1.6&basisW=20&rasterAr=1.6&lh=6&dist=50');
    check('the same pair at a 16:10 picture uses the maker\'s 16:10 ratio 2.36–4.03', variant.badge === 'MANUFACTURER VERIFIED' && variant.wide === '47\' 2½"' && variant.projection === 'safe', variant);
    const uncovered = await open('mode=verified_image_width&projector=PRJ-001&lens=LNS-004&profile=OPT-002&w=20&bottom=4&ar=2.35&basisW=20&rasterAr=2.35&lh=6&dist=50');
    check('a picture shape the maker did not measure cannot calculate as verified', uncovered.mode === 'partial' && /picture shapes/i.test(uncovered.gate), uncovered);
    const sony = await open('mode=verified_image_width&projector=PRJ-003&lens=LNS-010&profile=OPT-005&w=20&bottom=4&ar=1.7777778&basisW=20&rasterAr=1.7777778&lh=6&dist=19');
    check('the Sony pair at 16:9 uses the 0.85–1.09 width basis', sony.badge === 'MANUFACTURER VERIFIED' && sony.wide === '17\' 0"' && sony.tele === '21\' 9½"', sony);
    const barco = await open('mode=verified_image_width&projector=PRJ-004&lens=LNS-013&profile=OPT-008&w=20&bottom=4&ar=1.6&basisW=20&rasterAr=1.6&lh=6&dist=30');
    check('the Barco pair stays paused with a plain-language reason', barco.badge !== 'MANUFACTURER VERIFIED' && /CAN’T CALCULATE YET/.test(barco.gate) && /width basis|Barco/.test(barco.gate), barco);

    // 13b. Projector body from the catalog: back wall, keep-clear margin, and the body facts line.
    // Lens front at 44 ft; the PT-RQ50K body (3.51 ft) starts 0.68 ft behind it, so its back sits at 48.19 ft.
    await open('mode=verified_image_width&projector=PRJ-001&lens=LNS-004&profile=OPT-002&w=20&bottom=4&ar=1.8962963&basisW=20&rasterAr=1.8962963&lh=6&dist=44&clr=1');
    const bodied = await setInput('roomD', 60);
    const bodyFacts = await evaluate(`document.getElementById('fBody').textContent.trim()`);
    check('a catalog pair carries the maker body dimensions', /from maker data/.test(bodyFacts) && /2' 4/.test(bodyFacts) && bodied.alert === 'Nothing in the way', { bodyFacts, alert: bodied.alert });
    const throughWall = await setInput('roomD', 48);
    check('a body that ends behind the back wall is a fix', /Fix · .*back of the projector is through the back wall/.test(throughWall.alert) && /^Needs a fix/.test(throughWall.headline), throughWall);
    const tightMargin = await setInput('roomD', 49);
    check('a body inside the keep-clear margin is a check, not a fail', /Check · less than 1 ft behind the projector/.test(tightMargin.alert) && /^Worth a look/.test(tightMargin.headline), tightMargin);
    const roomy = await setInput('roomD', 52);
    check('enough room behind the body clears the alert', roomy.alert === 'Nothing in the way', roomy);
    const cleared = await click('clearBody');
    check('clearing the body falls back to the lens-position check', /lens position only/.test(await evaluate(`document.getElementById('fBody').textContent.trim()`)) && cleared.alert === 'Nothing in the way', cleared);

    // 14. Planner: picking a verified pair reads READY TO CALCULATE; a covered shape switch keeps it verified.
    await cdp('Page.navigate', { url: `${baseUrl}ProjectorThrow/index.html?workspace=planner` });
    await delay(2500);
    const planner = await evaluate(`(() => { const set = (id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); };
      set('catalogProjector', 'PRJ-001'); set('catalogLens', 'LNS-004'); return new Promise(resolve => setTimeout(() => resolve({ gate: document.getElementById('calculationGate').textContent.trim(), raster: document.getElementById('raster').value, verify: document.getElementById('verifyBadge').textContent.trim(), shiftProfile: document.getElementById('shiftProfile').value, shiftUp: document.getElementById('shiftUp').value, shiftLeft: document.getElementById('shiftLeft').value, shiftNote: document.getElementById('shiftCatalogNote').textContent.trim(), body: document.getElementById('body').value.trim(), stageLink: document.getElementById('stage3dLink').getAttribute('href') }), 400)); })()`);
    check('planner reads READY TO CALCULATE for a verified pair at its native shape', /^READY TO CALCULATE/.test(planner.gate) && planner.raster.startsWith('1.8962963') && planner.verify === 'maker verified', planner);
    check('planner fills the rear-mark body depth from maker data and transfers it to Stage 3D', planner.body !== '' && /bw=2\.362/.test(planner.stageLink) && /bd=3\.51/.test(planner.stageLink) && /lp=0\.682/.test(planner.stageLink), planner);
    check('planner fills the shift limits from maker data when a catalog pair is picked', planner.shiftProfile === 'catalog:OPT-002' && planner.shiftUp === '45' && planner.shiftLeft === '16' && /maker’s data/.test(planner.shiftNote), planner);
    check('planner transfers the sideways limits and the combined rule to Stage 3D', /su=45/.test(planner.stageLink) && /sl=16/.test(planner.stageLink) && /sr=16/.test(planner.stageLink) && /sc=ellipse\.assumed/.test(planner.stageLink), planner);
    const plannerShape = await evaluate(`(() => { const el = document.getElementById('raster'); el.value = '1.6|1920|1200'; el.dispatchEvent(new Event('change', { bubbles: true })); return new Promise(resolve => setTimeout(() => resolve({ gate: document.getElementById('calculationGate').textContent.trim(), sub: document.getElementById('rdSub').textContent.trim() }), 400)); })()`);
    check('planner switches to the maker\'s 16:10 ratio when the picture shape changes', /^READY TO CALCULATE/.test(plannerShape.gate) && /closest/.test(plannerShape.sub), plannerShape);
    const plannerHash = await evaluate(`location.hash`);
    check('planner share link keeps the sideways limits', /sl=16/.test(plannerHash) && /sr=16/.test(plannerHash) && /sp=catalog%3AOPT-002/.test(plannerHash), plannerHash);
    const plannerManual = await evaluate(`(() => { const el = document.getElementById('trmin'); el.value = '1.2'; el.dispatchEvent(new Event('input', { bubbles: true })); return new Promise(resolve => setTimeout(() => resolve({ profile: document.getElementById('shiftProfile').value, up: document.getElementById('shiftUp').value, left: document.getElementById('shiftLeft').value, noteHidden: document.getElementById('shiftCatalogNote').hidden }), 400)); })()`);
    check('typing a ratio by hand drops the catalog shift profile instead of leaving stale maker limits', plannerManual.profile === '' && plannerManual.up === '' && plannerManual.left === '' && plannerManual.noteHidden === true, plannerManual);
    // The planner shares Stage 3D's on-site rule: a stamp survives non-driving edits and drops on a driving edit, saying why.
    const plannerStamp = await evaluate(`(() => { const set = (id, value, type = 'input') => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event(type, { bubbles: true })); };
      set('actualDist', '12'); set('actualWidth', '10'); set('verifiedBy', 'Probe'); document.getElementById('stampVerify').click();
      return new Promise(resolve => setTimeout(() => { const before = { badge: document.getElementById('verifyBadge').textContent.trim(), link: document.getElementById('stage3dLink').getAttribute('href') };
        set('tol', '7'); setTimeout(() => { const kept = document.getElementById('verifyBadge').textContent.trim();
          set('dist', '30'); setTimeout(() => resolve({ before, kept, after: document.getElementById('verifyBadge').textContent.trim(), reset: document.getElementById('verifyReset').textContent.trim(), resetHidden: document.getElementById('verifyReset').hidden }), 400); }, 400); }, 400)); })()`);
    check('planner stamp reads field verified and its Stage 3D link carries the unit marker and measurement', plannerStamp.before.badge === 'field verified' && /u=ft/.test(plannerStamp.before.link) && /md=12/.test(plannerStamp.before.link) && /mw=10/.test(plannerStamp.before.link), plannerStamp);
    check('a non-driving edit keeps the planner stamp; a distance change drops it with the shared reason', plannerStamp.kept === 'field verified' && plannerStamp.after !== 'field verified' && plannerStamp.resetHidden === false && /measure again/.test(plannerStamp.reset), plannerStamp);

    // 15. The service worker must earn the Offline ready label and serve a cold-network reload.
    await open(AUDIT_QUERY);
    let offlineStatus = null;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      offlineStatus = await evaluate(`({ state:document.documentElement.dataset.offline, badge:document.getElementById('offlineBadge').textContent.trim(), controlled:Boolean(navigator.serviceWorker?.controller) })`);
      if (offlineStatus.state === 'ready') break;
      await delay(125);
    }
    check('Offline ready appears only after the service worker controls the page', offlineStatus?.state === 'ready' && offlineStatus.controlled === true && /^Offline ready/.test(offlineStatus.badge), offlineStatus);
    await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    let offlineReload;
    try {
      offlineReload = await open(AUDIT_QUERY);
    } finally {
      await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
    const offlineReloadStatus = await evaluate(`({ state:document.documentElement.dataset.offline, controlled:Boolean(navigator.serviceWorker?.controller) })`);
    check('Stage 3D reloads with calculated facts while the network is offline', offlineReload.ratio === '0.366:1' && offlineReloadStatus.state === 'ready' && offlineReloadStatus.controlled === true, { readout: offlineReload, offline: offlineReloadStatus });

    // 15b. Crew job sheet: plain-language placement, the verdict, and a QR link that reopens the same scene.
    await open('mode=verified_image_width&projector=PRJ-001&lens=LNS-004&profile=OPT-002&w=20&bottom=4&ar=1.8962963&basisW=20&rasterAr=1.8962963&lh=6&dist=50&clr=1');
    await setInput('roomD', 60); await setInput('px', -2);
    await click('jobSheetOpen');
    const sheet = await evaluate(`(() => ({ open: document.getElementById('jobSheetDialog').open, text: document.getElementById('jobSheet').textContent.replace(/\\s+/g, ' '), link: document.getElementById('jobSheetLink').getAttribute('href'), svg: !!document.querySelector('#jobSheetQr svg'), modules: document.querySelectorAll('#jobSheetQr svg path, #jobSheetQr svg rect').length }))()`);
    check('the job sheet opens with plain-language placement and the verdict', sheet.open && /Lens front 50' 0" from the screen surface/.test(sheet.text) && /2' 0" to the left of the screen centre/.test(sheet.text) && /Back of the projector 54' 2/.test(sheet.text) && /Ready — everything checks out/.test(sheet.text) && /Not measured on site yet/.test(sheet.text), sheet);
    check('the job sheet carries a QR code and a link back to this exact scene', sheet.svg && sheet.modules > 0 && /projector=PRJ-001/.test(sheet.link) && /lens=LNS-004/.test(sheet.link) && /dist=50/.test(sheet.link) && /px=-2/.test(sheet.link) && /rd=60/.test(sheet.link) && /u=ft/.test(sheet.link), sheet);
    await evaluate(`document.getElementById('jobSheetClose').click()`);
    const reopened = await open(sheet.link.split('?')[1]);
    check('the job sheet link reopens the same verified scene', reopened.badge === 'MANUFACTURER VERIFIED' && reopened.distance === '50\' 0"' && reopened.wide === '40\' 0"' && reopened.alert === 'Nothing in the way' && /^Ready/.test(reopened.headline), reopened);

    // 16. Required responsive widths must keep the workspace contained and the mobile error visible.
    for (const viewport of [{ width: 680, height: 900 }, { width: 390, height: 844 }]) {
      await cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: viewport.width === 390 ? 3 : 2, mobile: viewport.width === 390 });
      await open(AUDIT_QUERY);
      const layout = await evaluate(`(() => { const stage=document.querySelector('.stage-canvas').getBoundingClientRect(); const dock=document.querySelector('.mobile-dock').getBoundingClientRect(); return { clientWidth:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, innerHeight, bodyHeight:document.body.getBoundingClientRect().height, stage:{ width:stage.width, height:stage.height, top:stage.top, bottom:stage.bottom }, dock:{ width:dock.width, height:dock.height, top:dock.top, bottom:dock.bottom }, buttons:[...document.querySelectorAll('.mobile-dock button')].map(button=>({ width:button.getBoundingClientRect().width, height:button.getBoundingClientRect().height })) }; })()`);
      check(`${viewport.width}px workspace has no horizontal overflow and keeps a visible stage`, layout.scrollWidth <= layout.clientWidth + 1 && layout.stage.width > 200 && layout.stage.height > 240 && layout.stage.top >= 0 && layout.stage.bottom <= layout.innerHeight, layout);
      check(`${viewport.width}px mobile dock stays visible with four touch targets`, layout.dock.width > 200 && layout.dock.height >= 44 && layout.dock.bottom <= layout.innerHeight + 1 && layout.buttons.length === 4 && layout.buttons.every(button => button.height >= 44), layout);
      if (viewport.width === 390) {
        await evaluate(`document.querySelector('[data-mobile-panel-button="adjust"]').click()`);
        await delay(120);
        await evaluate(`document.getElementById('stampVerification').scrollIntoView({ block:'center' })`);
        await delay(120);
        await evaluate(`document.getElementById('stampVerification').click()`);
        await delay(120);
        const mobileError = await evaluate(`(() => { const error=document.getElementById('fieldVerificationError'); const panel=document.querySelector('aside'); const rect=error.getBoundingClientRect(); const panelRect=panel.getBoundingClientRect(); return { hidden:error.hidden, display:getComputedStyle(error).display, text:error.textContent.trim(), panelDisplay:getComputedStyle(panel).display, rect:{top:rect.top,bottom:rect.bottom}, panel:{top:panelRect.top,bottom:panelRect.bottom}, focus:document.activeElement?.id }; })()`);
        check('390px Field Verify error is visible inside the open Adjust sheet', mobileError.hidden === false && mobileError.display !== 'none' && mobileError.panelDisplay !== 'none' && mobileError.rect.bottom > mobileError.panel.top && mobileError.rect.top < mobileError.panel.bottom && mobileError.focus === 'measuredDistance', mobileError);
      }
    }

    const unexpectedExceptions = noWebgl
      ? exceptions.filter((exception) => !/Error creating WebGL context\.|three-d-stage: WebGL 2 unavailable after standard and low-power startup attempts/.test(exception))
      : exceptions;
    check(noWebgl ? 'no unexpected browser exceptions in the intentional no-WebGL run' : 'no uncaught browser exceptions', unexpectedExceptions.length === 0, unexpectedExceptions);
  } finally {
    chrome.kill('SIGKILL');
    if (staticServer) staticServer.server.kill('SIGKILL');
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; }
      catch (error) { if (attempt === 7) throw error; await delay(125 * (attempt + 1)); }
    }
  }

  if (failures.length) { console.error(`Throwline Stage 3D probe failed: ${failures.length} check(s).`); process.exit(1); }
  console.log(`Throwline Stage 3D probe passed (${AUDIT_QUERY}).`);
}

main().catch((error) => { console.error(error); process.exit(1); });
