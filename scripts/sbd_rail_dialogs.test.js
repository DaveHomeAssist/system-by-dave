'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadRuntime() {
  const context = { self: {}, URL };
  vm.createContext(context);
  for (const file of ['js/sbd-registry.js', 'js/sbd-rail.js', 'js/sbd-rail-dialogs.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  return {
    rail: context.self.SBD_RAIL,
    dialogs: context.self.SBD_RAIL_DIALOGS,
    registry: context.self.SBD_REGISTRY
  };
}

class MemoryStorage {
  constructor(initial = {}) {
    this.data = { ...initial };
    this.getCalls = [];
    this.setCalls = [];
  }

  getItem(key) {
    this.getCalls.push(key);
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }

  setItem(key, value) {
    this.setCalls.push([key, String(value)]);
    this.data[key] = String(value);
  }
}

class FakeEventTarget {
  constructor() { this.listeners = new Map(); }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((candidate) => candidate !== listener));
  }

  dispatch(type, fields = {}) {
    const event = { type, preventDefault() { this.defaultPrevented = true; }, ...fields };
    (this.listeners.get(type) || []).slice().forEach((listener) => listener(event));
    return event;
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tagName, ownerDocument, namespace = null) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.namespace = namespace;
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.disabled = false;
    this.hidden = false;
    this.type = '';
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  replaceChildren(...children) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }

  focus() { this.ownerDocument.activeElement = this; }
}

class FakeDocument {
  constructor() { this.activeElement = null; }
  createElement(tagName) { return new FakeElement(tagName, this); }
  createElementNS(namespace, tagName) { return new FakeElement(tagName, this, namespace); }
}

function descendants(element) {
  return element.children.flatMap((child) => [child, ...descendants(child)]);
}

function hasClass(element, className) {
  return element.className.split(/\s+/).includes(className);
}

function elementsByClass(root, className) {
  return descendants(root).filter((element) => hasClass(element, className));
}

function elementsByAttribute(root, name, value) {
  return descendants(root).filter((element) => element.getAttribute(name) === value);
}

function action(root, reference, name) {
  return descendants(root).find((element) => element.getAttribute('data-rail-ref') === reference && element.getAttribute('data-action') === name);
}

function click(element) {
  assert.ok(element, 'expected an actionable element');
  element.dispatch('click');
}

function draftEnvelope(consoleId = 'av-video') {
  return JSON.stringify({
    v: 1,
    console: consoleId,
    at: '2026-10-05T22:30:00.000Z',
    baseline: null,
    doc: { title: 'Unsaved plan' }
  });
}

test('dialog runtime loads without touching the DOM or storage', () => {
  const { dialogs } = loadRuntime();
  assert.equal(dialogs.version, 'sbd.rail.dialogs.v1');
  assert.equal(dialogs.draftEventName, 'sbd:console-draft-change');
});

test('typed route resolution carries context only to eligible internal destinations', () => {
  const { dialogs, registry } = loadRuntime();
  const options = {
    registry,
    baseUrl: 'https://avbydave.com/',
    sourceUrl: 'https://avbydave.com/av-video/?sbdShow=Gala&sbdVenue=Hall&sbdDate=2026-10-05&sbdOperator=Dave&sbdPhase=show&private=drop#source'
  };

  const consoleRoute = new URL(dialogs.resolveRoute('console:av-video', options).href);
  assert.equal(consoleRoute.origin, 'https://avbydave.com');
  assert.equal(consoleRoute.pathname, '/av-video/');
  assert.equal(consoleRoute.searchParams.get('sbdShow'), 'Gala');
  assert.equal(consoleRoute.searchParams.get('sbdVenue'), 'Hall');
  assert.equal(consoleRoute.searchParams.has('private'), false);
  assert.equal(consoleRoute.hash, '');

  const familyRoute = new URL(dialogs.resolveRoute('family:audio', options).href);
  assert.equal(familyRoute.searchParams.get('entry'), 'toolbox');
  assert.equal(familyRoute.searchParams.get('family'), 'audio');
  assert.equal(familyRoute.searchParams.has('sbdShow'), false);

  const toolboxRoute = new URL(dialogs.resolveRoute('toolbox', options).href);
  assert.equal(toolboxRoute.searchParams.get('entry'), 'toolbox');
  assert.equal(toolboxRoute.searchParams.has('sbdShow'), false);

  const cueForge = new URL(dialogs.resolveRoute('external:cueforge', options).href);
  assert.equal(cueForge.href, 'https://systembydave.com/cueforge.html');
  const plotForge = new URL(dialogs.resolveRoute('external:plotforge', options).href);
  assert.equal(plotForge.href, 'https://avbydave.com/plotforge.html');
  assert.equal(plotForge.searchParams.has('sbdShow'), false);

  registry.tools.push({ id: 'route-fixture', name: 'Route fixture', href: 'fixture.html?mode=keep#anchor' });
  const fixture = new URL(dialogs.resolveRoute('tool:route-fixture', options).href);
  assert.equal(fixture.searchParams.get('mode'), 'keep');
  assert.equal(fixture.searchParams.get('sbdShow'), 'Gala');
  assert.equal(fixture.hash, '#anchor');
  registry.tools.push({ id: 'unsafe-fixture', name: 'Unsafe fixture', href: 'javascript:alert(1)' });
  assert.equal(dialogs.resolveRoute('tool:unsafe-fixture', options).code, 'unsafe-protocol');

  const audioConsole = new URL(dialogs.resolveRoute('console:audio', options).href);
  assert.equal(audioConsole.pathname, '/av-audio/');
  assert.equal(audioConsole.searchParams.get('sbdShow'), 'Gala');
  assert.equal(dialogs.resolveRoute('external:arenaops', options).code, 'not-navigable');
  assert.equal(dialogs.resolveRoute('tool:cueforge', options).code, 'unknown-reference');
});

