import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { releasePlan, verifyRelease } from './verify_live_release.mjs';

const commit = 'a'.repeat(40);
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-readback-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const config = { origin: 'https://main.example.test', sourceRepository: 'example/source', sites: [
    { id: 'video', domain: 'video.example.test', home: '/video/', pages: ['video/'] }
  ] };
  const files = {
    '/': '<h1>Home</h1>', '/tools.html': '<script src="/app.js"></script>',
    '/robots.txt': 'Allow: /', '/sitemap.xml': '<urlset/>', '/transfer.html': 'Transfer',
    '/video/': '<base href="/shared/"><script src="app.js"></script><link href="theme.css" rel="stylesheet"><script src="https://external.example.test/tracker.js"></script>',
    '/shared/app.js': '/* current bundle */', '/shared/theme.css': 'body { color: black; }', '/app.js': '/* app */',
    '/source.json': JSON.stringify({ site: 'video', domain: 'video.example.test', sourceRepository: config.sourceRepository, sourceCommit: commit })
  };
  for (const [route, body] of Object.entries(files)) {
    const file = path.join(directory, route.slice(1) + (route.endsWith('/') ? 'index.html' : ''));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  const fetchImpl = async (url, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store'); assert.ok(options.signal);
    const u = new URL(url); assert.equal(u.searchParams.get('release'), commit);
    assert.ok(['https://main.example.test', 'https://video.example.test'].includes(u.origin));
    const body = files[u.pathname];
    return new Response(body, { status: body === undefined ? 404 : 200 });
  };
  let time = 0;
  const options = { fetchImpl, budgetMs: 10, intervalMs: 10, now: () => time, delay: async ms => { time += ms; } };
  return { config, directory, files, options };
}

test('root entry pages and direct code assets match without third-party requests', async t => {
  const f = fixture(t); const plan = releasePlan(f.config, 'systembydave', f.directory, commit);
  assert.equal(plan.files.length, 5);
  const report = await verifyRelease(plan, f.options);
  assert.equal(report.status, 'passed'); assert.equal(report.checked, 5);
});
test('domain receipt, configured routes and base-resolved assets match', async t => {
  const f = fixture(t); const plan = releasePlan(f.config, 'video', f.directory, commit);
  assert.equal(plan.files.length, 8);
  assert.ok(plan.files.some(file => file.route === '/shared/app.js'));
  assert.equal((await verifyRelease(plan, f.options)).status, 'passed');
});
test('staged provenance or absent dependencies fail before any request', t => {
  const f = fixture(t);
  assert.throws(() => releasePlan(f.config, 'video', f.directory, 'b'.repeat(40)), /commit differs/);
  fs.unlinkSync(path.join(f.directory, 'shared/app.js'));
  assert.throws(() => releasePlan(f.config, 'video', f.directory, commit));
});
for (const kind of ['stale page', 'stale receipt', 'missing asset', 'redirect', 'network failure']) {
  test(`${kind} yields a terminal failure report`, async t => {
    const f = fixture(t); const plan = releasePlan(f.config, 'video', f.directory, commit);
    if (kind === 'stale page') f.files['/video/'] = 'old';
    if (kind === 'stale receipt') f.files['/source.json'] = '{}';
    if (kind === 'missing asset') delete f.files['/shared/app.js'];
    if (kind === 'redirect') f.options.fetchImpl = async () => new Response('', { status: 302 });
    if (kind === 'network failure') f.options.fetchImpl = async () => { throw new Error('sensitive response body'); };
    const report = await verifyRelease(plan, f.options);
    assert.equal(report.status, 'failed'); assert.equal(report.attempts, 1);
    assert.equal(report.durationMs, 10); assert.ok(report.error);
    assert.ok(!JSON.stringify(report).includes('sensitive'));
  });
}
test('propagation retry eventually matches the same complete snapshot', async t => {
  const f = fixture(t); const plan = releasePlan(f.config, 'systembydave', f.directory, commit);
  const fetchImpl = f.options.fetchImpl; let calls = 0; let time = 0;
  const report = await verifyRelease(plan, { ...f.options, budgetMs: 20, intervalMs: 5,
    now: () => time, delay: async ms => { time += ms; },
    fetchImpl: async (...args) => ++calls === 1 ? new Response('old') : fetchImpl(...args) });
  assert.equal(report.status, 'passed'); assert.equal(report.attempts, 2); assert.equal(report.checked, 5);
});
test('an empty readback cannot claim success', async () => {
  await assert.rejects(verifyRelease({ files: [] }), /at least one/);
});

test('real HTTP transport compares bytes and rejects a redirect', async t => {
  const f = fixture(t); const plan = releasePlan(f.config, 'systembydave', f.directory, commit);
  let redirect = false;
  const server = createServer((req, res) => {
    if (redirect) { res.writeHead(302, { location: '/tools.html' }); res.end(); return; }
    res.end(f.files[new URL(req.url, 'http://fixture').pathname]);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const fetchImpl = (url, options) => fetch(`http://127.0.0.1:${server.address().port}${new URL(url).pathname}`, options);
  assert.equal((await verifyRelease(plan, { ...f.options, fetchImpl, budgetMs: 1000, intervalMs: 1000 })).status, 'passed');
  redirect = true;
  assert.equal((await verifyRelease(plan, { ...f.options, fetchImpl, budgetMs: 1000, intervalMs: 1000 })).status, 'failed');
});
test('CLI preserves a failure report when staging cannot be read', t => {
  const f = fixture(t); const report = path.join(f.directory, 'reports/failure.json');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./verify_live_release.mjs', import.meta.url)),
    'systembydave', path.join(f.directory, 'missing'), commit, report], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(fs.readFileSync(report)).status, 'failed');
});

test('configured directory prefixes expand nested HTML without inventing an index route', async t => {
  const f = fixture(t);
  f.config.sites[0].pages.push('nested/');
  fs.mkdirSync(path.join(f.directory, 'nested/child'), { recursive: true });
  fs.writeFileSync(path.join(f.directory, 'nested/child/index.html'), 'Nested page');
  f.files['/nested/child/'] = 'Nested page';
  const plan = releasePlan(f.config, 'video', f.directory, commit);
  assert.ok(plan.files.some(file => file.route === '/nested/child/'));
  assert.ok(!plan.files.some(file => file.route === '/nested/'));
  assert.equal((await verifyRelease(plan, f.options)).status, 'passed');
});
