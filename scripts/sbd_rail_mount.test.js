'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/sbd-rail-mount.js'), 'utf8');

class Host {
  constructor(currentRef = '') {
    this.attributes = new Map();
    if (currentRef) this.attributes.set('data-current-ref', currentRef);
  }

  getAttribute(name) { return this.attributes.get(name) || null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
}

class FakeCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
    this.cancelable = Boolean(options.cancelable);
    this.defaultPrevented = false;
  }

  preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
}

class EventBus {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) { this.listeners.set(type, [...(this.listeners.get(type) || []), listener]); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== listener)); }
  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return !event.defaultPrevented;
  }
}

test('production mount wires typed routes, dialogs, explicit reset, and focus-safe rerenders', () => {
  const context = { self: { CustomEvent: FakeCustomEvent }, URL };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/sbd-rail-mount.js' });

  const host = new Host('console:av-video');
  const dialogHost = {};
  const storage = {};
  const eventTarget = new EventBus();
  const registry = { version: 'fixture' };
  const store = {
    resetCalls: 0,
    reset() { this.resetCalls += 1; return { state: { status: 'saved' } }; }
  };
  const renderOptions = [];
  const railNodes = [];
  const rail = {
    createPreferenceStore(options) {
      assert.equal(options.registry, registry);
      assert.equal(options.storage, storage);
      return store;
    },
    resolveRef(reference) {
      if (!reference.startsWith('console:')) return null;
      return { ref: reference, id: reference.slice(8), namespace: 'console' };
    },
    render(container, options) {
      assert.equal(container, host);
      renderOptions.push(options);
      const railNode = { focusCalls: 0, focus() { this.focusCalls += 1; } };
      const result = {
        state: options.state || { status: 'default' },
        rail: railNode,
        launcher: { id: `launcher-${renderOptions.length}` },
        allAppsButton: { id: `all-${renderOptions.length}` },
        customizeButton: { id: `customize-${renderOptions.length}` },
        destroy() {}
      };
      railNodes.push(railNode);
      return result;
    }
  };
  let dialogOptions;
  const controller = {
    allTrigger: null,
    customizeTrigger: null,
    replacementTrigger: null,
    closeAllAppsCalls: 0,
    getCustomizeTrigger() { return this.customizeTrigger; },
    openAllApps(trigger) { this.allTrigger = trigger; },
    openCustomize(trigger) { this.customizeTrigger = trigger; },
    setCustomizeTrigger(trigger) { this.customizeTrigger = trigger; this.replacementTrigger = trigger; },
    closeAllApps() { this.closeAllAppsCalls += 1; },
    destroy() {}
  };
  const dialogs = {
    resolveRoute(reference, options) {
      assert.equal(options.registry, registry);
      assert.equal(options.baseUrl, 'https://avbydave.com/');
      return { ok: true, href: `https://avbydave.com/${reference}` };
    },
    create(options) { dialogOptions = options; return controller; }
  };

  const mounted = context.self.SBD_RAIL_MOUNT.mount({
    host,
    dialogHost,
    rail,
    dialogs,
    registry,
    storage,
    eventTarget,
    sourceUrl: 'https://avbydave.com/av-video/?sbdShow=Gala',
    baseUrl: 'https://avbydave.com/'
  });

  assert.equal(mounted.ok, true);
  assert.equal(host.getAttribute('data-rail-state'), 'ready');
  assert.equal(dialogOptions.currentRef, 'console:av-video');
  assert.equal(dialogOptions.draftStorage, storage);
  assert.equal(renderOptions[0].toolboxHref, 'https://avbydave.com/toolbox');
  assert.equal(renderOptions[0].resolveHref({ ref: 'console:av-video', href: 'fallback' }), 'https://avbydave.com/console:av-video');
  assert.equal(typeof renderOptions[0].onNavigate, 'function');
  assert.equal(dialogOptions.onNavigate, renderOptions[0].onNavigate);

  const appsTrigger = {};
  const customizeTrigger = {};
  renderOptions[0].onAllApps({ currentTarget: appsTrigger });
  renderOptions[0].onCustomize({ currentTarget: customizeTrigger });
  assert.equal(controller.allTrigger, appsTrigger);
  assert.equal(controller.customizeTrigger, customizeTrigger);

  dialogOptions.onPreferencesChange({ state: { status: 'saved' } });
  assert.equal(renderOptions.length, 2);
  assert.equal(controller.replacementTrigger, mounted.rendered().customizeButton);

  controller.customizeTrigger = mounted.rendered().launcher;
  dialogOptions.onPreferencesChange({ state: { status: 'saved' } });
  assert.equal(renderOptions.length, 3);
  assert.equal(controller.replacementTrigger, mounted.rendered().launcher);

  controller.customizeTrigger = mounted.rendered().allAppsButton;
  dialogOptions.onPreferencesChange({ state: { status: 'saved' } });
  assert.equal(renderOptions.length, 4);
  assert.equal(controller.replacementTrigger, mounted.rendered().allAppsButton);

  renderOptions[3].onResetPreferences();
  assert.equal(store.resetCalls, 1);
  assert.equal(renderOptions.length, 5);
  assert.equal(railNodes.at(-1).focusCalls, 1);

  eventTarget.addEventListener('sbd:rail-console-select', event => event.preventDefault());
  const navigation = { prevented: false, button: 0, preventDefault() { this.prevented = true; } };
  renderOptions.at(-1).onNavigate({ ref: 'console:audio', id: 'audio', namespace: 'console', href: 'av-audio/' }, navigation);
  assert.equal(navigation.prevented, true);
  assert.equal(host.getAttribute('data-current-ref'), 'console:audio');
  assert.equal(renderOptions.at(-1).currentRef, 'console:audio');
  assert.equal(controller.closeAllAppsCalls, 1);

  eventTarget.dispatchEvent(new FakeCustomEvent('sbd:console-snapshot-active', { detail: { ref: 'console:av-video' } }));
  assert.equal(host.getAttribute('data-current-ref'), 'console:av-video');
  assert.equal(renderOptions.at(-1).currentRef, 'console:av-video');

  const renderCount = renderOptions.length;
  mounted.destroy();
  eventTarget.dispatchEvent(new FakeCustomEvent('sbd:console-snapshot-active', { detail: { ref: 'console:audio' } }));
  assert.equal(renderOptions.length, renderCount, 'destroy removes the active snapshot listener');
});

test('missing mount dependencies fail closed without throwing', () => {
  const context = { self: {}, URL };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/sbd-rail-mount.js' });
  const host = new Host();
  const result = context.self.SBD_RAIL_MOUNT.mount({ host, dialogHost: null });
  assert.deepEqual({ ok: result.ok, code: result.code }, { ok: false, code: 'dependency-missing' });
  assert.equal(host.getAttribute('data-rail-state'), 'unavailable');
});
