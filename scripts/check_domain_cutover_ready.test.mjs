import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkPrerequisites, checkDestination, cacheRemainingMs, verifyLiveRelease } from './check_domain_cutover_ready.mjs';

test('missing deploy key or auth evidence blocks publication', () => {
  assert.throws(() => checkPrerequisites({}), /deploy key/);
  assert.throws(() => checkPrerequisites({ DEPLOY_KEY: 'synthetic' }), /OAuth/);
  checkPrerequisites({ DEPLOY_KEY: 'synthetic', CUTOVER_AUTH_VERIFIED: 'true' });
});

test('release verifies the destination before publishing either source redirect', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  const publisher = fs.readFileSync(new URL('./publish_domain_site.sh', import.meta.url), 'utf8');
  const push = publisher.indexOf('git push --quiet origin HEAD:main');
  const wait = publisher.indexOf('node "$WAIT_HELPER"');
  assert.ok(push > -1 && wait > push, 'the destination Pages run is awaited after the push and before the script returns');
  const ordered = ['--preflight', 'scripts/publish_domain_site.sh housevideo-walk', '--live _sites/housevideo-walk',
    '- name: Deploy to GitHub Pages', 'scripts/publish_domain_site.sh housevideo '];
  let previous = -1;
  for (const step of ordered) {
    const position = workflow.indexOf(step);
    assert.ok(position > previous, `${step} must follow the readiness gates`);
    previous = position;
  }
});

test('destination must serve the exact release and pages before redirects publish', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'destination-readiness-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const site = { id: 'walk', domain: 'walk.example.test', home: '/walk/', pages: ['walk/', 'alias/'] };
  const metadata = { schema: 'test.v1', site: site.id, domain: site.domain,
    sourceRepository: 'example/source', sourceCommit: 'expected', artifactSha256: 'digest', cutover: true };
  const files = { '/source.json': JSON.stringify(metadata), '/walk/': '<h1>Walk</h1>',
    '/alias/': '<p>Walk alias</p>', '/transfer.html': '<h1>Transfer</h1>' };
  for (const [route, body] of Object.entries(files)) {
    const file = path.join(directory, route.slice(1), route.endsWith('/') ? 'index.html' : '');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  const request = async (url, options) => {
    assert.equal(new URL(url).origin, 'https://walk.example.test');
    assert.equal(options.redirect, 'error');
    const body = files[new URL(url).pathname];
    return new Response(body, { status: body === undefined ? 404 : 200 });
  };
  await checkDestination(site, directory, request);
  files['/source.json'] = JSON.stringify({ ...metadata, sourceCommit: 'stale' });
  await assert.rejects(checkDestination(site, directory, request), /sourceCommit differs/);
  files['/source.json'] = JSON.stringify(metadata);
  files['/walk/'] = '<h1>Old release</h1>';
  await assert.rejects(checkDestination(site, directory, request), /bytes differ/);
  files['/walk/'] = '<h1>Walk</h1>';
  delete files['/transfer.html'];
  await assert.rejects(checkDestination(site, directory, request), /not ready/);
  await assert.rejects(checkDestination(site, directory, async () => { throw new Error('DNS unavailable'); }), /DNS unavailable/);
});

test('a cached previous release reports how long that response stays fresh', () => {
  assert.equal(cacheRemainingMs(new Headers({ 'cache-control': 'max-age=600', age: '40' })), 560000);
  assert.equal(cacheRemainingMs(new Headers({ 'cache-control': 'max-age=600' })), 600000);
  assert.equal(cacheRemainingMs(new Headers()), 0);
});

test('a fresh cached mismatch is waited out once instead of polled', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'destination-cache-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const site = { id: 'walk', domain: 'walk.example.test', home: '/walk/', pages: ['walk/'] };
  const metadata = { schema: 'test.v1', site: site.id, domain: site.domain,
    sourceRepository: 'example/source', sourceCommit: 'expected', artifactSha256: 'digest', cutover: true };
  const write = (route, body) => {
    const file = path.join(directory, route.slice(1), route.endsWith('/') ? 'index.html' : '');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  };
  write('/source.json', JSON.stringify(metadata));
  write('/walk/', '<h1>Walk</h1>');
  write('/transfer.html', '<h1>Transfer</h1>');
  let reads = 0;
  const request = async url => {
    reads += 1;
    const route = new URL(url).pathname;
    const stale = reads === 1;
    const body = route === '/source.json'
      ? JSON.stringify({ ...metadata, sourceCommit: stale ? 'stale' : 'expected' })
      : fs.readFileSync(path.join(directory, route.slice(1) + (route.endsWith('/') ? 'index.html' : '')), 'utf8');
    return new Response(body, { status: 200, headers: { 'cache-control': 'max-age=600', age: stale ? '0' : '601' } });
  };
  const sleeps = [];
  await verifyLiveRelease(site, directory, {
    fetchImpl: request, sleep: async ms => { sleeps.push(ms); }, log() {}, now: () => 0, budgetMs: 1000
  });
  assert.deepEqual(sleeps, [601000]);
  assert.equal(reads > 1, true);
});
