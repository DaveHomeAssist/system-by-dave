#!/usr/bin/env node
'use strict';

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
const screenshotArg = args.find((arg) => arg.startsWith('--screenshot-dir='));
const baseUrl = (baseArg ? baseArg.slice('--base='.length) : 'http://127.0.0.1:8000/').replace(/\/?$/, '/');
const chromeBin = chromeArg ? chromeArg.slice('--chrome='.length) : (
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);
const screenshotDir = screenshotArg ? screenshotArg.slice('--screenshot-dir='.length) : '';

const failures = [];
const notes = [];
const runtimeExceptions = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function waitForJson(port) {
  for (let i = 0; i < 80; i += 1) {
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

function smokeUrl() {
  const url = new URL('cue-sheet.html', baseUrl);
  url.searchParams.set('sbdShow', 'Cue Sheet Smoke Show');
  url.searchParams.set('sbdVenue', 'Dock Hall');
  url.searchParams.set('sbdDate', '2026-07-03');
  url.searchParams.set('sbdOperator', 'TD');
  url.searchParams.set('sbdPhase', 'show');
  return url.href;
}

function importFixturePath() {
  const file = path.join(os.tmpdir(), `cue-sheet-import-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({
    schema: 'system-by-dave.cueforge.v1',
    title: 'Imported Smoke Show',
    rows: [
      {
        number: '900',
        time: '21:00',
        type: 'Smoke',
        action: 'Imported smoke cue',
        source: 'Probe',
        owner: 'QA',
        status: 'Ready',
        notes: 'Imported through file input'
      }
    ]
  }, null, 2));
  return file;
}

function mediaFixturePaths() {
  const stamp = Date.now();
  const image = path.join(os.tmpdir(), `cue-sheet-image-${stamp}.png`);
  const audio = path.join(os.tmpdir(), `cue-sheet-audio-${stamp}.wav`);
  fs.writeFileSync(image, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
  const sampleCount = 800;
  const wav = Buffer.alloc(44 + (sampleCount * 2));
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(sampleCount * 2, 40);
  fs.writeFileSync(audio, wav);
  return { image, audio };
}

async function main() {
  if (!fs.existsSync(chromeBin)) {
    throw new Error(`Chrome binary not found: ${chromeBin}`);
  }

  const port = 9800 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-cue-sheet-probe-'));
  const importFile = importFixturePath();
  const mediaFiles = mediaFixturePaths();
  const chrome = spawn(chromeBin, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-component-update',
    '--no-default-browser-check',
    '--no-first-run',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  try {
    await waitForJson(port);
    const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((res) => res.json());
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let sequence = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(message.params?.exceptionDetails?.text || 'Runtime exception');
      }
      if (!message.id || !pending.has(message.id)) return;
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(JSON.stringify(message.error)));
      else callbacks.resolve(message.result);
    };

    function cdp(method, params = {}) {
      const id = sequence += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    }

    async function evaluate(expression) {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.');
      }
      return result.result.value;
    }

    async function snapshot() {
      return evaluate(`(() => {
        const rows = Array.from(document.querySelectorAll('#cueBody tr[data-id]'));
        const callerCards = Array.from(document.querySelectorAll('#callerDeck .cue-card')).map((card) => ({
          selected: card.classList.contains('is-selected'),
          label: card.querySelector('.cue-card-kicker')?.textContent.trim() || '',
          title: card.querySelector('.cue-card-title')?.textContent.trim() || '',
          meta: card.querySelector('.cue-card-meta')?.textContent.trim() || ''
        }));
        const read = (selector) => document.querySelector(selector)?.textContent.trim() || '';
        const luminance = (hex) => {
          const parts = hex.match(/[a-f0-9]{2}/gi).map((part) => Number.parseInt(part, 16) / 255);
          const linear = parts.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
          return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
        };
        const contrast = (a, b) => {
          const light = Math.max(luminance(a), luminance(b));
          const dark = Math.min(luminance(a), luminance(b));
          return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
        };
        const tokens = getComputedStyle(document.documentElement);
        const newControlSelector = '[data-quick-add],.transport button,.transport input,.source-rack button,.source-rack input:not(.sr-only),.source-rack select,#timelineExpandBtn,#layerList button,#layerList input';
        const newControls = Array.from(document.querySelectorAll(newControlSelector)).filter((item) => !item.disabled);
        const rowData = rows.map((row) => {
          const field = (name) => row.querySelector('[data-field="' + name + '"]')?.value || '';
          return {
            id: row.dataset.id,
            selected: row.classList.contains('selected'),
            number: field('number'),
            time: field('time'),
            type: field('type'),
            layer: field('layer'),
            action: field('action'),
            source: field('source'),
            sourceKind: JSON.parse(localStorage.getItem('cueSheet.v1') || '{"rows":[]}').rows.find((item) => item.id === row.dataset.id)?.sourceKind || '',
            owner: field('owner'),
            status: field('status'),
            notes: field('notes')
          };
        });
        return {
          title: document.title,
          path: window.location.pathname.split('/').pop(),
          query: window.location.search,
          contextApplied: document.documentElement.dataset.sbdContextApplied === 'true',
          showTitle: document.getElementById('showTitle')?.value || '',
          rowCount: rows.length,
          visibleRows: rows.filter((row) => row.offsetParent !== null).length,
          emptyVisible: document.getElementById('emptyState')?.hidden === false,
          total: read('#totalStat'),
          open: read('#openStat'),
          done: read('#doneStat'),
          issues: read('#issueStat'),
          selectedReadout: read('#selectedReadout'),
          nextMeta: read('#nextMeta'),
          nextAction: read('#nextAction'),
          hint: read('#hint'),
          storageStatus: read('#storageStatus'),
          callerCount: read('#callerDeckCount'),
          callerCards,
          quickAdd: Array.from(document.querySelectorAll('[data-quick-add]')).map((button) => ({
            kind: button.dataset.quickAdd,
            width: Math.round(button.getBoundingClientRect().width),
            height: Math.round(button.getBoundingClientRect().height),
            label: button.innerText.trim()
          })),
          gsap: window.gsap?.version || '',
          layerCount: document.querySelectorAll('#layerList .layer-row').length,
          programLayerCount: document.getElementById('programLayerCount')?.textContent.trim() || '',
          programText: document.getElementById('programSurface')?.innerText.trim() || '',
          previewMedia: Array.from(document.querySelectorAll('#previewSurface img,#previewSurface audio,#previewSurface video')).map((item) => ({
            tag: item.tagName,
            muted: Boolean(item.muted),
            volume: Number(item.volume)
          })),
          programMedia: Array.from(document.querySelectorAll('#programSurface img,#programSurface audio,#programSurface video')).map((item) => item.tagName),
          sourceStatus: document.getElementById('sourceStatus')?.textContent.trim() || '',
          timelineExpanded: document.body.classList.contains('timeline-expanded'),
          timelinePressed: document.getElementById('timelineExpandBtn')?.getAttribute('aria-pressed') || '',
          ndiCopy: document.getElementById('ndiNote')?.textContent.trim() || '',
          sourceControls: ['attachFileBtn','detectSourcesBtn','connectCaptureBtn','connectNetworkBtn','detectDisplaysBtn','openOutputBtn'].every((id) => Boolean(document.getElementById(id))),
          newControlTargets: newControls.map((item) => {
            const rect = item.getBoundingClientRect();
            const labels = Array.from(item.labels || []).map((label) => label.textContent.trim()).join(' ');
            return {
              name: item.getAttribute('aria-label') || labels || item.textContent.trim() || item.value,
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            };
          }),
          contrast: {
            mutedText: contrast(tokens.getPropertyValue('--av-muted').trim(), tokens.getPropertyValue('--av-surface').trim()),
            dimText: contrast(tokens.getPropertyValue('--av-dim').trim(), tokens.getPropertyValue('--av-surface').trim()),
            controlBoundary: contrast(tokens.getPropertyValue('--av-line').trim(), tokens.getPropertyValue('--av-control').trim()),
            primaryLabel: contrast(tokens.getPropertyValue('--av-accent').trim(), tokens.getPropertyValue('--av-primary-ink').trim())
          },
          localState: localStorage.getItem('cueSheet.v1') || '',
          downloads: window.__cueSheetDownloads || [],
          rows: rowData
        };
      })()`);
    }

    async function click(selector) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
      await delay(180);
    }

    async function setValue(selector, value, eventName = 'input') {
      await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.value = ${JSON.stringify(value)};
        el.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true }));
        return true;
      })()`);
      await delay(180);
    }

    async function setFileInput(selector, file) {
      const dom = await cdp('DOM.getDocument');
      const input = await cdp('DOM.querySelector', { nodeId: dom.root.nodeId, selector });
      await cdp('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [file] });
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change', { bubbles: true }))`);
      await delay(450);
    }

    async function captureScreenshot(name) {
      if (!screenshotDir) return;
      fs.mkdirSync(screenshotDir, { recursive: true });
      const result = await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true });
      fs.writeFileSync(path.join(screenshotDir, `${name}.png`), Buffer.from(result.data, 'base64'));
    }

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('DOM.enable');
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });

    await cdp('Page.navigate', { url: smokeUrl() });
    await delay(2800);

    await evaluate(`(() => {
      window.__cueSheetDownloads = [];
      const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function(blob) {
        if (blob && typeof blob.text === 'function') {
          blob.text().then((text) => window.__cueSheetDownloads.push({ type: blob.type, text }));
        }
        return originalCreateObjectUrl(blob);
      };
    })()`);

    let state = await snapshot();
    const verifiedContrast = state.contrast;
    assert(state.title.includes('Cue Sheet'), 'Cue Sheet page title did not load.');
    assert(state.path === 'cue-sheet.html', `Cue Sheet probe landed on ${state.path}.`);
    assert(state.query.includes('sbdShow=Cue+Sheet+Smoke+Show') || state.query.includes('sbdShow=Cue%20Sheet%20Smoke%20Show'), 'Cue Sheet route did not preserve suite context query.');
    assert(state.contextApplied, 'AV Suite context was not applied to Cue Sheet.');
    assert(state.showTitle === 'Cue Sheet Smoke Show', `Context did not hydrate show title; saw "${state.showTitle}".`);
    assert(state.rowCount === 8, `Expected 8 sample rows on first load, saw ${state.rowCount}.`);
    assert(state.total === '8' && state.open === '8' && state.done === '0' && state.issues === '0', 'Initial stats did not match sample cues.');
    assert(state.storageStatus === 'Saved', 'Cue Sheet did not report saved storage state.');
    assert(state.callerCount === '8 open', `Caller deck count did not match initial open cues; saw "${state.callerCount}".`);
    assert(state.callerCards.length === 5, `Caller deck should show the next five open cues; saw ${state.callerCards.length}.`);
    assert(state.callerCards[0]?.title.includes('Doors open'), 'Caller deck first card did not show the first open cue.');
    assert(state.gsap.startsWith('3.'), `Local GSAP runtime did not load; saw "${state.gsap}".`);
    assert(state.quickAdd.length === 6, `Expected 6 quick-add controls, saw ${state.quickAdd.length}.`);
    assert(new Set(state.quickAdd.map((item) => item.width)).size === 1 && new Set(state.quickAdd.map((item) => item.height)).size === 1, 'Quick-add controls are not equal size at desktop width.');
    assert(state.quickAdd.every((item) => item.label.split('\n').filter(Boolean).length >= 2), 'Quick-add controls do not expose a clear label and source hint.');
    assert(state.layerCount === 4, `Expected four playback layers, saw ${state.layerCount}.`);
    assert(state.sourceControls && /Native NDI is not decoded by the browser/.test(state.ndiCopy), 'Capture, monitor, or truthful NDI source guidance is missing.');
    assert(state.newControlTargets.every((item) => item.name), 'A new Cue Sheet control is missing an accessible name.');
    assert(state.newControlTargets.every((item) => item.width >= 44 && item.height >= 44), `A new Cue Sheet control is smaller than 44px: ${JSON.stringify(state.newControlTargets.filter((item) => item.width < 44 || item.height < 44).slice(0, 4))}`);
    assert(state.contrast.mutedText >= 4.5 && state.contrast.dimText >= 4.5 && state.contrast.primaryLabel >= 4.5, `Cue Sheet text contrast is below AA: ${JSON.stringify(state.contrast)}.`);
    assert(state.contrast.controlBoundary >= 3, `Cue Sheet control boundary contrast is below 3:1: ${JSON.stringify(state.contrast)}.`);
    await captureScreenshot('cue-sheet-desktop');

    await click('[data-quick-add="Text"]');
    state = await snapshot();
    assert(state.rowCount === 9, `Text quick add did not create a cue; saw ${state.rowCount} rows.`);
    assert(state.rows.some((row) => row.sourceKind === 'Text' && row.layer === '4'), 'Text quick add did not assign the overlay source to layer 4.');
    await click('#deleteBtn');

    await click('[data-quick-add="Image"]');
    await setFileInput('#sourceFileInput', mediaFiles.image);
    state = await snapshot();
    assert(state.previewMedia.some((item) => item.tag === 'IMG'), 'Attached image did not render in Preview.');
    assert(state.rows.some((row) => row.sourceKind === 'Image'), 'Attached image did not update the cue source type.');
    await click('#goLiveBtn');
    state = await snapshot();
    assert(state.programMedia.includes('IMG'), 'Image source did not render on Program.');
    await click('#clearLayerBtn');
    await click('#deleteBtn');

    await click('[data-quick-add="Audio"]');
    await setFileInput('#sourceFileInput', mediaFiles.audio);
    state = await snapshot();
    assert(state.previewMedia.some((item) => item.tag === 'AUDIO' && !item.muted && item.volume === 0.8), 'Attached audio did not expose an audible Preview transport at the configured level.');
    await click('#previewPlayBtn');
    state = await snapshot();
    assert(/Preview playback started|browser blocked playback/.test(state.sourceStatus), 'Preview audio transport did not report a playback result.');
    await click('#deleteBtn');

    await click('#addCueBtn');
    state = await snapshot();
    assert(state.rowCount === 9, `Add Cue did not create a row; saw ${state.rowCount}.`);
    assert(state.rows.some((row) => row.number === '009' && row.action === 'New cue'), 'Added cue 009 was not present.');

    const selectedId = state.rows.find((row) => row.selected)?.id;
    assert(Boolean(selectedId), 'No selected cue after adding a cue.');
    await setValue(`tr[data-id="${selectedId}"] [data-field="action"]`, 'Smoke action edited by probe');
    await setValue(`tr[data-id="${selectedId}"] [data-field="owner"]`, 'QA');
    await setValue(`tr[data-id="${selectedId}"] [data-field="layer"]`, '4', 'change');
    await setValue(`tr[data-id="${selectedId}"] [data-field="status"]`, 'Issue', 'change');
    state = await snapshot();
    assert(state.issues === '1', `Issue stat did not update after status edit; saw ${state.issues}.`);
    assert(state.rows.some((row) => row.action === 'Smoke action edited by probe' && row.status === 'Issue'), 'Edited cue action/status was not reflected.');
    assert(state.rows.some((row) => row.action === 'Smoke action edited by probe' && row.layer === '4'), 'Edited cue layer was not persisted.');

    await click('#goLiveBtn');
    state = await snapshot();
    assert(state.programLayerCount === '1 layer live', `Go Live did not create a program layer; saw "${state.programLayerCount}".`);
    assert(state.programText.includes('Smoke action edited by probe'), 'Program monitor did not show the live cue.');
    assert(state.localState.includes('"activeLayers":{"4"'), 'Live layer assignment was not persisted.');
    await click('#clearLayerBtn');
    state = await snapshot();
    assert(state.programLayerCount === '0 layers live', 'Clear Selected Layer did not clear program output.');
    await setValue(`tr[data-id="${selectedId}"] [data-field="status"]`, 'Issue', 'change');

    await setValue('#searchInput', 'Smoke action');
    state = await snapshot();
    assert(state.rowCount === 1 && !state.emptyVisible, 'Search did not narrow Cue Sheet to the edited smoke cue.');
    await setValue('#searchInput', 'no possible match');
    state = await snapshot();
    assert(state.emptyVisible, 'No-match search did not show the empty state.');
    await setValue('#searchInput', '');
    await setValue('#statusFilter', 'Issue', 'change');
    state = await snapshot();
    assert(state.rowCount === 1 && state.rows[0].status === 'Issue', 'Issue status filter did not isolate the issue cue.');
    await setValue('#statusFilter', 'all', 'change');

    await click('#duplicateBtn');
    state = await snapshot();
    assert(state.rowCount === 10, `Duplicate did not create a row; saw ${state.rowCount}.`);
    assert(state.rows.some((row) => row.number === '010' && row.status === 'Ready'), 'Duplicated cue did not reset to Ready with next number.');
    await click('#moveUpBtn');
    await click('#moveDownBtn');
    await click('#deleteBtn');
    state = await snapshot();
    assert(state.rowCount === 9, `Delete after duplicate did not return to 9 rows; saw ${state.rowCount}.`);

    await click('#sampleBtn');
    await click('#takeNextBtn');
    state = await snapshot();
    assert(state.done === '1' && state.open === '7', `Take Next Cue did not advance stats; open=${state.open}, done=${state.done}.`);
    assert(state.nextMeta.includes('002'), `Next cue did not advance to cue 002; saw "${state.nextMeta}".`);
    assert(state.callerCount === '7 open' && state.callerCards[0]?.meta.includes('002'), 'Caller deck did not advance after taking the first cue.');

    await click('#exportJsonBtn');
    await click('#exportCsvBtn');
    await delay(500);
    state = await snapshot();
    assert(state.downloads.some((download) => download.type.includes('application/json') && download.text.includes('system-by-dave.cue-sheet.v2') && download.text.includes('"layers"')), 'JSON export did not emit the layered Cue Sheet v2 schema payload.');
    assert(state.downloads.some((download) => download.type.includes('text/csv') && download.text.includes('"Cue","Time","Type","Action"')), 'CSV export did not emit expected cue headers.');

    await setFileInput('#importFile', importFile);
    state = await snapshot();
    assert(state.showTitle === 'Imported Smoke Show', `Import did not update title; saw "${state.showTitle}".`);
    assert(state.rowCount === 1 && state.rows[0].action === 'Imported smoke cue', 'Import did not load the fixture cue row.');
    assert(state.localState.includes('Imported Smoke Show'), 'Imported state was not persisted to localStorage.');

    await click('#clearBtn');
    state = await snapshot();
    assert(state.rowCount === 0 && state.emptyVisible && state.total === '0', 'Clear Sheet did not remove all cue rows.');
    assert(state.callerCount === '0 open', 'Caller deck did not report 0 open cues after clear.');

    await click('#timelineExpandBtn');
    await delay(240);
    state = await snapshot();
    assert(state.timelineExpanded && state.timelinePressed === 'true', 'Expand Timeline did not enter the focus layout or expose its pressed state.');
    await click('#timelineExpandBtn');
    await delay(240);
    state = await snapshot();
    assert(!state.timelineExpanded && state.timelinePressed === 'false', 'Restore Workspace did not exit the timeline focus layout.');

    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await delay(200);
    const lightState = await snapshot();
    assert(lightState.contrast.mutedText >= 4.5 && lightState.contrast.dimText >= 4.5 && lightState.contrast.primaryLabel >= 4.5, `Cue Sheet light-theme text contrast is below AA: ${JSON.stringify(lightState.contrast)}.`);
    assert(lightState.contrast.controlBoundary >= 3, `Cue Sheet light-theme control boundary contrast is below 3:1: ${JSON.stringify(lightState.contrast)}.`);
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await delay(200);

    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await delay(300);
    state = await evaluate(`(() => {
      const vw = window.innerWidth;
      const selector = 'a[href],button,input,select,textarea,[tabindex]';
      const focusables = Array.from(document.querySelectorAll(selector)).filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return !el.disabled && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      });
      const clipped = focusables.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.left < -1 || rect.right > vw + 1;
      }).map((el) => el.id || el.textContent.trim().slice(0, 40) || el.tagName);
      return {
        overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
        clipped
      };
    })()`);
    assert(state.overflowX <= 1, `Cue Sheet mobile viewport has overflowX=${state.overflowX}.`);
    assert(state.clipped.length === 0, `Cue Sheet mobile viewport has clipped focusable controls: ${JSON.stringify(state.clipped.slice(0, 4))}`);
    await evaluate(`(() => {
      window.scrollTo(0, 0);
      const dock = document.querySelector('[data-sbd-suite-dock]');
      const toggle = document.querySelector('[data-sbd-suite-compact-toggle]');
      if (dock && dock.dataset.sbdSuiteCompact !== 'true') toggle?.click();
    })()`);
    await delay(220);
    await captureScreenshot('cue-sheet-mobile');

    await cdp('Page.navigate', { url: new URL('cueforge.html', baseUrl).href });
    await delay(500);
    state = await evaluate(`(() => ({
      path: location.pathname.split('/').pop(),
      title: document.title,
      copy: document.body.innerText,
      cueSheetHref: document.querySelector('a[href="cue-sheet.html"]')?.getAttribute('href') || ''
    }))()`);
    assert(state.path === 'cueforge.html', `CueForge boundary redirected to ${state.path}.`);
    assert(state.title.includes('CueForge Desktop App'), 'CueForge boundary title is missing the desktop-app distinction.');
    assert(state.copy.includes('separate Electron desktop application'), 'CueForge boundary does not explain the Electron product identity.');
    assert(state.copy.includes('No automatic redirect'), 'CueForge boundary does not make the no-redirect behavior visible.');
    assert(state.cueSheetHref === 'cue-sheet.html', 'CueForge boundary does not provide an explicit Cue Sheet link.');
    await captureScreenshot('cueforge-product-boundary');

    await evaluate(`(() => {
      localStorage.setItem('av-suite-dashboard.v1', JSON.stringify({
        schema:'system-by-dave.av-suite.v1',
        favorites:['cueforge'],
        recent:['cueforge'],
        readiness:{cueforge:'issue'},
        toolNotes:{cueforge:'Migrated browser tool note'},
        commandRecent:['tool:cueforge'],
        filters:{search:'',phase:'all',dept:'all',pin:'all'}
      }));
    })()`);
    await cdp('Page.navigate', { url: new URL('av-suite.html', baseUrl).href });
    await delay(900);
    await evaluate(`document.querySelector('[data-fam-select="runofshow"]')?.click()`);
    await delay(300);
    state = await evaluate(`(() => ({
      cueSheetVisible: document.body.innerText.includes('Cue Sheet'),
      legacyNameVisible: document.body.innerText.includes('CueForge'),
      pinTitle: document.querySelector('[data-pin="cue-sheet"]')?.getAttribute('title') || '',
      readiness: document.querySelector('[data-readiness="cue-sheet"]')?.value || '',
      note: document.querySelector('[data-note="cue-sheet"]')?.value || ''
    }))()`);
    assert(state.cueSheetVisible && !state.legacyNameVisible, 'AV Suite did not render Cue Sheet under its correct name.');
    assert(state.pinTitle === 'Unpin Cue Sheet', `Legacy cueforge favorite did not migrate to Cue Sheet: ${JSON.stringify(state)}.`);
    assert(state.readiness === 'issue', `Legacy cueforge readiness did not migrate to Cue Sheet: ${JSON.stringify(state)}.`);
    assert(state.note === 'Migrated browser tool note', `Legacy cueforge note did not migrate to Cue Sheet: ${JSON.stringify(state)}.`);

    if (runtimeExceptions.length) {
      runtimeExceptions.forEach((error) => failures.push(`Runtime exception: ${error}`));
    }

    notes.push(`base=${baseUrl}`);
    notes.push('route=cue-sheet.html');
    notes.push('context=applied');
    notes.push('sampleRows=8');
    notes.push('callerDeck=passed');
    notes.push('layersPlayback=passed');
    notes.push('quickAdd=equal');
    notes.push(`contrast=${verifiedContrast.dimText}:1`);
    notes.push('themes=dark+light');
    notes.push('sources=capture+ndi-gateway');
    notes.push('mediaPreview=image+audio');
    notes.push('timelineFocus=passed');
    notes.push('importExport=passed');
    notes.push('mobile=390px');
    notes.push('cueforgeBoundary=no-redirect');
    notes.push('legacySuiteId=migrated');
    if (screenshotDir) notes.push(`screenshots=${screenshotDir}`);

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
    try {
      fs.unlinkSync(importFile);
    } catch (error) {
      // Temp file cleanup best effort.
    }
    Object.values(mediaFiles).forEach((file) => {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        // Temp file cleanup best effort.
      }
    });
    await delay(500);
    await removeProfile(profile);
  }

  if (failures.length) {
    console.error('Cue Sheet smoke probe failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Cue Sheet smoke probe passed (${notes.join(', ')}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
