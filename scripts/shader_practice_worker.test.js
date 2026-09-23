'use strict';

// Fetch rules of the Camera Shading Practice offline worker, run against
// in-memory stand-ins for the cache and the network.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'shader', 'practice-worker.js'), 'utf8');
const SCOPE = 'https://housevideo.app/shader/';

class MemoryCache {
  constructor() { this.entries = new Map(); }
  async match(key) { const entry = this.entries.get(String(key)); return entry ? entry.clone() : undefined; }
  async put(key, response) { this.entries.set(String(key), response); }
  async addAll() {}
}

function loadWorker({ network, saved = {}, timer = setTimeout }) {
  const listeners = {};
  const cache = new MemoryCache();
  Object.entries(saved).forEach(([file, body]) => cache.entries.set(new URL(file, SCOPE).href, new Response(body)));
  const self = {
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    addEventListener: (type, listener) => { listeners[type] = listener; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };
  const caches = { open: async () => cache, keys: async () => [], delete: async () => true };
  vm.runInNewContext(SOURCE, { self, caches, fetch: network, Response, URL, setTimeout: timer, Promise });
  return {
    cache,
    request(file, { mode = 'no-cors', method = 'GET', origin = SCOPE } = {}) {
      let responded = null;
      const waits = [];
      listeners.fetch({ request: { url: new URL(file, origin).href, method, mode }, respondWith: value => { responded = value; }, waitUntil: value => waits.push(value) });
      return { responded, settled: Promise.all(waits) };
    }
  };
}

const bodyOf = async response => (response ? response.text() : null);

test('a good network answer is served and refreshes the saved copy', async () => {
  const worker = loadWorker({ network: async () => new Response('fresh'), saved: { './practice.css': 'saved' } });
  const { responded, settled } = worker.request('./practice.css');
  assert.equal(await bodyOf(await responded), 'fresh');
  await settled;
  assert.equal(await bodyOf(await worker.cache.match(`${SCOPE}practice.css`)), 'fresh');
});

test('a server error falls back to the saved copy and keeps it', async () => {
  const worker = loadWorker({ network: async () => new Response('outage', { status: 503 }), saved: { './practice.css': 'saved' } });
  const { responded, settled } = worker.request('./practice.css');
  assert.equal(await bodyOf(await responded), 'saved');
  await settled;
  assert.equal(await bodyOf(await worker.cache.match(`${SCOPE}practice.css`)), 'saved');
});

test('removals and redirects pass through instead of being hidden by the saved copy', async () => {
  const removed = loadWorker({ network: async () => new Response('gone', { status: 404 }), saved: { './practice.html': 'saved' } });
  assert.equal((await removed.request('./practice.html', { mode: 'navigate' }).responded).status, 404);
  const redirect = { type: 'opaqueredirect', status: 0, ok: false, clone() { return this; } };
  const moved = loadWorker({ network: async () => redirect, saved: { './practice.html': 'saved' } });
  assert.equal(await moved.request('./practice.html', { mode: 'navigate' }).responded, redirect);
});

test('no network, or a network slower than the timeout, serves the saved copy', async () => {
  const offline = loadWorker({ network: async () => { throw new TypeError('offline'); }, saved: { './practice-app.js': 'saved' } });
  assert.equal(await bodyOf(await offline.request('./practice-app.js').responded), 'saved');
  const slow = loadWorker({ network: () => new Promise(() => {}), saved: { './practice-app.js': 'saved' }, timer: callback => setImmediate(callback) });
  assert.equal(await bodyOf(await slow.request('./practice-app.js').responded), 'saved');
});

test('a page never saved offline falls back to the saved console page when the network fails', async () => {
  const worker = loadWorker({ network: async () => { throw new TypeError('offline'); }, saved: { './practice.html': 'console' } });
  assert.equal(await bodyOf(await worker.request('./index.html', { mode: 'navigate' }).responded), 'console');
  const asset = await worker.request('./practice-render.js').responded;
  assert.equal(asset.type, 'error');
});

test('requests outside the offline file list are left to the browser', () => {
  const worker = loadWorker({ network: async () => new Response('x') });
  assert.equal(worker.request('./other.html').responded, null);
  assert.equal(worker.request('./practice.css', { method: 'POST' }).responded, null);
  assert.equal(worker.request('https://example.com/shader/practice.css', { origin: 'https://example.com/shader/' }).responded, null);
});
