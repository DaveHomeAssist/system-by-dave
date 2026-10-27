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

for (const route of ['av/', 'av/?app=calculator', 'av/index.html?app=calculator']) {
  test(`prepared console ${route} reopens from its index cache offline`, async () => {
    const listeners = {}, index = 'https://example.test/av/index.html';
    const context = {
      URL, Response, Promise, importScripts() {},
      caches: { open: async () => ({
        match: async key => key === index ? new Response('native console') : undefined,
        put: async () => assert.fail('Offline navigation must not write a response')
      }) },
      fetch: async () => { throw new Error('offline'); },
      self: {
        location: { origin: 'https://example.test' },
        registration: { scope: 'https://example.test/' },
        SBD_REGISTRY: { version: 'test', offlineAssets: () => ['./av/index.html'] },
        addEventListener: (type, listener) => { listeners[type] = listener; }
      }
    };
    vm.runInNewContext(source, context);
    let response;
    listeners.fetch({ request: { url: `https://example.test/${route}`, method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
    assert.equal(await (await response).text(), 'native console');
    assert.equal(context.canonicalUrl('https://example.test/unknown/'), 'https://example.test/unknown/');
    assert.equal(context.canonicalUrl('https://example.test/'), 'https://example.test/', 'site root caching stays unchanged');
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
      assert.equal(name, 'sbd-av-suite-v20261027-offline-console-recovery');
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
    './js/sbd-rail-mount.js',
    './show-ops/assets/show-ops.js',
    './show-ops/assets/index.css',
    './the-shop/assets/the-shop.js',
    './the-shop/assets/index.css',
    './infrastructure/assets/infrastructure.js',
    './infrastructure/assets/index.css',
    './front-office/assets/front-office.js',
    './front-office/assets/index.css',
    './av-lighting/assets/av-lighting.js',
    './av-lighting/assets/index.css'
  ];
  railAssets.forEach(asset => assert.ok(optional.includes(asset), `${asset} was not precached`));
  assert.equal(critical.some(asset => railAssets.includes(asset)), false);
  // The console shell itself must install; a missing optional asset never blocks it.
  ['./av/index.html', './av/assets/av-suite.js', './av/assets/av-suite.css', './js/av-offline.js'].forEach(asset => assert.ok(critical.includes(asset), `${asset} is not a critical shell asset`));
  assert.equal(critical.some(asset => /av-suite\.html|av-suite-landing|js\/av-suite\//.test(asset)), false, 'retired Toolbox assets are no longer critical');
  assert.equal(registry.offlineAssets().some(asset => /^https?:/.test(asset)), false);
});

for (const scope of ['https://example.test/', 'https://example.test/project/']) {
  test(`offline recovery opens the cached console within ${scope}`, async () => {
    const listeners = {}, index = new URL('av/index.html', scope).href;
    const context = {
      URL, Response, Promise, importScripts() {},
      caches: { open: async () => ({
        match: async key => key === index ? new Response('native console') : undefined,
        put: async () => assert.fail('Offline recovery must not write a response')
      }) },
      fetch: async () => { throw new Error('offline'); },
      self: {
        location: { origin: 'https://example.test' }, registration: { scope },
        SBD_REGISTRY: { version: 'test', offlineAssets: () => ['./av/index.html'] },
        addEventListener: (type, listener) => { listeners[type] = listener; }
      }
    };
    vm.runInNewContext(source, context);
    const navigate = url => {
      let response;
      listeners.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
      return response;
    };
    const fallback = await navigate(new URL('uncached.html', scope).href);
    assert.equal(fallback.status, 503);
    const links = [...(await fallback.text()).matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(links, [new URL('av/', scope).href]);
    assert.equal(await (await navigate(links[0])).text(), 'native console');
    assert.equal(await (await navigate(scope)).text(), 'native console', 'uncached site root falls back to the prepared shell');
  });
}
