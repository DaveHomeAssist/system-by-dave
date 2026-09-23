#!/usr/bin/env node
'use strict';

// Browser acceptance probe for the deterministic Shader camera-shading lab.
// It drives the shipped page without a framework dependency and verifies the
// operator path, scope switching, exact handoff, responsive containment, and
// the boundary that this page generates practice data rather than device I/O.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

if (typeof WebSocket === 'undefined') throw new Error('This probe needs a Node runtime with global WebSocket support.');

const args = process.argv.slice(2);
const baseArg = args.find(arg => arg.startsWith('--base='));
const chromeArg = args.find(arg => arg.startsWith('--chrome='));
const root = path.resolve(__dirname, '..');
const chromeCandidates = [
  chromeArg?.slice('--chrome='.length), process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'
].filter(Boolean);
const chromeBin = chromeCandidates.find(candidate => fs.existsSync(candidate));
const failures = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(name, condition, detail = '') {
  if (condition) console.log(`ok - ${name}`);
  else { failures.push(name); console.log(`not ok - ${name}${detail ? ` :: ${JSON.stringify(detail)}` : ''}`); }
}
async function waitForHttp(url, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await delay(150);
  }
  throw new Error(`${url} did not become reachable.`);
}
async function startServer() {
  const port = 8800 + Math.floor(Math.random() * 300);
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const baseUrl = `http://127.0.0.1:${port}/`;
  await waitForHttp(`${baseUrl}shader/practice.html`);
  return { server, baseUrl };
}

