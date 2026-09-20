import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkPrerequisites, checkDestination } from './check_domain_cutover_ready.mjs';

test('missing deploy key or auth evidence blocks publication', () => {
  assert.throws(() => checkPrerequisites({}), /deploy key/);
  assert.throws(() => checkPrerequisites({ DEPLOY_KEY: 'synthetic' }), /OAuth/);
  checkPrerequisites({ DEPLOY_KEY: 'synthetic', CUTOVER_AUTH_VERIFIED: 'true' });
});

test('release verifies the destination before publishing either source redirect', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  const ordered = ['--preflight', 'scripts/publish_domain_site.sh fmpwalk-site', '--live _sites/fmpwalk-site',
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
