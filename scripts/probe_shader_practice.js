#!/usr/bin/env node
'use strict';

// Browser acceptance probe for the deterministic Shader camera-shading console.
// It drives the shipped page over the Chrome DevTools Protocol, without a test
// framework, and checks the operator workflow, every comparison and scope
// control, keyboard-only use, coaching, demonstrations, exact handoff,
// imports, offline reload, responsive containment at six viewports in both
// themes, reduced motion, and the failure paths for storage, clipboard,
// canvas, the service worker and JavaScript. The page generates practice data
// only; nothing here talks to equipment.

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
const VIEWPORTS = [[320, 568], [390, 844], [820, 900], [1024, 768], [1440, 900], [2560, 1440]];
const STATEMENTS = ['SIMULATION FOR PRACTICE', 'Generated practice signal · not a measurement', 'Nothing here reads or controls real equipment.'];

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

// ---------- a minimal flat-session CDP client ----------

class Connection {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.handlers = new Set();
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pair = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pair.reject(new Error(`${pair.method}: ${JSON.stringify(message.error)}`));
        else pair.resolve(message.result);
        return;
      }
      this.handlers.forEach(handler => handler(message));
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }
}

class Page {
  constructor(connection, sessionId, contextId, label) {
    this.connection = connection;
    this.sessionId = sessionId;
    this.contextId = contextId;
    this.label = label;
    this.exceptions = [];
    this.consoleErrors = [];
    this.networkErrors = [];
    this.expectOffline = false;
    connection.handlers.add(message => {
      if (message.sessionId !== sessionId) return;
      const { method, params } = message;
      if (method === 'Runtime.exceptionThrown') this.exceptions.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text);
      if (method === 'Runtime.consoleAPICalled' && ['error', 'assert', 'warning'].includes(params.type)) this.consoleErrors.push(`${params.type}: ${params.args.map(arg => arg.value || arg.description).join(' ')}`);
      if (method === 'Log.entryAdded' && params.entry.level === 'error' && !this.expectOffline) this.networkErrors.push(params.entry.text + (params.entry.url ? ` ${params.entry.url}` : ''));
    });
  }
  send(method, params) { return this.connection.send(method, params, this.sessionId); }
  async eval(fn, ...values) {
    const expression = `(${fn})(...${JSON.stringify(values)})`;
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(`${this.label}: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
    return result.result.value;
  }
  async open(url) {
    await this.send('Page.navigate', { url });
    for (let count = 0; count < 160; count += 1) {
      try {
        if (await this.eval(() => Boolean(window.ShaderPracticeApp && document.readyState === 'complete'))) { await this.settle(); return; }
      } catch {}
      await delay(75);
    }
    throw new Error(`${this.label}: Shader Practice did not become ready at ${url}`);
  }
  async settle() {
    await this.eval(() => new Promise(resolve => {
      if (window.ShaderPracticeApp) window.ShaderPracticeApp.renderNow();
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
  }
  async viewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await this.send('Emulation.setTouchEmulationEnabled', width < 600 ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  }
  async key(key, modifiers = 0) {
    const codes = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, PageUp: 33, PageDown: 34, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, z: 90, a: 65 };
    const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
    const base = { key, code, windowsVirtualKeyCode: codes[key] || 0, nativeVirtualKeyCode: codes[key] || 0, modifiers };
    const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined;
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(text && !modifiers ? { text } : {}) });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    await this.settle();
  }
  async activeId() { return this.eval(() => document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)); }
  async setFile(selector, file) {
    const { root: document } = await this.send('DOM.getDocument', { depth: 1 });
    const { nodeId } = await this.send('DOM.querySelector', { nodeId: document.nodeId, selector });
    await this.send('DOM.setFileInputFiles', { nodeId, files: [file] });
    await delay(250);
    await this.settle();
  }
  errors() { return [...this.exceptions, ...this.consoleErrors, ...this.networkErrors]; }
}

const MODIFIER = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

// ---------- in-page inspectors ----------

function inspectLayout(statements) {
  const visible = el => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  const textVisible = text => [...document.querySelectorAll('body *')].some(el => [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.includes(text)) && visible(el));
  const interactive = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex="0"]')]
    .filter(el => !el.closest('[hidden], dialog:not([open])') && visible(el) && !el.classList.contains('sbd-skip-link'));
  const small = interactive.map(el => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width < 43.5 || rect.height < 43.5)
    .map(({ el, rect }) => `${el.id || el.className || el.tagName} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  // WCAG contrast for every visible text node's element.
  const parse = value => (value.match(/[\d.]+/g) || []).map(Number);
  const lum = rgb => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
  const background = el => {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const [r, g, b, a = 1] = parse(getComputedStyle(node).backgroundColor);
      if (a > 0) { layers.push([r, g, b, a]); if (a >= 1) break; }
    }
    let color = [255, 255, 255];
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const [r, g, b, a] = layers[index];
      color = [r * a + color[0] * (1 - a), g * a + color[1] * (1 - a), b * a + color[2] * (1 - a)];
    }
    return color;
  };
  const lowContrast = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!visible(el) || el.closest('[hidden], canvas, .sr-only, dialog:not([open])') || el.closest('button:disabled') || el.matches(':disabled')) return;
    if (![...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())) return;
    const style = getComputedStyle(el);
    if (style.clip === 'rect(0px, 0px, 0px, 0px)' || parseFloat(style.opacity) < 1) return;
    const [r, g, b] = parse(style.color);
    const bg = background(el);
    const l1 = lum([r, g, b]);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) lowContrast.push(`${el.id || el.className || el.tagName} ${ratio.toFixed(2)}`);
  });
  return {
    layout: document.body.dataset.layout,
    view: document.body.dataset.view,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overflowY: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    statements: statements.map(text => ({ text, visible: textVisible(text) })),
    rail: visible(document.querySelector('.view-rail')),
    sideTabs: visible(document.querySelector('.side-tabs')),
    small: small.slice(0, 8),
    lowContrast: lowContrast.slice(0, 8),
    canvasDrawn: [...document.querySelectorAll('canvas')].filter(visible).every(canvas => {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 0; index < data.length; index += 16) if (data[index] + data[index + 1] + data[index + 2] > 60) return true;
      return false;
    })
  };
}

