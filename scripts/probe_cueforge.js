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
const baseUrl = (baseArg ? baseArg.slice('--base='.length) : 'http://127.0.0.1:8000/').replace(/\/?$/, '/');
const chromeBin = chromeArg ? chromeArg.slice('--chrome='.length) : (
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);

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
  const url = new URL('cueforge.html', baseUrl);
  url.searchParams.set('sbdShow', 'CueForge Smoke Show');
  url.searchParams.set('sbdVenue', 'Dock Hall');
  url.searchParams.set('sbdDate', '2026-07-03');
  url.searchParams.set('sbdOperator', 'TD');
  url.searchParams.set('sbdPhase', 'show');
  return url.href;
}

function importFixturePath() {
  const file = path.join(os.tmpdir(), `cueforge-import-${Date.now()}.json`);
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

async function main() {
  if (!fs.existsSync(chromeBin)) {
    throw new Error(`Chrome binary not found: ${chromeBin}`);
  }

  const port = 9800 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-cueforge-probe-'));
  const importFile = importFixturePath();
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
        const rowData = rows.map((row) => {
          const field = (name) => row.querySelector('[data-field="' + name + '"]')?.value || '';
          return {
            id: row.dataset.id,
            selected: row.classList.contains('selected'),
            number: field('number'),
            time: field('time'),
            type: field('type'),
            action: field('action'),
            source: field('source'),
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
          localState: localStorage.getItem('cueSheet.v1') || '',
          downloads: window.__cueforgeDownloads || [],
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

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('DOM.enable');
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await cdp('Page.navigate', { url: smokeUrl() });
    await delay(2800);

    await evaluate(`(() => {
      window.__cueforgeDownloads = [];
      const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function(blob) {
        if (blob && typeof blob.text === 'function') {
          blob.text().then((text) => window.__cueforgeDownloads.push({ type: blob.type, text }));
        }
        return originalCreateObjectUrl(blob);
      };
    })()`);

    let state = await snapshot();
    assert(state.title.includes('CueForge'), 'CueForge page title did not load.');
    assert(state.path === 'cue-sheet.html', `cueforge.html did not route to cue-sheet.html; landed on ${state.path}.`);
    assert(state.query.includes('sbdShow=CueForge+Smoke+Show') || state.query.includes('sbdShow=CueForge%20Smoke%20Show'), 'CueForge route did not preserve suite context query.');
    assert(state.contextApplied, 'AV Suite context was not applied to CueForge.');
    assert(state.showTitle === 'CueForge Smoke Show', `Context did not hydrate show title; saw "${state.showTitle}".`);
    assert(state.rowCount === 8, `Expected 8 sample rows on first load, saw ${state.rowCount}.`);
    assert(state.total === '8' && state.open === '8' && state.done === '0' && state.issues === '0', 'Initial stats did not match sample cues.');
    assert(state.storageStatus === 'Saved', 'CueForge did not report saved storage state.');
    assert(state.callerCount === '8 open', `Caller deck count did not match initial open cues; saw "${state.callerCount}".`);
    assert(state.callerCards.length === 5, `Caller deck should show the next five open cues; saw ${state.callerCards.length}.`);
    assert(state.callerCards[0]?.title.includes('Doors open'), 'Caller deck first card did not show the first open cue.');

    await click('#addCueBtn');
    state = await snapshot();
    assert(state.rowCount === 9, `Add Cue did not create a row; saw ${state.rowCount}.`);
    assert(state.rows.some((row) => row.number === '009' && row.action === 'New cue'), 'Added cue 009 was not present.');

    const selectedId = state.rows.find((row) => row.selected)?.id;
    assert(Boolean(selectedId), 'No selected cue after adding a cue.');
    await setValue(`tr[data-id="${selectedId}"] [data-field="action"]`, 'Smoke action edited by probe');
    await setValue(`tr[data-id="${selectedId}"] [data-field="owner"]`, 'QA');
    await setValue(`tr[data-id="${selectedId}"] [data-field="status"]`, 'Issue', 'change');
    state = await snapshot();
    assert(state.issues === '1', `Issue stat did not update after status edit; saw ${state.issues}.`);
    assert(state.rows.some((row) => row.action === 'Smoke action edited by probe' && row.status === 'Issue'), 'Edited cue action/status was not reflected.');

    await setValue('#searchInput', 'Smoke action');
    state = await snapshot();
    assert(state.rowCount === 1 && !state.emptyVisible, 'Search did not narrow CueForge to the edited smoke cue.');
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
    assert(state.downloads.some((download) => download.type.includes('application/json') && download.text.includes('system-by-dave.cueforge.v1')), 'JSON export did not emit CueForge schema payload.');
    assert(state.downloads.some((download) => download.type.includes('text/csv') && download.text.includes('"Cue","Time","Type","Action"')), 'CSV export did not emit expected cue headers.');

    const dom = await cdp('DOM.getDocument');
    const input = await cdp('DOM.querySelector', { nodeId: dom.root.nodeId, selector: '#importFile' });
    await cdp('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [importFile] });
    await evaluate(`document.getElementById('importFile').dispatchEvent(new Event('change', { bubbles: true }))`);
    await delay(600);
    state = await snapshot();
    assert(state.showTitle === 'Imported Smoke Show', `Import did not update title; saw "${state.showTitle}".`);
    assert(state.rowCount === 1 && state.rows[0].action === 'Imported smoke cue', 'Import did not load the fixture cue row.');
    assert(state.localState.includes('Imported Smoke Show'), 'Imported state was not persisted to localStorage.');

    await click('#clearBtn');
    state = await snapshot();
    assert(state.rowCount === 0 && state.emptyVisible && state.total === '0', 'Clear Sheet did not remove all cue rows.');
    assert(state.callerCount === '0 open', 'Caller deck did not report 0 open cues after clear.');

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
    assert(state.overflowX <= 1, `CueForge mobile viewport has overflowX=${state.overflowX}.`);
    assert(state.clipped.length === 0, `CueForge mobile viewport has clipped focusable controls: ${JSON.stringify(state.clipped.slice(0, 4))}`);

    if (runtimeExceptions.length) {
      runtimeExceptions.forEach((error) => failures.push(`Runtime exception: ${error}`));
    }

    notes.push(`base=${baseUrl}`);
    notes.push('route=cueforge.html->cue-sheet.html');
    notes.push('context=applied');
    notes.push('sampleRows=8');
    notes.push('callerDeck=passed');
    notes.push('importExport=passed');
    notes.push('mobile=390px');

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
    try {
      fs.unlinkSync(importFile);
    } catch (error) {
      // Temp file cleanup best effort.
    }
    await delay(500);
    await removeProfile(profile);
  }

  if (failures.length) {
    console.error('CueForge smoke probe failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`CueForge smoke probe passed (${notes.join(', ')}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