test('draft reads validate the direct console key without writing or trusting the index', () => {
  const { dialogs, registry } = loadRuntime();
  const storage = new MemoryStorage({
    'sbd.avVideo.draft.v1': draftEnvelope(),
    'sbd.consoleDrafts.v1': '{stale index'
  });

  assert.equal(dialogs.readDraftState('console:av-video', { registry, storage }).status, 'present');
  assert.equal(dialogs.readDraftState('console:audio', { registry, storage }).status, 'not-applicable');
  assert.deepEqual(storage.setCalls, []);

  storage.data['sbd.avVideo.draft.v1'] = draftEnvelope('audio');
  assert.equal(dialogs.readDraftState('console:av-video', { registry, storage }).status, 'unavailable');
  storage.data['sbd.avVideo.draft.v1'] = '{broken';
  assert.equal(dialogs.readDraftState('console:av-video', { registry, storage }).label, 'Draft state unavailable');
  delete storage.data['sbd.avVideo.draft.v1'];
  assert.equal(dialogs.readDraftState('console:av-video', { registry, storage }).status, 'none');
  assert.deepEqual(storage.setCalls, []);
});

test('draft observer refreshes same-tab, cross-tab, clear, and page-restore invalidations', () => {
  const { dialogs, registry } = loadRuntime();
  const storage = new MemoryStorage();
  const target = new FakeEventTarget();
  const changes = [];
  const observer = dialogs.createDraftObserver({
    registry,
    storage,
    eventTarget: target,
    initial: false,
    onChange: (reference, state) => changes.push([reference, state.status])
  });

  storage.data['sbd.avVideo.draft.v1'] = draftEnvelope();
  target.dispatch('sbd:console-draft-change', { detail: { consoleId: 'av-video' } });
  delete storage.data['sbd.avVideo.draft.v1'];
  target.dispatch('storage', { key: 'sbd.avVideo.draft.v1' });
  storage.data['sbd.avVideo.draft.v1'] = '{bad';
  target.dispatch('pageshow');
  assert.deepEqual(changes, [
    ['console:av-video', 'present'],
    ['console:av-video', 'none'],
    ['console:av-video', 'unavailable']
  ]);
  assert.deepEqual(storage.setCalls, []);

  observer.destroy();
  target.dispatch('pageshow');
  assert.equal(changes.length, 3);
});