function focusReport() {
  const el = document.activeElement;
  if (!el || el === document.body) return { id: 'body', visibleRing: false };
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    id: el.id || el.className || el.tagName,
    visibleRing: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2) || (el.id === 'practiceWorkspace' && style.outlineStyle !== 'none'),
    onScreen: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
  };
}

// ---------- scenarios ----------

async function mainSession(page, baseUrl) {
  const url = `${baseUrl}shader/practice.html?scenario=match-cameras&seed=browser-proof`;
  await page.viewport(1440, 900);
  await page.open(url);
  const baseline = await page.eval(() => {
    const state = ShaderPracticeApp.getState();
    return { schema: state.schema, cameras: state.cameras.length, controls: Object.keys(state.cameras[0].controls).length, score: ShaderPracticeState.evaluatePractice(state).score, identity: document.getElementById('stateIdentity').textContent, build: ShaderPracticeState.BUILD === ShaderPracticeRender.BUILD };
  });
  check('console exposes two cameras, seven controls, and the versioned shared state', baseline.schema === 'shader.camera-practice.v1' && baseline.cameras === 2 && baseline.controls === 7 && /shader\.camera-practice\.v1/.test(baseline.identity) && baseline.build, baseline);

  let offlineReady = false;
  for (let count = 0; count < 160 && !offlineReady; count += 1) {
    offlineReady = await page.eval(() => document.documentElement.dataset.offline === 'ready' && Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));
    if (!offlineReady) await delay(100);
  }
  check('a fresh direct visit prepares its own offline cache', offlineReady, await page.eval(() => ({ state: document.documentElement.dataset.offline || '', status: document.getElementById('offlineStatus').textContent })));

  // Keyboard-only: skip link first, then a full Tab cycle with visible focus.
  await page.open(url);
  await page.key('Tab');
  const skip = await page.eval(() => document.activeElement.className);
  await page.key('Enter');
  check('the first Tab reaches the skip link and Enter lands in the console', skip === 'sbd-skip-link' && await page.activeId() === 'practiceWorkspace', { skip });
  const visited = new Set();
  const badFocus = [];
  for (let index = 0; index < 160; index += 1) {
    await page.key('Tab');
    const report = await page.eval(focusReport);
    // Focus briefly leaves the document when the Tab cycle wraps.
    if (report.id === 'body') continue;
    if (!report.visibleRing || !report.onScreen) badFocus.push(report);
    if (visited.has(report.id) && report.id === 'sbd-skip-link') break;
    visited.add(report.id);
  }
  // Undo and Redo stay disabled (and out of the Tab order) until a change exists.
  const required = ['tab-exercise', 'seedInput', 'injectButton', 'control-iris', 'value-iris', 'control-colorPhase', 'resetCameraButton', 'scoreButton', 'shareButton', 'themeButton', 'blinkButton', 'freezeButton', 'scopeTab-waveform', 'monitorSelectA'];
  check('Tab reaches every console control with a visible focus ring', required.every(id => visited.has(id)) && badFocus.length === 0, { missing: required.filter(id => !visited.has(id)), badFocus: badFocus.slice(0, 5) });

  // Arrow keys step fine, Shift and Page keys step coarse, Alt forces fine.
  await page.eval(() => document.getElementById('control-pedestal').focus());
  const pedestal = () => page.eval(() => ShaderPracticeApp.getState().cameras[1].controls.pedestal);
  await page.key('ArrowLeft');
  const afterFine = await pedestal();
  await page.key('ArrowLeft', MODIFIER.shift);
  const afterCoarse = await pedestal();
  await page.key('PageDown');
  const afterPage = await pedestal();
  await page.key('ArrowRight', MODIFIER.alt);
  const afterAlt = await pedestal();
  check('keyboard steps distinguish fine and coarse changes', afterFine === 4.4 && afterCoarse === 3.4 && afterPage === 2.4 && afterAlt === 2.5, { afterFine, afterCoarse, afterPage, afterAlt });
  await page.key('z', MODIFIER.ctrl);
  const undone = await pedestal();
  await page.key('z', MODIFIER.ctrl | MODIFIER.shift);
  check('Ctrl+Z undoes one adjustment gesture and Ctrl+Shift+Z redoes it', undone === 4.5 && await pedestal() === 2.5, { undone });

  await page.eval(() => { const input = document.getElementById('value-gain'); input.focus(); input.select(); });
  await page.send('Input.insertText', { text: '-1.2' });
  await page.key('Enter');
  const typed = await page.eval(() => ShaderPracticeApp.getState().cameras[1].controls.gain);
  await page.eval(() => { const input = document.getElementById('value-gain'); input.focus(); input.select(); });
  await page.send('Input.insertText', { text: 'loud' });
  await page.key('Enter');
  const invalid = await page.eval(() => ({ gain: ShaderPracticeApp.getState().cameras[1].controls.gain, invalid: document.getElementById('value-gain').getAttribute('aria-invalid') }));
  check('typed values apply exactly and invalid entries are rejected in place', typed === -1.2 && invalid.gain === -1.2 && invalid.invalid === 'true', { typed, invalid });

  await page.eval(() => document.getElementById('tab-exercise').focus());
  await page.key('ArrowRight');
  const sideA = await page.eval(() => ({ tab: ShaderPracticeApp.ui().sideTab, focus: document.activeElement.id }));
  await page.key('End');
  const sideB = await page.eval(() => ShaderPracticeApp.ui().sideTab);
  await page.key('Home');
  check('side panel tabs follow arrow, Home and End keys', sideA.tab === 'score' && sideA.focus === 'tab-score' && sideB === 'demo' && await page.eval(() => ShaderPracticeApp.ui().sideTab) === 'exercise', { sideA, sideB });
  await page.eval(() => document.getElementById('scopeTab-waveform').focus());
  await page.key('ArrowRight');
  const scopeA = await page.eval(() => ShaderPracticeApp.getState().scope);
  await page.key('End');
  check('scope tabs follow arrow and End keys', scopeA === 'parade' && await page.eval(() => ShaderPracticeApp.getState().scope) === 'histogram', { scopeA });

  // Match Camera B to Camera A through the visible controls, then score by keyboard.
  const match = await page.eval(() => {
    document.querySelector('[data-camera-switch="camera-b"]').click();
    const reference = ShaderPracticeApp.getState().cameras[0].controls;
    Object.entries(reference).forEach(([name, value]) => {
      const input = document.getElementById(`control-${name}`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const next = ShaderPracticeApp.getState();
    return { score: ShaderPracticeState.evaluatePractice(next).score, selected: next.selectedCameraId };
  });
  check('matching Camera B through the visible control panel reaches a passing score', match.selected === 'camera-b' && match.score >= 95 && match.score > baseline.score, { baseline: baseline.score, match });
  await page.eval(() => document.getElementById('scoreButton').focus());
  await page.key('Enter');
  await delay(400);
  await page.settle();
  const debrief = await page.eval(() => ({ tab: ShaderPracticeApp.ui().sideTab, number: document.getElementById('scoreNumber').textContent, band: document.getElementById('scoreBand').textContent, next: document.getElementById('nextCorrection').textContent, changes: document.getElementById('changeList').children.length, visible: !document.getElementById('scoreContent').hidden }));
  check('scoring opens the debrief with the score, status word, and change review', debrief.visible && debrief.tab === 'score' && Number(debrief.number) >= 95 && debrief.band === 'OK' && debrief.changes >= 1, debrief);

  // Coaching on a fresh exercise names a direction and never a value.
  await page.open(`${baseUrl}shader/practice.html?scenario=set-black-level&seed=browser-proof`);
  await page.eval(() => document.getElementById('scoreButton').click());
  await delay(500);
  await page.settle();
  const coaching = await page.eval(() => document.getElementById('nextCorrection').textContent);
  check('the next correction names the objective and control without revealing a value', /Black floor/.test(coaching) && /lower Pedestal/.test(coaching) && !/\d/.test(coaching), coaching);

  // Comparison modes, wipe, blink, and freeze.
  await page.open(url);
  const compare = {};
  for (const mode of ['wipe', 'reference', 'target', 'side']) {
    compare[mode] = await page.eval(target => {
      document.querySelector(`[data-compare="${target}"]`).click();
      ShaderPracticeApp.renderNow();
      return { left: !monitorLeft.hidden, right: !monitorRight.hidden, wipe: !monitorWipe.hidden, mode: ShaderPracticeApp.getState().view.compare, pressed: document.querySelector(`[data-compare="${target}"]`).getAttribute('aria-pressed') };
    }, mode);
  }
  check('side-by-side, wipe, reference-only and target-only views switch the multiviewer', compare.side.left && compare.side.right && compare.wipe.wipe && !compare.wipe.left && compare.reference.left && !compare.reference.right && compare.target.left && !compare.target.right && Object.values(compare).every(item => item.pressed === 'true'), compare);
  await page.eval(() => { document.querySelector('[data-compare="wipe"]').click(); ShaderPracticeApp.renderNow(); });
  const wipeBox = await page.eval(() => { const rect = document.querySelector('#monitorWipe .monitor-screen').getBoundingClientRect(); return { x: rect.left, y: rect.top, w: rect.width, h: rect.height }; });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: wipeBox.x + wipeBox.w * 0.5, y: wipeBox.y + wipeBox.h / 2, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: wipeBox.x + wipeBox.w * 0.3, y: wipeBox.y + wipeBox.h / 2, button: 'left' });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: wipeBox.x + wipeBox.w * 0.3, y: wipeBox.y + wipeBox.h / 2, button: 'left', clickCount: 1 });
  await page.settle();
  const wipe = await page.eval(() => ShaderPracticeApp.getState().view.wipe);
  check('dragging the wipe moves the split between reference and target', wipe < 0.45 && wipe > 0.05, { wipe });
  await page.eval(() => { document.querySelector('[data-compare="side"]').click(); document.getElementById('blinkButton').click(); });
  const blinkSeen = new Set();
  for (let index = 0; index < 12; index += 1) { blinkSeen.add(await page.eval(() => ShaderPracticeApp.ui().blinkShowing)); await delay(160); }
  const blinking = await page.eval(() => ShaderPracticeApp.ui().blinking);
  await page.eval(() => document.getElementById('blinkButton').click());
  check('A/B blink alternates reference and target on one monitor and stops on demand', blinking && blinkSeen.has('reference') && blinkSeen.has('target') && !(await page.eval(() => ShaderPracticeApp.ui().blinking)), [...blinkSeen]);
  const freeze = await page.eval(() => {
    document.getElementById('freezeButton').click();
    const input = document.querySelector('[data-camera-switch="camera-a"]');
    input.click();
    ShaderPracticeApp.renderNow();
    const frozen = ShaderPracticeApp.getState().view.freeze;
    const tag = document.getElementById('roleTagA').textContent;
    document.getElementById('freezeButton').click();
    ShaderPracticeApp.renderNow();
    return { frozen: Boolean(frozen), tag, released: ShaderPracticeApp.getState().view.freeze === null };
  });
  check('freezing the reference stores a labelled still and releases on demand', freeze.frozen && /STILL/.test(freeze.tag) && freeze.released, freeze);

  // Scopes: single tabs and the quad layout all draw.
  const scopes = await page.eval(() => {
    const lit = kind => { const canvas = document.getElementById(`scopeCanvas-${kind}`); const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let count = 0; for (let index = 0; index < data.length; index += 4) if (data[index] + data[index + 1] + data[index + 2] > 150) count += 1; return { count, height: canvas.height, label: canvas.getAttribute('aria-label') }; };
    const single = {};
    for (const kind of ['waveform', 'parade', 'vectorscope', 'histogram']) {
      document.querySelector(`[data-scope="${kind}"]`).click();
      ShaderPracticeApp.renderNow();
      single[kind] = lit(kind);
    }
    document.querySelector('[data-layout="quad"]').click();
    ShaderPracticeApp.renderNow();
    const quad = ['waveform', 'parade', 'vectorscope', 'histogram'].map(kind => ({ kind, visible: !document.getElementById(`scopeFigure-${kind}`).hidden, ...lit(kind) }));
    document.querySelector('#scopeFigure-parade [data-focus-scope]').click();
    ShaderPracticeApp.renderNow();
    const state = ShaderPracticeApp.getState();
    return { single, quad, focused: { scope: state.scope, layout: state.view.scopeLayout }, caption: [...document.querySelectorAll('.scope-disclaimer')].every(node => node.textContent === 'Generated practice signal · not a measurement') };
  });
  check('all four scopes draw in single view with descriptive text alternatives', Object.values(scopes.single).every(item => item.count > 200 && item.height > 60 && /not a measurement/.test(item.label)), scopes.single);
  check('the quad layout shows all four scopes and Focus returns to a single scope', scopes.quad.every(item => item.visible && item.count > 100) && scopes.focused.scope === 'parade' && scopes.focused.layout === 'single' && scopes.caption, { quad: scopes.quad.map(item => [item.kind, item.count]), focused: scopes.focused });

  // Troubleshooting injection is explicit and reversible.
  const fault = await page.eval(() => {
    document.getElementById('tab-exercise').click();
    document.getElementById('injectionSelect').value = 'lifted-blacks';
    document.getElementById('injectButton').click();
    ShaderPracticeApp.renderNow();
    const injected = { pedestal: ShaderPracticeApp.getState().cameras[1].controls.pedestal, list: document.getElementById('faultList').textContent };
    document.getElementById('revertFaultButton').click();
    ShaderPracticeApp.renderNow();
    return { injected, reverted: ShaderPracticeApp.getState().cameras[1].controls.pedestal, list: document.getElementById('faultList').textContent };
  });
  check('an injected fault is listed and reverts to the prior value', fault.injected.pedestal === 10 && /Lifted blacks/.test(fault.injected.list) && fault.reverted === 4.5 && /No faults/.test(fault.list), fault);

  // Demonstration mode: guided sweep, before/after, capture, exact replay.
  const demo = await page.eval(() => {
    document.getElementById('tab-demo').click();
    document.getElementById('demoControlSelect').value = 'pedestal';
    document.getElementById('startDemoButton').click();
    ShaderPracticeApp.renderNow();
    const first = { steps: ShaderPracticeApp.getState().demo.steps.length, position: document.getElementById('demoPosition').textContent };
    document.getElementById('demoNextButton').click();
    document.getElementById('demoNextButton').click();
    ShaderPracticeApp.renderNow();
    const third = { pedestal: ShaderPracticeApp.getState().cameras[1].controls.pedestal, before: document.getElementById('roleTagA').textContent, after: document.getElementById('roleTagB').textContent, note: document.getElementById('demoStepNote').textContent };
    document.querySelector('[data-demo-compare="previous"]').click();
    ShaderPracticeApp.renderNow();
    const previous = document.getElementById('roleTagA').textContent;
    document.querySelector('.instructor').open = true;
    document.getElementById('demoNoteInput').value = 'Watch the floor move.';
    document.getElementById('demoCaptureButton').click();
    ShaderPracticeApp.renderNow();
    return { first, third, previous, captured: ShaderPracticeApp.getState().demo.steps.length, link: ShaderPracticeApp.fullStateLink(), state: ShaderPracticeApp.getState() };
  });
  check('a guided sweep steps one control with before and after pictures', demo.first.steps === 5 && /STEP 1 OF 5/.test(demo.first.position) && demo.third.pedestal === 10 && /BEFORE · STEP 1/.test(demo.third.before) && /AFTER · STEP 3/.test(demo.third.after) && /generated 0–100 scale/.test(demo.third.note) && /STEP 2/.test(demo.previous), { first: demo.first, third: demo.third, previous: demo.previous });
  await page.open(demo.link);
  const replayedDemo = await page.eval(() => ShaderPracticeApp.getState());
  check('an instructor sequence replays exactly from its link', demo.captured === 6 && JSON.stringify(replayedDemo) === JSON.stringify(demo.state), { captured: demo.captured });
  const exited = await page.eval(() => { document.getElementById('tab-demo').click(); document.getElementById('exitDemoButton').click(); return ShaderPracticeApp.getState(); });
  check('leaving a demonstration restores the practice state', exited.demo === null && exited.cameras[1].controls.pedestal === 4.5, { demo: exited.demo, pedestal: exited.cameras[1].controls.pedestal });

  // Exact full-state handoff, including scored checks and the view.
  const handoff = await page.eval(() => {
    document.querySelector('[data-compare="wipe"]').click();
    const input = document.getElementById('control-iris');
    input.value = -0.35;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('scoreButton').click();
    return { state: ShaderPracticeApp.getState(), url: ShaderPracticeApp.fullStateLink() };
  });
  await page.open(handoff.url);
  const reproduced = await page.eval(() => ShaderPracticeApp.getState());
  check('a full-state link reproduces the exact practice session', JSON.stringify(reproduced) === JSON.stringify(handoff.state), { checks: reproduced.checks.length, compare: reproduced.view.compare });
  await page.open(`${baseUrl}shader/practice.html`);
  const persisted = await page.eval(() => ShaderPracticeApp.getState());
  check('a plain reload continues the saved session on this device', JSON.stringify(persisted) === JSON.stringify(handoff.state));

  // Imports through the visible file control: legacy Throwline, then invalid.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shader-import-'));
  const legacyState = await page.eval(() => ({ ...ShaderPracticeState.createPracticeState({ scenarioId: 'neutralize-cast', seed: 'legacy-browser' }), schema: 'throwline.camera-practice.v1' }));
  const legacyFile = path.join(tmp, 'legacy.json');
  fs.writeFileSync(legacyFile, JSON.stringify({ kind: 'throwline-camera-practice-session', schema: 'throwline.camera-practice.v1', schemaVersion: 1, state: legacyState }));
  await page.eval(() => document.getElementById('shareButton').click());
  await page.setFile('#fileInput', legacyFile);
  const legacy = await page.eval(() => ({ state: ShaderPracticeApp.getState(), open: document.getElementById('shareDialog').open }));
  check('a legacy Throwline export imports into the Shader schema', legacy.state.schema === 'shader.camera-practice.v1' && legacy.state.scenarioId === 'neutralize-cast' && legacy.state.seed === 'legacy-browser' && !legacy.open, { scenario: legacy.state.scenarioId, open: legacy.open });
  const invalidFile = path.join(tmp, 'invalid.json');
  fs.writeFileSync(invalidFile, JSON.stringify({ kind: 'something-else', schema: 'other', state: {} }));
  await page.eval(() => document.getElementById('shareButton').click());
  await page.setFile('#fileInput', invalidFile);
  const invalidImport = await page.eval(() => ({ error: !document.getElementById('importError').hidden && document.getElementById('importError').textContent, role: document.getElementById('importError').getAttribute('role'), seed: ShaderPracticeApp.getState().seed }));
  check('an invalid import is refused with an announced error and no state change', /must use shader\.camera-practice\.v1/.test(invalidImport.error || '') && invalidImport.role === 'alert' && invalidImport.seed === 'legacy-browser', invalidImport);
  await page.key('Escape');
  check('Escape closes the share dialog and returns focus to its button', !(await page.eval(() => document.getElementById('shareDialog').open)) && await page.activeId() === 'shareButton');
  fs.rmSync(tmp, { recursive: true, force: true });

  // Offline reload from the dedicated worker's cache.
  page.expectOffline = true;
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.open(url);
  const offline = await page.eval(() => ({ schema: ShaderPracticeApp.getState().schema, controlled: Boolean(navigator.serviceWorker.controller), css: getComputedStyle(document.body).overflow === 'hidden' }));
  check('the console reloads offline from its own cache with styles and scripts', offline.schema === 'shader.camera-practice.v1' && offline.controlled && offline.css, offline);
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  page.expectOffline = false;

  const theme = await page.eval(() => { document.getElementById('themeButton').click(); return { theme: document.documentElement.dataset.theme, stored: localStorage.getItem('shader.practice.theme.v1'), pressed: document.getElementById('themeButton').getAttribute('aria-pressed') }; });
  check('the theme toggle switches to Show Dark and remembers the choice', theme.theme === 'dark' && theme.stored === 'dark' && theme.pressed === 'true', theme);
}

