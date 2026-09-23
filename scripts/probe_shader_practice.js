#!/usr/bin/env node
'use strict';

// Browser acceptance probe for the deterministic Shader camera-shading lab.
// It drives the shipped page without a browser-test framework and verifies the
// learner workflow, responsive reachability, accessibility state, offline
// cache, all four generated scopes, and exact-state handoff.

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
  else {
    failures.push(name);
    console.log(`not ok - ${name}${detail ? ` :: ${JSON.stringify(detail)}` : ''}`);
  }
}

async function waitForHttp(url, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw new Error(`${url} did not become reachable.`);
}

async function startServer() {
  const port = 8800 + Math.floor(Math.random() * 300);
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore'
  });
  const baseUrl = `http://127.0.0.1:${port}/`;
  await waitForHttp(`${baseUrl}shader/practice.html`);
  return { server, baseUrl };
}

async function main() {
  if (!chromeBin) throw new Error(`Chrome binary not found. Tried: ${chromeCandidates.join(', ')}`);
  let baseUrl = baseArg ? baseArg.slice('--base='.length).replace(/\/?$/, '/') : '';
  let staticServer;
  if (!baseUrl) {
    staticServer = await startServer();
    baseUrl = staticServer.baseUrl;
  }

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
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });

    let sequence = 0;
    const pending = new Map();
    const exceptions = [];
    const consoleErrors = [];
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') {
        exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      }
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type)) {
        consoleErrors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
      }
      if (!message.id || !pending.has(message.id)) return;
      const pair = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) pair.reject(new Error(JSON.stringify(message.error)));
      else pair.resolve(message.result);
    };

    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const viewport = async (width, height) => {
      await cdp('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: width <= 680
      });
      await delay(100);
    };
    const open = async url => {
      await cdp('Page.navigate', { url });
      for (let count = 0; count < 120; count += 1) {
        try {
          if (await evaluate(`Boolean(window.ShaderPracticeApp && window.ShaderPracticeState && document.getElementById('scopeCanvas-waveform'))`)) {
            await delay(150);
            return;
          }
        } catch {}
        await delay(100);
      }
      throw new Error(`Shader Practice did not become ready: ${url}`);
    };

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Network.enable');
    await viewport(1440, 900);

    const url = `${baseUrl}shader/practice.html?scenario=match-cameras&seed=browser-proof`;
    await open(url);
    const baseline = await evaluate(`(() => {
      const state = ShaderPracticeApp.getState();
      return {
        schema: state.schema,
        cameras: state.cameras.length,
        controls: Object.keys(state.cameras[0].controls).length,
        score: ShaderPracticeState.evaluatePractice(state).score,
        label: document.querySelector('.sim-flag')?.textContent.trim(),
        disclaimer: document.querySelector('.scope-disclaimer')?.textContent.trim(),
        identity: document.getElementById('stateIdentity')?.textContent.trim()
      };
    })()`);
    check(
      'practice page exposes two cameras, seven controls, and the versioned shared state',
      baseline.schema === 'shader.camera-practice.v1' && baseline.cameras === 2 && baseline.controls === 7 && /shader\.camera-practice\.v1/.test(baseline.identity),
      baseline
    );
    check(
      'practice page visibly labels generated simulation data',
      /SIMULATION FOR PRACTICE/.test(baseline.label) && baseline.disclaimer === 'Generated practice signal · not a measurement',
      baseline
    );

    let offlineReady = false;
    for (let count = 0; count < 120 && !offlineReady; count += 1) {
      offlineReady = await evaluate(`document.documentElement.dataset.offline === 'ready' && Boolean(navigator.serviceWorker?.controller)`);
      if (!offlineReady) await delay(100);
    }
    check('a fresh direct visit prepares its own offline cache', offlineReady, await evaluate(`({
      state: document.documentElement.dataset.offline || '',
      status: document.getElementById('offlineStatus')?.textContent.trim(),
      controlled: Boolean(navigator.serviceWorker?.controller)
    })`));

    await cdp('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1
    });
    await open(url);
    const offlineReload = await evaluate(`({
      schema: ShaderPracticeApp.getState().schema,
      state: document.documentElement.dataset.offline || '',
      controlled: Boolean(navigator.serviceWorker?.controller),
      stylesheet: Boolean([...document.styleSheets].find(sheet => /practice\.css/.test(sheet.href || ''))),
      renderer: Boolean(window.ShaderPracticeRender)
    })`);
    check(
      'scope practice reloads its page, styles, engine, renderer, and app from a fresh-profile cache while offline',
      offlineReload.schema === 'shader.camera-practice.v1' && offlineReload.controlled && offlineReload.stylesheet && offlineReload.renderer,
      offlineReload
    );
    await cdp('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
    });

    const referenceLock = await evaluate(`(() => {
      const reference = () => ShaderPracticeApp.getState().cameras.find(camera => camera.id === 'camera-a');
      const target = () => ShaderPracticeApp.getState().cameras.find(camera => camera.id === 'camera-b');
      const beforeReference = structuredClone(reference().controls);
      const beforeTarget = structuredClone(target().controls);
      const cameraButton = document.querySelector('[data-camera-switch="camera-a"]');
      const monitorButton = document.getElementById('monitorSelectA');
      cameraButton?.click();
      monitorButton?.click();
      const editControls = [...document.querySelectorAll('#controlList input, #controlList button'), document.getElementById('resetCameraButton')].filter(Boolean);
      const input = [...document.querySelectorAll('#controlList input[data-control]')].find(control => !control.disabled && control.getAttribute('aria-disabled') !== 'true');
      if (input) {
        const current = Number(input.value);
        const minimum = Number(input.min);
        const maximum = Number(input.max);
        input.value = String(current === maximum ? minimum : maximum);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const after = ShaderPracticeApp.getState();
      return {
        selected: after.selectedCameraId,
        referenceUnchanged: JSON.stringify(beforeReference) === JSON.stringify(reference().controls),
        targetChanged: JSON.stringify(beforeTarget) !== JSON.stringify(target().controls),
        editsLocked: editControls.length > 0 && editControls.every(control => control.disabled || control.getAttribute('aria-disabled') === 'true'),
        activeControlCamera: document.getElementById('controlTarget')?.textContent.trim(),
        inputFound: Boolean(input)
      };
    })()`);
    check(
      'the scored learner workflow prevents every visible control from modifying Camera A',
      referenceLock.referenceUnchanged && (
        (referenceLock.inputFound && referenceLock.targetChanged && /CAM B.*TARGET/.test(referenceLock.activeControlCamera)) ||
        (!referenceLock.inputFound && referenceLock.editsLocked && /reference inspection.*controls locked/i.test(referenceLock.activeControlCamera))
      ),
      referenceLock
    );

    const match = await evaluate(`(() => {
      document.querySelector('[data-camera-switch="camera-b"]').click();
      const state = ShaderPracticeApp.getState();
      const reference = state.cameras.find(camera => camera.id === 'camera-a').controls;
      for (const [name, value] of Object.entries(reference)) {
        const candidates = [...document.querySelectorAll('[data-control="' + name + '"]')];
        const input = candidates.find(element => element.matches('input[type="range"]')) || candidates.find(element => element.matches('input'));
        if (!input) continue;
        input.value = String(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const next = ShaderPracticeApp.getState();
      return {
        score: ShaderPracticeState.evaluatePractice(next).score,
        selected: next.selectedCameraId,
        reference: next.cameras.find(camera => camera.id === 'camera-a').controls,
        target: next.cameras.find(camera => camera.id === 'camera-b').controls
      };
    })()`);
    check(
      'matching Camera B through the visible control panel improves the exercise to a passing score',
      match.selected === 'camera-b' && match.score > baseline.score && match.score >= 95 && JSON.stringify(match.reference) === JSON.stringify(match.target),
      { baseline: baseline.score, match }
    );

    const scopes = await evaluate(`(async () => {
      const result = {};
      for (const name of ['waveform', 'parade', 'vectorscope', 'histogram']) {
        document.querySelector('[data-scope="' + name + '"]').click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const state = ShaderPracticeApp.getState();
        const canvas = document.getElementById('scopeCanvas-' + name);
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        const figure = document.getElementById('scopeFigure-' + name);
        result[name] = {
          selected: state.scope,
          drawn: canvas.width > 1 && canvas.height > 1 && pixels.some(value => value !== 0),
          visible: !figure.hidden && getComputedStyle(figure).display !== 'none'
        };
      }
      return result;
    })()`);
    check(
      'all four scope tabs expose their own visible, rendered canvas',
      Object.entries(scopes).every(([name, result]) => result.selected === name && result.drawn && result.visible),
      scopes
    );

    const debrief = await evaluate(`(async () => {
      const score = document.getElementById('scoreButton');
      score.click();
      await new Promise(resolve => setTimeout(resolve, 80));
      await new Promise(resolve => requestAnimationFrame(resolve));
      const heading = document.getElementById('scoreHeading');
      const panel = document.getElementById('panel-score');
      return {
        focused: document.activeElement === heading,
        panelVisible: !panel.hidden && getComputedStyle(panel).display !== 'none',
        score: document.getElementById('scoreNumber')?.textContent.trim(),
        sideSelected: document.getElementById('tab-score')?.getAttribute('aria-selected'),
        mobileSelected: document.querySelector('[data-view="score"]')?.getAttribute('aria-pressed')
      };
    })()`);
    check(
      'scoring opens the debrief and transfers focus to its heading',
      debrief.focused && debrief.panelVisible && /^\d+$/.test(debrief.score),
      debrief
    );

    const handoff = await evaluate(`(() => ({ state: ShaderPracticeApp.getState(), url: ShaderPracticeApp.fullStateLink() }))()`);
    await open(handoff.url);
    const reproduced = await evaluate('ShaderPracticeApp.getState()');
    check('full-state handoff reproduces the exact practice session', JSON.stringify(reproduced) === JSON.stringify(handoff.state));

    // Restart the responsive pass from the unscored learner view so a saved
    // debrief panel cannot hide the camera-control path being measured.
    await viewport(1440, 900);
    await open(url);

    const sizes = [
      [320, 568], [390, 844], [820, 900], [821, 900], [876, 900],
      [1024, 600], [1440, 900], [2560, 1080]
    ];
    const responsive = [];
    for (const [width, height] of sizes) {
      await viewport(width, height);
      const result = await evaluate(`(async () => {
        const width = ${width};
        const height = ${height};
        const visible = element => {
          if (!element) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const fullyInViewport = element => {
          if (!visible(element)) return false;
          const rect = element.getBoundingClientRect();
          return rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1;
        };
        const rail = document.getElementById('viewRail');
        const mobile = visible(rail);
        const shadeButton = document.querySelector('[data-view="shade"]');
        if (mobile) shadeButton.click();
        else {
          const controlTab = document.getElementById('tab-control');
          if (visible(controlTab)) controlTab.click();
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const score = document.getElementById('scoreButton');
        score.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const center = score.getBoundingClientRect();
        const hit = document.elementFromPoint(
          Math.max(0, Math.min(innerWidth - 1, center.left + center.width / 2)),
          Math.max(0, Math.min(innerHeight - 1, center.top + center.height / 2))
        );
        const roleA = document.getElementById('roleTagA');
        const roleB = document.getElementById('roleTagB');
        const modeA = document.getElementById('tallyTagA');
        const modeB = document.getElementById('tallyTagB');
        const scoreStatus = {
          visible: visible(score),
          reachable: fullyInViewport(score) && (hit === score || score.contains(hit)),
          rect: { left: center.left, top: center.top, right: center.right, bottom: center.bottom },
          diagnostic: {
            hidden: score.hidden,
            display: getComputedStyle(score).display,
            visibility: getComputedStyle(score).visibility,
            hit: hit ? { id: hit.id, className: typeof hit.className === 'string' ? hit.className : '', tag: hit.tagName } : null,
            panelHidden: document.getElementById('controlPanel').hidden,
            panelDisplay: getComputedStyle(document.getElementById('controlPanel')).display
          }
        };
        const roleStatus = {
          a: { visible: visible(roleA), text: roleA?.textContent.trim() || '' },
          b: { visible: visible(roleB), text: roleB?.textContent.trim() || '' },
          modes: ((modeA?.textContent || '') + ' ' + (modeB?.textContent || '')).trim()
        };
        const buttons = [...document.querySelectorAll('#viewRail [data-view]')];
        const railInitial = {
          label: rail?.getAttribute('aria-label'),
          pressed: buttons.filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.dataset.view),
          allTyped: buttons.every(button => button.getAttribute('type') === 'button'),
          allStates: buttons.every(button => ['true', 'false'].includes(button.getAttribute('aria-pressed')))
        };
        const containment = [];
        if (mobile) {
          for (const button of buttons) {
            button.click();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            containment.push({
              view: button.dataset.view,
              overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
              documentWidth: document.documentElement.scrollWidth
            });
          }
          shadeButton.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        } else {
          const tabs = [...document.querySelectorAll('#sideTabs [data-side-tab]')].filter(visible);
          for (const button of tabs) {
            button.click();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            containment.push({
              view: button.dataset.sideTab,
              overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
              documentWidth: document.documentElement.scrollWidth
            });
          }
          const controlTab = document.getElementById('tab-control');
          if (visible(controlTab)) controlTab.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        let railSwitch = null;
        let phoneLegend = null;
        if (mobile) {
          const scopesButton = document.querySelector('[data-view="scopes"]');
          scopesButton.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const selected = buttons.filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.dataset.view);
          railSwitch = {
            bodyView: document.body.dataset.view,
            selected,
            scopeVisible: visible(document.getElementById('scopePanel'))
          };
          const activeFigure = document.getElementById('scopeFigure-' + ShaderPracticeApp.getState().scope);
          const legend = activeFigure?.querySelector('.legend');
          phoneLegend = {
            visible: visible(legend),
            text: legend?.textContent.trim() || ''
          };
        }
        return {
          width, height, mobile,
          horizontalOverflow: containment.some(item => item.overflow),
          containment,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          scoreVisible: scoreStatus.visible,
          scoreReachable: scoreStatus.reachable,
          scoreRect: scoreStatus.rect,
          scoreDiagnostic: scoreStatus.diagnostic,
          roles: roleStatus,
          railInitial, railSwitch, phoneLegend
        };
      })()`);
      responsive.push(result);
    }
    check(
      'responsive layouts remain horizontally contained at every required boundary viewport',
      responsive.every(result => !result.horizontalOverflow),
      responsive.filter(result => result.horizontalOverflow)
    );
    check(
      'Score attempt remains visible and pointer-reachable at every required viewport',
      responsive.every(result => result.scoreVisible && result.scoreReachable),
      responsive.filter(result => !result.scoreVisible || !result.scoreReachable)
    );
    check(
      'reference and target role tags remain persistent in the shading view',
      responsive.every(result => result.roles.a.visible && /REF.*CAM A/.test(result.roles.a.text) && result.roles.b.visible && /TGT.*CAM B/.test(result.roles.b.text)),
      responsive.filter(result => !result.roles.a.visible || !result.roles.b.visible)
    );
    check(
      'practice roles do not imitate real program or preview tally',
      responsive.every(result => !/\b(?:PGM|PVW)\b/.test(result.roles.modes)),
      responsive.filter(result => /\b(?:PGM|PVW)\b/.test(result.roles.modes))
    );
    const mobileResults = responsive.filter(result => result.width <= 899);
    check(
      'the mobile and tablet task rail exposes one pressed view and updates its semantic state',
      mobileResults.every(result => result.mobile && result.railInitial.label === 'Practice views' && result.railInitial.allTyped && result.railInitial.allStates && result.railInitial.pressed.length === 1 && result.railSwitch?.bodyView === 'scopes' && result.railSwitch.selected.length === 1 && result.railSwitch.selected[0] === 'scopes' && result.railSwitch.scopeVisible),
      mobileResults
    );
    const phoneResults = responsive.filter(result => result.width <= 390);
    check(
      'phone scope view keeps the reference and target trace legend visible',
      phoneResults.every(result => result.phoneLegend?.visible && /REF/i.test(result.phoneLegend.text) && /TGT/i.test(result.phoneLegend.text)),
      phoneResults.map(result => ({ width: result.width, legend: result.phoneLegend }))
    );

    await viewport(390, 844);
    await open(url);
    const mobileDebrief = await evaluate(`(async () => {
      document.querySelector('[data-view="shade"]').click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      document.getElementById('scoreButton').click();
      await new Promise(resolve => setTimeout(resolve, 80));
      await new Promise(resolve => requestAnimationFrame(resolve));
      const panel = document.getElementById('panel-score');
      const heading = document.getElementById('scoreHeading');
      return {
        bodyView: document.body.dataset.view,
        focused: document.activeElement === heading,
        panelVisible: !panel.hidden && getComputedStyle(panel).display !== 'none',
        selected: [...document.querySelectorAll('#viewRail [data-view]')]
          .filter(button => button.getAttribute('aria-pressed') === 'true')
          .map(button => button.dataset.view)
      };
    })()`);
    check(
      'phone scoring selects the debrief view and transfers focus to its heading',
      mobileDebrief.bodyView === 'score' && mobileDebrief.focused && mobileDebrief.panelVisible && mobileDebrief.selected.length === 1 && mobileDebrief.selected[0] === 'score',
      mobileDebrief
    );
    check('browser run has no uncaught exceptions or console errors', exceptions.length === 0 && consoleErrors.length === 0, { exceptions, consoleErrors });
  } finally {
    try { socket?.close(); } catch {}
    chrome.kill('SIGTERM');
    if (staticServer) staticServer.server.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => chrome.exitCode === null ? chrome.once('exit', resolve) : resolve()),
      delay(1500)
    ]);
    try {
      await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile ${profile}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error(`Shader Practice browser probe failed (${failures.length}).`);
    process.exit(1);
  }
  console.log('Shader Practice browser probe passed.');
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