test('All apps and Customize dialogs preserve truthful status, focus, and explicit writes', () => {
  const { rail, dialogs, registry } = loadRuntime();
  const preferenceStorage = new MemoryStorage();
  const draftStorage = new MemoryStorage({ 'sbd.avVideo.draft.v1': draftEnvelope() });
  const preferenceStore = rail.createPreferenceStore({ storage: preferenceStorage, registry });
  const eventTarget = new FakeEventTarget();
  const document = new FakeDocument();
  const container = new FakeElement('div', document);
  const allTrigger = new FakeElement('button', document);
  const customizeTrigger = new FakeElement('button', document);
  const controller = dialogs.create({
    container,
    registry,
    preferenceStore,
    draftStorage,
    eventTarget,
    currentRef: 'console:av-video',
    baseUrl: 'https://avbydave.com/',
    sourceUrl: 'https://avbydave.com/av-video/?sbdShow=Gala',
    idPrefix: 'testRail'
  });

  controller.openAllApps(allTrigger);
  assert.equal(controller.allAppsDialog.hidden, false);
  assert.equal(allTrigger.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Close All apps');
  const consoleCards = descendants(controller.allAppsDialog).filter((element) => (element.getAttribute('data-rail-ref') || '').startsWith('console:'));
  assert.equal(consoleCards.length, 9);
  const plannedCards = consoleCards.filter((element) => element.getAttribute('data-entry-type') === 'Planned console');
  assert.equal(plannedCards.length, 0);
  consoleCards.forEach((card) => {
    assert.equal(card.tagName, 'A');
    assert.equal(card.hasAttribute('href'), true);
  });
  const avVideo = elementsByAttribute(controller.allAppsDialog, 'data-rail-ref', 'console:av-video')[0];
  assert.equal(avVideo.tagName, 'A');
  assert.equal(new URL(avVideo.getAttribute('href')).searchParams.get('sbdShow'), 'Gala');
  assert.equal(avVideo.getAttribute('aria-current'), 'page');
  assert.equal(elementsByClass(avVideo, 'sbd-rail-dialog__draft')[0].textContent, 'Unsaved draft');
  const audioConsole = elementsByAttribute(controller.allAppsDialog, 'data-rail-ref', 'console:audio')[0];
  assert.equal(new URL(audioConsole.getAttribute('href')).pathname, '/av-audio/');
  assert.equal(new URL(audioConsole.getAttribute('href')).searchParams.get('sbdShow'), 'Gala');
  controller.setCurrentRef('console:audio');
  assert.equal(avVideo.hasAttribute('aria-current'), false);
  assert.equal(audioConsole.getAttribute('aria-current'), 'page');
  ['av-audio', 'show-control', 'show-ops', 'front-office', 'the-shop', 'infrastructure', 'av-lighting', 'av-calculator'].forEach((toolId) => {
    assert.equal(elementsByAttribute(controller.allAppsDialog, 'data-rail-ref', `tool:${toolId}`).length, 0);
  });
  const audioFamily = elementsByAttribute(controller.allAppsDialog, 'data-rail-ref', 'family:audio')[0];
  assert.equal(new URL(audioFamily.getAttribute('href')).searchParams.has('sbdShow'), false);
  const cueForge = elementsByAttribute(controller.allAppsDialog, 'data-rail-ref', 'external:cueforge')[0];
  assert.equal(cueForge.getAttribute('href'), 'https://systembydave.com/cueforge.html');
  const arenaOps = elementsByAttribute(controller.allAppsDialog, 'data-rail-ref', 'external:arenaops')[0];
  assert.equal(arenaOps.tagName, 'DIV');
  assert.equal(arenaOps.hasAttribute('href'), false);
  assert.equal(action(controller.customizeDialog, 'external:arenaops', 'pin'), undefined);
  assert.equal(preferenceStorage.setCalls.length, 0);

  click(action(controller.allAppsDialog, 'rail', 'customize'));
  assert.equal(controller.allAppsDialog.hidden, true);
  assert.equal(controller.customizeDialog.hidden, false);
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Close Customize rail');
  controller.closeCustomize();
  assert.equal(document.activeElement, allTrigger);
  assert.equal(preferenceStorage.setCalls.length, 0);

  controller.openAllApps(allTrigger);
  controller.allAppsDialog.dispatch('keydown', { key: 'Escape' });
  assert.equal(controller.allAppsDialog.hidden, true);
  assert.equal(document.activeElement, allTrigger);

  controller.openCustomize(customizeTrigger);
  assert.equal(preferenceStorage.setCalls.length, 0);
  click(action(controller.customizeDialog, 'console:audio', 'unpin'));
  assert.equal(preferenceStorage.setCalls.length, 1);
  assert.equal(JSON.parse(preferenceStorage.data['sbd.rail.v1']).pinned.includes('console:audio'), false);
  assert.equal(document.activeElement.getAttribute('data-action'), 'pin');
  click(action(controller.customizeDialog, 'console:audio', 'pin'));
  assert.equal(preferenceStorage.setCalls.length, 2);
  assert.equal(JSON.parse(preferenceStorage.data['sbd.rail.v1']).pinned.at(-1), 'console:audio');
  assert.equal(document.activeElement.getAttribute('data-action'), 'unpin');
  click(action(controller.customizeDialog, 'console:audio', 'move-up'));
  assert.equal(preferenceStorage.setCalls.length, 3);
  assert.equal(controller.customizeDialog.children[1].textContent, 'Audio moved to position 8 of 9.');
  assert.equal(document.activeElement.getAttribute('data-action'), 'move-up');
  click(action(controller.customizeDialog, 'defaults', 'reset'));
  assert.deepEqual(JSON.parse(preferenceStorage.data['sbd.rail.v1']).pinned, Array.from(registry.rail.defaultPinned));
  assert.equal(draftStorage.setCalls.length, 0);

  const replacementTrigger = new FakeElement('button', document);
  controller.setCustomizeTrigger(replacementTrigger);
  controller.closeCustomize();
  assert.equal(document.activeElement, replacementTrigger);
  controller.destroy();
  assert.equal(container.children.length, 0);
});

test('dialog stylesheet provides bounded responsive and accessible foundations', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/sbd-rail-dialogs.css'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'js/sbd-rail-dialogs.js'), 'utf8');
  assert.match(css, /max-height: min\(760px, calc\(100dvh - 32px\)\)/);
  assert.match(css, /overflow: auto;/);
  assert.match(runtime, /data-web2-scroll/);
  assert.match(css, /min-width: 44px;[\s\S]*min-height: 44px;/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 719px\)/);
  assert.match(css, /height: 100dvh;/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media print/);
});