async function viewportMatrix(page, baseUrl) {
  const results = [];
  let themeScript = null;
  for (const theme of ['light', 'dark']) {
    // The saved theme applies before first paint, as it does for a returning operator.
    if (themeScript) await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: themeScript });
    ({ identifier: themeScript } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('shader.practice.theme.v1', '${theme}'); } catch {}` }));
    for (const [width, height] of VIEWPORTS) {
      await page.viewport(width, height);
      await page.open(`${baseUrl}shader/practice.html?scenario=recover-highlights&seed=layout-proof`);
      await delay(200);
      await page.settle();
      const report = await page.eval(inspectLayout, STATEMENTS);
      report.themeApplied = await page.eval(() => document.documentElement.dataset.theme);
      results.push({ width, height, theme, ...report });
      if (report.layout === 'compact') {
        for (const view of ['scopes', 'exercise', 'score', 'demo', 'shade']) {
          await page.eval(target => document.querySelector(`[data-view="${target}"]`).click(), view);
          // Let 120 ms colour transitions finish before measuring contrast.
          await delay(200);
          await page.settle();
          const viewReport = await page.eval(inspectLayout, STATEMENTS);
          results.push({ width, height, theme, view, ...viewReport });
        }
      }
    }
  }
  check('the saved theme applies in every layout', results.filter(item => !item.view).every(item => item.themeApplied === item.theme), results.filter(item => !item.view).map(item => `${item.width}:${item.themeApplied}`));
  const expectedLayout = width => (width < 900 ? 'compact' : width < 1280 ? 'medium' : 'desktop');
  const bad = results.filter(item => item.overflowX || item.overflowY);
  check('every viewport and view stays contained with no page overflow', bad.length === 0, bad.map(item => `${item.width}x${item.height} ${item.theme} ${item.view || ''}`));
  const layoutMismatch = results.filter(item => item.layout !== expectedLayout(item.width));
  check('layouts switch between phone, laptop and desktop consoles at the documented widths', layoutMismatch.length === 0, layoutMismatch.map(item => `${item.width}:${item.layout}`));
  const shade = results.filter(item => !item.view || item.view === 'shade');
  const missing = shade.filter(item => item.statements.some(statement => !statement.visible));
  check('the simulation, measurement and equipment statements stay visible in every layout', missing.length === 0, missing.map(item => `${item.width}x${item.height} ${item.theme}: ${item.statements.filter(s => !s.visible).map(s => s.text).join(' / ')}`));
  const nav = results.filter(item => !item.view).map(item => ({ width: item.width, ok: item.layout === 'compact' ? item.rail && !item.sideTabs : item.sideTabs && !item.rail }));
  check('phones use the task rail and wider layouts use side tabs, never both', nav.every(item => item.ok), nav);
  const small = results.filter(item => item.small.length);
  check('visible controls keep 44 px touch targets at every size', small.length === 0, small.slice(0, 4).map(item => `${item.width}x${item.height} ${item.view || ''}: ${item.small.join(', ')}`));
  const contrast = results.filter(item => item.lowContrast.length);
  check('visible text meets WCAG contrast in light and dark themes', contrast.length === 0, contrast.slice(0, 4).map(item => `${item.width} ${item.theme} ${item.view || ''}: ${item.lowContrast.join(', ')}`));
  const undrawn = results.filter(item => !item.canvasDrawn);
  check('every visible monitor and scope canvas draws a picture', undrawn.length === 0, undrawn.map(item => `${item.width}x${item.height} ${item.theme} ${item.view || ''}`));
}

async function reducedMotion(page, baseUrl) {
  await page.viewport(1440, 900);
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.open(`${baseUrl}shader/practice.html?scenario=match-cameras&seed=motion-proof`);
  const result = await page.eval(async () => {
    const button = document.getElementById('blinkButton');
    button.click();
    const first = ShaderPracticeApp.getState().view.compare;
    await new Promise(resolve => setTimeout(resolve, 900));
    const settled = ShaderPracticeApp.getState().view.compare;
    button.click();
    return { label: button.textContent, first, settled, second: ShaderPracticeApp.getState().view.compare, blinking: ShaderPracticeApp.ui().blinking, transition: getComputedStyle(document.querySelector('.btn')).transitionDuration };
  });
  check('reduced motion replaces automatic blinking with a manual A/B flip and no transitions', result.label === 'FLIP A/B' && result.first === 'reference' && result.settled === 'reference' && result.second === 'target' && !result.blinking && /^0s/.test(result.transition), result);
}

async function failurePaths(connection, baseUrl) {
  const scenarios = [
    ['storage denied', `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage is blocked', 'SecurityError'); } });`],
    ['clipboard denied', `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new DOMException('Clipboard is blocked', 'NotAllowedError')) } });`],
    ['canvas unavailable', `HTMLCanvasElement.prototype.getContext = function () { return null; };`],
    ['service worker refused', `if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('Service worker registration refused'));`]
  ];
  const pages = [];
  for (const [label, script] of scenarios) {
    const page = await newPage(connection, label);
    pages.push(page);
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: script });
    await page.viewport(1440, 900);
    await page.open(`${baseUrl}shader/practice.html?scenario=match-cameras&seed=${encodeURIComponent(label)}`);
    if (label === 'storage denied') {
      const result = await page.eval(() => {
        document.getElementById('themeButton').click();
        const input = document.getElementById('control-pedestal');
        input.value = 0;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        ShaderPracticeApp.renderNow();
        return { theme: document.documentElement.dataset.theme, storage: ShaderPracticeApp.ui().storage, pedestal: ShaderPracticeApp.getState().cameras[1].controls.pedestal };
      });
      check('the console works with storage denied: theme toggles and controls respond', result.theme === 'dark' && result.storage === false && result.pedestal === 0, result);
    }
    if (label === 'clipboard denied') {
      const result = await page.eval(async () => {
        document.getElementById('shareButton').click();
        document.getElementById('copyLinkButton').click();
        await new Promise(resolve => setTimeout(resolve, 200));
        const field = document.getElementById('shareLinkField');
        return { status: document.getElementById('shareStatus').textContent, selected: document.activeElement === field && field.selectionEnd > field.selectionStart, link: field.value };
      });
      check('with clipboard denied the link is shown selected with manual-copy instructions', /blocked/.test(result.status) && result.selected && /#state=/.test(result.link), { status: result.status, selected: result.selected });
    }
    if (label === 'canvas unavailable') {
      const result = await page.eval(() => ({ fallback: [...document.querySelectorAll('.canvas-fallback')].map(node => node.textContent).join(' | '), readout: document.getElementById('readoutB').textContent, canvas: ShaderPracticeApp.ui().canvas, score: (document.getElementById('scoreButton').click(), ShaderPracticeApp.getState().checks.length) }));
      check('without canvas the console explains the fallback and keeps readouts and scoring', /canvas/.test(result.fallback) && /PEAK/.test(result.readout) && result.canvas === false && result.score === 1, result);
    }
    if (label === 'service worker refused') {
      await delay(300);
      const result = await page.eval(() => ({ state: document.documentElement.dataset.offline, status: document.getElementById('offlineStatus').textContent }));
      check('a refused service worker leaves a clear status and a working console', result.state === 'error' && /could not be prepared/.test(result.status), result);
    }
  }
  const noScript = await newPage(connection, 'javascript disabled');
  pages.push(noScript);
  await noScript.send('Emulation.setScriptExecutionDisabled', { value: true });
  await noScript.viewport(390, 844);
  await noScript.send('Page.navigate', { url: `${baseUrl}shader/practice.html` });
  await delay(800);
  await noScript.send('Emulation.setScriptExecutionDisabled', { value: false });
  const noscriptText = await noScript.eval(() => {
    const block = document.querySelector('noscript');
    return { text: document.body.innerText, links: [...document.querySelectorAll('a[href]')].map(link => link.getAttribute('href')) };
  });
  check('without JavaScript the page states it is a simulation and keeps its escape links', /SIMULATION FOR PRACTICE/.test(noscriptText.text) && noscriptText.links.includes('index.html') && noscriptText.links.includes('/fmp/'), { links: noscriptText.links });
  return pages;
}

