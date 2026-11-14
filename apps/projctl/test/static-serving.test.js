// Static files: folders serve their index.html, and a folder or missing file never stops the relay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { startRelay } from './relay-helper.js';

test('folders serve index.html, redirect without a slash, and leave the relay running', async () => {
  const relay = await startRelay();
  try {
    const get = (route) => fetch(relay.base + route, { redirect: 'manual' });
    const monitor = await get('/monitor/');
    assert.equal(monitor.status, 200);
    assert.match(monitor.headers.get('content-type'), /text\/html/);
    assert.match(await monitor.text(), /<title>Frozen Monitor \| Monitor<\/title>/);

    const bare = await get('/monitor');
    assert.equal(bare.status, 301);
    assert.equal(bare.headers.get('location'), '/monitor/');
    // The redirect is built from the resolved folder, never echoed from the request, so a
    // protocol-relative request cannot become an off-site redirect.
    const doubled = await get('//monitor');
    assert.ok(doubled.status !== 301 || !doubled.headers.get('location').startsWith('//'));
    const dotted = await get('/avd/../monitor');
    assert.equal(dotted.status, 301);
    assert.equal(dotted.headers.get('location'), '/monitor/');

    // A folder without an index.html used to crash the relay when read as a file.
    assert.equal((await get('/avd/')).status, 404);
    assert.equal((await get('/monitor/nope.js')).status, 404);
    const health = await fetch(relay.base + '/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    for (const page of ['index.html', 'cues.html', 'rig.html', 'network.html', 'notes.html', 'calendar.html']) {
      const r = await get('/monitor/' + page);
      assert.equal(r.status, 200, page);
      const html = await r.text();
      assert.match(html, /http-equiv="Content-Security-Policy"/, page);
      assert.doesNotMatch(html, /\sstyle="/, `${page} keeps styles in monitor.css`);
    }
  } finally { await relay.close(); }
});

test('the monitor keeps private relay and lighting addresses out of its public source', async () => {
  const dir = new URL('../public/monitor/', import.meta.url);
  for (const name of await readdir(dir)) {
    const text = await readFile(new URL(name, dir), 'utf8');
    assert.doesNotMatch(text, /\b(?:192\.168\.\d{1,3}|10\.\d{1,3}\.\d{1,3})\.(?:\d{1,3}|x)\b/, `${name} hard-codes a private address`);
  }
});
