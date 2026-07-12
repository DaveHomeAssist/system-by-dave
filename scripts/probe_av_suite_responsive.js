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
const targetArg = args.find((arg) => arg.startsWith('--target='));
const baseUrl = (baseArg ? baseArg.slice('--base='.length) : 'http://127.0.0.1:8000/').replace(/\/?$/, '/');
const chromeBin = chromeArg ? chromeArg.slice('--chrome='.length) : (
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);

const allTargets = [
  ['hub', 'av-suite.html'],
  ['av-workbook', 'av-workbook/'],
  ['ontrack', 'ontrack.html'],
  ['show-timer', 'show-timer.html'],
  ['playback-check', 'playback-check.html'],
  ['cueforge', 'cueforge.html'],
  ['audio-patch', 'audio-patch.html'],
  ['av-calculator', 'av-calculator.html'],
  ['show-handoff', 'show-handoff.html']
];
const targetName = targetArg ? targetArg.slice('--target='.length) : '';
const targets = targetName ? allTargets.filter(([name]) => name === targetName) : allTargets;
const widths = [390, 1280];
const failures = [];
const results = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-av-probe-'));
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

    await cdp('Page.enable');
    await cdp('Runtime.enable');

    const expression = `(() => {
      const vw = window.innerWidth;
      const selector = 'a[href],button,input,select,textarea,[tabindex]';
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }
      function isInert(el) {
        return Boolean(el.closest('[inert]'));
      }
      function label(el) {
        const explicit = el.getAttribute('aria-label') || el.getAttribute('title') || '';
        const fromLabel = el.id ? (document.querySelector('label[for="' + CSS.escape(el.id) + '"]') || {}).textContent || '' : '';
        return (explicit || fromLabel || el.innerText || el.value || el.textContent || '').replace(/\\s+/g, ' ').trim();
      }
      const focusables = Array.from(document.querySelectorAll(selector)).filter((el) => !el.disabled && !isInert(el) && isVisible(el));
      const clipped = focusables.map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), id: el.id || '', cls: el.className || '', text: label(el).slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right) };
      }).filter((item) => item.left < -1 || item.right > vw + 1);
      const overflowElements = Array.from(document.querySelectorAll('body *')).map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), id: el.id || '', cls: typeof el.className === 'string' ? el.className : '', left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      }).filter((item) => item.width > 0 && (item.left < -1 || item.right > vw + 1)).slice(0, 8);
      const drawer = document.getElementById('settingsDrawer');
      return {
        title: document.title,
        viewport: { width: vw, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth },
        overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
        clipped,
        overflowElements,
        drawerInert: drawer ? drawer.hasAttribute('inert') : null
      };
    })()`;

    for (const [name, rel] of targets) {
      for (const width of widths) {
        await cdp('Emulation.setDeviceMetricsOverride', {
          width,
          height: 844,
          deviceScaleFactor: 1,
          mobile: width <= 430
        });
        await cdp('Page.navigate', { url: new URL(rel, baseUrl).href });
        await delay(rel === 'cueforge.html' ? 2600 : 1800);
        const evaluated = await cdp('Runtime.evaluate', { expression, returnByValue: true });
        const value = evaluated.result.value;
        results.push({ name, width, overflowX: value.overflowX, clipped: value.clipped.length, overflowElements: value.overflowElements, drawerInert: value.drawerInert });
        if (value.overflowX > 1) failures.push(`${name} ${width}px has page overflowX=${value.overflowX}: ${JSON.stringify(value.overflowElements)}.`);
        if (width === 390 && value.clipped.length) {
          failures.push(`${name} ${width}px has clipped focusable controls: ${JSON.stringify(value.clipped.slice(0, 4))}`);
        }
        if (name === 'hub' && value.drawerInert !== true) failures.push('AV Suite settings drawer is not inert while closed.');
      }
    }

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
    await delay(500);
    await removeProfile(profile);
  }

  if (failures.length) {
    console.error('Responsive probe failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  console.log(`Responsive probe passed for ${targets.length} pages at ${widths.join('/')}px using ${baseUrl}.`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
