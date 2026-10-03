'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'av-suite-worker.js'), 'utf8');

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
