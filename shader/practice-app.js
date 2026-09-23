(function () {
  'use strict';

  const Practice = window.ShaderPracticeState;
  const Draw = window.ShaderPracticeRender;
  if (!Practice || !Draw) {
    document.body.textContent = 'Camera Shading Practice could not start. Reload the page to restore its local application files.';
    return;
  }

  const THEME_KEY = 'shader.practice.theme.v1';
  const LEGACY_THEME_KEY = 'throwline.practice.theme.v1';
  const OFFLINE_VERSION = 'v20260923-shader-practice-console';
  const MOBILE_QUERY = '(max-width: 899px)';
  const WIDE_QUERY = '(min-width: 1280px)';
  const HISTORY_LIMIT = 60;
  const CONTROL_NAMES = Object.keys(Practice.CONTROL_LIMITS);
  const SCOPE_NAMES = Object.freeze({
    waveform: 'waveform',
    parade: 'RGB parade',
    vectorscope: 'vectorscope',
    histogram: 'histogram'
  });

  const byId = id => document.getElementById(id);
  const els = {};
  document.querySelectorAll('[id]').forEach(element => { els[element.id] = element; });

  let state = stateFromLocation();
  let sidePanel = 'exercise';
  let mobileView = 'shade';
  let stepSize = 'fine';
  let activeControl = 'iris';
  let lastControlEffect = '';
  let undoStack = [];
  let redoStack = [];
  let historyGroup = null;
  let animationFrame = 0;
  let blinkTimer = 0;
  let blinkActive = false;
  let blinkPhase = false;
  let toastTimer = 0;
  let demoInputKey = '';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function pill(level, text) {
    const element = node('span', 'pill', text || level);
    element.dataset.level = level;
    return element;
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeBase64Url(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
  }

  function stateFromLocation() {
    try {
      const hash = new URLSearchParams(location.hash.slice(1));
      if (hash.has('state')) return Practice.importPracticeJSON(decodeBase64Url(hash.get('state')));
    } catch (error) {
      setTimeout(() => showToast(error.message, true), 0);
    }
    const params = new URLSearchParams(location.search);
    const compare = params.get('compare') || (params.get('split') === '0' ? null : 'side');
    const wipe = params.has('wipe') ? Number(params.get('wipe')) / 100 : undefined;
    return Practice.createPracticeState({
      scenarioId: params.get('scenario'),
      seed: params.get('seed'),
      selectedCameraId: params.get('camera'),
      scope: params.get('scope'),
      splitView: params.get('split') !== '0',
      view: {
        compare,
        scopeLayout: params.get('layout'),
        wipe
      }
    });
  }

  function pageUrl() {
    return new URL('./practice.html', location.href);
  }

  function queryLink() {
    const url = pageUrl();
    url.search = '';
    url.hash = '';
    url.searchParams.set('scenario', state.scenarioId);
    url.searchParams.set('seed', state.seed);
    url.searchParams.set('camera', state.selectedCameraId);
    url.searchParams.set('scope', state.scope);
    url.searchParams.set('compare', state.view.compare);
    url.searchParams.set('layout', state.view.scopeLayout);
    if (state.view.compare === 'wipe') url.searchParams.set('wipe', String(Math.round(state.view.wipe * 100)));
    return url.href;
  }

  function fullStateLink() {
    const url = pageUrl();
    url.search = '';
    url.hash = `state=${encodeBase64Url(Practice.exportPracticeJSON(state))}`;
    return url.href;
  }

  function syncLocation() {
    try { history.replaceState(null, '', queryLink()); } catch (error) { /* file URLs and locked-down embeds may reject history changes */ }
  }

  function showToast(message, error = false) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.dataset.error = String(error);
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3600);
  }

  function announce(message) {
    els.liveStatus.textContent = '';
    requestAnimationFrame(() => { els.liveStatus.textContent = message; });
  }

  function setState(next, options = {}) {
    state = Practice.normalizeState(next);
    if (options.clearHistory) {
      undoStack = [];
      redoStack = [];
      historyGroup = null;
    }
    if (options.syncLocation) syncLocation();
    render(options);
    return clone(state);
  }

  function commitIntent(intent, options = {}) {
    const before = state;
    const next = Practice.applyIntent(before, intent);
    if (JSON.stringify(next) === JSON.stringify(before)) return false;
    if (options.history !== false) {
      undoStack.push(clone(before));
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack = [];
    }
    state = next;
    historyGroup = null;
    if (options.syncLocation) syncLocation();
    render(options);
    return true;
  }

  function beginContinuousEdit(key) {
    if (historyGroup === key) return;
    historyGroup = key;
    undoStack.push(clone(state));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
  }

  function editControl(control, value, key) {
    if (!canEditSelectedCamera()) return;
    beginContinuousEdit(key || `${state.selectedCameraId}:${control}`);
    const before = Practice.getCamera(state, state.selectedCameraId).controls[control];
    state = Practice.applyIntent(state, { type: 'set-control', cameraId: state.selectedCameraId, control, value });
    const after = Practice.getCamera(state, state.selectedCameraId).controls[control];
    if (before !== after) {
      activeControl = control;
      lastControlEffect = Practice.CONTROL_INFO[control].effect[after >= before ? 'up' : 'down'];
    }
    render({ preserveInputs: false });
  }

  function finishContinuousEdit() {
    historyGroup = null;
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(clone(state));
    state = Practice.normalizeState(undoStack.pop());
    historyGroup = null;
    render();
    announce(`Undid change. ${state.lastAction}`);
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(clone(state));
    state = Practice.normalizeState(redoStack.pop());
    historyGroup = null;
    render();
    announce(`Redid change. ${state.lastAction}`);
  }

  function scenario() {
    return Practice.SCENARIOS[state.scenarioId];
  }

  function canEditSelectedCamera() {
    return state.selectedCameraId === scenario().targetCameraId;
  }

  function isMobile() {
    return matchMedia(MOBILE_QUERY).matches;
  }

  function isWide() {
    return matchMedia(WIDE_QUERY).matches;
  }

  function initializeLists() {
    const exerciseItems = Practice.scenarioList().map((item, index) => {
      const listItem = node('li');
      const button = node('button', 'exercise');
      button.type = 'button';
      button.dataset.scenario = item.id;
      const number = node('span', 'exercise-index', String(index + 1).padStart(2, '0'));
      const title = node('span', 'exercise-title', item.title.toUpperCase());
      const brief = node('span', 'exercise-brief', item.brief);
      button.append(number, title, brief);
      listItem.append(button);
      return listItem;
    });
    els.exerciseList.replaceChildren(...exerciseItems);

    Practice.troubleshootingList().forEach(item => {
      const option = node('option', '', item.label);
      option.value = item.id;
      els.injectionSelect.append(option);
    });
    CONTROL_NAMES.forEach(control => {
      const option = node('option', '', Practice.CONTROL_LABELS[control]);
      option.value = control;
      els.demoControlSelect.append(option);
    });
    buildControlRows();
  }

  function buildControlRows() {
    const rows = CONTROL_NAMES.map(control => {
      const info = Practice.CONTROL_INFO[control];
      const limits = Practice.CONTROL_LIMITS[control];
      const row = node('div', 'control-row');
      row.dataset.controlRow = control;

      const label = node('label', 'control-name', Practice.CONTROL_LABELS[control].toUpperCase());
      label.htmlFor = `controlValue-${control}`;
      const unit = node('span', 'control-unit', info.unit || 'LEVEL');
      const value = node('input', 'control-value');
      value.id = `controlValue-${control}`;
      value.type = 'number';
      value.inputMode = 'decimal';
      value.min = String(limits[0]);
      value.max = String(limits[1]);
      value.step = String(info.fine);
      value.dataset.control = control;
      value.dataset.controlInput = 'number';
      value.setAttribute('aria-label', `${Practice.CONTROL_LABELS[control]} numeric value`);

      const minus = node('button', 'step-btn', '−');
      minus.type = 'button';
      minus.dataset.control = control;
      minus.dataset.step = '-1';
      minus.setAttribute('aria-label', `${info.verbs.down} ${Practice.CONTROL_LABELS[control]}`);

      const range = node('input');
      range.type = 'range';
      range.min = String(limits[0]);
      range.max = String(limits[1]);
      range.step = String(info.fine);
      range.dataset.control = control;
      range.dataset.controlInput = 'range';
      range.setAttribute('aria-label', Practice.CONTROL_LABELS[control]);

      const plus = node('button', 'step-btn', '+');
      plus.type = 'button';
      plus.dataset.control = control;
      plus.dataset.step = '1';
      plus.setAttribute('aria-label', `${info.verbs.up} ${Practice.CONTROL_LABELS[control]}`);

      const reset = node('button', 'reset-btn', '↺');
      reset.type = 'button';
      reset.dataset.control = control;
      reset.dataset.resetControl = control;
      reset.setAttribute('aria-label', `Reset ${Practice.CONTROL_LABELS[control]} to the exercise start`);

      row.append(label, unit, value, minus, range, plus, reset);
      return row;
    });
    els.controlList.replaceChildren(...rows);
  }

  function bindEvents() {
    els.exerciseList.addEventListener('click', event => {
      const button = event.target.closest('[data-scenario]');
      if (!button) return;
      stopBlink();
      commitIntent({ type: 'load-scenario', scenarioId: button.dataset.scenario }, { history: false, syncLocation: true });
      undoStack = [];
      redoStack = [];
      setSidePanel('exercise');
      showToast(`Exercise loaded: ${scenario().title}.`);
    });

    document.querySelectorAll('[data-camera-switch]').forEach(button => {
      button.addEventListener('click', () => {
        commitIntent({ type: 'select-camera', cameraId: button.dataset.cameraSwitch }, { history: false });
        if (button.dataset.cameraSwitch === scenario().referenceCameraId) announce('Camera A reference selected for inspection. Shading controls are locked.');
      });
    });
    els.monitorSelectA.addEventListener('click', event => event.preventDefault());
    els.monitorSelectB.addEventListener('click', () => commitIntent({ type: 'select-camera', cameraId: scenario().targetCameraId }, { history: false }));

    els.controlList.addEventListener('focusin', event => {
      const control = event.target.dataset.control;
      if (control) {
        activeControl = control;
        renderControlNotes();
      }
    });
    els.controlList.addEventListener('pointerdown', event => {
      const input = event.target.closest('[data-control-input]');
      if (input && canEditSelectedCamera()) beginContinuousEdit(`${state.selectedCameraId}:${input.dataset.control}`);
    });
    els.controlList.addEventListener('input', event => {
      const input = event.target.closest('[data-control-input="range"]');
      if (!input) return;
      editControl(input.dataset.control, input.value, `${state.selectedCameraId}:${input.dataset.control}`);
    });
    els.controlList.addEventListener('change', event => {
      const input = event.target.closest('[data-control-input]');
      if (!input) return;
      if (input.dataset.controlInput === 'number') {
        if (!Number.isFinite(Number(input.value))) {
          input.setAttribute('aria-invalid', 'true');
          showToast('Enter a numeric control value.', true);
          return;
        }
        input.removeAttribute('aria-invalid');
        editControl(input.dataset.control, input.value, `${state.selectedCameraId}:${input.dataset.control}`);
      }
      finishContinuousEdit();
    });
    els.controlList.addEventListener('click', event => {
      const step = event.target.closest('[data-step]');
      const reset = event.target.closest('[data-reset-control]');
      if (step && canEditSelectedCamera()) {
        const control = step.dataset.control;
        activeControl = control;
        const before = Practice.getCamera(state, state.selectedCameraId).controls[control];
        if (commitIntent({ type: 'step-control', cameraId: state.selectedCameraId, control, direction: Number(step.dataset.step), size: stepSize })) {
          const after = Practice.getCamera(state, state.selectedCameraId).controls[control];
          lastControlEffect = Practice.CONTROL_INFO[control].effect[after >= before ? 'up' : 'down'];
          renderControlNotes();
        }
      } else if (reset && canEditSelectedCamera()) {
        activeControl = reset.dataset.resetControl;
        commitIntent({ type: 'reset-control', cameraId: state.selectedCameraId, control: activeControl });
        lastControlEffect = `${Practice.CONTROL_LABELS[activeControl]} restored to this exercise's starting value.`;
        renderControlNotes();
      }
    });

    els.undoButton.addEventListener('click', undo);
    els.redoButton.addEventListener('click', redo);
    els.resetCameraButton.addEventListener('click', () => {
      if (!canEditSelectedCamera()) return;
      commitIntent({ type: 'reset-camera', cameraId: state.selectedCameraId });
      lastControlEffect = 'Camera B controls restored to the exercise start.';
    });
    document.querySelectorAll('[data-step-size]').forEach(button => button.addEventListener('click', () => {
      stepSize = button.dataset.stepSize;
      renderControls();
    }));

    document.addEventListener('keydown', event => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.altKey || event.key.toLowerCase() !== 'z') return;
      const editable = event.target.matches('textarea, input[type="text"]') && !event.target.closest('#controlList');
      if (editable) return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    });

    document.querySelectorAll('#compareGroup button[data-compare]').forEach(button => button.addEventListener('click', () => {
      stopBlink();
      commitIntent({ type: 'set-compare', mode: button.dataset.compare }, { history: false, syncLocation: true });
    }));
    els.wipeInput.addEventListener('input', () => commitIntent({ type: 'set-wipe', value: Number(els.wipeInput.value) / 100 }, { history: false }));
    els.wipeInput.addEventListener('change', syncLocation);
    els.blinkButton.addEventListener('click', toggleBlink);
    els.freezeButton.addEventListener('click', () => {
      if (state.demo) return;
      commitIntent({ type: state.view.freeze ? 'release-freeze' : 'freeze-reference' });
      announce(state.lastAction);
    });

    els.scopeTabs.addEventListener('click', event => {
      const button = event.target.closest('[data-scope]');
      if (!button) return;
      commitIntent({ type: 'set-scope', scope: button.dataset.scope }, { history: false, syncLocation: true });
    });
    bindTabKeys(els.scopeTabs, '[data-scope]');
    document.querySelectorAll('button[data-layout]').forEach(button => button.addEventListener('click', () => {
      commitIntent({ type: 'set-scope-layout', layout: button.dataset.layout }, { history: false, syncLocation: true });
    }));
    document.querySelectorAll('[data-focus-scope]').forEach(button => button.addEventListener('click', () => {
      state = Practice.applyIntent(state, { type: 'set-scope', scope: button.dataset.focusScope });
      state = Practice.applyIntent(state, { type: 'set-scope-layout', layout: 'single' });
      render();
      syncLocation();
    }));

    els.applySeedButton.addEventListener('click', applySeed);
    els.seedInput.addEventListener('keydown', event => { if (event.key === 'Enter') applySeed(); });
    els.replayButton.addEventListener('click', () => {
      stopBlink();
      commitIntent({ type: 'replay' }, { history: false, syncLocation: true });
      undoStack = [];
      redoStack = [];
      showToast('Exercise replayed from the same seed.');
    });
    els.injectButton.addEventListener('click', () => {
      commitIntent({ type: 'inject-trouble', injectionId: els.injectionSelect.value, cameraId: scenario().targetCameraId });
      showToast(state.lastAction);
    });
    els.revertFaultButton.addEventListener('click', () => {
      if (!state.injections.length) return;
      commitIntent({ type: 'revert-injection' });
      showToast(state.lastAction);
    });

    els.scoreButton.addEventListener('click', scoreAttempt);
    els.openDebriefButton.addEventListener('click', () => openDebrief(true));

    els.sideTabs.addEventListener('click', event => {
      const button = event.target.closest('[data-side-tab]');
      if (button) setSidePanel(button.dataset.sideTab, true);
    });
    bindTabKeys(els.sideTabs, '[data-side-tab]');
    els.viewRail.addEventListener('click', event => {
      const button = event.target.closest('[data-view]');
      if (button) setMobileView(button.dataset.view, true);
    });

    els.startDemoButton.addEventListener('click', () => {
      commitIntent({ type: 'start-demo', control: els.demoControlSelect.value });
      openDemoPanel(true);
    });
    els.captureFirstButton.addEventListener('click', () => {
      commitIntent({ type: 'demo-capture', title: 'Instructor sequence', cameraId: scenario().targetCameraId });
      openDemoPanel(true);
    });
    els.demoPrevButton.addEventListener('click', () => goDemo(state.demo ? state.demo.index - 1 : 0));
    els.demoNextButton.addEventListener('click', () => goDemo(state.demo ? state.demo.index + 1 : 0));
    els.demoStepList.addEventListener('click', event => {
      const button = event.target.closest('[data-demo-step]');
      if (button) goDemo(Number(button.dataset.demoStep));
    });
    document.querySelectorAll('[data-demo-compare]').forEach(button => button.addEventListener('click', () => {
      commitIntent({ type: 'demo-compare-with', value: button.dataset.demoCompare });
    }));
    els.demoCaptureButton.addEventListener('click', () => commitIntent({ type: 'demo-capture', label: els.demoLabelInput.value, note: els.demoNoteInput.value }));
    els.demoUpdateButton.addEventListener('click', () => commitIntent({ type: 'demo-update-step', label: els.demoLabelInput.value, note: els.demoNoteInput.value, recapture: true }));
    els.demoRemoveButton.addEventListener('click', () => commitIntent({ type: 'demo-remove-step' }));
    els.exitDemoButton.addEventListener('click', () => {
      commitIntent({ type: 'exit-demo' });
      setSidePanel('exercise');
      if (isMobile()) setMobileView('shade');
    });
    els.demoLinkButton.addEventListener('click', () => copyText(fullStateLink(), 'Demonstration link copied.'));
    els.demoExportButton.addEventListener('click', exportJSON);

    els.shareButton.addEventListener('click', openShare);
    els.closeShareButton.addEventListener('click', () => els.shareDialog.close());
    els.shareDialog.addEventListener('click', event => { if (event.target === els.shareDialog) els.shareDialog.close(); });
    els.copyLinkButton.addEventListener('click', () => copyText(fullStateLink(), 'Full-state link copied.'));
    els.copyShortLinkButton.addEventListener('click', () => copyText(queryLink(), 'Exercise link copied.'));
    els.exportButton.addEventListener('click', exportJSON);
    els.importButton.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', importFile);

    els.themeButton.addEventListener('click', toggleTheme);
    window.addEventListener('resize', handleResize, { passive: true });
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => scheduleCanvasRender());
      observer.observe(els.monitorWall);
      observer.observe(els.scopeGrid);
    }
  }

  function bindTabKeys(container, selector) {
    container.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...container.querySelectorAll(selector)].filter(tab => !tab.hidden && !tab.disabled);
      if (!tabs.length) return;
      event.preventDefault();
      const current = Math.max(0, tabs.indexOf(document.activeElement));
      let next;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else next = (current + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
  }

  function applySeed() {
    stopBlink();
    commitIntent({ type: 'set-seed', seed: els.seedInput.value }, { history: false, syncLocation: true });
    undoStack = [];
    redoStack = [];
    showToast(`Seed applied: ${state.seed}`);
  }

  function scoreAttempt() {
    if (state.demo) return;
    commitIntent({ type: 'score-check' }, { history: false });
    const debrief = Practice.debriefPractice(state);
    openDebrief(true);
    announce(`Attempt scored ${debrief.score}. ${debrief.explanation}`);
  }

  function openDebrief(focus) {
    if (isMobile()) setMobileView('score', false);
    else setSidePanel('score', false);
    updateVisibility();
    renderDebrief();
    if (focus) requestAnimationFrame(() => els.scoreHeading.focus());
  }

  function openDemoPanel(focus) {
    if (isMobile()) setMobileView('demo', false);
    else setSidePanel('demo', false);
    updateVisibility();
    if (focus) requestAnimationFrame(() => els.demoHeading.focus());
  }

  function setSidePanel(name, focus = false) {
    if (!['control', 'exercise', 'score', 'demo'].includes(name)) return;
    sidePanel = isWide() && name === 'control' ? 'exercise' : name;
    updateVisibility();
    if (focus) {
      const target = sidePanel === 'control' ? els.controlHeading : byId(`${sidePanel}Heading`);
      if (target) requestAnimationFrame(() => target.focus ? target.focus() : null);
    }
  }

  function setMobileView(name, focus = false) {
    if (!['shade', 'scopes', 'exercise', 'score', 'demo'].includes(name)) return;
    mobileView = name;
    document.body.dataset.view = name;
    updateVisibility();
    scheduleCanvasRender();
    if (focus) {
      const targets = { shade: els.controlHeading, scopes: els.scopeHeading, exercise: els.exerciseHeading, score: els.scoreHeading, demo: els.demoHeading };
      const target = targets[name];
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => target.focus());
      }
    }
  }

  function updateVisibility() {
    const mobile = isMobile();
    const wide = isWide();
    document.body.dataset.layout = mobile ? 'mobile' : wide ? 'wide' : 'laptop';
    els['tab-control'].hidden = wide;

    document.querySelectorAll('#viewRail button[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mobileView)));
    document.querySelectorAll('[data-side-tab]').forEach(button => {
      const selected = button.dataset.sideTab === sidePanel;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    if (mobile) {
      els.monitorPanel.hidden = !['shade'].includes(mobileView);
      els.scopePanel.hidden = !['shade', 'scopes'].includes(mobileView);
      els.controlPanel.hidden = mobileView !== 'shade';
      els['panel-exercise'].hidden = mobileView !== 'exercise';
      els['panel-score'].hidden = mobileView !== 'score';
      els['panel-demo'].hidden = mobileView !== 'demo';
    } else {
      els.monitorPanel.hidden = false;
      els.scopePanel.hidden = false;
      els.controlPanel.hidden = wide ? false : sidePanel !== 'control';
      els['panel-exercise'].hidden = sidePanel !== 'exercise';
      els['panel-score'].hidden = sidePanel !== 'score';
      els['panel-demo'].hidden = sidePanel !== 'demo';
    }
  }

  function render(options = {}) {
    const evaluation = Practice.evaluatePractice(state);
    renderStatus(evaluation);
    renderExercise(evaluation);
    renderControls(options.preserveInputs !== true);
    renderComparison();
    renderScopes();
    renderDebrief();
    renderDemo();
    updateVisibility();
    scheduleCanvasRender();
  }

  function renderStatus(evaluation) {
    const currentScenario = scenario();
    const status = Practice.exerciseStatus(state);
    els.exerciseStatus.textContent = status;
    els.exerciseStatus.dataset.level = status;
    els.exerciseName.textContent = currentScenario.title.toUpperCase();
    const workflow = Practice.workflowSteps(state);
    const current = workflow.find(step => step.current);
    els.statusNext.textContent = current ? `NEXT · ${current.label}` : '';
    els.statusDemo.hidden = !state.demo;
    els.statusDemoText.textContent = state.demo ? `${state.demo.title} · step ${state.demo.index + 1}/${state.demo.steps.length}` : '';
    const alerts = Practice.signalAlerts(state);
    els.statusAlerts.replaceChildren(...alerts.slice(0, 2).map(alert => {
      const item = node('li');
      item.append(pill(alert.level), document.createTextNode(alert.title));
      return item;
    }));
    els.statusAlerts.hidden = alerts.length === 0;
  }

  function renderExercise(evaluation) {
    const currentScenario = scenario();
    els.exerciseList.querySelectorAll('[data-scenario]').forEach(button => button.setAttribute('aria-current', String(button.dataset.scenario === state.scenarioId)));
    els.objectiveText.textContent = currentScenario.objective;
    els.passRule.textContent = `PASS · total score ${Practice.PASS_RULE.score}+ and every objective ${Practice.PASS_RULE.objective}+`;
    els.objectiveList.replaceChildren(...Practice.progressBands(evaluation).map(item => {
      const entry = node('li');
      entry.append(node('span', 'objective-name', item.label), pill(item.band), node('span', 'objective-help', item.explanation));
      return entry;
    }));
    els.workflowList.replaceChildren(...Practice.workflowSteps(state).map(item => {
      const entry = node('li');
      entry.dataset.state = item.done ? 'done' : item.current ? 'current' : 'pending';
      const mark = node('span', 'flow-mark', item.done ? 'DONE' : item.current ? 'NEXT' : '');
      entry.append(node('span', '', item.label), mark);
      return entry;
    }));
    const alerts = Practice.signalAlerts(state);
    if (!alerts.length) {
      const item = node('li');
      item.append(pill('OK'), node('span', '', 'No simulated clipping, crushing, or excessive gain alert.'));
      els.alertList.replaceChildren(item);
    } else {
      els.alertList.replaceChildren(...alerts.map(alert => {
        const item = node('li');
        item.append(pill(alert.level), node('strong', '', alert.title), node('span', 'alert-detail', alert.detail));
        return item;
      }));
    }
    els.seedInput.value = state.seed;
    els.stateIdentity.textContent = `${state.schema} · attempt ${state.attempt}`;
    els.faultList.replaceChildren(...state.injections.map((id, index) => {
      const fault = Practice.TROUBLESHOOTING[id];
      const item = node('li');
      item.append(pill('WARN', String(index + 1).padStart(2, '0')), node('span', '', fault ? fault.label : id));
      return item;
    }));
    if (!state.injections.length) els.faultList.append(node('li', 'hint', 'No fault injected.'));
    els.revertFaultButton.disabled = state.injections.length === 0;
  }

  function renderControls(updateValues = true) {
    const currentScenario = scenario();
    const selected = Practice.getCamera(state, state.selectedCameraId);
    const locked = !canEditSelectedCamera();
    els.controlTarget.textContent = locked ? `${selected.label} · reference inspection · controls locked` : `${selected.label} · target camera`;
    document.querySelectorAll('[data-camera-switch]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cameraSwitch === state.selectedCameraId)));
    els.camRoleA.textContent = 'REF · LOCKED';
    els.camRoleB.textContent = 'TGT · ADJUST';
    els.resetCameraButton.disabled = locked;
    els.resetCameraButton.setAttribute('aria-disabled', String(locked));
    els.undoButton.disabled = undoStack.length === 0;
    els.redoButton.disabled = redoStack.length === 0;
    document.querySelectorAll('[data-step-size]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stepSize === stepSize)));

    els.controlList.querySelectorAll('[data-control-row]').forEach(row => {
      const control = row.dataset.controlRow;
      const info = Practice.CONTROL_INFO[control];
      const value = selected.controls[control];
      row.dataset.active = String(control === activeControl);
      row.querySelectorAll('input, button').forEach(input => {
        input.disabled = locked;
        input.setAttribute('aria-disabled', String(locked));
      });
      row.querySelectorAll('[data-control-input]').forEach(input => {
        input.step = String(stepSize === 'coarse' ? info.coarse : info.fine);
        if (updateValues || document.activeElement !== input) input.value = String(value);
        input.setAttribute('aria-valuetext', Practice.formatControl(control, value));
      });
    });
    els.monitorSelectA.disabled = true;
    els.monitorSelectA.setAttribute('aria-disabled', 'true');
    els.monitorSelectA.setAttribute('aria-label', 'Camera A reference is locked; use the Camera A inspection button');
    els.monitorSelectB.disabled = false;
    els.monitorSelectB.setAttribute('aria-disabled', 'false');
    els.scoreButton.disabled = Boolean(state.demo);
    renderControlNotes();

    const lastCheck = state.checks[state.checks.length - 1];
    if (!lastCheck) els.scoreSummary.textContent = 'Not scored yet.';
    else {
      const debrief = Practice.debriefPractice(state);
      els.scoreSummary.textContent = `Check ${lastCheck.n} · ${debrief.score}/100 · ${debrief.band}`;
    }
  }

  function renderControlNotes() {
    const info = Practice.CONTROL_INFO[activeControl] || Practice.CONTROL_INFO.iris;
    els.controlNotesTitle.textContent = Practice.CONTROL_LABELS[activeControl].toUpperCase();
    els.controlNotesSummary.textContent = info.summary;
    els.controlNotesSimulation.textContent = info.simulation;
    els.controlNotesCaveat.textContent = info.caveat;
    els.controlNotesKeys.textContent = `Fine ${Practice.formatControl(activeControl, info.fine, { sign: false })} · Coarse ${Practice.formatControl(activeControl, info.coarse, { sign: false })}`;
    els.causeEffect.textContent = canEditSelectedCamera() ? (lastControlEffect || 'Adjust Camera B and compare the generated picture with both scopes.') : 'Reference inspection only. Camera A controls stay locked so scoring cannot move the target.';
  }

  function presentation() {
    const sources = Practice.comparisonSources(state);
    const left = Practice.analyzeCamera(sources.left.state, sources.left.cameraId);
    const right = Practice.analyzeCamera(sources.right.state, sources.right.cameraId);
    return { sources, left, right };
  }

  function effectiveCompare() {
    if (blinkActive) return blinkPhase ? 'target' : 'reference';
    return state.view.compare;
  }

  function renderComparison() {
    const shown = effectiveCompare();
    const data = presentation();
    const demo = data.sources.mode === 'demo';
    els.monitorWall.dataset.compare = shown;
    els.monitorWall.dataset.single = String(['reference', 'target', 'wipe'].includes(shown));
    els.monitorWall.dataset.arrangement = 'row';
    els.monitorLeft.hidden = !['side', 'reference'].includes(shown);
    els.monitorRight.hidden = !['side', 'target'].includes(shown);
    els.monitorWipe.hidden = shown !== 'wipe';
    document.querySelectorAll('#compareGroup button[data-compare]').forEach(button => button.setAttribute('aria-pressed', String(!blinkActive && button.dataset.compare === state.view.compare)));
    els.blinkButton.setAttribute('aria-pressed', String(blinkActive));
    els.freezeButton.setAttribute('aria-pressed', String(Boolean(state.view.freeze)));
    els.freezeButton.textContent = state.view.freeze ? 'Release ref' : 'Freeze ref';
    els.freezeButton.disabled = Boolean(state.demo);
    els.wipeInput.value = String(Math.round(state.view.wipe * 100));

    if (demo) {
      els.roleTagA.textContent = `BEFORE · ${data.sources.left.stepLabel}`;
      els.roleTagB.textContent = `AFTER · ${data.sources.right.stepLabel}`;
      els.wipeTagLeft.textContent = 'BEFORE';
      els.wipeTagRight.textContent = 'AFTER';
      els.compareCaption.textContent = `Generated before/after comparison · ${state.demo.title}.`;
    } else {
      els.roleTagA.textContent = state.view.freeze ? 'REF STILL · CAM A' : 'REF · CAM A';
      els.roleTagB.textContent = 'TGT · CAM B';
      els.wipeTagLeft.textContent = state.view.freeze ? 'REF STILL · CAM A' : 'REF · CAM A';
      els.wipeTagRight.textContent = 'TGT · CAM B';
      els.compareCaption.textContent = state.view.freeze ? `Reference still frozen · target remains live.` : 'Camera A reference · Camera B shading target.';
    }
    els.tallyTagA.hidden = demo;
    els.tallyTagB.hidden = demo;
    els.controlTagA.hidden = state.selectedCameraId !== data.sources.left.cameraId || state.selectedCameraId === scenario().referenceCameraId;
    els.controlTagB.hidden = state.selectedCameraId !== data.sources.right.cameraId;
    els.readoutA.textContent = metricReadout(data.left.metrics, demo ? 'BEFORE' : 'REF');
    els.readoutB.textContent = metricReadout(data.right.metrics, demo ? 'AFTER' : 'TGT');
    els.cameraCanvasA.setAttribute('aria-label', `${demo ? 'Before' : 'Reference'} generated simulated picture. ${els.readoutA.textContent}`);
    els.cameraCanvasB.setAttribute('aria-label', `${demo ? 'After' : 'Target'} generated simulated picture. ${els.readoutB.textContent}`);
  }

  function metricReadout(metrics, label) {
    return `${label} · BLACK ${Math.round(metrics.black * 100)} · MID ${Math.round(metrics.mid * 100)} · PEAK ${Math.round(metrics.peak * 100)} · CLIP ${metrics.clippedPercent.toFixed(1)}%`;
  }

  function renderScopes() {
    const layout = state.view.scopeLayout;
    els.scopeGrid.dataset.layout = layout;
    els.scopeGrid.dataset.arrangement = layout === 'quad' && innerWidth >= 1920 ? 'row' : layout === 'quad' && isMobile() ? 'stack' : 'grid';
    document.querySelectorAll('button[data-layout]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layout === layout)));
    document.querySelectorAll('#scopeTabs [data-scope]').forEach(button => {
      const selected = button.dataset.scope === state.scope;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('.scope[data-scope]').forEach(figure => {
      figure.hidden = layout === 'single' && figure.dataset.scope !== state.scope;
    });
    const demo = Boolean(state.demo);
    const legendText = demo ? 'BEFORE · dashed gray  |  AFTER · green' : 'REF · dashed gray  |  TGT · green';
    document.querySelectorAll('.legend').forEach(legend => { legend.textContent = legendText; });
  }

  function scopeRenderData(data) {
    const demo = data.sources.mode === 'demo';
    const leftLabel = demo ? 'BEFORE' : 'REF';
    const rightLabel = demo ? 'AFTER' : 'TGT';
    const metrics = data.right.metrics;
    return {
      series: [
        { analysis: data.left, metrics: data.left.metrics, label: leftLabel },
        { analysis: data.right, metrics: data.right.metrics, label: rightLabel }
      ],
      targets: { label: leftLabel, peak: data.left.metrics.peak, black: data.left.metrics.black },
      clipText: metrics.clippedPercent >= 0.5 ? `${rightLabel} CLIP ${metrics.clippedPercent.toFixed(1)}%` : '',
      crushText: metrics.crushedPercent >= 0.5 ? `${rightLabel} CRUSH ${metrics.crushedPercent.toFixed(1)}%` : '',
      hueText: `${leftLabel} ${Math.round(data.left.metrics.hue)}° · ${rightLabel} ${Math.round(data.right.metrics.hue)}°`
    };
  }

  function scheduleCanvasRender() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      drawCanvases();
    });
  }

  function drawCanvases() {
    const data = presentation();
    if (!els.monitorLeft.hidden) Draw.drawPicture(els.cameraCanvasA, data.left);
    if (!els.monitorRight.hidden) Draw.drawPicture(els.cameraCanvasB, data.right);
    if (!els.monitorWipe.hidden) Draw.drawWipe(els.wipeCanvas, data.left, data.right, state.view.wipe);
    const scopeData = scopeRenderData(data);
    Practice.SCOPES.forEach(kind => {
      const figure = byId(`scopeFigure-${kind}`);
      if (figure && !figure.hidden && !els.scopePanel.hidden) Draw.drawScope(byId(`scopeCanvas-${kind}`), kind, scopeData);
    });
  }

  function renderDebrief() {
    const report = Practice.debriefPractice(state);
    els.scoreEmpty.hidden = Boolean(report);
    els.scoreContent.hidden = !report;
    if (!report) return;
    els.scoreNumber.textContent = String(report.score);
    els.scoreBand.textContent = report.band;
    els.scoreBand.dataset.level = report.band;
    els.scoreStatusText.textContent = report.explanation;
    const delta = report.delta;
    els.scoreDelta.textContent = `Attempt ${report.attempt} · check ${report.check} · ${delta === 0 ? 'no score change' : `${delta > 0 ? '+' : ''}${delta} from ${report.baseline}`}`;
    els.nextCorrection.textContent = report.next.message;
    els.objectiveTableBody.replaceChildren(...report.objectives.map(item => {
      const row = document.createElement('tr');
      const name = node('td', '', item.label);
      const before = node('td', 'num', item.before.toFixed(1));
      const after = node('td', 'num', `${item.after.toFixed(1)} (${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)})`);
      const status = document.createElement('td');
      status.append(pill(item.band));
      row.append(name, before, after, status);
      return row;
    }));
    if (!report.changes.length) {
      els.changeList.replaceChildren(node('li', '', `No control changed since ${report.baseline}.`));
    } else {
      els.changeList.replaceChildren(...report.changes.map(change => {
        const item = node('li');
        const head = node('div', 'change-head');
        head.append(node('span', '', `${change.cameraLabel} · ${change.label}`), pill(change.verdict === 'helped' ? 'OK' : change.verdict === 'hurt' ? 'CRIT' : 'WARN', change.verdict.toUpperCase()));
        const values = node('p', 'change-values', `${change.fromText} → ${change.toText}`);
        const effects = node('p', 'change-effects', change.effects.length ? change.effects.map(effect => `${effect.label} ${effect.closer > 0 ? 'closer' : 'farther'} ${Math.abs(effect.closer)}%`).join(' · ') : 'No material objective movement by itself.');
        const why = node('p', 'change-why', change.explanation);
        item.append(head, values, effects, why);
        return item;
      }));
    }
    els.interactionNote.hidden = !report.interacting;
    els.coachList.replaceChildren(...report.coach.map(text => node('li', '', text)));
    els.checkHistory.replaceChildren(...state.checks.map(check => {
      const score = Practice.evaluatePractice(Practice.withControls(state, check.controls)).score;
      const item = node('li');
      item.append(node('span', '', `Check ${check.n}`), node('strong', '', `${score}/100`));
      return item;
    }));
  }

  function renderDemo() {
    const demo = state.demo;
    els.demoIdle.hidden = Boolean(demo);
    els.demoActive.hidden = !demo;
    if (!demo) {
      demoInputKey = '';
      return;
    }
    els.demoTitle.textContent = demo.title;
    els.demoPosition.textContent = `Step ${demo.index + 1} of ${demo.steps.length}`;
    els.demoPrevButton.disabled = demo.index === 0;
    els.demoNextButton.disabled = demo.index === demo.steps.length - 1;
    els.demoStepList.replaceChildren(...demo.steps.map((step, index) => {
      const item = node('li');
      const button = node('button', 'demo-step');
      button.type = 'button';
      button.dataset.demoStep = String(index);
      if (index === demo.index) button.setAttribute('aria-current', 'step');
      button.append(node('span', 'step-index', String(index + 1).padStart(2, '0')), node('span', '', step.label));
      item.append(button);
      return item;
    }));
    const current = demo.steps[demo.index];
    els.demoStepLabel.textContent = current.label;
    els.demoStepNote.textContent = current.note || 'No instructor note for this step.';
    els.demoModified.hidden = !Practice.demoStepModified(state);
    document.querySelectorAll('[data-demo-compare]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoCompare === demo.compareWith)));
    const inputKey = `${demo.title}:${demo.index}:${current.label}:${current.note}`;
    if (inputKey !== demoInputKey) {
      els.demoLabelInput.value = current.label;
      els.demoNoteInput.value = current.note;
      demoInputKey = inputKey;
    }
    els.demoRemoveButton.disabled = demo.steps.length <= 1;
  }

  function goDemo(index) {
    if (!state.demo) return;
    commitIntent({ type: 'demo-goto', index }, { history: false });
  }

  function toggleBlink() {
    if (blinkActive) {
      stopBlink();
      renderComparison();
      scheduleCanvasRender();
      return;
    }
    blinkActive = true;
    blinkPhase = false;
    renderComparison();
    scheduleCanvasRender();
    blinkTimer = window.setInterval(() => {
      blinkPhase = !blinkPhase;
      renderComparison();
      scheduleCanvasRender();
    }, 650);
  }

  function stopBlink() {
    if (blinkTimer) clearInterval(blinkTimer);
    blinkTimer = 0;
    blinkActive = false;
    blinkPhase = false;
    els.blinkButton.setAttribute('aria-pressed', 'false');
  }

  function openShare() {
    const link = fullStateLink();
    els.shareLinkField.value = link;
    els.shareStatus.textContent = `Full state · ${state.schema} · ${link.length} characters`;
    els.importError.hidden = true;
    if (typeof els.shareDialog.showModal === 'function') els.shareDialog.showModal();
    else els.shareDialog.setAttribute('open', '');
  }

  async function copyText(text, success) {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (error) {
      if (els.shareDialog.open) {
        els.shareLinkField.value = text;
        els.shareLinkField.select();
        try { copied = document.execCommand('copy'); } catch (fallbackError) { copied = false; }
      }
    }
    if (copied) showToast(success);
    else showToast('Copy is unavailable. Open Share & files and copy the selected link.', true);
  }

  function exportJSON() {
    const blob = new Blob([Practice.exportPracticeJSON(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shader-practice-${state.scenarioId}-${state.seed.replace(/[^a-z0-9_-]+/gi, '-')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast(state.demo ? 'Demonstration JSON exported.' : 'Practice JSON exported.');
  }

  async function importFile() {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (!file) return;
    try {
      const imported = Practice.importPracticeJSON(await file.text());
      stopBlink();
      setState(imported, { clearHistory: true, syncLocation: true });
      els.importError.hidden = true;
      els.shareDialog.close();
      showToast('Practice JSON imported.');
    } catch (error) {
      els.importError.textContent = error.message;
      els.importError.hidden = false;
      showToast(error.message, true);
    } finally {
      els.fileInput.value = '';
    }
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* storage is optional */ }
    renderTheme();
    scheduleCanvasRender();
  }

  function renderTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    els.themeButton.setAttribute('aria-pressed', String(dark));
    els.themeButton.setAttribute('aria-label', `Show ${dark ? 'light' : 'dark'} theme`);
    els.themeLabel.textContent = `Show ${dark ? 'light' : 'dark'}`;
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = dark ? '#15191e' : '#f4f6f8';
  }

  function migrateTheme() {
    try {
      if (!localStorage.getItem(THEME_KEY)) {
        const legacy = localStorage.getItem(LEGACY_THEME_KEY);
        if (legacy === 'dark' || legacy === 'light') localStorage.setItem(THEME_KEY, legacy);
      }
    } catch (error) { /* storage is optional */ }
    renderTheme();
  }

  function handleResize() {
    if (isWide() && sidePanel === 'control') sidePanel = 'exercise';
    updateVisibility();
    renderScopes();
    renderComparison();
    scheduleCanvasRender();
  }

  async function controllingWorkerVersion() {
    const controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!controller) return '';
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(''), 1400);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        resolve(String(event.data && event.data.version || ''));
      };
      controller.postMessage({ type: 'SBD_OFFLINE_VERSION' }, [channel.port2]);
    });
  }

  async function markOfflineReady() {
    const version = await controllingWorkerVersion();
    if (version !== OFFLINE_VERSION) return false;
    document.documentElement.dataset.offline = 'ready';
    els.offlineStatus.textContent = 'Offline ready · practice files saved on this device.';
    return true;
  }

  async function prepareOfflineUse() {
    if (location.protocol === 'file:' || !('serviceWorker' in navigator)) {
      document.documentElement.dataset.offline = 'unavailable';
      els.offlineStatus.textContent = 'Offline cache unavailable in this browser.';
      return;
    }
    try {
      document.documentElement.dataset.offline = 'installing';
      els.offlineStatus.textContent = 'Preparing offline use.';
      const registration = await navigator.serviceWorker.register('./practice-worker.js');
      await navigator.serviceWorker.ready;
      if (await markOfflineReady()) return;
      navigator.serviceWorker.addEventListener('controllerchange', () => { markOfflineReady(); }, { once: true });
      if (registration.active) registration.active.postMessage({ type: 'SBD_CLAIM_CLIENTS' });
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('Shader practice offline cache unavailable', error);
      document.documentElement.dataset.offline = 'error';
      els.offlineStatus.textContent = 'Offline cache could not be prepared; stay online to reopen this practice.';
    }
  }

  function exposePublicApi() {
    window.ShaderPracticeApp = Object.freeze({
      getState: () => clone(state),
      setState: value => setState(value, { clearHistory: true }),
      importJSON: value => setState(Practice.importPracticeJSON(value), { clearHistory: true }),
      queryLink,
      fullStateLink
    });
  }

  function initialize() {
    migrateTheme();
    initializeLists();
    bindEvents();
    exposePublicApi();
    render();
    prepareOfflineUse();
  }

  initialize();
})();
