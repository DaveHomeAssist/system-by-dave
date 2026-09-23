(() => {
  'use strict';

  // Controller for the Shader camera-shading practice console. All pictures,
  // scopes and scores come from ShaderPracticeState; this file only renders
  // them and turns operator input into state intents. It makes no network
  // requests and talks to no equipment.

  const Practice = window.ShaderPracticeState;
  const Render = window.ShaderPracticeRender;
  const THEME_KEY = 'shader.practice.theme.v1';
  const SESSION_KEY = 'shader.practice.session.v1';
  const OFFLINE_CACHE_VERSION = 'v20260923-shader-practice-console';
  const DISPLAY = Object.freeze({ width: 96, height: 54 });
  const HISTORY_LIMIT = 100;
  const BLINK_INTERVAL = 700;
  const MAX_IMPORT_BYTES = 400000;
  const SCOPE_NAMES = Object.freeze({ waveform: 'Waveform', parade: 'RGB parade', vectorscope: 'Vectorscope', histogram: 'Histogram' });
  const UNIT_WORDS = Object.freeze({ stops: 'stops', dB: 'decibels', K: 'kelvin', '×': 'times', '°': 'degrees' });

  const byId = id => document.getElementById(id);
  const els = new Proxy({}, { get: (cache, id) => (cache[id] || (cache[id] = byId(id))) });
  const media = {
    compact: window.matchMedia('(max-width: 899px)'),
    medium: window.matchMedia('(max-width: 1279px)'),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
  };

  const ui = {
    layout: 'desktop', sideTab: 'exercise', view: 'shade', stepSize: 'fine',
    blinking: false, blinkShowing: 'reference', blinkTimer: null,
    activeControl: 'iris', lastChange: null, gesture: null,
    history: [], future: [],
    debrief: null, debriefKey: '', debriefTimer: null,
    renderQueued: false, canvasOk: true, storageOk: true, restored: false,
    toastTimer: null, saveTimer: null, announceTimer: null
  };

  const RELOAD_FLAG = 'shader.practice.reloaded';

  // An older offline cache can serve a stale engine or renderer next to a new
  // page. Let the updated worker take over, then reload once.
  function recoverFromMixedFiles() {
    const say = message => {
      ['offlineStatus', 'exerciseName'].forEach(id => { const node = byId(id); if (node) node.textContent = message; });
    };
    let reloaded = false;
    try { reloaded = window.sessionStorage.getItem(RELOAD_FLAG) === OFFLINE_CACHE_VERSION; } catch (error) { reloaded = false; }
    if (reloaded || !Practice) {
      say('Practice files did not finish loading. Reload this page; nothing here reads or controls real equipment.');
      return;
    }
    say('UPDATING PRACTICE FILES…');
    const reload = () => {
      try { window.sessionStorage.setItem(RELOAD_FLAG, OFFLINE_CACHE_VERSION); } catch (error) { /* reload once regardless */ }
      window.location.reload();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
      navigator.serviceWorker.register('./practice-worker.js').then(registration => registration.update()).catch(() => {});
    }
    setTimeout(reload, 3000);
  }

  if (!Practice || !Render || Practice.BUILD !== OFFLINE_CACHE_VERSION || Render.BUILD !== OFFLINE_CACHE_VERSION) {
    recoverFromMixedFiles();
    return;
  }

  // ---------- small helpers ----------

  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? '' : String(value));
    });
    children.flat().forEach(child => {
      if (child == null) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function svgIcon(path) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const shape = document.createElementNS(ns, 'path');
    shape.setAttribute('d', path);
    shape.setAttribute('fill', 'none');
    shape.setAttribute('stroke', 'currentColor');
    shape.setAttribute('stroke-width', '1.6');
    shape.setAttribute('stroke-linecap', 'round');
    shape.setAttribute('stroke-linejoin', 'round');
    svg.append(shape);
    return svg;
  }

  // Interleave spaces so adjacent inline parts never run together when read
  // aloud or copied ("CRIT Camera B…", not "CRITCamera B…").
  const spaced = (...parts) => parts.filter(part => part != null && part !== '').flatMap((part, index) => (index ? [' ', part] : [part]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const pct = value => Math.round(value * 100);
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  const setHidden = (node, hidden) => { if (node && node.hidden !== hidden) node.hidden = hidden; };
  const scenarioOf = current => Practice.SCENARIOS[current.scenarioId];
  const cameraLabel = id => (id === 'camera-a' ? 'Camera A' : 'Camera B');
  const cameraShort = id => (id === 'camera-a' ? 'CAM A' : 'CAM B');
  const formatValue = (name, value, options) => Practice.formatControl(name, value, options);
  const displayAnalysis = (sourceState, cameraId) => Practice.analyzeCamera(sourceState, cameraId, DISPLAY);
  const scoringMetrics = (sourceState, cameraId) => Practice.analyzeCamera(sourceState, cameraId).metrics;
  const isTyping = target => Boolean(target && target.matches && target.matches('input[type="text"], textarea, select'));

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { ui.storageOk = false; return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (error) { ui.storageOk = false; return false; }
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeBase64Url(value) {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
  }

  function sessionJSON(current) {
    return JSON.stringify({ kind: 'shader-camera-practice-session', schema: Practice.SCHEMA, schemaVersion: Practice.SCHEMA_VERSION, exportedAt: null, state: Practice.normalizeState(current) });
  }

  // ---------- initial state: link, then saved session, then default ----------

  function readUrlState() {
    const result = { state: null, explicit: false, error: '' };
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.has('state')) {
      result.explicit = true;
      try {
        result.state = Practice.importPracticeJSON(decodeBase64Url(hash.get('state')));
      } catch (error) {
        result.error = error.message || 'The link state could not be read.';
      }
      return result;
    }
    const params = new URLSearchParams(location.search);
    if (!['scenario', 'seed', 'camera', 'scope', 'split', 'compare', 'layout', 'demo', 'step'].some(key => params.has(key))) return result;
    result.explicit = true;
    let next = Practice.createPracticeState({
      scenarioId: params.get('scenario'), seed: params.get('seed'), selectedCameraId: params.get('camera'), scope: params.get('scope'),
      splitView: params.get('split') !== '0',
      view: { compare: params.get('compare') || undefined, scopeLayout: params.get('layout') || undefined }
    });
    if (params.get('demo')) {
      next = Practice.applyIntent(next, { type: 'start-demo', control: params.get('demo') });
      if (params.has('step')) next = Practice.applyIntent(next, { type: 'demo-goto', index: Number(params.get('step')) - 1 });
    }
    result.state = next;
    return result;
  }

  function readSession() {
    const raw = storageGet(SESSION_KEY);
    if (!raw) return null;
    try { return Practice.importPracticeJSON(raw); } catch (error) { return null; }
  }

  const urlState = readUrlState();
  const savedSession = urlState.explicit ? null : readSession();
  let state = urlState.state || savedSession || Practice.createPracticeState();
  ui.restored = Boolean(savedSession);

  // ---------- links ----------

  function pageUrl() {
    return new URL(location.pathname, location.origin);
  }

  function fullStateLink() {
    const url = pageUrl();
    url.hash = `state=${encodeBase64Url(sessionJSON(state))}`;
    return url.href;
  }

  function exerciseLink() {
    const url = pageUrl();
    url.searchParams.set('scenario', state.scenarioId);
    url.searchParams.set('seed', state.seed);
    url.searchParams.set('camera', state.selectedCameraId);
    url.searchParams.set('scope', state.scope);
    url.searchParams.set('split', state.splitView ? '1' : '0');
    url.searchParams.set('compare', state.view.compare);
    url.searchParams.set('layout', state.view.scopeLayout);
    return url.href;
  }

  // ---------- history (camera settings only) ----------

  function cameraSnapshot(current) {
    return { cameras: clone(current.cameras), injections: [...current.injections], injectionRecords: clone(current.injectionRecords), selectedCameraId: current.selectedCameraId, lastAction: current.lastAction };
  }
  const cameraSignature = current => JSON.stringify([current.cameras.map(camera => camera.controls), current.injections, current.injectionRecords]);

  function pushHistory(previous, coalesceKey) {
    const now = Date.now();
    if (coalesceKey && ui.gesture && ui.gesture.key === coalesceKey && now - ui.gesture.at < 1200) {
      ui.gesture.at = now;
      return;
    }
    ui.gesture = coalesceKey ? { key: coalesceKey, at: now } : null;
    ui.history.push(cameraSnapshot(previous));
    if (ui.history.length > HISTORY_LIMIT) ui.history.shift();
    ui.future = [];
  }

  function restoreSnapshot(snapshot, verb) {
    state = Practice.normalizeState({ ...state, ...snapshot, lastAction: `${verb}: ${snapshot.lastAction}` });
    ui.gesture = null;
    ui.lastChange = null;
    scheduleSave();
    renderNow();
    announce(`${verb}. ${state.lastAction}`);
  }

  function undo() {
    if (!ui.history.length) return;
    ui.future.push(cameraSnapshot(state));
    restoreSnapshot(ui.history.pop(), 'Undone');
  }

  function redo() {
    if (!ui.future.length) return;
    ui.history.push(cameraSnapshot(state));
    restoreSnapshot(ui.future.pop(), 'Redone');
  }

  // ---------- commit ----------

  function commit(next, options = {}) {
    const previous = state;
    state = next;
    if (options.resetHistory) {
      ui.history = [];
      ui.future = [];
      ui.gesture = null;
      ui.lastChange = null;
    } else if (options.history !== false && cameraSignature(previous) !== cameraSignature(next)) {
      pushHistory(previous, options.coalesce);
    }
    if (options.change) {
      const key = `${options.change.cameraId}:${options.change.control}`;
      const continuing = ui.lastChange && ui.lastChange.key === key && Date.now() - ui.lastChange.at < 1500;
      ui.lastChange = { key, cameraId: options.change.cameraId, control: options.change.control, before: continuing ? ui.lastChange.before : previous, at: Date.now() };
      ui.activeControl = options.change.control;
    }
    scheduleSave();
    scheduleRender();
  }

  function intent(action, options = {}) {
    commit(Practice.applyIntent(state, action), options);
  }

  function scheduleSave() {
    clearTimeout(ui.saveTimer);
    ui.saveTimer = setTimeout(saveSession, 350);
  }

  function saveSession() {
    clearTimeout(ui.saveTimer);
    storageSet(SESSION_KEY, sessionJSON(state));
  }

  // ---------- feedback ----------

  function toast(message, isError = false) {
    clearTimeout(ui.toastTimer);
    els.toast.textContent = message;
    els.toast.dataset.error = String(isError);
    els.toast.hidden = false;
    ui.toastTimer = setTimeout(() => { els.toast.hidden = true; }, isError ? 7000 : 4200);
  }

  function announce(message) {
    clearTimeout(ui.announceTimer);
    els.liveStatus.textContent = '';
    ui.announceTimer = setTimeout(() => { els.liveStatus.textContent = message; }, 60);
  }

  // ---------- static DOM ----------

  function unitLabel(info) {
    return info.unit ? (info.unit === 'stops' ? 'STOPS' : info.unit === 'dB' ? 'DB' : info.unit) : '';
  }

  function buildStaticDom() {
    Practice.scenarioList().forEach((scenario, index) => {
      els.exerciseList.append(h('li', {},
        h('button', { type: 'button', className: 'exercise', dataset: { scenario: scenario.id }, 'aria-current': 'false' },
          h('span', { className: 'exercise-index', 'aria-hidden': 'true', text: String(index + 1).padStart(2, '0') }),
          ...spaced(h('span', { className: 'exercise-title', text: scenario.title.toUpperCase() }),
            h('span', { className: 'exercise-brief', text: scenario.brief })))));
    });
    Practice.troubleshootingList().forEach(item => els.injectionSelect.append(h('option', { value: item.id, text: item.label })));
    Object.keys(Practice.CONTROL_LIMITS).forEach(name => els.demoControlSelect.append(h('option', { value: name, text: Practice.CONTROL_LABELS[name] })));
    const resetPath = 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4';
    Object.entries(Practice.CONTROL_LIMITS).forEach(([name, [min, max, precision]]) => {
      const info = Practice.CONTROL_INFO[name];
      const label = Practice.CONTROL_LABELS[name];
      const unitWord = UNIT_WORDS[info.unit];
      const reset = h('button', { type: 'button', className: 'reset-btn', dataset: { reset: name }, 'aria-label': `Reset ${label} to the exercise start`, title: `Reset ${label} to the exercise start` });
      reset.append(svgIcon(resetPath));
      els.controlList.append(h('div', { className: 'control-row', dataset: { control: name } },
        h('label', { className: 'control-name', for: `control-${name}`, text: label.toUpperCase() }),
        h('span', { className: 'control-unit', 'aria-hidden': 'true', text: unitLabel(info) }),
        h('input', { type: 'text', className: 'control-value', id: `value-${name}`, inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': `${label} value${unitWord ? ` in ${unitWord}` : ''}`, dataset: { valueFor: name } }),
        h('button', { type: 'button', className: 'step-btn', dataset: { step: '-1', control: name }, 'aria-label': `Decrease ${label}`, text: '−' }),
        h('input', { type: 'range', id: `control-${name}`, dataset: { control: name }, min, max, step: precision, 'aria-describedby': `help-${name}` }),
        h('button', { type: 'button', className: 'step-btn', dataset: { step: '1', control: name }, 'aria-label': `Increase ${label}`, text: '+' }),
        reset,
        h('span', { className: 'sr-only', id: `help-${name}`, text: `${info.summary} ${info.simulation} Arrow keys step ${formatValue(name, info.fine, { sign: false })}; Shift with an arrow or Page Up and Page Down step ${formatValue(name, info.coarse, { sign: false })}.` })));
    });
  }

  // ---------- control input ----------

  function selectedCamera() {
    return Practice.getCamera(state, state.selectedCameraId);
  }

  function setControl(control, value) {
    const cameraId = state.selectedCameraId;
    intent({ type: 'set-control', cameraId, control, value }, { coalesce: `${cameraId}:${control}`, change: { cameraId, control } });
  }

  function stepControl(control, direction, size) {
    const cameraId = state.selectedCameraId;
    intent({ type: 'step-control', cameraId, control, direction, size }, { coalesce: `${cameraId}:${control}`, change: { cameraId, control } });
  }

  function parseEntry(raw) {
    const cleaned = String(raw).trim().replace(/[−–—]/g, '-').replace(/[^0-9+\-.]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '+') return NaN;
    return Number(cleaned);
  }

  function commitValueInput(input) {
    const control = input.dataset.valueFor;
    const label = Practice.CONTROL_LABELS[control];
    const [min, max] = Practice.CONTROL_LIMITS[control];
    const number = parseEntry(input.value);
    if (!Number.isFinite(number)) {
      input.setAttribute('aria-invalid', 'true');
      toast(`Enter a number for ${label}, from ${formatValue(control, min)} to ${formatValue(control, max)}.`, true);
      input.value = formatValue(control, selectedCamera().controls[control], { unit: false });
      return;
    }
    input.removeAttribute('aria-invalid');
    setControl(control, number);
    const applied = selectedCamera().controls[control];
    input.value = formatValue(control, applied, { unit: false });
    if (number < min || number > max) toast(`${label} is limited to ${formatValue(control, min)} … ${formatValue(control, max)}; set to ${formatValue(control, applied)}.`);
    else if (Math.abs(applied - number) > 1e-9) toast(`${label} moves in steps of ${formatValue(control, Practice.CONTROL_LIMITS[control][2], { sign: false })}; set to ${formatValue(control, applied)}.`);
  }

  function bindControls() {
    els.controlList.addEventListener('input', event => {
      const control = event.target.dataset.control;
      if (event.target.type === 'range' && control) setControl(control, event.target.value);
    });
    els.controlList.addEventListener('keydown', event => {
      const target = event.target;
      if (target.type === 'range') {
        const directions = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 1, PageDown: -1 };
        if (!(event.key in directions)) return;
        event.preventDefault();
        const size = event.altKey ? 'fine' : (event.shiftKey || event.key.startsWith('Page')) ? 'coarse' : ui.stepSize;
        stepControl(target.dataset.control, directions[event.key], size);
      } else if (target.dataset.valueFor) {
        if (event.key === 'Enter') { event.preventDefault(); commitValueInput(target); }
        if (event.key === 'Escape') {
          target.removeAttribute('aria-invalid');
          target.value = formatValue(target.dataset.valueFor, selectedCamera().controls[target.dataset.valueFor], { unit: false });
        }
      }
    });
    els.controlList.addEventListener('change', event => {
      if (event.target.dataset.valueFor) commitValueInput(event.target);
    });
    els.controlList.addEventListener('focusin', event => {
      const row = event.target.closest('.control-row');
      if (row && row.dataset.control !== ui.activeControl) {
        ui.activeControl = row.dataset.control;
        scheduleRender();
      }
    });
    els.controlList.querySelectorAll('.step-btn').forEach(button => {
      let holdTimer = null;
      let repeatTimer = null;
      let repeated = false;
      const stop = () => { clearTimeout(holdTimer); clearInterval(repeatTimer); holdTimer = null; repeatTimer = null; };
      const step = coarse => stepControl(button.dataset.control, Number(button.dataset.step), coarse ? 'coarse' : ui.stepSize);
      button.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        repeated = false;
        holdTimer = setTimeout(() => {
          repeatTimer = setInterval(() => { repeated = true; step(event.shiftKey); }, 90);
        }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(type => button.addEventListener(type, stop));
      button.addEventListener('click', event => {
        if (repeated) { repeated = false; return; }
        step(event.shiftKey);
      });
    });
    els.controlList.querySelectorAll('.reset-btn').forEach(button => button.addEventListener('click', () => {
      const cameraId = state.selectedCameraId;
      intent({ type: 'reset-control', cameraId, control: button.dataset.reset }, { change: { cameraId, control: button.dataset.reset } });
      announce(state.lastAction);
    }));
  }

  // ---------- layout and navigation ----------

  function detectLayout() {
    return media.compact.matches ? 'compact' : media.medium.matches ? 'medium' : 'desktop';
  }

  const SIDE_TABS = ['control', 'exercise', 'score', 'demo'];
  const sideTabButton = tab => byId(`tab-${tab}`);
  const sidePanel = tab => (tab === 'control' ? els.controlPanel : byId(`panel-${tab}`));

  function setSideTab(tab, focusTab) {
    ui.sideTab = tab;
    applyVisibility();
    if (focusTab) sideTabButton(tab).focus();
    scheduleRender();
  }

  function setView(view) {
    ui.view = view;
    applyVisibility();
    scheduleRender();
  }

  function setRole(node, role, labelledBy) {
    if (role) {
      node.setAttribute('role', role);
      node.setAttribute('aria-labelledby', labelledBy);
    } else {
      node.removeAttribute('role');
    }
  }

  function applyVisibility() {
    ui.layout = detectLayout();
    const layout = ui.layout;
    document.body.dataset.layout = layout;
    document.body.dataset.view = ui.view;
    if (layout === 'desktop' && ui.sideTab === 'control') ui.sideTab = 'exercise';
    setHidden(sideTabButton('control'), layout !== 'medium');
    SIDE_TABS.forEach(tab => {
      const selected = ui.sideTab === tab;
      const button = sideTabButton(tab);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    const tabbed = layout !== 'compact';
    ['exercise', 'score', 'demo'].forEach(tab => {
      const panel = sidePanel(tab);
      setRole(panel, tabbed ? 'tabpanel' : null, tabbed ? `tab-${tab}` : `${tab === 'exercise' ? 'exerciseHeading' : tab === 'score' ? 'scoreHeading' : 'demoHeading'}`);
      if (!tabbed) panel.setAttribute('aria-labelledby', tab === 'exercise' ? 'exerciseHeading' : tab === 'score' ? 'scoreHeading' : 'demoHeading');
      setHidden(panel, tabbed ? ui.sideTab !== tab : ui.view !== tab);
    });
    if (layout === 'medium') setRole(els.controlPanel, 'tabpanel', 'tab-control');
    else { setRole(els.controlPanel, null); els.controlPanel.setAttribute('aria-labelledby', 'controlHeading'); }
    const showsVisual = !tabbed ? ui.view === 'shade' || ui.view === 'scopes' : true;
    setHidden(els.sideColumn, !tabbed && showsVisual);
    setHidden(els.monitorPanel, !showsVisual);
    setHidden(els.scopePanel, !showsVisual);
    setHidden(els.controlPanel, layout === 'compact' ? ui.view !== 'shade' : layout === 'medium' && ui.sideTab !== 'control');
    els.viewRail.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === ui.view)));
  }

  function bindNavigation() {
    els.sideTabs.addEventListener('click', event => {
      const button = event.target.closest('[data-side-tab]');
      if (button) setSideTab(button.dataset.sideTab, false);
    });
    els.sideTabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = SIDE_TABS.filter(tab => !sideTabButton(tab).hidden);
      const current = tabs.indexOf(ui.sideTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setSideTab(tabs[next], true);
    });
    els.viewRail.addEventListener('click', event => {
      const button = event.target.closest('[data-view]');
      if (button) setView(button.dataset.view);
    });
    els.openDebriefButton.addEventListener('click', () => {
      if (ui.layout === 'compact') setView('score');
      else setSideTab('score', false);
      els.scoreHeading.focus();
    });
    Object.values(media).forEach(query => {
      const listener = () => { applyVisibility(); scheduleRender(); };
      if (query.addEventListener) query.addEventListener('change', listener);
      else if (query.addListener) query.addListener(listener);
    });
  }

  // ---------- comparison controls ----------

  function stopBlink() {
    clearInterval(ui.blinkTimer);
    ui.blinkTimer = null;
    ui.blinking = false;
  }

  function toggleBlink() {
    if (media.reducedMotion.matches) {
      // Reduced motion: no automatic flashing. Each press swaps the picture.
      stopBlink();
      const next = state.view.compare === 'reference' ? 'target' : 'reference';
      intent({ type: 'set-compare', mode: next }, { history: false });
      announce(next === 'reference' ? 'Showing the reference picture. Press again for the target.' : 'Showing the target picture. Press again for the reference.');
      return;
    }
    if (ui.blinking) {
      stopBlink();
      announce('Blink comparison off.');
    } else {
      ui.blinking = true;
      ui.blinkShowing = 'reference';
      ui.blinkTimer = setInterval(() => {
        ui.blinkShowing = ui.blinkShowing === 'reference' ? 'target' : 'reference';
        renderMonitors(Practice.comparisonSources(state));
      }, BLINK_INTERVAL);
      announce('Blink comparison on: the monitor alternates reference and target. Press Blink again to stop.');
    }
    scheduleRender();
  }

  function bindComparison() {
    els.compareGroup.addEventListener('click', event => {
      const button = event.target.closest('[data-compare]');
      if (!button) return;
      stopBlink();
      intent({ type: 'set-compare', mode: button.dataset.compare }, { history: false });
    });
    els.blinkButton.addEventListener('click', toggleBlink);
    els.freezeButton.addEventListener('click', () => {
      if (state.demo) { toast('Freeze is for practice; a demonstration already holds its before picture.'); return; }
      intent({ type: state.view.freeze ? 'release-freeze' : 'freeze-reference' }, { history: false });
      announce(state.lastAction);
    });
    [['monitorSelectA', 'left'], ['monitorSelectB', 'right']].forEach(([id, slot]) => {
      els[id].addEventListener('click', () => {
        const sources = Practice.comparisonSources(state);
        const cameraId = sources[slot].cameraId;
        if (cameraId !== state.selectedCameraId) {
          intent({ type: 'select-camera', cameraId }, { history: false });
          announce(`${cameraLabel(cameraId)} selected for control.`);
        }
      });
    });
    els.wipeInput.addEventListener('input', () => intent({ type: 'set-wipe', value: Number(els.wipeInput.value) / 100 }, { history: false }));
    const screen = els.monitorWipe.querySelector('.monitor-screen');
    let dragging = false;
    const wipeFromPointer = event => {
      const rect = screen.getBoundingClientRect();
      const picture = Render.pictureRect(rect.width, rect.height);
      const position = (event.clientX - rect.left - picture.x) / picture.w;
      intent({ type: 'set-wipe', value: position }, { history: false });
    };
    screen.addEventListener('pointerdown', event => { dragging = true; screen.setPointerCapture(event.pointerId); wipeFromPointer(event); });
    screen.addEventListener('pointermove', event => { if (dragging) wipeFromPointer(event); });
    ['pointerup', 'pointercancel'].forEach(type => screen.addEventListener(type, () => { dragging = false; }));
    els.scopeTabs.addEventListener('click', event => {
      const button = event.target.closest('[data-scope]');
      if (button) intent({ type: 'set-scope', scope: button.dataset.scope }, { history: false });
    });
    els.scopeTabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const scopes = Practice.SCOPES;
      const current = scopes.indexOf(state.scope);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? scopes.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + scopes.length) % scopes.length;
      intent({ type: 'set-scope', scope: scopes[next] }, { history: false });
      renderNow();
      byId(`scopeTab-${scopes[next]}`).focus();
    });
    document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => intent({ type: 'set-scope-layout', layout: button.dataset.layout }, { history: false })));
    els.scopeGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-focus-scope]');
      if (!button) return;
      commit(Practice.applyIntent(Practice.applyIntent(state, { type: 'set-scope', scope: button.dataset.focusScope }), { type: 'set-scope-layout', layout: 'single' }), { history: false });
      renderNow();
      byId(`scopeTab-${button.dataset.focusScope}`).focus();
    });
  }

  // ---------- exercise, faults, score, demo ----------

  function bindTraining() {
    els.exerciseList.addEventListener('click', event => {
      const button = event.target.closest('[data-scenario]');
      if (!button) return;
      stopBlink();
      intent({ type: 'load-scenario', scenarioId: button.dataset.scenario }, { resetHistory: true });
      const scenario = scenarioOf(state);
      announce(`${scenario.title} loaded. ${scenario.objective}`);
    });
    els.applySeedButton.addEventListener('click', () => {
      intent({ type: 'set-seed', seed: els.seedInput.value }, { resetHistory: true });
      toast(`Seed applied: ${state.seed}. The exercise restarted from its start.`);
    });
    els.seedInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); els.applySeedButton.click(); } });
    els.replayButton.addEventListener('click', () => {
      intent({ type: 'replay' }, { resetHistory: true });
      toast('Exercise replayed from the same seed.');
    });
    els.injectButton.addEventListener('click', () => {
      intent({ type: 'inject-trouble', injectionId: els.injectionSelect.value, cameraId: 'camera-b' });
      toast(`${state.lastAction}. Revert it from the fault list, or undo.`);
      announce(state.lastAction);
    });
    els.revertFaultButton.addEventListener('click', () => {
      intent({ type: 'revert-injection' });
      announce(state.lastAction);
    });
    els.resetCameraButton.addEventListener('click', () => {
      intent({ type: 'reset-camera', cameraId: state.selectedCameraId });
      announce(state.lastAction);
    });
    els.undoButton.addEventListener('click', undo);
    els.redoButton.addEventListener('click', redo);
    document.querySelectorAll('[data-step-size]').forEach(button => button.addEventListener('click', () => {
      ui.stepSize = button.dataset.stepSize;
      scheduleRender();
    }));
    document.querySelectorAll('[data-camera-switch]').forEach(button => button.addEventListener('click', () => {
      intent({ type: 'select-camera', cameraId: button.dataset.cameraSwitch }, { history: false });
    }));
    els.scoreButton.addEventListener('click', scoreAttempt);
    els.startDemoButton.addEventListener('click', () => {
      stopBlink();
      intent({ type: 'start-demo', control: els.demoControlSelect.value }, { resetHistory: true });
      ui.activeControl = els.demoControlSelect.value;
      announce(`${state.demo.title}. ${state.lastAction}`);
    });
    els.captureFirstButton.addEventListener('click', () => {
      intent({ type: 'demo-capture', label: 'Starting point' }, { resetHistory: true });
      announce('Demonstration started from the current state.');
    });
    els.demoPrevButton.addEventListener('click', () => goToStep(state.demo.index - 1));
    els.demoNextButton.addEventListener('click', () => goToStep(state.demo.index + 1));
    els.demoStepList.addEventListener('click', event => {
      const button = event.target.closest('[data-demo-step]');
      if (button) goToStep(Number(button.dataset.demoStep));
    });
    document.querySelectorAll('[data-demo-compare]').forEach(button => button.addEventListener('click', () => intent({ type: 'demo-compare-with', value: button.dataset.demoCompare }, { history: false })));
    els.demoCaptureButton.addEventListener('click', () => {
      intent({ type: 'demo-capture', label: els.demoLabelInput.value, note: els.demoNoteInput.value }, { resetHistory: true });
      els.demoLabelInput.value = '';
      els.demoNoteInput.value = '';
      announce(state.lastAction);
    });
    els.demoUpdateButton.addEventListener('click', () => {
      intent({ type: 'demo-update-step', recapture: true, label: els.demoLabelInput.value || null, note: els.demoNoteInput.value }, { resetHistory: true });
      announce(state.lastAction);
    });
    els.demoRemoveButton.addEventListener('click', () => {
      intent({ type: 'demo-remove-step' }, { resetHistory: true });
      announce(state.lastAction);
    });
    els.exitDemoButton.addEventListener('click', () => {
      intent({ type: 'exit-demo' }, { resetHistory: true });
      announce(state.lastAction);
    });
    els.demoLinkButton.addEventListener('click', () => copyLink(fullStateLink(), 'Demonstration link copied. It replays every step exactly.'));
    els.demoExportButton.addEventListener('click', () => exportJSON('shader-demo'));
  }

  function goToStep(index) {
    if (!state.demo) return;
    intent({ type: 'demo-goto', index }, { resetHistory: true });
    announce(state.lastAction);
  }

  function scoreAttempt() {
    intent({ type: 'score-check' }, { history: false });
    const check = state.checks[state.checks.length - 1];
    const evaluation = Practice.evaluatePractice(state);
    els.scoreButton.disabled = true;
    setText(els.scoreSummary, `Scoring check ${check.n}…`);
    if (ui.layout === 'desktop') ui.sideTab = 'score';
    if (ui.layout === 'compact') ui.view = 'score';
    applyVisibility();
    clearTimeout(ui.debriefTimer);
    // Let the button state paint before the heavier debrief runs.
    ui.debriefTimer = setTimeout(() => {
      ui.debriefTimer = null;
      try {
        computeDebrief();
      } finally {
        els.scoreButton.disabled = false;
        renderNow();
      }
      if (ui.layout === 'compact') els.scoreHeading.focus();
      announce(`Check ${check.n} scored ${evaluation.score} of 100. ${ui.debrief && ui.debrief.next ? ui.debrief.next.message : ''}`);
    }, 30);
  }

  const debriefKey = current => JSON.stringify([current.scenarioId, current.seed, current.attempt, current.checks, current.cameras.map(camera => camera.source)]);

  function computeDebrief() {
    const key = debriefKey(state);
    if (key === ui.debriefKey) return ui.debrief;
    ui.debrief = Practice.debriefPractice(state);
    ui.debriefKey = key;
    return ui.debrief;
  }

  // ---------- share, import, export ----------

  async function copyText(text) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  function openShare(message) {
    els.shareLinkField.value = fullStateLink();
    els.shareStatus.textContent = message || '';
    els.importError.hidden = true;
    if (typeof els.shareDialog.showModal === 'function') {
      if (!els.shareDialog.open) els.shareDialog.showModal();
    } else {
      els.shareDialog.setAttribute('open', '');
    }
    if (message) { els.shareLinkField.focus(); els.shareLinkField.select(); } else els.copyLinkButton.focus();
  }

  function closeShare() {
    if (typeof els.shareDialog.close === 'function' && els.shareDialog.open) els.shareDialog.close();
    else els.shareDialog.removeAttribute('open');
    els.shareButton.focus();
  }

  async function copyLink(link, successMessage) {
    if (await copyText(link)) {
      toast(successMessage);
      if (els.shareDialog.open) els.shareStatus.textContent = successMessage;
      return true;
    }
    const manual = 'Copy is blocked in this browser. The link is selected below: press Ctrl+C (⌘C on Mac) to copy it.';
    openShare(manual);
    els.shareLinkField.value = link;
    els.shareLinkField.select();
    return false;
  }

  function exportJSON(prefix = 'shader-practice') {
    try {
      const blob = new Blob([Practice.exportPracticeJSON(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = h('a', { href: url, download: `${prefix}-${state.scenarioId}-${state.seed.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40)}.json` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Practice JSON exported. It can be imported here or replayed from its link.');
    } catch (error) {
      toast('Export is unavailable in this browser. Use the full-state link instead.', true);
    }
  }

  function importState(next, message) {
    stopBlink();
    commit(next, { resetHistory: true });
    toast(message);
    announce(message);
  }

  async function importFile(file) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('That file is too large to be a practice session.');
      importState(Practice.importPracticeJSON(await file.text()), 'Practice JSON imported.');
      closeShare();
    } catch (error) {
      els.importError.textContent = `Import failed: ${error.message}`;
      els.importError.hidden = false;
      toast(`Import failed: ${error.message}`, true);
    } finally {
      els.fileInput.value = '';
    }
  }

  function bindShare() {
    els.shareButton.addEventListener('click', () => openShare());
    els.closeShareButton.addEventListener('click', closeShare);
    els.shareDialog.addEventListener('click', event => { if (event.target === els.shareDialog) closeShare(); });
    els.copyLinkButton.addEventListener('click', () => copyLink(fullStateLink(), 'Full-state link copied. It reproduces this exact session.'));
    els.copyShortLinkButton.addEventListener('click', () => copyLink(exerciseLink(), 'Exercise link copied. It reopens this exercise, seed and view from the start.'));
    els.exportButton.addEventListener('click', () => exportJSON());
    els.importButton.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', () => importFile(els.fileInput.files && els.fileInput.files[0]));
  }

  // ---------- theme ----------

  function setTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    els.themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#04080c' : '#f4f6f8');
    if (persist) storageSet(THEME_KEY, theme);
  }

  // ---------- rendering ----------

  function scheduleRender() {
    if (ui.renderQueued) return;
    ui.renderQueued = true;
    window.requestAnimationFrame(() => {
      if (!ui.renderQueued) return;
      ui.renderQueued = false;
      render();
    });
  }

  function renderNow() {
    ui.renderQueued = false;
    render();
  }

  function render() {
    const scenario = scenarioOf(state);
    const evaluation = Practice.evaluatePractice(state);
    const alerts = Practice.signalAlerts(state);
    const sources = Practice.comparisonSources(state);
    applyVisibility();
    renderStatus(scenario, evaluation, alerts);
    renderExercise(scenario, evaluation, alerts);
    renderControls(scenario);
    renderMonitors(sources);
    renderScopes(sources);
    renderNotes(sources);
    renderScore(evaluation);
    renderDemo();
  }

  function levelFor(status) {
    return status === 'complete' ? 'OK' : status === 'close' ? 'WARN' : 'CRIT';
  }

  function renderStatus(scenario, evaluation, alerts) {
    // During a demonstration the practice is parked; the DEMO badge replaces
    // its status word so a matched baseline never reads as a completed exercise.
    const status = Practice.exerciseStatus(state);
    els.exerciseStatus.dataset.level = status;
    setText(els.exerciseStatus, status);
    setHidden(els.exerciseStatus, Boolean(state.demo));
    const index = Practice.scenarioList().findIndex(item => item.id === scenario.id) + 1;
    setText(els.exerciseName, `${String(index).padStart(2, '0')} · ${scenario.title.toUpperCase()}`);
    const current = Practice.workflowSteps(state).find(step => step.current);
    setText(els.statusNext, current ? `Next: ${current.label.toLowerCase()}` : '');
    setHidden(els.statusDemo, !state.demo);
    if (state.demo) setText(els.statusDemoText, `Step ${state.demo.index + 1} of ${state.demo.steps.length} · ${state.demo.steps[state.demo.index].label}`);
    const shown = alerts.length ? alerts.slice(0, 2) : [{ level: 'OK', title: 'No simulated signal alerts', detail: '' }];
    els.statusAlerts.replaceChildren(...shown.map(alert => h('li', {}, ...spaced(
      h('span', { className: 'pill', dataset: { level: alert.level }, text: alert.level }),
      h('span', { text: alert.title }),
      alert.detail ? h('span', { className: 'alert-detail', text: alert.detail }) : null))));
    if (alerts.length > 2) els.statusAlerts.append(h('li', { text: `+${alerts.length - 2} more in Exercise` }));
    els.undoButton.disabled = !ui.history.length;
    els.redoButton.disabled = !ui.future.length;
    els.revertFaultButton.disabled = !state.injections.length;
    els.freezeButton.disabled = Boolean(state.demo);
  }

  function renderExercise(scenario, evaluation, alerts) {
    els.exerciseList.querySelectorAll('[data-scenario]').forEach(button => button.setAttribute('aria-current', String(button.dataset.scenario === state.scenarioId)));
    setText(els.objectiveText, `${scenario.brief} ${scenario.objective}`);
    setText(els.passRule, `PASS: SCORE ≥ ${Practice.PASS_RULE.score} AND EVERY OBJECTIVE OK (≥ ${Practice.PASS_RULE.objective})`);
    const bands = Practice.progressBands(evaluation);
    els.objectiveList.replaceChildren(...bands.map(item => h('li', {}, ...spaced(
      h('span', { className: 'objective-name', text: item.label }),
      h('span', { className: 'pill', dataset: { level: item.band }, text: item.band }),
      h('span', { className: 'objective-help', text: item.explanation })))));
    els.workflowList.replaceChildren(...Practice.workflowSteps(state).map(step => h('li', { dataset: { state: step.current ? 'current' : step.done ? 'done' : 'todo' }, 'aria-current': step.current ? 'step' : null }, ...spaced(
      h('span', { text: step.label }),
      h('span', { className: 'flow-mark', text: step.current ? 'NOW' : step.done ? 'DONE' : '' })))));
    els.alertList.replaceChildren(...(alerts.length ? alerts : [{ level: 'OK', title: 'No simulated signal alerts.', detail: 'Clipping, crushed blacks, high gain and a moved reference would be listed here.' }]).map(alert => h('li', {}, ...spaced(
      h('span', { className: 'pill', dataset: { level: alert.level }, text: alert.level }),
      h('span', { text: alert.title }),
      alert.detail ? h('span', { className: 'alert-detail', text: alert.detail }) : null))));
    if (document.activeElement !== els.seedInput) els.seedInput.value = state.seed;
    setText(els.stateIdentity, `${Practice.SCHEMA} · seed ${state.seed} · attempt ${state.attempt}`);
    const faults = state.injections.map(id => Practice.TROUBLESHOOTING[id].label);
    els.faultList.replaceChildren(...(faults.length ? faults.map(label => h('li', {}, ...spaced(h('span', { className: 'pill', dataset: { level: 'WARN' }, text: 'FAULT' }), h('span', { text: `${label} on Camera B` })))) : [h('li', { className: 'hint', text: 'No faults injected.' })]));
  }

  function renderControls(scenario) {
    const camera = selectedCamera();
    const isReference = camera.id === scenario.referenceCameraId;
    document.querySelectorAll('[data-camera-switch]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cameraSwitch === camera.id)));
    els.camDotA.dataset.tally = scenario.referenceCameraId === 'camera-a' ? 'pgm' : 'pvw';
    els.camDotB.dataset.tally = scenario.referenceCameraId === 'camera-b' ? 'pgm' : 'pvw';
    setText(els.camRoleA, scenario.referenceCameraId === 'camera-a' ? 'REF · SIM PGM' : 'TGT · SIM PVW');
    setText(els.camRoleB, scenario.referenceCameraId === 'camera-b' ? 'REF · SIM PGM' : 'TGT · SIM PVW');
    const target = state.demo
      ? `→ ${cameraShort(camera.id)} · DEMO STEP ${state.demo.index + 1}`
      : isReference ? `→ ${cameraShort(camera.id)} · REFERENCE ON SIM PGM` : `→ ${cameraShort(camera.id)} · TARGET`;
    setText(els.controlTarget, target);
    els.controlTarget.style.color = isReference && !state.demo ? 'var(--state-warn)' : '';
    document.querySelectorAll('[data-step-size]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stepSize === ui.stepSize)));
    Object.keys(Practice.CONTROL_LIMITS).forEach(name => {
      const value = camera.controls[name];
      const range = byId(`control-${name}`);
      const input = byId(`value-${name}`);
      if (Number(range.value) !== value) range.value = String(value);
      range.setAttribute('aria-valuetext', formatValue(name, value));
      if (document.activeElement !== input) {
        input.value = formatValue(name, value, { unit: false });
        input.removeAttribute('aria-invalid');
      }
      const [min, max] = Practice.CONTROL_LIMITS[name];
      els.controlList.querySelectorAll(`[data-control="${name}"].step-btn`).forEach(button => {
        button.disabled = Number(button.dataset.step) < 0 ? value <= min : value >= max;
      });
      range.closest('.control-row').dataset.active = String(name === ui.activeControl);
    });
  }

  function roleLabels(source, sources) {
    if (sources.mode === 'demo') {
      return { tag: `${source.role === 'before' ? 'BEFORE' : 'AFTER'} · STEP ${source.stepIndex + 1}`, spoken: `${source.role === 'before' ? 'Before' : 'After'}, demonstration step ${source.stepIndex + 1}, ${source.stepLabel}` };
    }
    if (source.role === 'reference') {
      return source.frozen
        ? { tag: `REF STILL · ${cameraShort(source.cameraId)}`, spoken: `Reference still of ${cameraLabel(source.cameraId)}` }
        : { tag: `REF · ${cameraShort(source.cameraId)}`, spoken: `Reference ${cameraLabel(source.cameraId)}` };
    }
    return { tag: `TGT · ${cameraShort(source.cameraId)}`, spoken: `Target ${cameraLabel(source.cameraId)}` };
  }

  function metricsLine(metrics) {
    return `BLACK ${pct(metrics.black)} · MID ${pct(metrics.mid)} · PEAK ${pct(metrics.peak)} · CLIP ${metrics.clippedPercent.toFixed(1)}%`;
  }

  function monitorSlots(sources) {
    if (ui.blinking) return { single: true, slots: [['left', ui.blinkShowing === 'reference' ? sources.left : sources.right]] };
    const compare = state.view.compare;
    if (compare === 'wipe') return { single: true, wipe: true, slots: [] };
    if (compare === 'reference') return { single: true, slots: [['left', sources.left]] };
    if (compare === 'target') return { single: true, slots: [['left', sources.right]] };
    return { single: false, slots: [['left', sources.left], ['right', sources.right]] };
  }

  function showCanvasFallback(canvas, message) {
    const screen = canvas.parentElement;
    let fallback = screen.querySelector('.canvas-fallback');
    if (!fallback) {
      fallback = h('p', { className: 'canvas-fallback' });
      screen.append(fallback);
    }
    setText(fallback, message);
  }

  function renderMonitor(slot, source, sources) {
    const suffix = slot === 'left' ? 'A' : 'B';
    const figure = slot === 'left' ? els.monitorLeft : els.monitorRight;
    const canvas = byId(`cameraCanvas${suffix}`);
    const analysis = displayAnalysis(source.state, source.cameraId);
    const metrics = scoringMetrics(source.state, source.cameraId);
    const labels = roleLabels(source, sources);
    const scenario = scenarioOf(state);
    const tally = sources.mode === 'demo' || source.frozen ? '' : source.cameraId === scenario.referenceCameraId ? 'pgm' : 'pvw';
    figure.dataset.role = source.role;
    figure.dataset.tally = tally;
    setText(byId(`roleTag${suffix}`), labels.tag);
    const tallyTag = byId(`tallyTag${suffix}`);
    setHidden(tallyTag, !tally);
    tallyTag.dataset.tally = tally;
    setText(tallyTag, tally === 'pgm' ? 'SIM PGM' : 'SIM PVW');
    setHidden(byId(`controlTag${suffix}`), source.cameraId !== state.selectedCameraId || source.frozen || (sources.mode === 'demo' && source.role === 'before'));
    const select = byId(`monitorSelect${suffix}`);
    setHidden(select, ui.blinking || source.frozen);
    select.setAttribute('aria-label', `Control ${cameraLabel(source.cameraId)}`);
    const alertTag = byId(`alertTag${suffix}`);
    const warning = metrics.clippedPercent >= 0.5 ? `CLIP ${metrics.clippedPercent.toFixed(1)}%` : metrics.crushedPercent >= 0.5 ? `CRUSH ${metrics.crushedPercent.toFixed(1)}%` : '';
    setHidden(alertTag, !warning);
    setText(alertTag, warning);
    setText(byId(`readout${suffix}`), metricsLine(metrics));
    canvas.setAttribute('aria-label', `${labels.spoken}: generated picture. Black ${pct(metrics.black)}, midtone ${pct(metrics.mid)}, peak ${pct(metrics.peak)} on the generated 0 to 100 scale, ${metrics.clippedPercent.toFixed(1)} percent clipped.`);
    const drawn = Render.drawPicture(canvas, analysis);
    if (!drawn && !Render.canvasAvailable()) {
      ui.canvasOk = false;
      showCanvasFallback(canvas, 'Pictures need canvas, which this browser blocked. Readouts, scores and coaching still work.');
    }
  }

  function renderMonitors(sources) {
    const layout = monitorSlots(sources);
    const wall = els.monitorWall;
    wall.dataset.compare = state.view.compare;
    wall.dataset.single = String(layout.single);
    setHidden(els.monitorWipe, !layout.wipe);
    setHidden(els.monitorLeft, layout.wipe || !layout.slots.some(([slot]) => slot === 'left'));
    setHidden(els.monitorRight, layout.wipe || !layout.slots.some(([slot]) => slot === 'right'));
    document.querySelectorAll('[data-compare]').forEach(button => button.setAttribute('aria-pressed', String(!ui.blinking && button.dataset.compare === state.view.compare)));
    els.blinkButton.setAttribute('aria-pressed', String(ui.blinking));
    setText(els.blinkButton, media.reducedMotion.matches ? 'FLIP A/B' : 'BLINK A/B');
    els.freezeButton.setAttribute('aria-pressed', String(Boolean(state.view.freeze)));
    setText(els.freezeButton, state.view.freeze ? 'RELEASE STILL' : 'FREEZE REF');
    fitMonitorWall(layout);
    if (layout.wipe) {
      const left = roleLabels(sources.left, sources);
      const right = roleLabels(sources.right, sources);
      setText(els.wipeTagLeft, `◀ ${left.tag}`);
      setText(els.wipeTagRight, `${right.tag} ▶`);
      if (document.activeElement !== els.wipeInput) els.wipeInput.value = String(Math.round(state.view.wipe * 100));
      els.wipeInput.setAttribute('aria-valuetext', `${Math.round(state.view.wipe * 100)} percent reference on the left`);
      els.wipeCanvas.setAttribute('aria-label', `Wipe comparison: ${left.spoken} on the left, ${right.spoken} on the right.`);
      const drawn = Render.drawWipe(els.wipeCanvas, displayAnalysis(sources.left.state, sources.left.cameraId), displayAnalysis(sources.right.state, sources.right.cameraId), state.view.wipe);
      if (!drawn && !Render.canvasAvailable()) { ui.canvasOk = false; showCanvasFallback(els.wipeCanvas, 'The wipe needs canvas, which this browser blocked.'); }
    }
    layout.slots.forEach(([slot, source]) => renderMonitor(slot, source, sources));
    setText(els.compareCaption, compareCaption(sources, layout));
  }

  function compareCaption(sources, layout) {
    if (sources.mode === 'demo') return `Before (step ${sources.left.stepIndex + 1}) and after (step ${sources.right.stepIndex + 1}), both ${cameraLabel(sources.right.cameraId)}.`;
    if (ui.blinking) return `Blinking: ${ui.blinkShowing === 'reference' ? 'reference' : 'target'} shown; the picture alternates every 0.7 s.`;
    if (layout.wipe) return 'Wipe: reference on the left, target on the right. Drag the picture or use the wipe slider.';
    const reference = sources.left.frozen ? `A stored still of ${cameraLabel(sources.left.cameraId)} is the reference; scores still compare the live cameras.` : `${cameraLabel(sources.left.cameraId)} is the reference on simulated program (SIM PGM).`;
    if (state.view.compare === 'reference') return `${reference} Showing the reference only.`;
    if (state.view.compare === 'target') return `Showing target ${cameraLabel(sources.right.cameraId)} only, on simulated preview (SIM PVW).`;
    return `${reference} ${cameraLabel(sources.right.cameraId)} is the target on simulated preview (SIM PVW).`;
  }

  // Size the multiviewer so 16:9 pictures fill their tiles; the rest of the
  // column goes to the scopes.
  function fitMonitorWall(layout) {
    const wall = els.monitorWall;
    if (ui.layout === 'compact' || els.monitorPanel.hidden) {
      wall.style.removeProperty('--wall-height');
      wall.dataset.arrangement = 'row';
      return;
    }
    const center = els.monitorPanel.parentElement;
    const sideBySide = window.getComputedStyle(center).display === 'grid';
    const width = wall.clientWidth || els.monitorPanel.clientWidth;
    const count = layout.single ? 1 : 2;
    if (sideBySide) {
      wall.style.removeProperty('--wall-height');
      const height = wall.clientHeight || center.clientHeight;
      const rowWidth = Math.min((width - 8) / count, (height - 24) * 16 / 9);
      const columnWidth = Math.min(width, ((height - 8) / count - 24) * 16 / 9);
      wall.dataset.arrangement = count === 2 && columnWidth > rowWidth ? 'column' : 'row';
      return;
    }
    wall.dataset.arrangement = 'row';
    const tileWidth = (width - (count - 1) * 8) / count;
    const ideal = tileWidth * 9 / 16 + 4 + 20 + (layout.wipe ? 48 : 0);
    const bar = els.monitorPanel.querySelector('.panel-bar').offsetHeight + 60;
    const limit = Math.max(140, center.clientHeight * 0.56 - bar);
    wall.style.setProperty('--wall-height', `${Math.round(Math.min(ideal, limit))}px`);
  }

  function scopeSeries(sources) {
    const series = [];
    const compare = ui.blinking ? 'side' : state.view.compare;
    if (compare !== 'target') series.push({ slot: 0, source: sources.left, analysis: displayAnalysis(sources.left.state, sources.left.cameraId), metrics: scoringMetrics(sources.left.state, sources.left.cameraId) });
    if (compare !== 'reference') series.push({ slot: 1, source: sources.right, analysis: displayAnalysis(sources.right.state, sources.right.cameraId), metrics: scoringMetrics(sources.right.state, sources.right.cameraId) });
    return series;
  }

  function seriesName(entry, sources) {
    return roleLabels(entry.source, sources).tag;
  }

  function scopeData(kind, series, sources) {
    const first = series.find(entry => entry.slot === 0);
    const second = series.find(entry => entry.slot === 1);
    const data = { series: series.map(entry => ({ slot: entry.slot, analysis: entry.analysis, metrics: entry.metrics })) };
    const targetLabel = sources.mode === 'demo' ? 'BEFORE' : 'REF';
    if (first && (kind === 'waveform')) data.targets = { label: targetLabel, black: first.metrics.black, peak: first.metrics.peak };
    const watched = second || first;
    if (watched && watched.metrics.clippedPercent > 0) data.clipText = `CLIP ${watched.metrics.clippedPercent.toFixed(1)}% ${second ? (sources.mode === 'demo' ? 'AFTER' : 'TGT') : targetLabel}`;
    if (watched && watched.metrics.crushedPercent > 0) data.crushText = `CRUSH ${watched.metrics.crushedPercent.toFixed(1)}%`;
    if (kind === 'vectorscope' && first && second) {
      const delta = Math.abs(first.metrics.hue - second.metrics.hue);
      data.hueText = `HUE Δ ${Math.round(Math.min(delta, 360 - delta))}°`;
    }
    return data;
  }

  function scopeSummary(kind, series, sources) {
    const part = entry => {
      const name = roleLabels(entry.source, sources).spoken;
      const m = entry.metrics;
      if (kind === 'parade') return `${name}: channel means red ${pct(m.rgbMean[0])}, green ${pct(m.rgbMean[1])}, blue ${pct(m.rgbMean[2])}`;
      if (kind === 'vectorscope') return `${name}: average hue ${Math.round(m.hue)} degrees, chroma amplitude ${pct(m.saturation)}`;
      if (kind === 'histogram') return `${name}: ${m.clippedPercent.toFixed(1)} percent clipped, ${m.crushedPercent.toFixed(1)} percent crushed`;
      return `${name}: black ${pct(m.black)}, midtone ${pct(m.mid)}, peak ${pct(m.peak)}`;
    };
    return `${SCOPE_NAMES[kind]}. ${series.map(part).join('. ')}. Generated practice signal, not a measurement.`;
  }

  function renderLegend(kind, series, sources) {
    const legend = byId(`legend-${kind}`);
    const items = series.map(entry => {
      const swatch = h('span', { className: 'swatch', 'aria-hidden': 'true' });
      const rgb = Render.SERIES[entry.slot];
      swatch.style.background = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      return h('span', {}, swatch, kind === 'parade' && entry.slot === 1 ? `${seriesName(entry, sources)} IN R G B` : `${seriesName(entry, sources)}${entry.slot === 0 && series.length > 1 ? ' (GHOST)' : ''}`);
    });
    legend.replaceChildren(...items);
  }

  function arrangeQuad(grid) {
    const width = grid.clientWidth;
    const height = grid.clientHeight;
    if (width < 520 || ui.layout === 'compact') return 'stack';
    if (height > 0 && width / height > 2.4) return 'row';
    return 'grid';
  }

  function renderScopes(sources) {
    if (els.scopePanel.hidden) return;
    const miniView = ui.layout === 'compact' && ui.view === 'shade';
    const layout = miniView ? 'single' : state.view.scopeLayout;
    const grid = els.scopeGrid;
    grid.dataset.layout = layout;
    document.querySelectorAll('[data-layout]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layout === state.view.scopeLayout)));
    setHidden(els.scopeTabs, layout === 'quad');
    if (layout === 'quad') grid.dataset.arrangement = arrangeQuad(grid);
    const series = scopeSeries(sources);
    // Settle every figure's visibility before measuring any canvas.
    const visibleKinds = Practice.SCOPES.filter(kind => {
      const tab = byId(`scopeTab-${kind}`);
      const selected = state.scope === kind;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const figure = byId(`scopeFigure-${kind}`);
      const visible = layout === 'quad' || selected;
      setHidden(figure, !visible);
      if (layout === 'quad') { figure.removeAttribute('role'); figure.removeAttribute('aria-labelledby'); }
      else { figure.setAttribute('role', 'tabpanel'); figure.setAttribute('aria-labelledby', `scopeTab-${kind}`); }
      return visible;
    });
    visibleKinds.forEach(kind => {
      const canvas = byId(`scopeCanvas-${kind}`);
      canvas.setAttribute('aria-label', scopeSummary(kind, series, sources));
      renderLegend(kind, series, sources);
      const drawn = Render.drawScope(canvas, kind, scopeData(kind, series, sources));
      if (!drawn && !Render.canvasAvailable()) { ui.canvasOk = false; showCanvasFallback(canvas, 'Scopes need canvas, which this browser blocked. The readouts below the monitors still reflect the generated signal.'); }
    });
  }

  function changeSummary(control, before, after, reference) {
    if (control === 'whiteBalance') return `R/G/B ${before.rgbMean.map(pct).join('/')} → ${after.rgbMean.map(pct).join('/')} (REF ${reference.rgbMean.map(pct).join('/')})`;
    if (control === 'saturation') return `CHROMA ${pct(before.saturation)} → ${pct(after.saturation)} (REF ${pct(reference.saturation)})`;
    if (control === 'colorPhase') return `HUE ${Math.round(before.hue)}° → ${Math.round(after.hue)}° (REF ${Math.round(reference.hue)}°)`;
    return `BLACK ${pct(before.black)} → ${pct(after.black)} · MID ${pct(before.mid)} → ${pct(after.mid)} · PEAK ${pct(before.peak)} → ${pct(after.peak)} · CLIP ${after.clippedPercent.toFixed(1)}% (REF ${pct(reference.black)}/${pct(reference.mid)}/${pct(reference.peak)})`;
  }

  function renderNotes(sources) {
    const control = ui.activeControl;
    const info = Practice.CONTROL_INFO[control];
    const label = Practice.CONTROL_LABELS[control];
    setText(els.controlNotesTitle, label.toUpperCase());
    setText(els.controlNotesSummary, info.summary);
    setText(els.controlNotesSimulation, info.simulation);
    setText(els.controlNotesCaveat, `Caveat: ${info.caveat}`);
    const arrow = ui.stepSize === 'coarse' ? info.coarse : info.fine;
    setText(els.controlNotesKeys, `KEYS: ←/→ ${formatValue(control, arrow, { sign: false })} (${ui.stepSize.toUpperCase()}) · SHIFT+←/→ OR PAGE UP/DOWN ${formatValue(control, info.coarse, { sign: false })} · ALT+←/→ ${formatValue(control, info.fine, { sign: false })} · ⌘/CTRL+Z UNDO`);
    const change = ui.lastChange;
    if (!change || change.control !== control) {
      setText(els.causeEffect, `Adjust ${label.toLowerCase()} to see its effect on the ${info.scope === 'parade' ? 'RGB parade' : info.scope} here.`);
      return;
    }
    const before = scoringMetrics(change.before, change.cameraId);
    const after = scoringMetrics(state, change.cameraId);
    const reference = scoringMetrics(sources.left.state, sources.left.cameraId);
    const from = Practice.getCamera(change.before, change.cameraId).controls[control];
    const to = Practice.getCamera(state, change.cameraId).controls[control];
    setText(els.causeEffect, `LAST CHANGE · ${cameraShort(change.cameraId)} ${label.toUpperCase()} ${formatValue(control, from)} → ${formatValue(control, to)} · ${changeSummary(control, before, after, reference)}`);
  }

  function renderScore(evaluation) {
    const last = state.checks[state.checks.length - 1];
    const debrief = state.checks.length ? (debriefKey(state) === ui.debriefKey ? ui.debrief : null) : null;
    if (!state.checks.length) {
      setText(els.scoreSummary, 'Not scored yet. Live progress is in the Exercise panel.');
      setHidden(els.scoreEmpty, false);
      setHidden(els.scoreContent, true);
      return;
    }
    if (!debrief && !ui.debriefTimer) {
      ui.debriefTimer = setTimeout(() => { ui.debriefTimer = null; computeDebrief(); scheduleRender(); }, 30);
    }
    const changedSince = JSON.stringify(last.controls) !== JSON.stringify(Practice.controlsPair(state));
    if (!els.scoreButton.disabled || debrief) {
      const summary = debrief
        ? `CHECK ${debrief.check} · ${debrief.score} · ${debrief.band}${changedSince ? ' · CHANGED SINCE' : ''}. ${debrief.next.complete ? 'Exercise complete.' : `Next: ${debrief.next.control ? `${debrief.next.direction > 0 ? Practice.CONTROL_INFO[debrief.next.control].verbs.up : Practice.CONTROL_INFO[debrief.next.control].verbs.down} ${Practice.CONTROL_LABELS[debrief.next.control].toLowerCase()}` : 'compare the scopes'}.`}`
        : `CHECK ${last.n} · scoring…`;
      setText(els.scoreSummary, summary);
    }
    setHidden(els.scoreEmpty, true);
    setHidden(els.scoreContent, false);
    if (!debrief) {
      setText(els.nextCorrection, 'Working out the next correction…');
      return;
    }
    setText(els.scoreNumber, String(debrief.score));
    els.scoreNumber.setAttribute('aria-label', `Score ${debrief.score} out of 100`);
    els.scoreBand.dataset.level = debrief.band;
    setText(els.scoreBand, debrief.band);
    setText(els.scoreStatusText, debrief.status === 'complete' ? 'Exercise complete.' : debrief.status === 'close' ? 'Close. Refine the signal.' : 'Keep adjusting.');
    setText(els.scoreDelta, `CHECK ${debrief.check} · ATTEMPT ${debrief.attempt} · ${debrief.delta >= 0 ? '+' : '−'}${Math.abs(debrief.delta)} SINCE ${debrief.baseline.toUpperCase()}${changedSince ? ' · CONTROLS CHANGED SINCE THIS CHECK' : ''}`);
    setText(els.nextCorrection, debrief.next.message);
    els.objectiveTableBody.replaceChildren(...debrief.objectives.map(item => h('tr', {},
      h('th', { scope: 'row', text: item.label }),
      h('td', { className: 'num', text: String(Math.round(item.before)) }),
      h('td', { className: 'num' }, ...spaced(String(Math.round(item.after)), h('span', { className: 'delta', text: `${item.delta >= 0 ? '+' : '−'}${Math.abs(Math.round(item.delta))}` }))),
      h('td', {}, h('span', { className: 'pill', dataset: { level: item.band }, text: item.band })))));
    els.changeList.replaceChildren(...(debrief.changes.length ? debrief.changes.map(change => h('li', {}, ...spaced(
      h('span', { className: 'change-head' }, ...spaced(
        h('span', { className: 'pill', dataset: { level: change.verdict === 'helped' ? 'OK' : change.verdict === 'hurt' ? 'CRIT' : 'IDLE' }, text: change.verdict === 'helped' ? 'OK' : change.verdict === 'hurt' ? 'CRIT' : 'IDLE' }),
        h('span', { text: `${change.cameraLabel} ${change.label} ${change.verdict}:` }),
        h('span', { className: 'change-values', text: `${change.fromText} → ${change.toText}.` }))),
      change.effects.length ? h('span', { className: 'change-effects', text: `${change.effects.map(effect => `${effect.label} ${Math.abs(effect.closer)}% ${effect.closer > 0 ? 'closer' : 'farther'}`).join(' · ')}.` }) : null,
      h('span', { className: 'change-why', text: `${change.explanation}${change.referenceMoved ? ' This moved the reference camera, so the target you are matching changed.' : ''}` })))) : [h('li', { text: `No control changes since ${debrief.baseline}.` })]));
    setHidden(els.interactionNote, !debrief.interacting);
    els.coachList.replaceChildren(...debrief.coach.map(note => h('li', { text: note })));
    els.checkHistory.replaceChildren(...state.checks.slice().reverse().map(check => {
      const result = check.n === debrief.check ? debrief.score : Practice.evaluatePractice(Practice.withControls(state, check.controls)).score;
      return h('li', {}, ...spaced(h('span', { text: `CHECK ${check.n}` }), h('span', { text: `${result} / 100` })));
    }));
  }

  function renderDemo() {
    const demo = state.demo;
    setHidden(els.demoIdle, Boolean(demo));
    setHidden(els.demoActive, !demo);
    if (!demo) return;
    setText(els.demoTitle, demo.title);
    setText(els.demoPosition, `STEP ${demo.index + 1} OF ${demo.steps.length}${demo.focus ? ` · ${Practice.CONTROL_LABELS[demo.focus].toUpperCase()} ON ${cameraShort(demo.cameraId)}` : ''}`);
    els.demoPrevButton.disabled = demo.index === 0;
    els.demoNextButton.disabled = demo.index >= demo.steps.length - 1;
    els.demoStepList.replaceChildren(...demo.steps.map((step, index) => h('li', {},
      h('button', { type: 'button', className: 'demo-step', dataset: { demoStep: String(index) }, 'aria-current': index === demo.index ? 'step' : null }, ...spaced(
        h('span', { className: 'step-index', text: String(index + 1).padStart(2, '0') }),
        h('span', { text: step.label }))))));
    const step = demo.steps[demo.index];
    setText(els.demoStepLabel, step.label.toUpperCase());
    setText(els.demoStepNote, step.note || 'No note for this step.');
    setHidden(els.demoModified, !Practice.demoStepModified(state));
    document.querySelectorAll('[data-demo-compare]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoCompare === demo.compareWith)));
    els.demoRemoveButton.disabled = demo.steps.length <= 1;
    els.demoCaptureButton.disabled = demo.steps.length >= Practice.LIMITS.demoSteps;
    if (document.activeElement !== els.demoLabelInput) els.demoLabelInput.placeholder = step.label;
  }

  // ---------- offline ----------

  async function controllingWorkerVersion() {
    const controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!controller) return '';
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(''), 1200);
      channel.port1.onmessage = event => { clearTimeout(timer); resolve(String((event.data && event.data.version) || '')); };
      controller.postMessage({ type: 'SBD_OFFLINE_VERSION' }, [channel.port2]);
    });
  }

  async function markOfflineReady() {
    const version = await controllingWorkerVersion();
    if (version !== OFFLINE_CACHE_VERSION) return false;
    document.documentElement.dataset.offline = 'ready';
    setText(els.offlineStatus, 'OFFLINE READY · practice files saved on this device.');
    return true;
  }

  async function prepareOfflineUse() {
    if (location.protocol === 'file:' || !('serviceWorker' in navigator)) {
      document.documentElement.dataset.offline = 'unavailable';
      setText(els.offlineStatus, 'Offline cache unavailable in this browser; the practice still works while this page is open.');
      return;
    }
    try {
      document.documentElement.dataset.offline = 'installing';
      const registration = await navigator.serviceWorker.register('./practice-worker.js');
      await navigator.serviceWorker.ready;
      if (await markOfflineReady()) return;
      navigator.serviceWorker.addEventListener('controllerchange', () => { markOfflineReady(); }, { once: true });
      if (registration.active) registration.active.postMessage({ type: 'SBD_CLAIM_CLIENTS' });
      registration.update().catch(() => {});
    } catch (error) {
      document.documentElement.dataset.offline = 'error';
      setText(els.offlineStatus, 'Offline cache could not be prepared; stay online to reopen this practice. Everything on this page still works now.');
    }
  }

  // ---------- start ----------

  function bindGlobal() {
    els.themeButton.addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
    document.addEventListener('keydown', event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if (key === 'y') { event.preventDefault(); redo(); }
    });
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => scheduleRender());
      [els.monitorWall, els.scopeGrid, els.practiceWorkspace].forEach(node => observer.observe(node));
    } else {
      window.addEventListener('resize', scheduleRender);
    }
    window.addEventListener('pagehide', saveSession);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSession(); });
  }

  function start() {
    try { window.sessionStorage.removeItem(RELOAD_FLAG); } catch (error) { /* storage may be blocked */ }
    buildStaticDom();
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
    bindControls();
    bindNavigation();
    bindComparison();
    bindTraining();
    bindShare();
    bindGlobal();
    ui.layout = detectLayout();
    if (ui.layout === 'medium') ui.sideTab = 'control';
    // A first visit on an ultrawide screen opens with all four scopes.
    if (!urlState.explicit && !ui.restored && window.matchMedia('(min-width: 1920px)').matches) {
      state = Practice.applyIntent(state, { type: 'set-scope-layout', layout: 'quad' });
    }
    if (!Render.canvasAvailable()) ui.canvasOk = false;
    renderNow();
    if (urlState.error) toast(`The link's saved state could not be read (${urlState.error}). The default exercise is open instead.`, true);
    else if (ui.restored) toast('Restored your last practice session from this device.');
    // Links are one-time inputs: once the session is saved locally, a reload
    // continues the work instead of rewinding to the link.
    if (urlState.explicit && !urlState.error) {
      saveSession();
      if (ui.storageOk) history.replaceState(null, '', location.pathname);
    }
    prepareOfflineUse();
  }

  window.ShaderPracticeApp = Object.freeze({
    getState: () => clone(state),
    setState: value => { commit(Practice.normalizeState(value), { resetHistory: true }); renderNow(); return clone(state); },
    importJSON: value => { importState(Practice.importPracticeJSON(value), 'Practice JSON imported.'); renderNow(); return clone(state); },
    queryLink: () => exerciseLink(),
    fullStateLink: () => fullStateLink(),
    undo: () => { undo(); return clone(state); },
    redo: () => { redo(); return clone(state); },
    score: () => { scoreAttempt(); return clone(state); },
    renderNow,
    debrief: () => clone(computeDebrief()),
    ui: () => ({ layout: ui.layout, sideTab: ui.sideTab, view: ui.view, stepSize: ui.stepSize, blinking: ui.blinking, blinkShowing: ui.blinkShowing, activeControl: ui.activeControl, history: ui.history.length, future: ui.future.length, canvas: ui.canvasOk, storage: ui.storageOk, offline: document.documentElement.dataset.offline || '' })
  });

  start();
})();
