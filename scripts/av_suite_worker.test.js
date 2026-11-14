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

// A known page that the server answers with an error: what the worker returns
// for each combination of saved copies.
function serverErrorNavigation({ saved, status = 503, url = 'https://example.test/tool.html' }) {
  const listeners = {};
  const context = {
    URL, Response, Promise, importScripts() {},
    caches: { open: async () => ({
      match: async key => typeof key === 'string' && saved[key] ? new Response(saved[key]) : undefined,
      put: async () => assert.fail('An error response must not be stored')
    }) },
    fetch: async () => new Response('origin unavailable', { status }),
    self: {
      location: { origin: 'https://example.test' },
      registration: { scope: 'https://example.test/' },
      SBD_REGISTRY: { version: 'test', offlineAssets: () => ['./av/index.html', './tool.html'] },
      addEventListener: (type, listener) => { listeners[type] = listener; }
    }
  };
  vm.runInNewContext(source, context, { filename: 'av-suite-worker.js' });
  let response;
  listeners.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
  return response;
}

test('a server error on a saved page reopens the saved copy', async () => {
  const response = await serverErrorNavigation({ saved: {
    'https://example.test/tool.html': 'saved tool',
    'https://example.test/av/index.html': 'native console'
  } });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'saved tool');
});

test('a server error on a known page with no saved copy reopens the saved console', async () => {
  const response = await serverErrorNavigation({ saved: { 'https://example.test/av/index.html': 'native console' } });
  assert.equal(await response.text(), 'native console');
});

test('a server error passes through when nothing is saved', async () => {
  const response = await serverErrorNavigation({ saved: {} });
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'origin unavailable');
});

test('a 404 on a known page is passed through, not replaced or stored', async () => {
  const response = await serverErrorNavigation({ status: 404, saved: { 'https://example.test/tool.html': 'saved tool' } });
  assert.equal(response.status, 404);
  assert.equal(await response.text(), 'origin unavailable');
});

test('install precaches every local Rail asset in the bumped cache generation', async () => {
  const registryContext = { self: {} };
  vm.createContext(registryContext);
  vm.runInContext(registrySource, registryContext, { filename: 'js/sbd-registry.js' });
  const registry = registryContext.self.SBD_REGISTRY;
  const listeners = {};
  const critical = [];
  const optional = [];
  // Install must read past the HTTP cache, or a copy fetched before a deploy is stored as new.
  const asset = request => {
    assert.equal(request.cache, 'reload', `${request.url} was read through the HTTP cache`);
    return `./${request.url.slice('https://example.test/'.length)}`;
  };
  const cache = {
    addAll: async requests => { critical.push(...requests.map(asset)); },
    add: async request => { optional.push(asset(request)); }
  };
  const context = {
    URL, Request, Response, Promise,
    importScripts: () => {},
    caches: { open: async name => {
      assert.equal(name, 'sbd-av-suite-v20261114-offline-cache-receipts');
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

test('version reply lists optional assets missing from the cache and retries them once (AVC-19)', async () => {
  const listeners = {}, stored = new Set(['https://example.test/av/index.html']), added = [];
  const context = {
    URL, Response, Promise, importScripts() {},
    caches: { open: async () => ({
      match: async key => stored.has(key) ? new Response('ok') : undefined,
      add: async asset => { added.push(asset); throw new Error('still offline'); }
    }) },
    fetch: async () => { throw new Error('offline'); },
    self: {
      location: { origin: 'https://example.test' }, registration: { scope: 'https://example.test/' },
      SBD_REGISTRY: { version: 'test', offlineAssets: () => ['./av/index.html', './js/tool-a.js', './tool-b.html'] },
      addEventListener: (type, listener) => { listeners[type] = listener; }
    }
  };
  vm.runInNewContext(source, context);
  const ask = async () => {
    let reply, pending;
    listeners.message({ data: { type: 'SBD_OFFLINE_VERSION' }, ports: [{ postMessage: data => { reply = data; } }], waitUntil: promise => { pending = promise; } });
    await pending;
    return reply;
  };
  const first = await ask();
  assert.equal(first.version, 'test');
  assert.equal(first.cache, 'sbd-av-suite-test');
  assert.deepEqual([...first.missing], ['./js/tool-a.js', './tool-b.html']);
  assert.deepEqual(added, ['./js/tool-a.js', './tool-b.html']);
  stored.add('https://example.test/js/tool-a.js');
  const second = await ask();
  assert.deepEqual([...second.missing], ['./tool-b.html']);
  assert.equal(added.length, 2, 'missing assets are retried once per worker start, not on every readiness poll');
});
