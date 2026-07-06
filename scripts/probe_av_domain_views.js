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
const targets = [
  {
    name: 'signal-flow',
    page: 'signal-flow.html',
    title: 'Signal Flow',
    panel: '#routeChainView',
    body: '#routeBody',
    countLabel: 'visible routes',
    minRows: 7,
    expects: ['Playback laptop 1', 'Spyder input 4'],
    editValue: 'Probe camera source',
    requireClasses: ['is-issue', 'is-backup']
  },
  {
    name: 'audio-patch',
    page: 'audio-patch.html',
    title: 'Audio Patch',
    panel: '#audioPatchView',
    body: '#itemBody',
    countLabel: 'visible channels',
    minRows: 7,
    expects: ['Lead vocal', 'Stagebox A'],
    editValue: 'Probe audio source',
    requireClasses: ['is-ready', 'is-issue']
  },
  {
    name: 'input-list',
    page: 'input-list.html',
    title: 'Input List',
    panel: '#inputListView',
    body: '#sheetBody',
    countLabel: 'visible inputs',
    minRows: 8,
    expects: ['Lectern mic', 'SL box 1'],
    editValue: 'Probe input source',
    requireClasses: ['is-checked', 'is-open']
  },
  {
    name: 'line-check',
    page: 'line-check.html',
    title: 'Line Check',
    panel: '#lineCheckView',
    body: '#itemBody',
    countLabel: 'visible lines',
    minRows: 7,
    expects: ['Lead vocal', 'QL5 Ch 1'],
    editValue: 'Probe line source',
    requireClasses: ['is-passed', 'is-issue']
  },
  {
    name: 'power-plan',
    page: 'power-plan.html',
    title: 'Power Plan',
    panel: '#powerPlanView',
    body: '#circuitBody',
    countLabel: 'visible circuits',
    minRows: 7,
    expects: ['FOH audio rack', 'FOH wall A1'],
    editField: 'load',
    editValue: 'Probe power load',
    requireClasses: ['is-hot', 'is-issue']
  },
  {
    name: 'network-plan',
    page: 'network-plan.html',
    title: 'Network Plan',
    panel: '#networkPlanView',
    body: '#deviceBody',
    countLabel: 'visible devices',
    minRows: 8,
    expects: ['Core switch', '10.40.10.2'],
    editField: 'device',
    editValue: 'Probe network device',
    requireClasses: ['is-online', 'is-issue']
  },
  {
    name: 'rf-coordination',
    page: 'rf-coordination.html',
    title: 'RF Coordination',
    panel: '#rfCoordinationView',
    body: '#unitBody',
    countLabel: 'visible units',
    minRows: 8,
    expects: ['Vocal handheld A', '542.125'],
    editField: 'unit',
    editValue: 'Probe RF unit',
    requireClasses: ['is-clean', 'is-issue']
  },
  {
    name: 'gear-prep',
    page: 'gear-prep.html',
    title: 'Gear Prep',
    panel: '#gearPrepView',
    body: '#itemBody',
    countLabel: 'visible items',
    minRows: 8,
    expects: ['Main video switcher', 'VID-01'],
    editField: 'item',
    editValue: 'Probe gear item',
    requireClasses: ['is-tested', 'is-issue']
  },
  {
    name: 'truck-pack',
    page: 'truck-pack.html',
    title: 'Truck Pack',
    panel: '#truckPackView',
    body: '#itemBody',
    countLabel: 'visible cases',
    minRows: 8,
    expects: ['FOH console case', 'A-FOH'],
    editField: 'contents',
    editValue: 'Probe truck case',
    requireClasses: ['is-loaded', 'is-issue']
  },
  {
    name: 'load-in-plan',
    page: 'load-in-plan.html',
    title: 'Load In Plan',
    panel: '#loadInView',
    body: '#itemBody',
    countLabel: 'visible items',
    minRows: 8,
    expects: ['Truck arrival and unload lane', 'Dock A'],
    editField: 'item',
    editValue: 'Probe load-in item',
    requireClasses: ['is-built', 'is-issue']
  },
  {
    name: 'strike-plan',
    page: 'strike-plan.html',
    title: 'Strike Plan',
    panel: '#strikePlanView',
    body: '#itemBody',
    countLabel: 'visible items',
    minRows: 10,
    expects: ['FOH console and stagebox', 'Audio 01'],
    editField: 'item',
    editValue: 'Probe strike item',
    requireClasses: ['is-returned', 'is-missing']
  },
  {
    name: 'room-check',
    page: 'room-check.html',
    title: 'Room Check',
    panel: '#roomCheckView',
    body: '#itemBody',
    countLabel: 'visible checks',
    minRows: 10,
    expects: ['Room walk and sightlines', 'Lead tech'],
    editField: 'check',
    editValue: 'Probe room check',
    requireClasses: ['is-ready', 'is-issue']
  },
  {
    name: 'breakout-room-matrix',
    page: 'breakout-room-matrix.html',
    title: 'Breakout Room Matrix',
    panel: '#breakoutRoomView',
    body: '#roomBody',
    countLabel: 'visible rooms',
    minRows: 8,
    expects: ['Room 201', 'Opening breakout'],
    editField: 'session',
    editValue: 'Probe breakout session',
    requireClasses: ['is-ready', 'is-blocked']
  },
  {
    name: 'camera-shot-list',
    page: 'camera-shot-list.html',
    title: 'Camera Shot List',
    panel: '#cameraShotView',
    body: '#shotBody',
    countLabel: 'visible shots',
    minRows: 6,
    expects: ['Room and lectern', 'Opening wide'],
    editField: 'subject',
    editValue: 'Probe camera subject',
    requireClasses: ['is-ready', 'is-hold']
  }
];

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

    async function snapshot(target) {
      return evaluate(`(() => {
        const panel = document.querySelector(${JSON.stringify(target.panel)});
        const cards = Array.from(document.querySelectorAll(${JSON.stringify(`${target.panel} .av-domain-card`)}));
        const rows = Array.from(document.querySelectorAll(${JSON.stringify(`${target.body} tr[data-id]`)}));
        return {
          title: document.title,
          hasPanel: Boolean(panel),
          count: document.querySelector(${JSON.stringify(`${target.panel} [data-domain-count]`)})?.textContent.trim() || '',
          cardCount: cards.length,
          rowCount: rows.length,
          firstText: cards[0]?.textContent.replace(/\\s+/g, ' ').trim() || '',
          selectedCards: cards.filter((card) => card.classList.contains('is-selected')).length,
          selectedRow: rows.find((row) => row.classList.contains('selected'))?.dataset.id || '',
          selectedCard: cards.find((card) => card.classList.contains('is-selected'))?.dataset.rowId || '',
          classes: cards.reduce((acc, card) => {
            Array.from(card.classList).forEach((name) => {
              if (name.indexOf('is-') === 0) acc[name] = (acc[name] || 0) + 1;
            });
            return acc;
          }, {}),
          text: panel?.textContent.replace(/\\s+/g, ' ').trim() || ''
        };
      })()`);
    }

    async function runDesktopTarget(target) {
      await cdp('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });
      await cdp('Page.navigate', { url: new URL(target.page, baseUrl).href });
      await delay(2200);

      let state = await snapshot(target);
      assert(state.title.includes(target.title), `${target.name} page title did not load.`);
      assert(state.hasPanel, `${target.name} domain panel did not render.`);
      assert(state.cardCount === state.rowCount, `${target.name} card count ${state.cardCount} did not match visible rows ${state.rowCount}.`);
      assert(state.cardCount >= target.minRows, `${target.name} expected at least ${target.minRows} sample cards, saw ${state.cardCount}.`);
      assert(state.count === `${state.cardCount} ${target.countLabel}`, `${target.name} count was "${state.count}".`);
      target.expects.forEach((expected) => {
        assert(state.text.includes(expected), `${target.name} domain view did not include expected text "${expected}".`);
      });
      target.requireClasses.forEach((className) => {
        assert((state.classes[className] || 0) >= 1, `${target.name} did not expose ${className} status cards.`);
      });

      await evaluate(`(() => {
        const field = ${JSON.stringify(target.editField || 'source')};
        const control = document.querySelector(${JSON.stringify(`${target.body} tr[data-id]`)} + ' [data-field="' + field + '"]');
        control.value = ${JSON.stringify(target.editValue)};
        control.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await delay(350);
      state = await snapshot(target);
      assert(state.text.includes(target.editValue), `${target.name} domain view did not update after editing a table source.`);

      const clickedId = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll(${JSON.stringify(`${target.panel} .av-domain-card`)}));
        const targetCard = cards.find((card) => !card.classList.contains('is-selected')) || cards[0];
        targetCard.click();
        return targetCard.dataset.rowId || '';
      })()`);
      await delay(500);
      state = await snapshot(target);
      assert(Boolean(clickedId), `${target.name} could not click a domain card.`);
      assert(state.selectedRow === clickedId, `${target.name} card click did not select the matching table row.`);
      assert(state.selectedCard === clickedId, `${target.name} selected card did not sync after card click.`);
    }

    async function runMobileTarget(target) {
      await cdp('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
      });
      await cdp('Page.navigate', { url: new URL(target.page, baseUrl).href });
      await delay(2200);
      const mobile = await evaluate(`(() => {
        const panel = document.querySelector(${JSON.stringify(target.panel)});
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
          hasPanel: Boolean(panel),
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
          clipped,
          cardColumns: panel ? getComputedStyle(panel.querySelector('.av-domain-deck')).gridTemplateColumns : ''
        };
      })()`);
      assert(mobile.hasPanel, `${target.name} mobile domain panel did not render.`);
      assert(mobile.overflowX <= 1, `${target.name} mobile viewport has overflowX=${mobile.overflowX}.`);
      assert(mobile.clipped.length === 0, `${target.name} mobile viewport has clipped focusable controls: ${JSON.stringify(mobile.clipped.slice(0, 4))}`);
      assert(mobile.cardColumns && !mobile.cardColumns.includes(' '), `${target.name} mobile deck is not one column: ${mobile.cardColumns}`);
    }

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('DOM.enable');

    for (const target of targets) {
      await runDesktopTarget(target);
      await runMobileTarget(target);
      notes.push(`${target.name}=passed`);
    }

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
  console.log(`AV domain-view probe passed (${notes.join(', ')}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