async function newPage(connection, label) {
  const { browserContextId } = await connection.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new Page(connection, sessionId, browserContextId, label);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');
  return page;
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
    '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let socket;
  const pages = [];
  try {
    await waitForHttp(`http://127.0.0.1:${port}/json/version`);
    const version = await fetch(`http://127.0.0.1:${port}/json/version`).then(response => response.json());
    socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const connection = new Connection(socket);
    const main = await newPage(connection, 'main');
    pages.push(main);
    await mainSession(main, baseUrl);
    const matrix = await newPage(connection, 'viewports');
    pages.push(matrix);
    await viewportMatrix(matrix, baseUrl);
    const motion = await newPage(connection, 'reduced motion');
    pages.push(motion);
    await reducedMotion(motion, baseUrl);
    pages.push(...await failurePaths(connection, baseUrl));
    const problems = pages.flatMap(page => page.errors().map(error => `${page.label}: ${error}`));
    check('the whole run has no uncaught exceptions, console errors or failed requests', problems.length === 0, problems.slice(0, 8));
  } finally {
    // Ask Chrome to close over the protocol first; a signal alone can leave a
    // headless browser with open service workers running.
    if (socket && socket.readyState === 1) {
      try { await Promise.race([new Connection(socket).send('Browser.close'), delay(1000)]); } catch {}
    }
    try { socket?.close(); } catch {}
    if (chrome.exitCode === null) chrome.kill('SIGTERM');
    if (staticServer) staticServer.server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => chrome.exitCode === null ? chrome.once('exit', resolve) : resolve()), delay(1500)]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
    try { await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
    catch (error) { console.warn(`Could not remove temporary Chrome profile ${profile}: ${error.message}`); }
  }
  if (failures.length) { console.error(`Shader Practice browser probe failed (${failures.length}).`); process.exit(1); }
  console.log('Shader Practice browser probe passed.');
  process.exit(0);
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
