'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadRuntime() {
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sbd-registry.js'), 'utf8'), context, { filename: 'js/sbd-registry.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sbd-rail.js'), 'utf8'), context, { filename: 'js/sbd-rail.js' });
  return { rail: context.self.SBD_RAIL, registry: context.self.SBD_REGISTRY };
}

class MemoryStorage {
  constructor(initial = {}, options = {}) {
    this.data = { ...initial };
    this.options = options;
    this.getCalls = [];
    this.setCalls = [];
  }

  getItem(key) {
    this.getCalls.push(key);
    if (this.options.throwOnGet) throw new Error('get blocked');
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }

  setItem(key, value) {
    this.setCalls.push([key, value]);
    if (this.options.throwOnSet) throw new Error('set blocked');
    this.data[key] = String(value);
  }
}

class FakeElement {
  constructor(tagName, ownerDocument, namespace = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.namespace = namespace;
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.className = '';
    this.textContent = '';
    this.disabled = false;
    this.type = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatch(type) {
    const event = { type, target: this, preventDefault() {} };
    (this.listeners.get(type) || []).forEach((listener) => listener(event));
  }
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createElementNS(namespace, tagName) {
    return new FakeElement(tagName, this, namespace);
  }
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

test('runtime loads without a DOM or storage side effect', () => {
  const { rail } = loadRuntime();
  assert.equal(rail.version, 'sbd.rail.runtime.v1');
  assert.equal(rail.storageKey, 'sbd.rail.v1');
});

test('missing preferences read the exact nine-console defaults without writing', () => {
  const { rail, registry } = loadRuntime();
  const storage = new MemoryStorage({ unrelated: 'keep' });
  const store = rail.createPreferenceStore({ storage, registry });
  const state = store.read();

  assert.equal(state.status, 'default');
  assert.deepEqual(Array.from(state.pinned), Array.from(registry.rail.defaultPinned));
  assert.deepEqual(Array.from(state.visibleRefs), Array.from(registry.rail.defaultPinned));
  assert.deepEqual(Array.from(state.suppressedRefs), []);
  assert.equal(state.resetRequired, false);
  assert.deepEqual(storage.getCalls, ['sbd.rail.v1']);
  assert.deepEqual(storage.setCalls, []);
  assert.equal(storage.data.unrelated, 'keep');
});

test('saved preferences dedupe exact refs, retain unknown refs, and reject status-only refs', () => {
  const { rail, registry } = loadRuntime();
  const stored = {
    version: 1,
    pinned: ['console:audio', 'tool:throwline', 'console:audio', 'console:future', 'external:arenaops']
  };
  const storage = new MemoryStorage({ 'sbd.rail.v1': JSON.stringify(stored) });
  const state = rail.createPreferenceStore({ storage, registry }).read();

  assert.equal(state.status, 'saved');
  assert.deepEqual(Array.from(state.pinned), ['console:audio', 'tool:throwline', 'console:future', 'external:arenaops']);
  assert.deepEqual(Array.from(state.visibleRefs), ['console:audio', 'tool:throwline']);
  assert.deepEqual(Array.from(state.suppressedRefs), ['console:future']);
  assert.deepEqual(Array.from(state.rejectedRefs), ['external:arenaops']);
  assert.deepEqual(storage.setCalls, []);
});

test('explicit edits keep unresolved refs after visible refs and never alias IDs', () => {
  const { rail, registry } = loadRuntime();
  const storage = new MemoryStorage({
    'sbd.rail.v1': JSON.stringify({
      version: 1,
      pinned: ['console:audio', 'console:future', 'console:av-video', 'external:arenaops']
    }),
    unrelated: 'keep'
  });
  const store = rail.createPreferenceStore({ storage, registry });

  assert.equal(store.move('console:av-video', 0).ok, true);
  assert.deepEqual(JSON.parse(storage.data['sbd.rail.v1']).pinned, [
    'console:av-video', 'console:audio', 'console:future'
  ]);

  assert.equal(store.pin('console:lighting', 1).ok, true);
  assert.deepEqual(JSON.parse(storage.data['sbd.rail.v1']).pinned, [
    'console:av-video', 'console:lighting', 'console:audio', 'console:future'
  ]);

  assert.equal(store.unpin('console:audio').ok, true);
  assert.deepEqual(JSON.parse(storage.data['sbd.rail.v1']).pinned, [
    'console:av-video', 'console:lighting', 'console:future'
  ]);

  assert.equal(store.pin('tool:cueforge').code, 'not-pinnable');
  assert.equal(store.pin('external:arenaops').code, 'not-pinnable');
  assert.equal(store.pin('external:cueforge', 0).ok, true);
  assert.deepEqual(JSON.parse(storage.data['sbd.rail.v1']).pinned, [
    'external:cueforge', 'console:av-video', 'console:lighting', 'console:future'
  ]);
  assert.equal(storage.data.unrelated, 'keep');
});

test('typed resolution stays exact across console, family, tool, and external namespaces', () => {
  const { rail, registry } = loadRuntime();

  const plannedCalculator = rail.resolveRef('console:av-calculator', registry);
  assert.equal(plannedCalculator.availability, 'planned');
  assert.equal(plannedCalculator.navigable, false);
  assert.equal(plannedCalculator.href, null);

  const audioFamily = rail.resolveRef('family:audio', registry);
  assert.equal(audioFamily.href, 'av-suite.html?entry=toolbox&family=audio');
  assert.ok(audioFamily.icon.length > 0);

  const throwline = rail.resolveRef('tool:throwline', registry);
  assert.equal(throwline.href, 'ProjectorThrow/');
  assert.ok(throwline.icon.length > 0);

  const cueForge = rail.resolveRef('external:cueforge', registry);
  assert.equal(cueForge.href, 'https://systembydave.com/cueforge.html');
  assert.ok(cueForge.icon.length > 0);
  assert.equal(rail.resolveRef('tool:cueforge', registry), null);
  assert.equal(rail.resolveRef('tool:plotforge', registry), null);
});

test('unreadable and unsupported payloads require an explicit reset', () => {
  const { rail, registry } = loadRuntime();

  for (const raw of ['{bad json', JSON.stringify({ version: 2, pinned: ['console:audio'] })]) {
    const storage = new MemoryStorage({ 'sbd.rail.v1': raw, unrelated: 'keep' });
    const store = rail.createPreferenceStore({ storage, registry });
    const state = store.read();

    assert.equal(state.resetRequired, true);
    assert.deepEqual(Array.from(state.visibleRefs), Array.from(registry.rail.defaultPinned));
    assert.equal(store.pin('console:audio').code, 'reset-required');
    assert.deepEqual(storage.setCalls, []);

    const reset = store.reset();
    assert.equal(reset.ok, true);
    assert.deepEqual(JSON.parse(storage.data['sbd.rail.v1']), {
      version: 1,
      pinned: Array.from(registry.rail.defaultPinned)
    });
    assert.equal(storage.data.unrelated, 'keep');
  }
});

test('storage failures are explicit and preserve unrelated data', () => {
  const { rail, registry } = loadRuntime();
  const blockedRead = new MemoryStorage({ unrelated: 'keep' }, { throwOnGet: true });
  const unavailable = rail.createPreferenceStore({ storage: blockedRead, registry });
  assert.equal(unavailable.read().status, 'unavailable');
  assert.equal(unavailable.pin('console:audio').code, 'storage-unavailable');
  assert.deepEqual(blockedRead.setCalls, []);

  const blockedWrite = new MemoryStorage({ unrelated: 'keep' }, { throwOnSet: true });
  const recoveringStore = rail.createPreferenceStore({ storage: blockedWrite, registry });
  const failed = recoveringStore.pin('external:cueforge');
  assert.equal(failed.code, 'storage-error');
  assert.equal(failed.changed, true);
  assert.equal(failed.state.status, 'unsaved');
  assert.equal(failed.state.persisted, false);
  assert.equal(failed.state.visibleRefs.at(-1), 'external:cueforge');
  assert.deepEqual(Array.from(recoveringStore.read().visibleRefs), Array.from(failed.state.visibleRefs));
  assert.equal(blockedWrite.data.unrelated, 'keep');
  assert.equal(Object.prototype.hasOwnProperty.call(blockedWrite.data, 'sbd.rail.v1'), false);

  blockedWrite.options.throwOnSet = false;
  const recovered = recoveringStore.unpin('external:cueforge');
  assert.equal(recovered.ok, true);
  assert.equal(recovered.state.status, 'saved');
  assert.deepEqual(JSON.parse(blockedWrite.data['sbd.rail.v1']).pinned, Array.from(registry.rail.defaultPinned));
});

test('standalone renderer exposes nine ordered slots with eight non-actionable Planned states', () => {
  const { rail, registry } = loadRuntime();
  const storage = new MemoryStorage();
  const store = rail.createPreferenceStore({ storage, registry });
  const document = new FakeDocument();
  const container = new FakeElement('div', document);
  let allAppsCount = 0;
  let customizeCount = 0;

  const rendered = rail.render(container, {
    registry,
    preferenceStore: store,
    currentRef: 'console:av-video',
    onAllApps: () => { allAppsCount += 1; },
    onCustomize: () => { customizeCount += 1; },
    appsDialogId: 'railAppsDialog'
  });

  assert.equal(rendered.entries.length, 9);
  assert.deepEqual(Array.from(rendered.entries, (entry) => entry.getAttribute('data-rail-ref')), Array.from(registry.rail.defaultPinned));
  assert.equal(rendered.rail.tagName, 'NAV');
  assert.equal(rendered.rail.getAttribute('aria-label'), 'Applications');
  assert.equal(rendered.rail.getAttribute('data-web2-scroll'), '');
  assert.equal(rendered.rail.getAttribute('tabindex'), '0');
  assert.equal(rendered.launcher.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(rendered.launcher.getAttribute('aria-controls'), 'railAppsDialog');
  assert.equal(elementsByClass(rendered.shell, 'sbd-rail__toolbox')[0].hasAttribute('aria-current'), false);

  const planned = rendered.entries.filter((entry) => entry.getAttribute('data-status') === 'planned');
  assert.equal(planned.length, 8);
  planned.forEach((entry) => {
    assert.equal(entry.tagName, 'DIV');
    assert.equal(entry.hasAttribute('href'), false);
    assert.equal(entry.getAttribute('tabindex'), '0');
    assert.equal(entry.getAttribute('role'), 'note');
    assert.match(entry.getAttribute('aria-label'), /\. Planned\.$/);
    assert.equal(entry.hasAttribute('aria-current'), false);
    assert.equal(elementsByClass(entry, 'sbd-rail__status')[0].textContent, 'Planned');
  });
  assert.equal(rendered.entries[0].tagName, 'A');
  assert.equal(rendered.entries[0].getAttribute('href'), 'av-video/');
  assert.equal(rendered.entries[0].getAttribute('aria-current'), 'page');

  rendered.launcher.dispatch('click');
  elementsByClass(rendered.shell, 'sbd-rail__all')[0].dispatch('click');
  elementsByClass(rendered.shell, 'sbd-rail__customize')[0].dispatch('click');
  assert.equal(allAppsCount, 2);
  assert.equal(customizeCount, 1);
  assert.deepEqual(storage.setCalls, []);

  rendered.destroy();
  assert.equal(container.children.length, 0);
});

test('standalone renderer marks Toolbox as current only when explicitly selected', () => {
  const { rail, registry } = loadRuntime();
  const document = new FakeDocument();
  const container = new FakeElement('div', document);
  const rendered = rail.render(container, {
    registry,
    currentRef: 'toolbox'
  });

  assert.equal(elementsByClass(rendered.shell, 'sbd-rail__toolbox')[0].getAttribute('aria-current'), 'page');
  assert.equal(rendered.entries.some((entry) => entry.hasAttribute('aria-current')), false);
});

test('rendering a corrupt preference fallback does not reset it implicitly', () => {
  const { rail, registry } = loadRuntime();
  const storage = new MemoryStorage({ 'sbd.rail.v1': '{broken' });
  const store = rail.createPreferenceStore({ storage, registry });
  const document = new FakeDocument();
  const container = new FakeElement('div', document);
  let resetCount = 0;

  const rendered = rail.render(container, {
    registry,
    preferenceStore: store,
    onResetPreferences: () => { resetCount += 1; }
  });
  const notices = elementsByClass(rendered.shell, 'sbd-rail__notice');
  const resetButtons = elementsByClass(rendered.shell, 'sbd-rail__reset');

  assert.equal(notices.length, 1);
  assert.equal(notices[0].getAttribute('role'), 'status');
  assert.equal(resetButtons.length, 1);
  assert.deepEqual(storage.setCalls, []);
  resetButtons[0].dispatch('click');
  assert.equal(resetCount, 1);
  assert.deepEqual(storage.setCalls, []);
});

test('unavailable and unsaved states stay visibly reported without offering reset', () => {
  const { rail, registry } = loadRuntime();
  const document = new FakeDocument();
  let resetCount = 0;
  const onResetPreferences = () => { resetCount += 1; };

  const blockedRead = new MemoryStorage({}, { throwOnGet: true });
  const unavailable = rail.render(new FakeElement('div', document), {
    registry,
    preferenceStore: rail.createPreferenceStore({ storage: blockedRead, registry }),
    onResetPreferences
  });
  const unavailableNotices = elementsByClass(unavailable.shell, 'sbd-rail__notice');
  assert.equal(unavailableNotices.length, 1);
  assert.equal(unavailableNotices[0].getAttribute('role'), 'status');
  assert.equal(unavailableNotices[0].children[0].textContent, 'Rail preferences are unavailable in this browser.');
  assert.equal(elementsByClass(unavailable.shell, 'sbd-rail__reset').length, 0);

  const blockedWrite = new MemoryStorage({}, { throwOnSet: true });
  const failed = rail.createPreferenceStore({ storage: blockedWrite, registry }).pin('external:cueforge');
  const unsaved = rail.render(new FakeElement('div', document), { registry, state: failed.state, onResetPreferences });
  const unsavedNotices = elementsByClass(unsaved.shell, 'sbd-rail__notice');
  assert.equal(unsavedNotices.length, 1);
  assert.match(unsavedNotices[0].children[0].textContent, /could not be saved/);
  assert.equal(elementsByClass(unsaved.shell, 'sbd-rail__reset').length, 0);

  const saved = rail.render(new FakeElement('div', document), {
    registry,
    preferenceStore: rail.createPreferenceStore({ storage: new MemoryStorage(), registry })
  });
  assert.equal(elementsByClass(saved.shell, 'sbd-rail__notice').length, 0);
  assert.equal(resetCount, 0);
});

test('responsive stylesheet encodes the settled breakpoints and accessibility foundations', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/sbd-rail.css'), 'utf8');

  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1440px\)/);
  assert.match(css, /min-width: 44px;[\s\S]*min-height: 44px;/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-y: auto;/);
  assert.match(css, /overscroll-behavior: contain;/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.sbd-rail__entry\.is-planned:focus-visible[\s\S]*overflow-wrap: anywhere;/);
  assert.match(css, /@media print/);
});
