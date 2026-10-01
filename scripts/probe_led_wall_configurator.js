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
const noWebgl = args.includes('--no-webgl');
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
    '--headless=new', '--enable-unsafe-swiftshader', ...(noWebgl ? ['--disable-webgl'] : []), '--disable-background-networking',
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
    let initialViewer;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      initialViewer = await evaluate(`(() => {
        const preview = document.getElementById('ledWallPreview');
        if (!preview) return { state: 'loading' };
        const canvas = preview.querySelector('canvas');
        return { state: preview.dataset.viewerState || 'loading', columns: preview.dataset.viewerColumns,
          rows: preview.dataset.viewerRows, width: canvas?.width || 0, height: canvas?.height || 0,
          hint: document.getElementById('ledViewerHint').textContent };
      })()`);
      if (initialViewer.state === 'ready' || initialViewer.state === 'fallback') break;
      await delay(250);
    }
    if (noWebgl) {
      if (initialViewer.state !== 'fallback' || !initialViewer.hint.includes('unavailable')) {
        throw new Error(`No-WebGL viewer fallback failed: ${JSON.stringify(initialViewer)}.`);
      }
      console.log('PASS no-WebGL cabinet grid fallback');
    } else {
      if (initialViewer.state !== 'ready' || initialViewer.columns !== '8' || initialViewer.rows !== '5'
        || initialViewer.width < 100 || initialViewer.height < 100) {
        throw new Error(`3D viewer initialization failed: ${JSON.stringify(initialViewer)}.`);
      }
      console.log('PASS 3D cabinet model matches the calculated array');
    }

    await scenario('default cabinet layout', [], {
      build: '8 × 5 cabinets', metric: '4.000 × 2.500 m', raster: '1,376 × 860 px',
      ports: '3 planned chains', power: '7.20 kW max'
    });
    const defaultChains = await evaluate(`(() => {
      const row = document.getElementById('ledInspectRow');
      const column = document.getElementById('ledInspectColumn');
      row.value = '5';
      column.value = '8';
      column.dispatchEvent(new Event('change', { bubbles: true }));
      const selected = document.getElementById('ledCabinetInspection').textContent;
      document.querySelector('#ledChainList button').click();
      return { count: document.getElementById('ledChainCount').textContent,
        peak: document.getElementById('ledChainPeak').textContent,
        selected, first: document.getElementById('ledCabinetInspection').textContent,
        capacity: document.getElementById('ledWallPreview').dataset.cabinetsPerChain };
    })()`);
    if (defaultChains.count !== '3 planned ports' || defaultChains.capacity !== '17'
      || !defaultChains.peak.includes('502,928 px') || !defaultChains.selected.includes('R5 C8 · planned port 3')
      || !defaultChains.first.includes('R1 C1 · planned port 1')) {
      throw new Error(`Whole-cabinet chain map or inspector failed: ${JSON.stringify(defaultChains)}.`);
    }
    console.log('PASS whole-cabinet chain map and row/column inspector');
    await scenario('whole-cabinet plan can exceed the even-pixel lower bound', [
      ['ledCabinetPixelsWide', '900'], ['ledCabinetPixelsHigh', '100']
    ], { ports: '8 planned chains', warnings: 'Whole-cabinet chains need 8 ports' });
    await scenario('oversize cabinet has no valid chain', [
      ['ledCabinetPixelsWide', '1000'], ['ledCabinetPixelsHigh', '1000']
    ], { ports: 'No valid chain', warnings: 'One complete cabinet exceeds' });
    await scenario('processor port shortage uses the chain count', [
      ['ledCabinetPixelsWide', '172'], ['ledCabinetPixelsHigh', '172'], ['ledProcessorPortCount', '2']
    ], { ports: '3 planned chains', warnings: '3 whole-cabinet planning chains exceed the 2 physical ports' });
    await scenario('processor port limit cleared', [['ledProcessorPortCount', '']], { ports: '3 planned chains' });
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
      set('ledSpecSource', 'https://example.com/cabinet-spec.pdf');
      set('ledWeightKg', '8.5');
      document.getElementById('saveLedPresetBtn').click();
      set('ledPitchMm', '3.9');
      set('ledSpecSource', '');
      set('ledWeightKg', '');
      const profile = document.getElementById('ledProfileSelect');
      profile.value = 'probe-profile-500';
      profile.dispatchEvent(new Event('change', { bubbles: true }));
      const savedProfiles = JSON.parse(localStorage.getItem('avCalculator.ledProfiles.v1'));
      return { name: document.getElementById('ledProductName').value,
        pitch: document.getElementById('ledPitchMm').value, profiles: savedProfiles.length,
        source: document.getElementById('ledSpecSource').value,
        weight: document.getElementById('ledWeightKg').value,
        evidence: document.getElementById('ledProfileEvidence').textContent };
    })()`);
    if (profileResult.name !== 'Probe Profile 500' || profileResult.pitch !== '2.6' || profileResult.profiles !== 1
      || profileResult.source !== 'https://example.com/cabinet-spec.pdf' || profileResult.weight !== '8.5'
      || !profileResult.evidence.includes('does not verify')) {
      throw new Error(`Saved profile round trip failed: ${JSON.stringify(profileResult)}.`);
    }
    console.log('PASS saved profile round trip');
    await evaluate(`(() => {
      const profiles = JSON.parse(localStorage.getItem('avCalculator.ledProfiles.v1'));
      const legacyValues = { ...profiles[0].values };
      delete legacyValues.ledSpecSource;
      delete legacyValues.ledWeightKg;
      profiles.push({ id: 'legacy-cabinet', name: 'Legacy Cabinet', values: legacyValues });
      localStorage.setItem('avCalculator.ledProfiles.v1', JSON.stringify(profiles));
    })()`);
    await cdp('Page.reload', { ignoreCache: true });
    await delay(500);
    const persistedProfile = await evaluate(`(() => {
      const source = document.getElementById('ledSpecSource').value;
      const weight = document.getElementById('ledWeightKg').value;
      const profiles = document.getElementById('ledProfileSelect');
      profiles.value = 'legacy-cabinet';
      profiles.dispatchEvent(new Event('change', { bubbles: true }));
      const legacy = [document.getElementById('ledSpecSource').value, document.getElementById('ledWeightKg').value];
      profiles.value = 'probe-profile-500';
      profiles.dispatchEvent(new Event('change', { bubbles: true }));
      const invalid = document.getElementById('ledSpecSource');
      invalid.value = 'javascript:alert(1)';
      invalid.dispatchEvent(new Event('change', { bubbles: true }));
      return { source, weight, legacy, invalid: invalid.value,
        link: document.querySelector('#ledProfileEvidence a')?.href || '' };
    })()`);
    if (persistedProfile.source !== 'https://example.com/cabinet-spec.pdf' || persistedProfile.weight !== '8.5'
      || JSON.stringify(persistedProfile.legacy) !== '["",""]'
      || persistedProfile.invalid !== '' || persistedProfile.link !== '') {
      throw new Error(`Profile reload, legacy migration, or source URL validation failed: ${JSON.stringify(persistedProfile)}.`);
    }
    console.log('PASS profile provenance reload, legacy profile, and unsafe URL rejection');

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

    if (!noWebgl) {
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      const frontPose = await evaluate(`(() => {
        document.getElementById('ledPreviewFrontBtn').click();
        const canvas = document.querySelector('#ledWallPreview canvas');
        return { yaw: Number(canvas.dataset.yaw), pitch: Number(canvas.dataset.pitch) };
      })()`);
      if (frontPose.yaw !== 0 || frontPose.pitch !== 0) {
        throw new Error(`Reduced-motion front view did not settle immediately: ${JSON.stringify(frontPose)}.`);
      }
      await delay(150);
      const clickTarget = await evaluate(`(() => {
        const canvas = document.querySelector('#ledWallPreview canvas');
        const rect = canvas.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        return { x, y, topElement: document.elementFromPoint(x, y)?.tagName || '' };
      })()`);
      if (clickTarget.topElement !== 'CANVAS') {
        throw new Error(`3D canvas center is not clickable: ${JSON.stringify(clickTarget)}.`);
      }
      const { x, y } = clickTarget;
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      const clickedCabinet = await evaluate(`document.getElementById('ledCabinetInspection').textContent`);
      if (!clickedCabinet.includes('planned port') || clickedCabinet.includes('R1 C1 ·')) {
        throw new Error(`3D cabinet click did not select a cabinet: ${clickedCabinet}; target ${JSON.stringify(clickTarget)}.`);
      }
      console.log('PASS 3D cabinet click updates the inspector');
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 65, y: y + 20, button: 'left', buttons: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 65, y: y + 20, button: 'left', clickCount: 1 });
      const orbit = await evaluate(`(() => {
        const canvas = document.querySelector('#ledWallPreview canvas');
        const dragged = Number(canvas.dataset.yaw);
        canvas.focus();
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
        return { dragged, keyed: Number(canvas.dataset.yaw), focused: document.activeElement === canvas,
          frontPressed: document.getElementById('ledPreviewFrontBtn').getAttribute('aria-pressed') };
      })()`);
      if (!orbit.focused || Math.abs(orbit.dragged) < 0.1 || orbit.keyed === orbit.dragged || orbit.frontPressed !== 'false') {
        throw new Error(`Pointer or keyboard 3D orbit failed: ${JSON.stringify(orbit)}.`);
      }
      const zoomBefore = await evaluate(`Number(document.querySelector('#ledWallPreview canvas').dataset.zoom)`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: -120 });
      const zoomAfter = await evaluate(`Number(document.querySelector('#ledWallPreview canvas').dataset.zoom)`);
      if (!(zoomAfter < zoomBefore)) throw new Error(`Wheel zoom did not move closer: ${zoomBefore} -> ${zoomAfter}.`);
      await evaluate(`document.getElementById('ledPreviewIsoBtn').click()`);
      await cdp('Emulation.setEmulatedMedia', { features: [] });
      console.log('PASS pointer, keyboard, zoom, preset, and reduced-motion 3D views');
    }

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

    await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    await delay(150);
    const mobile = await evaluate(`(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      return {
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        resultTop: rect('#ledResultStrip').top,
        suiteBottom: rect('.led-suite').bottom,
        inputTop: rect('.led-input-grid').top,
        previewHeight: rect('.led-stage').height,
        jumpHeight: rect('[data-led-jump="ledPowerSection"]').height,
        stageRight: rect('.led-stage').right,
        clippedControls: ['#ledPreviewIsoBtn', '#ledPreviewFrontBtn', '#ledInspectRow', '#ledInspectColumn']
          .filter(selector => rect(selector).right > Math.min(window.innerWidth, rect('.led-stage').right) + 1
            || rect(selector).left < rect('.led-stage').left - 1)
      };
    })()`);
    if (mobile.documentHeight > mobile.viewportHeight || mobile.documentWidth > mobile.viewportWidth
      || mobile.resultTop >= mobile.suiteBottom
      || mobile.resultTop >= mobile.inputTop || mobile.previewHeight < 250 || mobile.jumpHeight < 44
      || mobile.clippedControls.length) {
      throw new Error(`Mobile preview, results, or section navigation failed: ${JSON.stringify(mobile)}.`);
    }
    const jumped = await evaluate(`(() => {
      document.querySelector('[data-led-jump="ledPowerSection"]').click();
      return document.activeElement.id;
    })()`);
    if (jumped !== 'ledPowerSection') throw new Error(`Mobile section jump did not focus its target: ${jumped}.`);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const desktopContainment = await evaluate(`(() => ({
      height: document.documentElement.scrollHeight <= document.documentElement.clientHeight,
      width: document.documentElement.scrollWidth <= document.documentElement.clientWidth
    }))()`);
    if (!desktopContainment.height || !desktopContainment.width) {
      throw new Error(`Desktop page-level overflow: ${JSON.stringify(desktopContainment)}.`);
    }
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
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        reachedPowerLoad = await evaluate(`(() => location.pathname.endsWith('/av-calculator.html')
          && document.getElementById('powerMethod')?.value === 'watts'
          && document.getElementById('deviceWatts')?.value === '2600'
          && document.getElementById('totalAmps')?.textContent.trim() === '—')()`);
      } catch (error) {
        // The previous page's execution context is being replaced.
      }
      if (reachedPowerLoad) break;
      await delay(150);
    }
    if (!reachedPowerLoad) throw new Error('Power Load handoff did not finish restoring the quick calculator.');
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
