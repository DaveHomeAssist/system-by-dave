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
const screenshotsArg = args.find((arg) => arg.startsWith('--screenshots='));
const baseUrl = (baseArg ? baseArg.slice('--base='.length) : 'http://127.0.0.1:8000/').replace(/\/?$/, '/');
const chromeBin = chromeArg ? chromeArg.slice('--chrome='.length) : (
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);

const allTargets = [
  ['hub-toolbox', 'av-suite.html?entry=toolbox'],
  ['hub-show', 'av-suite.html?entry=show'],
  ['ontrack', 'ontrack.html'],
  ['show-timer', 'show-timer.html'],
  ['playback-check', 'playback-check.html'],
  ['cue-sheet', 'cue-sheet.html'],
  ['audio-patch', 'audio-patch.html'],
  ['av-calculator', 'av-calculator.html'],
  ['show-handoff', 'show-handoff.html']
];
const targetName = targetArg ? targetArg.slice('--target='.length) : '';
const screenshotsDir = screenshotsArg ? path.resolve(screenshotsArg.slice('--screenshots='.length)) : '';
const targets = targetName ? allTargets.filter(([name]) => name === targetName) : allTargets;
const widths = [390, 680, 1280];
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

    async function navigate(rel, waitMs = 900) {
      await cdp('Page.navigate', { url: new URL(rel, baseUrl).href });
      await delay(waitMs);
    }

    async function evaluateValue(source, awaitPromise = false) {
      const evaluated = await cdp('Runtime.evaluate', { expression: source, returnByValue: true, awaitPromise });
      if (evaluated.exceptionDetails) throw new Error(`Browser evaluation failed: ${JSON.stringify(evaluated.exceptionDetails)}`);
      return evaluated.result.value;
    }

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
      function hasHorizontalScrollContainer(el) {
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          const style = getComputedStyle(parent);
          const verticalAppPane = parent.matches('#avApp [data-r="rail"],#avApp [data-r="main"],#avApp [data-r="aside"]');
          if (!verticalAppPane && (style.overflowX === 'auto' || style.overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth + 1) return true;
          parent = parent.parentElement;
        }
        return false;
      }
      const focusables = Array.from(document.querySelectorAll(selector)).filter((el) => !el.disabled && !isInert(el) && isVisible(el));
      const clipped = focusables.filter((el) => {
        const rect = el.getBoundingClientRect();
        return (rect.left < -1 || rect.right > vw + 1) && !hasHorizontalScrollContainer(el);
      }).map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), id: el.id || '', cls: el.className || '', text: label(el).slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right) };
      });
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
        await delay(rel === 'cue-sheet.html' ? 2600 : 1800);
        if (screenshotsDir && name.startsWith('hub-')) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
          const captured = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          fs.writeFileSync(path.join(screenshotsDir, `${name}-${width}.png`), Buffer.from(captured.data, 'base64'));
        }
        const evaluated = await cdp('Runtime.evaluate', { expression, returnByValue: true });
        const value = evaluated.result.value;
        results.push({ name, width, overflowX: value.overflowX, clipped: value.clipped.length, overflowElements: value.overflowElements, drawerInert: value.drawerInert });
        if (value.overflowX > 1) failures.push(`${name} ${width}px has page overflowX=${value.overflowX}: ${JSON.stringify(value.overflowElements)}.`);
        if (value.clipped.length) {
          failures.push(`${name} ${width}px has clipped focusable controls: ${JSON.stringify(value.clipped.slice(0, 4))}`);
        }
        if (name.startsWith('hub-') && value.drawerInert !== true) failures.push('AV Suite settings drawer is not inert while closed.');
      }
    }

    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Legacy Show preference must never redirect a neutral visit or mutate its saved show.
    await navigate('av-suite.html?entry=toolbox');
    const returningSentinel = await evaluateValue(`(() => {
      localStorage.clear();
      localStorage.setItem('av-suite-ui.v1', JSON.stringify({preferredEntry: 'show'}));
      const saved = '{"sentinel":"returning-show-must-survive","bytes":[7,8,9]}';
      localStorage.setItem('av-suite-dashboard.v1', saved);
      return saved;
    })()`);
    await navigate('av-suite.html');
    const returning = await evaluateValue(`({
      mode: document.getElementById('avApp').getAttribute('data-entry'),
      chooserHidden: document.getElementById('entryChooser').hidden,
      dashboard: localStorage.getItem('av-suite-dashboard.v1'),
      preference: JSON.parse(localStorage.getItem('av-suite-ui.v1')).preferredEntry
    })`);
    if (returning.mode !== 'toolbox' || !returning.chooserHidden) failures.push('Neutral returning visit did not open Toolbox.');
    if (returning.dashboard !== returningSentinel) failures.push('Neutral returning visit mutated saved show data.');
    if (returning.preference !== 'show') failures.push('Neutral returning visit rewrote the retained legacy preference.');

    /* Toolbox contract: cold entry, consolidated applications, plain links, isolated
       UI state, persistence, and a byte-for-byte untouched show dashboard. */
    await navigate('av-suite.html?entry=toolbox');
    await evaluateValue(`(() => {
      localStorage.clear();
      localStorage.setItem('av-suite-dashboard.v1', '{"sentinel":"toolbox-must-not-touch-this","bytes":[1,2,3]}');
      return true;
    })()`);
    await navigate('av-suite.html?entry=toolbox');
    const toolboxInitial = await evaluateValue(`(() => {
      const showParams = ['sbdShow','sbdVenue','sbdDate','sbdOperator','sbdPhase'];
      const links = Array.from(document.querySelectorAll('.toolbox-card a[data-tool]'));
      return {
        mode: document.getElementById('avApp').getAttribute('data-entry'),
        chooserHidden: document.getElementById('entryChooser').hidden,
        onboardingHidden: document.getElementById('onboardOverlay').hidden,
        noShow: document.body.innerText.includes('No show attached'),
        tools: links.map((link) => link.getAttribute('data-tool')).sort(),
        expectedTools: window.SBD_REGISTRY.tools.filter((tool) => !tool.consolidatedInto).map((tool) => tool.id).sort(),
        plainLinks: links.length && links.every((link) => {
          const url = new URL(link.href);
          return showParams.every((name) => !url.searchParams.has(name));
        }),
        phaseHidden: document.getElementById('phaseStrip').hidden,
        setupHidden: document.getElementById('setupBtn').hidden || getComputedStyle(document.getElementById('setupBtn')).display === 'none',
        showFileHidden: !document.getElementById('showFileRailBlock')
      };
    })()`);
    if (toolboxInitial.mode !== 'toolbox') failures.push('entry=toolbox did not resolve to Toolbox.');
    if (!toolboxInitial.chooserHidden || !toolboxInitial.onboardingHidden) failures.push('Explicit Toolbox entry did not bypass doorway/show onboarding.');
    if (!toolboxInitial.noShow) failures.push('Toolbox does not clearly display No show attached.');
    if (JSON.stringify(toolboxInitial.tools) !== JSON.stringify(toolboxInitial.expectedTools)) failures.push(`Toolbox application cards differ from the consolidated registry: ${JSON.stringify(toolboxInitial)}.`);
    if (!toolboxInitial.plainLinks) failures.push('At least one Toolbox tool link carries an sbd* show parameter.');
    if (!toolboxInitial.phaseHidden || !toolboxInitial.setupHidden || !toolboxInitial.showFileHidden) failures.push('Toolbox still exposes show-only phase, setup, or show-file controls.');

    const toolboxInteraction = await evaluateValue(`(() => {
      const sentinelBefore = localStorage.getItem('av-suite-dashboard.v1');
      document.querySelector('[data-pin="gear-reference"]').click();
      const recentLink = document.querySelector('.toolbox-card a[data-tool="throwline"]');
      recentLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
      recentLink.click();
      const search = document.getElementById('toolboxSearchInput');
      search.value = 'projection';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const family = document.getElementById('toolboxFamilySelect');
      family.value = 'video';
      family.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-toolbox-filter="pinned"]').click();
      const ui = JSON.parse(localStorage.getItem('av-suite-ui.v1') || '{}');
      return {
        sentinelBefore,
        sentinelAfter: localStorage.getItem('av-suite-dashboard.v1'),
        ui,
        searchValue: document.getElementById('toolboxSearchInput').value,
        familyValue: document.getElementById('toolboxFamilySelect').value,
        pinnedPressed: document.querySelector('[data-toolbox-filter="pinned"]').getAttribute('aria-pressed')
      };
    })()`);
    if (toolboxInteraction.sentinelAfter !== toolboxInteraction.sentinelBefore) failures.push('Toolbox interactions mutated av-suite-dashboard.v1.');
    if (!toolboxInteraction.ui.toolboxPinned?.includes('gear-reference')) failures.push('Toolbox pin did not persist to av-suite-ui.v1.');
    if (!toolboxInteraction.ui.toolboxRecent?.includes('throwline')) failures.push('Toolbox recent launch did not persist to av-suite-ui.v1.');
    if (toolboxInteraction.ui.toolboxSearch !== 'projection' || toolboxInteraction.ui.toolboxFamily !== 'video' || toolboxInteraction.ui.toolboxFilter !== 'pinned') failures.push('Toolbox search/filter/family state did not persist to av-suite-ui.v1.');

    await navigate('av-suite.html?entry=toolbox');
    const toolboxReload = await evaluateValue(`(() => ({
      dashboard: localStorage.getItem('av-suite-dashboard.v1'),
      search: document.getElementById('toolboxSearchInput').value,
      family: document.getElementById('toolboxFamilySelect').value,
      pinned: document.querySelector('[data-toolbox-filter="pinned"]').getAttribute('aria-pressed')
    }))()`);
    if (toolboxReload.dashboard !== toolboxInteraction.sentinelBefore) failures.push('Toolbox reload changed the show dashboard sentinel.');
    if (toolboxReload.search !== 'projection' || toolboxReload.family !== 'video' || toolboxReload.pinned !== 'true') failures.push('Toolbox UI preferences did not survive reload.');

    /* A typed family URL is an effective, non-persisted browsing override.
       Unknown families fall back to the saved Toolbox state, and popstate
       recomputes the effective family without touching saved show/UI bytes. */
    const familySentinel = await evaluateValue(`(() => ({
      dashboard: localStorage.getItem('av-suite-dashboard.v1'),
      ui: localStorage.getItem('av-suite-ui.v1')
    }))()`);
    await navigate('av-suite.html?entry=toolbox&family=audio');
    const knownFamily = await evaluateValue(`(() => ({
      mode: document.getElementById('avApp').getAttribute('data-entry'),
      search: document.getElementById('toolboxSearchInput').value,
      family: document.getElementById('toolboxFamilySelect').value,
      allPressed: document.querySelector('[data-toolbox-filter="all"]').getAttribute('aria-pressed'),
      tools: Array.from(document.querySelectorAll('.toolbox-card a[data-tool]')).map((link) => link.getAttribute('data-tool')).sort(),
      expected: window.SBD_REGISTRY.consoleFamilies.find((family) => family.id === 'audio').toolIds.slice().sort(),
      dashboard: localStorage.getItem('av-suite-dashboard.v1'),
      ui: localStorage.getItem('av-suite-ui.v1')
    }))()`);
    if (knownFamily.mode !== 'toolbox' || knownFamily.search !== '' || knownFamily.family !== 'audio' || knownFamily.allPressed !== 'true') failures.push(`Known family URL did not establish the effective Toolbox state: ${JSON.stringify(knownFamily)}.`);
    if (JSON.stringify(knownFamily.tools) !== JSON.stringify(knownFamily.expected)) failures.push(`Known family URL displayed the wrong tools: ${JSON.stringify(knownFamily)}.`);
    if (knownFamily.dashboard !== familySentinel.dashboard || knownFamily.ui !== familySentinel.ui) failures.push('Known family URL mutated saved show or Toolbox preferences.');

    await navigate('av-suite.html?entry=toolbox&family=missing');
    const unknownFamily = await evaluateValue(`(() => ({
      search: document.getElementById('toolboxSearchInput').value,
      family: document.getElementById('toolboxFamilySelect').value,
      pinned: document.querySelector('[data-toolbox-filter="pinned"]').getAttribute('aria-pressed'),
      dashboard: localStorage.getItem('av-suite-dashboard.v1'),
      ui: localStorage.getItem('av-suite-ui.v1')
    }))()`);
    if (unknownFamily.search !== 'projection' || unknownFamily.family !== 'video' || unknownFamily.pinned !== 'true') failures.push(`Unknown family URL did not use the normal saved Toolbox fallback: ${JSON.stringify(unknownFamily)}.`);
    if (unknownFamily.dashboard !== familySentinel.dashboard || unknownFamily.ui !== familySentinel.ui) failures.push('Unknown family URL mutated saved show or Toolbox preferences.');

    await navigate('av-suite.html?entry=toolbox&family=audio');
    const familyHistory = await evaluateValue(`(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      history.pushState({ avEntry: 'toolbox' }, '', 'av-suite.html?entry=toolbox&family=video');
      dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      await wait(100);
      const pushed = document.getElementById('toolboxFamilySelect').value;
      history.back();
      await wait(180);
      const back = document.getElementById('toolboxFamilySelect').value;
      history.forward();
      await wait(180);
      const forward = document.getElementById('toolboxFamilySelect').value;
      return {
        pushed, back, forward,
        dashboard: localStorage.getItem('av-suite-dashboard.v1'),
        ui: localStorage.getItem('av-suite-ui.v1')
      };
    })()`, true);
    if (familyHistory.pushed !== 'video' || familyHistory.back !== 'audio' || familyHistory.forward !== 'video') failures.push(`Family URL history did not recompute effective browsing state: ${JSON.stringify(familyHistory)}.`);
    if (familyHistory.dashboard !== familySentinel.dashboard || familyHistory.ui !== familySentinel.ui) failures.push('Family Back/Forward mutated saved show or Toolbox preferences.');

    await navigate('av-suite.html?entry=frontoffice&family=audio');
    const frontOfficeFamily = await evaluateValue(`({
      context: document.querySelector('#shopOfficeView h2')?.textContent || '',
      toolboxControls: Boolean(document.getElementById('toolboxFamilySelect')),
      dashboard: localStorage.getItem('av-suite-dashboard.v1'),
      ui: localStorage.getItem('av-suite-ui.v1')
    })`);
    if (!frontOfficeFamily.context.startsWith('Front Office') || frontOfficeFamily.toolboxControls) failures.push(`Front Office incorrectly applied the Toolbox family override: ${JSON.stringify(frontOfficeFamily)}.`);
    if (frontOfficeFamily.dashboard !== familySentinel.dashboard || frontOfficeFamily.ui !== familySentinel.ui) failures.push('Front Office family URL mutated saved show or Toolbox preferences.');

    /* Exact external commands coexist with legacy tool aliases. Status-only
       products never become executable commands or valid command recents. */
    await navigate('av-suite.html?entry=toolbox#source-fragment');
    const externalCommands = await evaluateValue(`(() => {
      const ui = JSON.parse(localStorage.getItem('av-suite-ui.v1') || '{}');
      ui.toolboxCommandRecent = ['external:cueforge', 'external:arenaops', 'tool:cueforge', 'tool:plotforge'];
      localStorage.setItem('av-suite-ui.v1', JSON.stringify(ui));
      return true;
    })()`);
    if (!externalCommands) failures.push('Could not seed external command recent coverage.');
    await navigate('av-suite.html?entry=toolbox#source-fragment');
    const externalPool = await evaluateValue(`(() => {
      document.getElementById('searchBtn').click();
      const input = document.getElementById('commandInput');
      function query(value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return Array.from(document.querySelectorAll('[data-command-id]')).map((row) => ({
          id: row.getAttribute('data-command-id'),
          href: row.getAttribute('data-command-href') || ''
        }));
      }
      return {
        savedRecent: JSON.parse(localStorage.getItem('av-suite-ui.v1') || '{}').toolboxCommandRecent || [],
        recent: query(''),
        cueforge: query('CueForge'),
        plotforge: query('PlotForge'),
        cueSheet: query('Cue Sheet'),
        stageplotter: query('StagePlotter'),
        arenaops: query('Arena Ops')
      };
    })()`);
    if (!externalPool.cueforge.some((item) => item.id === 'external:cueforge' && item.href === 'https://systembydave.com/cueforge.html')) failures.push(`CueForge external command is missing or routed through the wrong destination: ${JSON.stringify(externalPool.cueforge)}.`);
    const plotForgeCommand = externalPool.plotforge.find((item) => item.id === 'external:plotforge');
    if (!plotForgeCommand || new URL(plotForgeCommand.href).pathname !== '/plotforge.html' || new URL(plotForgeCommand.href).search || new URL(plotForgeCommand.href).hash) failures.push(`PlotForge external command inherited source context/hash: ${JSON.stringify(externalPool.plotforge)}.`);
    if (!externalPool.cueSheet.some((item) => item.id === 'tool:cue-sheet') || !externalPool.stageplotter.some((item) => item.id === 'tool:stageplotter')) failures.push('Legacy CueForge/PlotForge tool aliases no longer resolve to Cue Sheet/StagePlotter commands.');
    if (externalPool.arenaops.some((item) => item.id === 'external:arenaops') || externalPool.recent.some((item) => item.id === 'external:arenaops')) failures.push('Status-only Arena Ops became an executable or recent command.');
    if (!externalPool.savedRecent.includes('external:cueforge') || !externalPool.savedRecent.includes('tool:cue-sheet') || !externalPool.savedRecent.includes('tool:stageplotter')) failures.push(`Valid typed/legacy command recents were not retained: ${JSON.stringify(externalPool.savedRecent)}.`);

    const externalExecution = await evaluateValue(`(() => {
      const dashboard = localStorage.getItem('av-suite-dashboard.v1');
      window.__externalCommandCapture = null;
      document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('a[data-external-command]');
        if (!link) return;
        event.preventDefault();
        window.__externalCommandCapture = {
          reference: link.getAttribute('data-external-command'),
          href: link.href
        };
      }, true);
      const input = document.getElementById('commandInput');
      input.value = 'CueForge';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-command-id="external:cueforge"]').click();
      const ui = JSON.parse(localStorage.getItem('av-suite-ui.v1') || '{}');
      return {
        capture: window.__externalCommandCapture,
        recent: ui.toolboxCommandRecent,
        dashboard,
        dashboardAfter: localStorage.getItem('av-suite-dashboard.v1')
      };
    })()`);
    if (externalExecution.capture?.reference !== 'external:cueforge' || externalExecution.capture?.href !== 'https://systembydave.com/cueforge.html') failures.push(`CueForge command did not execute its exact external route: ${JSON.stringify(externalExecution)}.`);
    if (externalExecution.recent?.[0] !== 'external:cueforge') failures.push(`Executed external command was not recorded with its typed ID: ${JSON.stringify(externalExecution.recent)}.`);
    if (externalExecution.dashboardAfter !== externalExecution.dashboard) failures.push('Toolbox external command mutated the saved show dashboard.');

    /* Addressing priority and Show Console context propagation. */
    await navigate('av-suite.html?entry=show&sbdShow=Probe%20Show&sbdVenue=Probe%20Hall&sbdDate=2026-08-31&sbdOperator=Probe&sbdPhase=show');
    const showContract = await evaluateValue(`(() => {
      const links = Array.from(document.querySelectorAll('#showView a[data-tool], #railWorkbookLink'));
      return {
        mode: document.getElementById('avApp').getAttribute('data-entry'),
        contextual: links.length && links.every((link) => {
          const url = new URL(link.href);
          return url.searchParams.get('sbdShow') === 'Probe Show' && url.searchParams.get('sbdVenue') === 'Probe Hall' && url.searchParams.get('sbdPhase') === 'show';
        })
      };
    })()`);
    if (showContract.mode !== 'show') failures.push('entry=show did not resolve to Show Console.');
    if (!showContract.contextual) failures.push('Show Console links no longer carry the explicit show context.');

    await navigate('av-suite.html?entry=toolbox&family=audio&sbdShow=Forced%20Show');
    const forcedShow = await evaluateValue(`document.getElementById('avApp').getAttribute('data-entry')`);
    if (forcedShow !== 'show') failures.push('Explicit sbd* context did not force Show Console over entry=toolbox.');

    /* Back/forward must replay the URL-selected workspace. */
    await navigate('av-suite.html?entry=show');
    const historyModes = await evaluateValue(`(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      document.getElementById('ctxShopBtn').click();
      await wait(80);
      const afterClick = document.getElementById('avApp').getAttribute('data-entry');
      history.back();
      await wait(140);
      const afterBack = document.getElementById('avApp').getAttribute('data-entry');
      history.forward();
      await wait(140);
      const afterForward = document.getElementById('avApp').getAttribute('data-entry');
      return { afterClick, afterBack, afterForward };
    })()`, true);
    if (historyModes.afterClick !== 'toolbox' || historyModes.afterBack !== 'show' || historyModes.afterForward !== 'toolbox') failures.push(`Back/forward entry restoration failed: ${JSON.stringify(historyModes)}.`);

    /* A neutral first visit opens Toolbox; the optional chooser keeps native keyboard doors. */
    await evaluateValue(`localStorage.removeItem('av-suite-ui.v1')`);
    await navigate('av-suite.html?neutral-probe=1');
    const neutral = await evaluateValue(`(() => ({
      mode: document.getElementById('avApp').getAttribute('data-entry'),
      chooserHidden: document.getElementById('entryChooser').hidden,
      onboardingHidden: document.getElementById('onboardOverlay').hidden
    }))()`);
    if (neutral.mode !== 'toolbox' || !neutral.chooserHidden || !neutral.onboardingHidden) failures.push(`Neutral entry did not open Toolbox directly: ${JSON.stringify(neutral)}.`);
    await evaluateValue(`document.getElementById('doorwayBtn').click()`);
    await delay(120);
    const chooser = await evaluateValue(`(() => {
      const dialog = document.querySelector('.entry-dialog');
      const dialogRect = dialog.getBoundingClientRect();
      return {
        visible: !document.getElementById('entryChooser').hidden,
        choices: Array.from(document.querySelectorAll('[data-entry-choice]')).map((button) => {
          const rect = button.getBoundingClientRect();
          return { tag: button.tagName, choice: button.getAttribute('data-entry-choice'), contained: rect.left >= dialogRect.left && rect.right <= dialogRect.right };
        }),
        activeChoice: document.activeElement && document.activeElement.getAttribute('data-entry-choice'),
        horizontalOverflow: dialog.scrollWidth - dialog.clientWidth
      };
    })()`);
    if (!chooser.visible || chooser.choices.length !== 2 || chooser.choices.some((choice) => choice.tag !== 'BUTTON' || !choice.contained) || chooser.activeChoice !== 'show' || chooser.horizontalOverflow > 1) failures.push(`Optional doorway chooser is not keyboard-ready and contained: ${JSON.stringify(chooser)}.`);
    if (screenshotsDir) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      const captured = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(screenshotsDir, 'hub-chooser-1280.png'), Buffer.from(captured.data, 'base64'));
    }
    await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'char', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await delay(120);
    const keyboardDoor = await evaluateValue(`document.getElementById('avApp').getAttribute('data-entry')`);
    if (keyboardDoor !== 'show') failures.push('Enter did not activate the focused Work a show doorway.');

    await navigate('av-suite.html?saved-doorway-probe=show');
    const savedShowDoor = await evaluateValue(`(() => ({
      mode: document.getElementById('avApp').getAttribute('data-entry'),
      chooserHidden: document.getElementById('entryChooser').hidden
    }))()`);
    if (savedShowDoor.mode !== 'toolbox' || !savedShowDoor.chooserHidden) failures.push(`Neutral visit after explicit Show selection did not open Toolbox: ${JSON.stringify(savedShowDoor)}.`);
    await evaluateValue(`(() => {
      document.getElementById('doorwayBtn').click();
      document.querySelector('[data-entry-choice="toolbox"]').click();
      return true;
    })()`);
    await navigate('av-suite.html?saved-doorway-probe=toolbox');
    const savedToolboxDoor = await evaluateValue(`(() => ({
      mode: document.getElementById('avApp').getAttribute('data-entry'),
      chooserHidden: document.getElementById('entryChooser').hidden
    }))()`);
    if (savedToolboxDoor.mode !== 'toolbox' || !savedToolboxDoor.chooserHidden) failures.push(`Neutral visit after explicit Toolbox selection did not open Toolbox: ${JSON.stringify(savedToolboxDoor)}.`);

    /* Reduced motion must snap to final state without an active tween. */
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate('av-suite.html?entry=toolbox');
    const reducedMotion = await evaluateValue(`(() => {
      const regions = Array.from(document.querySelectorAll('[data-workspace-region]')).filter((el) => getComputedStyle(el).display !== 'none');
      return {
        tweens: window.gsap ? window.gsap.getTweensOf(regions).length : 0,
        settled: regions.every((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none')
      };
    })()`);
    if (reducedMotion.tweens !== 0 || !reducedMotion.settled) failures.push(`Reduced-motion workspace did not render immediately: ${JSON.stringify(reducedMotion)}.`);
    await cdp('Emulation.setEmulatedMedia', { features: [] });

    ws.close();
  } finally {
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGTERM');
    await delay(750);
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill('SIGKILL');
      await delay(150);
    }
    await removeProfile(profile);
  }

  if (failures.length) {
    console.error('Responsive probe failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  console.log(`Responsive and AV Toolbox contract probe passed for ${targets.length} pages at ${widths.join('/')}px using ${baseUrl}.`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
