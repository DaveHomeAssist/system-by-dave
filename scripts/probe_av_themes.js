#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');

if (typeof WebSocket === 'undefined') {
  console.error('This probe requires a Node runtime with global WebSocket support.');
  process.exit(1);
}

const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith('--base='));
const chromeArg = args.find((arg) => arg.startsWith('--chrome='));
const targetArg = args.find((arg) => arg.startsWith('--target='));
const widthArg = args.find((arg) => arg.startsWith('--width='));
const captureArg = args.find((arg) => arg.startsWith('--capture-dir='));
const motionArg = args.find((arg) => arg.startsWith('--motion='));
const sampleWorkbook = args.includes('--sample-workbook');
const baseUrl = (baseArg ? baseArg.slice('--base='.length) : 'http://127.0.0.1:8000/').replace(/\/?$/, '/');
const chromeBin = chromeArg ? chromeArg.slice('--chrome='.length) : (
  process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);
const root = path.resolve(__dirname, '..');
const viewportWidth = widthArg ? Number(widthArg.slice('--width='.length)) : 390;
const captureDir = captureArg ? path.resolve(captureArg.slice('--capture-dir='.length)) : '';
const motionPreference = motionArg ? motionArg.slice('--motion='.length) : 'reduce';

if (motionPreference !== 'reduce' && motionPreference !== 'no-preference') {
  throw new Error('--motion must be reduce or no-preference.');
}

function loadRegistry() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/sbd-registry.js'), 'utf8'), context);
  return context.SBD_REGISTRY;
}

const registry = loadRegistry();
const allTargets = [
  { id: 'av-suite', href: 'av-suite.html' },
  ...registry.tools.map((tool) => ({ id: tool.id, href: tool.href }))
];
const requestedTargets = targetArg ? new Set(targetArg.slice('--target='.length).split(',').filter(Boolean)) : null;
const targets = requestedTargets ? allTargets.filter((target) => requestedTargets.has(target.id)) : allTargets;
const preferences = ['light', 'dark'];
const systemManagedTargets = new Set(['pixelforge']);
const lockedDarkTargets = new Set(['av-workbook']);
const failures = [];
const results = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function rgb(value) {
  const hex = String(value || '').trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((index) => Number.parseInt(hex[1].slice(index, index + 2), 16));
  const functional = String(value || '').match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i);
  return functional ? functional.slice(1, 4).map(Number) : null;
}

