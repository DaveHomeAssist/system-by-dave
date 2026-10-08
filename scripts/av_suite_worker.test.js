'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'av-suite-worker.js'), 'utf8');
const registrySource = fs.readFileSync(path.join(__dirname, '..', 'js/sbd-registry.js'), 'utf8');

for (const destination of ['script', 'style']) {
  test(`${destination} falls back to a cached copy on an HTTP 503`, async () => {
    const listeners = {};
    const url = `https://example.test/js/tool.${destination === 'script' ? 'js' : 'css'}`;
    const cached = new Response('cached asset', { status: 200 });
    const cache = {
      match: async () => cached.clone(),
      put: async () => assert.fail('An unsuccessful response must not replace the cache')
    };
    const context = {
      URL, Response, Promise,
      importScripts: () => {},
      caches: { open: async () => cache },
      fetch: async (_request, options) => {
        assert.equal(options.cache, 'no-cache');
        return new Response('origin unavailable', { status: 503 });
      },
      self: {
        location: { origin: 'https://example.test' },
        registration: { scope: 'https://example.test/' },
        SBD_REGISTRY: { version: 'test', offlineAssets: () => [`./js/tool.${destination === 'script' ? 'js' : 'css'}`] },
        addEventListener: (type, listener) => { listeners[type] = listener; }
      }
    };
    vm.runInNewContext(source, context, { filename: 'av-suite-worker.js' });
    let responsePromise;
    listeners.fetch({
      request: { url, method: 'GET', mode: 'no-cors', destination },
      respondWith: promise => { responsePromise = promise; }
    });
    assert.equal(await (await responsePromise).text(), 'cached asset');
  });
}

test('install precaches every local Rail asset in the bumped cache generation', async () => {
  const registryContext = { self: {} };
  vm.createContext(registryContext);
  vm.runInContext(registrySource, registryContext, { filename: 'js/sbd-registry.js' });
  const registry = registryContext.self.SBD_REGISTRY;
  const listeners = {};
  const critical = [];
  const optional = [];
  const cache = {
    addAll: async assets => { critical.push(...assets); },
    add: async asset => { optional.push(asset); }
  };
  const context = {
    URL, Response, Promise,
    importScripts: () => {},
    caches: { open: async name => {
      assert.equal(name, 'sbd-av-suite-v20261008-front-office-show-advance');
      return cache;
    } },
    fetch: async () => new Response('ok'),
    self: {
      SBD_REGISTRY: registry,
      location: { origin: 'https://example.test' },
      registration: { scope: 'https://example.test/' },
      skipWaiting: async () => {},
      addEventListener: (type, listener) => { listeners[type] = listener; }
    }
  };
  vm.runInNewContext(source, context, { filename: 'av-suite-worker.js' });
  let installPromise;
  listeners.install({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;

  const railAssets = [
    './css/sbd-rail.css',
    './css/sbd-rail-dialogs.css',
    './js/sbd-rail.js',
    './js/sbd-rail-dialogs.js',
    './js/sbd-rail-mount.js'
  ];
  railAssets.forEach(asset => assert.ok(optional.includes(asset), `${asset} was not precached`));
  assert.equal(critical.some(asset => railAssets.includes(asset)), false);
  assert.equal(registry.offlineAssets().some(asset => /^https?:/.test(asset)), false);
});
