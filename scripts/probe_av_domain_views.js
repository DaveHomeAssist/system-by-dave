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
const runtimeExceptions = [];
const notes = [];

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

async function main() {
  if (!fs.existsSync(chromeBin)) {
    throw new Error(`Chrome binary not found: ${chromeBin}`);
  }

  const port = 9900 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-domain-probe-'));
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
        const panel = document.querySelector('#routeChainView');
        const cards = Array.from(document.querySelectorAll('#routeChainView .av-domain-card'));
        const rows = Array.from(document.querySelectorAll('#routeBody tr[data-id]'));
        return {
          title: document.title,
          hasPanel: Boolean(panel),
          count: document.querySelector('#routeChainView [data-domain-count]')?.textContent.trim() || '',
          cardCount: cards.length,
          rowCount: rows.length,
          firstText: cards[0]?.textContent.replace(/\\s+/g, ' ').trim() || '',
          selectedCards: cards.filter((card) => card.classList.contains('is-selected')).length,
          selectedRow: rows.find((row) => row.classList.contains('selected'))?.dataset.id || '',
          selectedCard: cards.find((card) => card.classList.contains('is-selected'))?.dataset.rowId || '',
          issueCards: cards.filter((card) => card.classList.contains('is-issue')).length,
          backupCards: cards.filter((card) => card.classList.contains('is-backup')).length,
          text: panel?.textContent.replace(/\\s+/g, ' ').trim() || ''
        };
      })()`);
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
    await cdp('Page.navigate', { url: new URL('signal-flow.html', baseUrl).href });
    await delay(2200);

    let state = await snapshot();
    assert(state.title.includes('Signal Flow'), 'Signal Flow page title did not load.');
    assert(state.hasPanel, 'Route chain panel did not render.');
    assert(state.cardCount === state.rowCount, `Route chain card count ${state.cardCount} did not match visible rows ${state.rowCount}.`);
    assert(state.cardCount >= 7, `Expected sample route cards, saw ${state.cardCount}.`);
    assert(state.count === `${state.cardCount} visible routes`, `Route chain count was "${state.count}".`);
    assert(state.firstText.includes('Playback laptop 1') && state.firstText.includes('Spyder input 4'), 'First route card did not show the source to destination chain.');
    assert(state.issueCards >= 1, 'Route chain did not expose issue status cards.');
    assert(state.backupCards >= 1, 'Route chain did not expose backup status cards.');

    await evaluate(`(() => {
      const firstSource = document.querySelector('#routeBody tr[data-id] [data-field="source"]');
      firstSource.value = 'Probe camera source';
      firstSource.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await delay(350);
    state = await snapshot();
    assert(state.text.includes('Probe camera source'), 'Route chain did not update after editing a table source.');

    const clickedId = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('#routeChainView .av-domain-card'));
      const target = cards.find((card) => !card.classList.contains('is-selected')) || cards[0];
      target.click();
      return target.dataset.rowId || '';
    })()`);
    await delay(500);
    state = await snapshot();
    assert(Boolean(clickedId), 'Could not click a route chain card.');
    assert(state.selectedRow === clickedId, 'Clicking a route chain card did not select the matching table row.');
    assert(state.selectedCard === clickedId, 'Selected route chain card did not sync after card click.');

    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await cdp('Page.navigate', { url: new URL('signal-flow.html', baseUrl).href });
    await delay(2200);
    const mobile = await evaluate(`(() => {
      const vw = window.innerWidth;
      const selector = 'a[href],button,input,select,textarea,[tabindex]';
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }
      const focusables = Array.from(document.querySelectorAll(selector)).filter((el) => !el.disabled && isVisible(el));
      const clipped = focusables.map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), id: el.id || '', cls: el.className || '', left: Math.round(rect.left), right: Math.round(rect.right) };
      }).filter((item) => item.left < -1 || item.right > vw + 1);
      return {
        overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
        clipped,
        cardColumns: getComputedStyle(document.querySelector('#routeChainView .av-domain-deck')).gridTemplateColumns
      };
    })()`);
    assert(mobile.overflowX <= 1, `Signal Flow mobile viewport has overflowX=${mobile.overflowX}.`);
    assert(mobile.clipped.length === 0, `Signal Flow mobile viewport has clipped focusable controls: ${JSON.stringify(mobile.clipped.slice(0, 4))}`);
    assert(mobile.cardColumns && !mobile.cardColumns.includes(' '), `Route chain mobile deck is not one column: ${mobile.cardColumns}`);

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
    await delay(500);
    await removeProfile(profile);
  }

  if (runtimeExceptions.length) {
    runtimeExceptions.forEach((exception) => failures.push(`Runtime exception: ${exception}`));
  }

  if (failures.length) {
    console.error('AV domain-view probe failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  notes.push(`base=${baseUrl}`);
  notes.push('signal-flow route-chain=passed');
  console.log(`AV domain-view probe passed (${notes.join(', ')}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