function luminance(color) {
  const channels = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const first = rgb(a);
  const second = rgb(b);
  if (!first || !second) return 0;
  const one = luminance(first);
  const two = luminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
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
  if (!targets.length) throw new Error('No AV theme probe targets matched --target.');
  if (captureDir) fs.mkdirSync(captureDir, { recursive: true });

  const port = 9500 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-av-theme-probe-'));
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
    const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });

    let sequence = 0;
    let exceptions = [];
    const pending = new Map();
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

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: viewportWidth,
      height: viewportWidth <= 430 ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    const expression = `(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      const value = (name) => styles.getPropertyValue(name).trim();
      const pixelForge = document.querySelector('.pf');

      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = colorCanvas.height = 1;
      const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
      const colorCache = new Map();
      const parseColor = (input) => {
        const key = String(input || 'transparent');
        if (colorCache.has(key)) return colorCache.get(key);
        colorContext.clearRect(0, 0, 1, 1);
        colorContext.fillStyle = key;
        colorContext.fillRect(0, 0, 1, 1);
        const channels = Array.from(colorContext.getImageData(0, 0, 1, 1).data);
        const parsed = [channels[0], channels[1], channels[2], channels[3] / 255];
        colorCache.set(key, parsed);
        return parsed;
      };
      const composite = (front, back) => {
        const alpha = front[3] + back[3] * (1 - front[3]);
        if (!alpha) return [0, 0, 0, 0];
        return [0, 1, 2].map((index) => (
          (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha
        )).concat(alpha);
      };
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      };
      const relativeLuminance = (color) => .2126 * channel(color[0]) + .7152 * channel(color[1]) + .0722 * channel(color[2]);
      const contrastRatio = (foreground, background) => {
        const one = relativeLuminance(foreground);
        const two = relativeLuminance(background);
        return (Math.max(one, two) + .05) / (Math.min(one, two) + .05);
      };
      const effectiveBackground = (element) => {
        const chain = [];
        for (let current = element; current; current = current.parentElement) chain.unshift(current);
        // Throwline intentionally uses self-contained theme tokens rather
        // than the shared AV variables. Start from the computed page surface
        // so the audit remains accurate for every page.
        let background = parseColor(getComputedStyle(document.body).backgroundColor);
        chain.forEach((current) => {
          background = composite(parseColor(getComputedStyle(current).backgroundColor), background);
        });
        return background;
      };
      const seenContrast = new Set();
      const contrastViolations = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      for (let node = walker.nextNode(); node && contrastViolations.length < 12; node = walker.nextNode()) {
        const element = node.parentElement;
        if (!element || element.closest('[aria-hidden="true"], [hidden]')) continue;
        if (element.matches(':disabled, [aria-disabled="true"]')) continue;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .55) continue;
        if (rect.width < 4 || rect.height < 4 || rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) continue;
        const background = effectiveBackground(element);
        const foreground = composite(parseColor(style.color), background);
        const ratio = contrastRatio(foreground, background);
        const size = Number.parseFloat(style.fontSize);
        const weight = Number.parseInt(style.fontWeight, 10) || 400;
        const threshold = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
        if (ratio + .05 >= threshold) continue;
        const label = node.nodeValue.trim().replace(/\\s+/g, ' ').slice(0, 56);
        const key = [element.tagName, element.className, label].join('|');
        if (seenContrast.has(key)) continue;
        seenContrast.add(key);
        contrastViolations.push({
          element: element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).trim().replace(/\\s+/g, '.') : ''),
          text: label,
          ratio: Number(ratio.toFixed(2)),
          threshold
        });
      }
      return {
        title: document.title,
        tool: root.getAttribute('data-av-tool'),
        optIn: root.getAttribute('data-av-theme'),
        darkPreference: matchMedia('(prefers-color-scheme: dark)').matches,
        tokens: location.pathname.includes('/ProjectorThrow/') ? {
          bg: value('--deck'),
          surface: value('--case'),
          text: value('--chalk'),
          muted: value('--dim'),
          accent: value('--hazard'),
          primaryInk: value('--primary-ink'),
          focus: value('--hazard')
        } : {
          bg: value('--av-bg'),
          surface: value('--av-surface'),
          text: value('--av-text'),
          muted: value('--av-muted'),
          accent: value('--av-accent'),
          primaryInk: value('--av-primary-ink'),
          focus: value('--av-focus')
        },
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        showBoardDark: root.getAttribute('data-av-tool') === 'show-board' ? document.body.classList.contains('dark') : null,
        throwlineDark: location.pathname.includes('/ProjectorThrow/') ? root.dataset.theme === 'dark' : null,
        pixelForgeDark: root.getAttribute('data-av-tool') === 'pixelforge' && pixelForge ? pixelForge.classList.contains('pf-dark') : null,
        pixelForgeSystem: root.getAttribute('data-av-tool') === 'pixelforge' ? root.getAttribute('data-av-system-theme') : null,
        contrastViolations
      };
    })()`;

    for (const preference of preferences) {
      await cdp('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [
          { name: 'prefers-color-scheme', value: preference },
          { name: 'prefers-reduced-motion', value: motionPreference }
        ]
      });

      // The AV suite honors the operator's stored mode and defaults to dark,
      // so seed the requested mode before each pass instead of relying on the
      // operating-system preference alone.
      await cdp('Page.navigate', { url: baseUrl });
      await delay(180);
      await cdp('Runtime.evaluate', {
        expression: `localStorage.setItem('av-theme-mode.v1', ${JSON.stringify(preference)})`
      });

      for (const target of targets) {
        exceptions = [];
        await cdp('Page.navigate', { url: new URL(target.href, baseUrl).href });
        if (target.id === 'av-workbook' && sampleWorkbook) {
          await delay(900);
          await cdp('Runtime.evaluate', {
            expression: `(() => {
              window.confirm = () => true;
              const button = Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent.trim() === 'Load Sample');
              if (!button) return false;
              button.click();
              return true;
            })()`
          });
          await delay(900);
        }
        await delay(target.id === 'av-workbook' && motionPreference === 'no-preference'
          ? 2800
          : target.id === 'pixelforge' || target.id === 'av-workbook' ? 1100 : 420);
        const evaluated = await cdp('Runtime.evaluate', { expression, returnByValue: true });
        const value = evaluated.result.value;
        if (target.id === 'av-workbook' && motionPreference === 'no-preference') {
          await cdp('Runtime.evaluate', { expression: 'window.scrollTo(0, document.documentElement.scrollHeight)' });
          await delay(650);
          const motionProbe = await cdp('Runtime.evaluate', {
            expression: `(() => ({
              progress: getComputedStyle(document.querySelector('.show-progress span')).transform,
              titleOpacity: getComputedStyle(document.querySelector('.hero-title')).opacity,
              titleVisibility: getComputedStyle(document.querySelector('.hero-title')).visibility
            }))()`,
            returnByValue: true
          });
          const motion = motionProbe.result.value;
          if (motion.progress === 'none' || motion.progress.includes('(0, 0')) {
            failures.push(`${target.id} ${preference}: GSAP scroll progress did not activate ${JSON.stringify(motion)}.`);
          }
          if (motion.titleOpacity !== '1' || motion.titleVisibility !== 'visible') {
            failures.push(`${target.id} ${preference}: GSAP boot sequence did not settle ${JSON.stringify(motion)}.`);
          }
          await cdp('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
          await delay(180);
        }
        if (target.id === 'av-workbook' && sampleWorkbook) {
          const engineProbe = await cdp('Runtime.evaluate', {
            expression: `(() => {
              const button = Array.from(document.querySelectorAll('[role="tab"]')).find((candidate) => candidate.textContent.includes('Engines'));
              if (!button) return false;
              button.click();
              return true;
            })()`,
            returnByValue: true
          });
          await delay(650);
          const engineView = await cdp('Runtime.evaluate', {
            expression: `(() => ({
              cards: document.querySelectorAll('.engine-card').length,
              selected: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim() || ''
            }))()`,
            returnByValue: true
          });
          if (!engineProbe.result.value || engineView.result.value.cards !== 6 || !engineView.result.value.selected.includes('Engines')) {
            failures.push(`${target.id} ${preference}: populated engine view did not render ${JSON.stringify(engineView.result.value)}.`);
          }
          await cdp('Runtime.evaluate', {
            expression: `Array.from(document.querySelectorAll('[role="tab"]')).find((candidate) => candidate.textContent.includes('Overview'))?.click()`
          });
          await delay(420);
        }
        if (target.id === 'av-calculator') {
          const calculatorProbe = await cdp('Runtime.evaluate', {
            expression: `(() => {
              const set = (id, value, eventName) => {
                const field = document.getElementById(id);
                field.value = String(value);
                field.dispatchEvent(new Event(eventName || 'input', { bubbles: true }));
              };

              set('powerMethod', 'amps', 'change');
              set('deviceAmps', 3.2);
              set('deviceCount', 4);
              set('circuitAmps', 20, 'change');
              const amps = {
                total: document.getElementById('totalAmps').textContent,
                reference: document.getElementById('circuitPercent').textContent,
                fields: [
                  getComputedStyle(document.getElementById('nameplateAmpsField')).display,
                  getComputedStyle(document.getElementById('wattsField')).display,
                  getComputedStyle(document.getElementById('powerFactorField')).display
                ]
              };

              set('powerMethod', 'watts', 'change');
              set('deviceWatts', 350);
              set('powerFactor', 0.7);
              set('voltage', 120, 'change');
              const watts = {
                total: document.getElementById('totalAmps').textContent,
                reference: document.getElementById('circuitPercent').textContent,
                fields: [
                  getComputedStyle(document.getElementById('nameplateAmpsField')).display,
                  getComputedStyle(document.getElementById('wattsField')).display,
                  getComputedStyle(document.getElementById('powerFactorField')).display
                ]
              };

              set('powerFactor', 0);
              const missingPowerFactor = {
                total: document.getElementById('totalAmps').textContent,
                warning: document.getElementById('powerWarning').textContent
              };

              return { amps, watts, missingPowerFactor };
            })()`,
            returnByValue: true
          });
          const calculator = calculatorProbe.result.value;
          if (calculator.amps.total !== '12.80 A' || calculator.amps.reference !== '80%' || JSON.stringify(calculator.amps.fields) !== '["grid","none","none"]') {
            failures.push(`${target.id} ${preference}: nameplate-amps calculation returned ${JSON.stringify(calculator.amps)}.`);
          }
          if (calculator.watts.total !== '~16.67 A' || calculator.watts.reference !== '104%' || JSON.stringify(calculator.watts.fields) !== '["none","grid","grid"]') {
            failures.push(`${target.id} ${preference}: watts-plus-PF calculation returned ${JSON.stringify(calculator.watts)}.`);
          }
          if (calculator.missingPowerFactor.total !== '—' || !calculator.missingPowerFactor.warning.includes('will not silently assume PF 1')) {
            failures.push(`${target.id} ${preference}: missing power factor did not fail closed ${JSON.stringify(calculator.missingPowerFactor)}.`);
          }

          await cdp('Runtime.evaluate', {
            expression: `localStorage.setItem('avCalculator.v1', JSON.stringify({ deviceWatts: 500, deviceCount: 2, voltage: 120, circuitAmps: 20 }))`
          });
          await cdp('Page.reload');
          await delay(420);
          const migratedProbe = await cdp('Runtime.evaluate', {
            expression: `(() => ({
              method: document.getElementById('powerMethod').value,
              powerFactor: document.getElementById('powerFactor').value,
              total: document.getElementById('totalAmps').textContent,
              status: document.getElementById('actionStatus').textContent,
              fields: [
                getComputedStyle(document.getElementById('nameplateAmpsField')).display,
                getComputedStyle(document.getElementById('wattsField')).display,
                getComputedStyle(document.getElementById('powerFactorField')).display
              ]
            }))()`,
            returnByValue: true
          });
          const migrated = migratedProbe.result.value;
          if (migrated.method !== 'watts' || migrated.powerFactor !== '0' || migrated.total !== '—' || !migrated.status.includes('Saved watts were migrated') || JSON.stringify(migrated.fields) !== '["none","grid","grid"]') {
            failures.push(`${target.id} ${preference}: legacy watts migration returned ${JSON.stringify(migrated)}.`);
          }
          await cdp('Runtime.evaluate', { expression: `localStorage.removeItem('avCalculator.v1')` });
        }
        if (captureDir) {
          const screenshot = await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
          fs.writeFileSync(path.join(captureDir, `${target.id}-${preference}-${viewportWidth}.png`), Buffer.from(screenshot.data, 'base64'));
        }
        const throwlineStandalone = target.id === 'throwline';
        const expectedBg = throwlineStandalone
          ? '#f4f1ea'
          : (lockedDarkTargets.has(target.id) || preference === 'dark' ? '#0c1016' : '#eee8df');
        const ratios = {
          text: contrast(value.tokens.text, value.tokens.bg),
          muted: contrast(value.tokens.muted, value.tokens.surface),
          accent: contrast(value.tokens.accent, value.tokens.surface),
          primary: contrast(value.tokens.primaryInk, value.tokens.accent),
          focus: contrast(value.tokens.focus, value.tokens.surface)
        };
        results.push({ id: target.id, preference, tokens: value.tokens, ratios, overflowX: value.overflowX });

        if (throwlineStandalone) {
          if (value.tool !== null || value.optIn !== null) failures.push(`throwline ${preference}: standalone app must not opt into the shared system theme (${value.tool}/${value.optIn}).`);
        } else if (value.tool !== target.id || value.optIn !== (lockedDarkTargets.has(target.id)
          ? 'dark'
          : (systemManagedTargets.has(target.id) ? 'system' : preference))) {
          failures.push(`${target.id} ${preference}: wrong theme identity (${value.tool}/${value.optIn}).`);
        }
        if (value.tokens.bg.toLowerCase() !== expectedBg) failures.push(`${target.id} ${preference}: --av-bg is ${value.tokens.bg}, expected ${expectedBg}.`);
        if (ratios.text < 4.5 || ratios.muted < 4.5 || ratios.accent < 4.5 || ratios.primary < 4.5 || ratios.focus < 3) {
          failures.push(`${target.id} ${preference}: contrast contract failed ${JSON.stringify(ratios)}.`);
        }
        if (value.overflowX > 1) failures.push(`${target.id} ${preference}: mobile overflowX=${value.overflowX}.`);
        if (target.id === 'show-board' && value.showBoardDark !== (preference === 'dark')) failures.push(`show-board ${preference}: body theme does not match the system.`);
        if (target.id === 'throwline' && value.throwlineDark !== false) failures.push(`throwline ${preference}: standalone app does not retain its light default.`);
        if (target.id === 'pixelforge' && value.pixelForgeSystem !== preference) failures.push(`pixelforge ${preference}: launcher theme does not match the system.`);
        if (value.contrastViolations.length) failures.push(`${target.id} ${preference}: visible text contrast ${JSON.stringify(value.contrastViolations)}.`);
        if (exceptions.length) failures.push(`${target.id} ${preference}: ${exceptions.join('; ')}`);
      }
    }

    socket.close();
  } finally {
    chrome.kill('SIGTERM');
    await delay(500);
    await removeProfile(profile);
  }

  if (failures.length) {
    console.error('AV theme browser probe failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const minimums = results.reduce((current, result) => ({
    text: Math.min(current.text, result.ratios.text),
    muted: Math.min(current.muted, result.ratios.muted),
    accent: Math.min(current.accent, result.ratios.accent),
    primary: Math.min(current.primary, result.ratios.primary),
    focus: Math.min(current.focus, result.ratios.focus)
  }), { text: Infinity, muted: Infinity, accent: Infinity, primary: Infinity, focus: Infinity });

  console.log(`AV theme browser probe passed (${targets.length} surfaces × ${preferences.length} preferences at ${viewportWidth}px, motion=${motionPreference}${sampleWorkbook ? ', sample-workbook' : ''}).`);
  console.log(JSON.stringify({ registry: registry.version, minimumContrast: minimums }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
