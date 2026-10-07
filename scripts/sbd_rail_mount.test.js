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

test('production mount wires typed routes, dialogs, explicit reset, and focus-safe rerenders', () => {
  const context = { self: {}, URL };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/sbd-rail-mount.js' });

  const host = new Host('console:av-video');
  const dialogHost = {};
  const storage = {};
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
    render(container, options) {
      assert.equal(container, host);
      renderOptions.push(options);
      const railNode = { focusCalls: 0, focus() { this.focusCalls += 1; } };
      const result = {
        rail: railNode,
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
    openAllApps(trigger) { this.allTrigger = trigger; },
    openCustomize(trigger) { this.customizeTrigger = trigger; },
    setCustomizeTrigger(trigger) { this.replacementTrigger = trigger; },
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
    sourceUrl: 'https://avbydave.com/av-video/?sbdShow=Gala',
    baseUrl: 'https://avbydave.com/'
  });

  assert.equal(mounted.ok, true);
  assert.equal(host.getAttribute('data-rail-state'), 'ready');
  assert.equal(dialogOptions.currentRef, 'console:av-video');
  assert.equal(dialogOptions.draftStorage, storage);
  assert.equal(renderOptions[0].toolboxHref, 'https://avbydave.com/toolbox');
  assert.equal(renderOptions[0].resolveHref({ ref: 'console:av-video', href: 'fallback' }), 'https://avbydave.com/console:av-video');

  const appsTrigger = {};
  const customizeTrigger = {};
  renderOptions[0].onAllApps({ currentTarget: appsTrigger });
  renderOptions[0].onCustomize({ currentTarget: customizeTrigger });
  assert.equal(controller.allTrigger, appsTrigger);
  assert.equal(controller.customizeTrigger, customizeTrigger);

  dialogOptions.onPreferencesChange({ state: { status: 'saved' } });
  assert.equal(renderOptions.length, 2);
  assert.equal(controller.replacementTrigger, mounted.rendered().customizeButton);

  renderOptions[1].onResetPreferences();
  assert.equal(store.resetCalls, 1);
  assert.equal(renderOptions.length, 3);
  assert.equal(railNodes.at(-1).focusCalls, 1);
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
