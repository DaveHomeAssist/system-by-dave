#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');

if (typeof WebSocket === 'undefined') {
  console.error('This probe requires a Node runtime with global WebSocket support.');
  process.exit(1);
}

const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith('--base='));
const chromeArg = args.find((arg) => arg.startsWith('--chrome='));
const baseUrl = (baseArg ? baseArg.slice('--base='.length) : 'http://127.0.0.1:8000/').replace(/\/?$/, '/');
const chromeBin = chromeArg ? chromeArg.slice('--chrome='.length) : (
  process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
    } catch (error) {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function removeProfile(profile) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error.code !== 'ENOTEMPTY' && error.code !== 'EBUSY') throw error;
      await delay(250);
    }
  }
  fs.rmSync(profile, { recursive: true, force: true });
}

async function main() {
  if (!fs.existsSync(chromeBin)) throw new Error(`Chrome binary not found: ${chromeBin}`);
  const port = 9900 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(`${os.tmpdir()}/sbd-led-configurator-probe-`);
  const chrome = spawn(chromeBin, [
    '--headless=new', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--no-default-browser-check', '--no-first-run',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  try {
    await waitForJson(port);
    const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });

    let sequence = 0;
    const pending = new Map();
    const exceptions = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') {
        exceptions.push(message.params.exceptionDetails.text || 'Runtime exception');
        return;
      }
      if (!message.id || !pending.has(message.id)) return;
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(JSON.stringify(message.error)));
      else callbacks.resolve(message.result);
    };

    function cdp(method, params = {}) {
      const id = sequence += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    }

    async function evaluate(expression) {
      const response = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
      return response.result.value;
    }

    async function scenario(name, changes, expected) {
      const result = await evaluate(`(() => {
        const set = (id, value) => {
          const field = document.getElementById(id);
          if (!field) throw new Error('Missing field: ' + id);
          field.value = value;
          field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
          if (field.tagName !== 'SELECT') field.dispatchEvent(new Event('change', { bubbles: true }));
        };
        ${JSON.stringify(changes)}.forEach(([id, value]) => set(id, value));
        const text = (id) => document.getElementById(id).textContent.trim();
        return {
          build: text('ledBuildArray'), metric: text('ledMetricSize'), raster: text('ledNativeRaster'),
          cabinetRaster: text('ledCabinetRaster'), ports: text('ledProcessing'), power: text('ledPower'),
          outcome: text('ledTargetOutcome'), warnings: text('ledWarnings'),
          cabinetsWideInput: document.getElementById('ledCabinetsWide').value
        };
      })()`);
      for (const [key, fragment] of Object.entries(expected)) {
        if (!String(result[key]).includes(fragment)) {
          throw new Error(`${name}: expected ${key} to include ${JSON.stringify(fragment)}, received ${JSON.stringify(result[key])}.`);
        }
      }
      console.log(`PASS ${name}`);
    }

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: new URL('led-wall-calculator.html', baseUrl).href });
    await delay(1000);

    await scenario('default cabinet layout', [], {
      build: '8 × 5 cabinets', metric: '4.000 × 2.500 m', raster: '1,376 × 860 px',
      ports: '3 estimated ports', power: '7.20 kW max'
    });
    const defaultPower = await evaluate(`(() => ({
      factor: document.getElementById('ledPowerFactor').value,
      current: document.getElementById('ledMaxLoad').textContent,
      circuits: document.getElementById('ledCircuitPlan').textContent
    }))()`);
    if (defaultPower.factor !== '' || !defaultPower.current.includes('current pending PF') || !defaultPower.circuits.includes('Enter manufacturer PF')) {
      throw new Error(`Unverified LED power factor produced current or circuits: ${JSON.stringify(defaultPower)}.`);
    }
    console.log('PASS watts remain visible while current and circuits await manufacturer PF');
    await scenario('target physical size uses independent ceilings', [
      ['ledMode', 'targetSize'], ['ledTargetWidthFt', '16'], ['ledTargetHeightFt', '9']
    ], {
      build: '10 × 6 cabinets', metric: '5.000 × 3.000 m',
      outcome: 'independent column and row ceiling produces 10 × 6 cabinets'
    });
    await scenario('target raster uses independent ceilings', [
      ['ledMode', 'targetRaster'], ['ledTargetWidthPx', '1920'], ['ledTargetHeightPx', '1080']
    ], {
      build: '12 × 7 cabinets', raster: '2,064 × 1,204 px',
      outcome: 'independent column and row ceiling produces 12 × 7 cabinets'
    });
    await scenario('rotation swaps physical and pixel axes', [
      ['ledMode', 'layout'], ['ledCabinetWidthMm', '500'], ['ledCabinetHeightMm', '1000'],
      ['ledCabinetPixelsWide', '168'], ['ledCabinetPixelsHigh', '336'],
      ['ledCabinetRotation', '90'], ['ledCabinetsWide', '2'], ['ledCabinetsHigh', '3']
    ], {
      build: '2 × 3 cabinets · rotated', metric: '2.000 × 1.500 m', raster: '672 × 504 px'
    });
    await scenario('blank cabinet raster derives both axes from pitch', [
      ['ledCabinetRotation', '0'], ['ledPitchMm', '2.5'],
      ['ledCabinetPixelsWide', ''], ['ledCabinetPixelsHigh', '']
    ], { cabinetRaster: '200 × 400 px · pitch derived' });
    const blankRasterState = await evaluate(`(() => {
      const state = JSON.parse(localStorage.getItem('avCalculator.v1'));
      return [state.ledCabinetPixelsWide, state.ledCabinetPixelsHigh];
    })()`);
    if (JSON.stringify(blankRasterState) !== '[null,null]') {
      throw new Error(`Blank optional cabinet raster did not persist explicitly: ${JSON.stringify(blankRasterState)}.`);
    }
    console.log('PASS blank optional raster persistence');
    const numericDraft = await evaluate(`(() => {
      const pitch = document.getElementById('ledPitchMm');
      pitch.value = '0';
      pitch.dispatchEvent(new Event('input', { bubbles: true }));
      const intermediate = pitch.value;
      const editing = document.getElementById('saveStatus').textContent;
      pitch.value = '0.95';
      pitch.dispatchEvent(new Event('input', { bubbles: true }));
      pitch.dispatchEvent(new Event('change', { bubbles: true }));
      return { intermediate, editing, final: pitch.value,
        saved: JSON.parse(localStorage.getItem('avCalculator.v1')).ledPitchMm };
    })()`);
    if (numericDraft.intermediate !== '0' || numericDraft.editing !== 'Editing' || numericDraft.final !== '0.95' || numericDraft.saved !== 0.95) {
      throw new Error(`Numeric input was changed before editing finished: ${JSON.stringify(numericDraft)}.`);
    }
    console.log('PASS in-progress numeric entry is preserved and final value persists');
    await evaluate(`(() => {
      const pitch = document.getElementById('ledPitchMm');
      pitch.value = '2.5';
      pitch.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await scenario('incomplete cabinet raster is rejected as a pair', [
      ['ledCabinetPixelsWide', '172']
    ], {
      cabinetRaster: '200 × 400 px · pitch derived',
      warnings: 'Enter both cabinet raster dimensions or leave both blank.'
    });
    await scenario('fractional cabinet count is visibly normalized', [
      ['ledCabinetPixelsWide', '200'], ['ledCabinetPixelsHigh', '400'],
      ['ledCabinetHeightMm', '1000'], ['ledCabinetsWide', '3.6']
    ], { build: '4 × 3 cabinets', cabinetsWideInput: '4' });

    const profileResult = await evaluate(`(() => {
      const set = (id, value) => {
        const field = document.getElementById(id);
        field.value = value;
        field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      };
      set('ledProductName', 'Probe Profile 500');
      set('ledPitchMm', '2.6');
      document.getElementById('saveLedPresetBtn').click();
      set('ledPitchMm', '3.9');
      const profile = document.getElementById('ledProfileSelect');
      profile.value = 'probe-profile-500';
      profile.dispatchEvent(new Event('change', { bubbles: true }));
      const savedProfiles = JSON.parse(localStorage.getItem('avCalculator.ledProfiles.v1'));
      return { name: document.getElementById('ledProductName').value,
        pitch: document.getElementById('ledPitchMm').value, profiles: savedProfiles.length };
    })()`);
    if (profileResult.name !== 'Probe Profile 500' || profileResult.pitch !== '2.6' || profileResult.profiles !== 1) {
      throw new Error(`Saved profile round trip failed: ${JSON.stringify(profileResult)}.`);
    }
    console.log('PASS saved profile round trip');

    const previewResult = await evaluate(`(() => {
      document.getElementById('ledPreviewFrontBtn').click();
      const stage = document.getElementById('ledWallPreview').parentElement;
      const front = stage.classList.contains('front-view') && document.getElementById('ledPreviewFrontBtn').getAttribute('aria-pressed') === 'true';
      document.getElementById('ledPreviewIsoBtn').click();
      const iso = !stage.classList.contains('front-view') && document.getElementById('ledPreviewIsoBtn').getAttribute('aria-pressed') === 'true';
      return { front, iso, label: document.getElementById('ledWallPreview').getAttribute('aria-label') };
    })()`);
    if (!previewResult.front || !previewResult.iso || !previewResult.label.includes('cabinet LED wall preview')) {
      throw new Error(`Cabinet map view toggle failed: ${JSON.stringify(previewResult)}.`);
    }
    console.log('PASS accessible front and isometric cabinet-map views');

    const boundaryResult = await evaluate(`(() => {
      const set = (id, value) => {
        const field = document.getElementById(id);
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set('ledPitchMm', '');
      set('ledCabinetWidthMm', '0');
      set('ledCabinetHeightMm', '10001');
      const result = {
        pitch: document.getElementById('ledPitchMm').value,
        width: document.getElementById('ledCabinetWidthMm').value,
        height: document.getElementById('ledCabinetHeightMm').value
      };
      document.getElementById('resetBtn').click();
      result.resetStatus = document.getElementById('actionStatus').textContent;
      return result;
    })()`);
    if (boundaryResult.pitch !== '2.9' || boundaryResult.width !== '1' || boundaryResult.height !== '10000' || !boundaryResult.resetStatus.includes('LED planner reset')) {
      throw new Error(`Numeric boundary or reset normalization failed: ${JSON.stringify(boundaryResult)}.`);
    }
    console.log('PASS blank, below-minimum, above-maximum, and reset behavior');
    const powerFactorResult = await evaluate(`(() => {
      const factor = document.getElementById('ledPowerFactor');
      factor.value = '0.8';
      factor.dispatchEvent(new Event('input', { bubbles: true }));
      factor.dispatchEvent(new Event('change', { bubbles: true }));
      return { current: document.getElementById('ledMaxLoad').textContent,
        circuits: document.getElementById('ledCircuitPlan').textContent,
        entered: JSON.parse(localStorage.getItem('avCalculator.v1')).ledPowerFactorEntered };
    })()`);
    if (!powerFactorResult.current.includes('~75.0 A') || !powerFactorResult.circuits.includes('5 max') || powerFactorResult.entered !== true) {
      throw new Error(`Single-phase PF calculation failed: ${JSON.stringify(powerFactorResult)}.`);
    }
    await cdp('Page.reload');
    await delay(500);
    const restoredPower = await evaluate(`(() => ({
      factor: document.getElementById('ledPowerFactor').value,
      current: document.getElementById('ledMaxLoad').textContent
    }))()`);
    if (restoredPower.factor !== '0.8' || !restoredPower.current.includes('~75.0 A')) {
      throw new Error(`Entered LED power factor did not survive reload: ${JSON.stringify(restoredPower)}.`);
    }
    const threePhasePower = await evaluate(`(() => {
      const phase = document.getElementById('ledPhaseMode');
      phase.value = 'threePhase';
      phase.dispatchEvent(new Event('change', { bubbles: true }));
      const voltage = document.getElementById('ledVoltage');
      voltage.value = '208';
      voltage.dispatchEvent(new Event('change', { bubbles: true }));
      return { current: document.getElementById('ledMaxLoad').textContent,
        circuits: document.getElementById('ledCircuitPlan').textContent };
    })()`);
    if (!threePhasePower.current.includes('~25.0 A') || !threePhasePower.circuits.includes('2 max')) {
      throw new Error(`Balanced three-phase PF calculation failed: ${JSON.stringify(threePhasePower)}.`);
    }
    const migratedPower = await evaluate(`(() => {
      const saved = JSON.parse(localStorage.getItem('avCalculator.v1'));
      saved.ledPowerFactor = 0.95;
      delete saved.ledPowerFactorEntered;
      localStorage.setItem('avCalculator.v1', JSON.stringify(saved));
      return true;
    })()`);
    if (!migratedPower) throw new Error('Legacy power-factor fixture failed.');
    await cdp('Page.reload');
    await delay(500);
    const legacyPower = await evaluate(`(() => ({
      factor: document.getElementById('ledPowerFactor').value,
      current: document.getElementById('ledMaxLoad').textContent,
      note: document.getElementById('actionStatus').textContent
    }))()`);
    if (legacyPower.factor !== '' || !legacyPower.current.includes('current pending PF') || !legacyPower.note.includes('manufacturer power factor')) {
      throw new Error(`Legacy assumed PF was retained as explicitly entered: ${JSON.stringify(legacyPower)}.`);
    }
    await evaluate(`(() => {
      for (const [id, value] of [['ledPhaseMode', 'singlePhase'], ['ledVoltage', '120']]) {
        const field = document.getElementById(id);
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    console.log('PASS single-phase PF calculation, reload, and legacy-state migration');

    const accessibility = await evaluate(`(() => {
      const controls = Array.from(document.querySelectorAll('#ledWallConfigurator input, #ledWallConfigurator select, #ledWallConfigurator button'))
        .filter((element) => !element.disabled && !element.closest('[hidden]'));
      const unlabeled = controls.filter((element) => element.tagName === 'BUTTON'
        ? !element.textContent.trim() && !element.getAttribute('aria-label')
        : !document.querySelector('label[for="' + CSS.escape(element.id) + '"]') && !element.getAttribute('aria-label'));
      const undersized = controls.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 43.5 || rect.height < 43.5);
      });
      return { statusRegions: document.querySelectorAll('[role="status"][aria-live="polite"]').length,
        unlabeled: unlabeled.map((element) => element.id), undersized: undersized.map((element) => element.id),
        disclaimer: document.getElementById('ledAssumption').textContent,
        hiddenModeEnabled: Array.from(document.querySelectorAll('.led-mode-fields[hidden] [data-key]')).some((element) => !element.disabled),
        summaryMinHeight: parseFloat(getComputedStyle(document.querySelector('.led-detail summary')).minHeight) };
    })()`);
    if (accessibility.statusRegions !== 1 || accessibility.unlabeled.length || accessibility.undersized.length || accessibility.hiddenModeEnabled || accessibility.summaryMinHeight < 44) {
      throw new Error(`Accessibility smoke check failed: ${JSON.stringify(accessibility)}.`);
    }
    if (!accessibility.disclaimer.includes('actual product documentation')) throw new Error('Persistent LED verification disclaimer is missing.');
    console.log('PASS accessibility and persistent-warning smoke checks');

    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await delay(150);
    const mobile = await evaluate(`(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      return {
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        resultTop: rect('#ledResultStrip').top,
        suiteBottom: rect('.led-suite').bottom,
        inputTop: rect('.led-input-grid').top,
        previewHeight: rect('.led-stage').height,
        jumpHeight: rect('[data-led-jump="ledPowerSection"]').height
      };
    })()`);
    if (mobile.documentHeight > mobile.viewportHeight || mobile.resultTop >= mobile.suiteBottom
      || mobile.resultTop >= mobile.inputTop || mobile.previewHeight < 250 || mobile.jumpHeight < 44) {
      throw new Error(`Mobile preview, results, or section navigation failed: ${JSON.stringify(mobile)}.`);
    }
    const jumped = await evaluate(`(() => {
      document.querySelector('[data-led-jump="ledPowerSection"]').click();
      return document.activeElement.id;
    })()`);
    if (jumped !== 'ledPowerSection') throw new Error(`Mobile section jump did not focus its target: ${jumped}.`);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    console.log('PASS viewport-contained mobile preview, results, and section jump');

    const ledBeforeHandoff = await evaluate(`(() => {
      document.getElementById('sendLedTypicalPowerBtn').click();
      const state = JSON.parse(localStorage.getItem('avCalculator.v1'));
      return { method: state.powerMethod, count: state.deviceCount, powerFactor: state.powerFactor,
        watts: state.deviceWatts, ledPitch: state.ledPitchMm };
    })()`);
    if (ledBeforeHandoff.method !== 'watts' || ledBeforeHandoff.count !== 1 || ledBeforeHandoff.powerFactor !== 0 || ledBeforeHandoff.watts !== 2600) {
      throw new Error(`Power Load handoff storage failed safe: ${JSON.stringify(ledBeforeHandoff)}.`);
    }
    let reachedPowerLoad = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        reachedPowerLoad = await evaluate("location.pathname.endsWith('/av-calculator.html') && !!document.getElementById('powerMethod')");
      } catch (error) {
        // The previous page's execution context is being replaced.
      }
      if (reachedPowerLoad) break;
      await delay(150);
    }
    if (!reachedPowerLoad) throw new Error('Power Load handoff did not navigate to the quick calculator.');
    const handoffResult = await evaluate(`(() => {
      const state = JSON.parse(localStorage.getItem('avCalculator.v1'));
      return { path: location.pathname, hash: location.hash, method: document.getElementById('powerMethod').value,
        watts: document.getElementById('deviceWatts').value, totalAmps: document.getElementById('totalAmps').textContent.trim(),
        warning: document.getElementById('verificationWarning').textContent.trim(), ledPitch: state.ledPitchMm };
    })()`);
    if (!handoffResult.path.endsWith('/av-calculator.html') || handoffResult.hash !== '#powerCard' || handoffResult.method !== 'watts' || handoffResult.watts !== '2600' || handoffResult.totalAmps !== '—' || handoffResult.ledPitch !== ledBeforeHandoff.ledPitch) {
      throw new Error(`Cross-page Power Load handoff failed safe: ${JSON.stringify(handoffResult)}.`);
    }
    if (!handoffResult.warning.includes('Field verification required')) throw new Error('Persistent verification warning was overwritten.');
    console.log('PASS cross-page Power Load handoff requires manufacturer power factor');

    const quick = await evaluate(`(() => {
      const text = (id) => document.getElementById(id).textContent.trim();
      const initial = {
        delay: text('delayMs'), projection: text('idealThrow'), storage: text('totalStorage'),
        watts: text('totalWatts'), current: text('totalAmps'), drop: text('voltageDrop'),
        spl: text('splOut'), summary: text('summaryOutput')
      };
      const set = (id, value) => {
        const field = document.getElementById(id);
        field.value = value;
        field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      };
      set('delayDistance', '100');
      set('screenWidth', '20');
      set('bitrate', '100');
      set('powerFactor', '0.8');
      set('dropLength', '200');
      set('splTargetDist', '6');
      const changed = {
        delay: text('delayMs'), projection: text('idealThrow'), storage: text('totalStorage'),
        current: text('totalAmps'), drop: text('voltageDrop'), spl: text('splOut')
      };
      const state = JSON.parse(localStorage.getItem('avCalculator.v1'));
      return { initial, changed, ledPitch: state.ledPitchMm };
    })()`);
    if (quick.initial.delay !== '63.9 ms' || quick.initial.projection !== '24.0 ft' || quick.initial.storage !== '162.0 GB'
      || quick.initial.watts !== '—' || quick.initial.current !== '—' || quick.initial.drop !== '2.40 V'
      || quick.initial.spl !== '75.6 dB' || quick.initial.summary.includes('LED wall:')
      || quick.changed.delay !== '88.8 ms' || quick.changed.projection !== '30.0 ft'
      || quick.changed.storage !== '324.0 GB' || quick.changed.current !== '~27.08 A'
      || quick.changed.drop !== '4.80 V' || quick.changed.spl !== '94.0 dB' || quick.ledPitch !== ledBeforeHandoff.ledPitch) {
      throw new Error(`Quick calculator regression failed: ${JSON.stringify(quick)}.`);
    }
    console.log('PASS all six quick calculators and separate operator summary');

    await cdp('Page.reload');
    await delay(500);
    const persisted = await evaluate(`(() => ({
      delay: document.getElementById('delayDistance').value,
      current: document.getElementById('totalAmps').textContent.trim(),
      ledPitch: JSON.parse(localStorage.getItem('avCalculator.v1')).ledPitchMm
    }))()`);
    if (persisted.delay !== '100' || persisted.current !== '~27.08 A' || persisted.ledPitch !== ledBeforeHandoff.ledPitch) {
      throw new Error(`Quick calculator reload lost saved values: ${JSON.stringify(persisted)}.`);
    }
    const reset = await evaluate(`(() => {
      document.getElementById('resetBtn').click();
      const state = JSON.parse(localStorage.getItem('avCalculator.v1'));
      return { delay: document.getElementById('delayDistance').value, ledPitch: state.ledPitchMm };
    })()`);
    if (reset.delay !== '72' || reset.ledPitch !== ledBeforeHandoff.ledPitch) {
      throw new Error(`Quick reset erased LED state: ${JSON.stringify(reset)}.`);
    }
    console.log('PASS reload and reset preserve independent calculator values');

    if (exceptions.length) throw new Error(`Runtime exceptions: ${exceptions.join('; ')}`);
    socket.close();
    console.log(`LED Wall Configurator regression probe passed using ${baseUrl}.`);
  } finally {
    chrome.kill('SIGTERM');
    await delay(500);
    await removeProfile(profile);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