async function main() {
  if (!chromeBin) throw new Error(`Chrome binary not found. Tried: ${chromeCandidates.join(', ')}`);
  let baseUrl = baseArg ? baseArg.slice('--base='.length).replace(/\/?$/, '/') : '';
  let staticServer;
  if (!baseUrl) { staticServer = await startServer(); baseUrl = staticServer.baseUrl; }
  const port = 9800 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shader-practice-probe-'));
  const chrome = spawn(chromeBin, [
    ...(args.includes('--no-sandbox') || (typeof process.getuid === 'function' && process.getuid() === 0) ? ['--no-sandbox'] : []),
    '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--no-first-run',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let socket;
  try {
    await waitForHttp(`http://127.0.0.1:${port}/json/version`);
    const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map(), exceptions = [], consoleErrors = [];
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Runtime.consoleAPICalled' && ['error','assert'].includes(message.params.type)) consoleErrors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
      if (!message.id || !pending.has(message.id)) return;
      const pair = pending.get(message.id); pending.delete(message.id);
      if (message.error) pair.reject(new Error(JSON.stringify(message.error))); else pair.resolve(message.result);
    };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    const open = async url => {
      await cdp('Page.navigate', { url });
      for (let count = 0; count < 120; count += 1) {
        try { if (await evaluate('Boolean(window.ShaderPracticeApp && document.getElementById("scopeCanvas"))')) { await delay(120); return; } } catch {}
        await delay(100);
      }
      throw new Error(`Shader Practice did not become ready: ${url}`);
    };
    const url = `${baseUrl}shader/practice.html?scenario=match-cameras&seed=browser-proof`;
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await open(url);
    const baseline = await evaluate(`(() => { const state=ShaderPracticeApp.getState(); return {schema:state.schema, cameras:state.cameras.length, controls:Object.keys(state.cameras[0].controls).length, score:ShaderPracticeState.evaluatePractice(state).score, label:document.querySelector('.simulation-label')?.textContent.trim(), disclaimer:document.querySelector('.scope-caption')?.textContent.trim(), chain:document.getElementById('stateIdentity')?.textContent.trim()}; })()`);
    check('practice page exposes two cameras, seven controls, and the versioned shared state', baseline.schema === 'shader.camera-practice.v1' && baseline.cameras === 2 && baseline.controls === 7 && /shader\.camera-practice\.v1/.test(baseline.chain), baseline);
    check('practice page visibly labels generated simulation data', baseline.label === 'SIMULATION FOR PRACTICE' && baseline.disclaimer === 'Generated practice signal · not a measurement', baseline);

    let offlineReady = false;
    for (let count = 0; count < 120 && !offlineReady; count += 1) {
      offlineReady = await evaluate(`document.documentElement.dataset.offline==='ready'&&Boolean(navigator.serviceWorker?.controller)`);
      if (!offlineReady) await delay(100);
    }
    check('a fresh direct visit prepares its own offline cache', offlineReady, await evaluate(`({state:document.documentElement.dataset.offline||'',status:document.getElementById('offlineStatus')?.textContent.trim(),controlled:Boolean(navigator.serviceWorker?.controller)})`));
    await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await open(url);
    const offlineReload = await evaluate(`({schema:ShaderPracticeApp.getState().schema,state:document.documentElement.dataset.offline||'',controlled:Boolean(navigator.serviceWorker?.controller)})`);
    check('scope practice reloads from a fresh-profile cache while offline', offlineReload.schema === 'shader.camera-practice.v1' && offlineReload.controlled, offlineReload);
    await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    const match = await evaluate(`(() => {
      document.querySelector('[data-camera-switch="camera-b"]').click();
      const state=ShaderPracticeApp.getState(), reference=state.cameras.find(camera=>camera.id==='camera-a').controls;
      for (const [name,value] of Object.entries(reference)) { const input=document.querySelector('[data-control="'+name+'"]'); input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); }
      const next=ShaderPracticeApp.getState(); return {score:ShaderPracticeState.evaluatePractice(next).score,selected:next.selectedCameraId};
    })()`);
    check('matching Camera B through the visible control panel improves the exercise to a passing score', match.selected === 'camera-b' && match.score > baseline.score && match.score >= 95, { baseline: baseline.score, match });

    const scopes = await evaluate(`(() => { const result={}; for(const name of ['waveform','parade','vectorscope','histogram']){document.querySelector('[data-scope="'+name+'"]').click();const state=ShaderPracticeApp.getState();const canvas=document.getElementById('scopeCanvas');const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;result[name]={selected:state.scope,drawn:pixels.some(value=>value!==0)};}return result; })()`);
    check('all four visible scope tabs select and render', Object.entries(scopes).every(([name,result]) => result.selected === name && result.drawn), scopes);

    const handoff = await evaluate(`(() => ({state:ShaderPracticeApp.getState(),url:ShaderPracticeApp.fullStateLink()}))()`);
    await open(handoff.url);
    const reproduced = await evaluate('ShaderPracticeApp.getState()');
    check('full-state handoff reproduces the exact practice session', JSON.stringify(reproduced) === JSON.stringify(handoff.state));

    const responsive = [];
    for (const [width, height] of [[390,844],[820,900],[1440,900],[2560,900]]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      await delay(120);
      responsive.push(await evaluate(`(() => ({width:${width},overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,bodyOverflow:getComputedStyle(document.body).overflow,navVisible:getComputedStyle(document.querySelector('.mobile-nav')).display!=='none',tab:document.body.dataset.mobileTab}))()`));
    }
    check('responsive practice layouts stay horizontally contained from phone to ultrawide', responsive.every(result => !result.overflow), responsive);
    check('phone layout exposes the mobile task navigation', responsive[0].navVisible === true && responsive[0].tab === 'monitor', responsive[0]);
    check('browser run has no uncaught exceptions or console errors', exceptions.length === 0 && consoleErrors.length === 0, { exceptions, consoleErrors });
  } finally {
    try { socket?.close(); } catch {}
    chrome.kill('SIGTERM');
    if (staticServer) staticServer.server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => chrome.exitCode === null ? chrome.once('exit', resolve) : resolve()), delay(1500)]);
    try { await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
    catch (error) { console.warn(`Could not remove temporary Chrome profile ${profile}: ${error.message}`); }
  }
  if (failures.length) { console.error(`Shader Practice browser probe failed (${failures.length}).`); process.exit(1); }
  console.log('Shader Practice browser probe passed.');
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
