import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { changedFiles, planPublish, readLive } from './domain_publish_plan.mjs';

const staged = { domain: 'site.example.test', artifactSha256: 'a'.repeat(64) };
const same = { artifactSha256: 'a'.repeat(64) };
const older = { artifactSha256: 'b'.repeat(64) };

test('a changed site file publishes whatever the live site serves', () => {
  assert.equal(planPublish({ staged, changed: ['index.html', 'source.json'], live: same }).action, 'publish');
  assert.equal(planPublish({ staged, changed: ['js/app.js'], live: null }).action, 'publish');
  assert.match(planPublish({ staged, changed: ['a', 'b', 'source.json'], live: same }).reason, /^2 files changed$/);
  assert.match(planPublish({ staged, changed: ['a'], live: same }).reason, /^1 file changed$/);
});

test('only source.json differing skips when the live site already serves the content', () => {
  const plan = planPublish({ staged, changed: ['source.json'], live: same });
  assert.equal(plan.action, 'skip');
  assert.match(plan.reason, /already serves content aaaaaaaaaaaa/);
  assert.equal(planPublish({ staged, changed: [], live: same }).action, 'skip');
});

test('content the repository has but the live site does not serve is republished', () => {
  const stale = planPublish({ staged, changed: ['source.json'], live: older });
  assert.equal(stale.action, 'republish');
  assert.match(stale.reason, /serves content bbbbbbbbbbbb, not aaaaaaaaaaaa.*did not land/);
  assert.equal(planPublish({ staged, changed: [], live: older }).action, 'republish');
});

test('an unreadable live site never skips a push', () => {
  const plan = planPublish({ staged, changed: ['source.json'], live: null });
  assert.equal(plan.action, 'republish');
  assert.match(plan.reason, /could not be read/);
});

test('readLive returns provenance only for a 200 with a digest, and never throws', async () => {
  const seen = [];
  const reply = (status, body) => async (url, options) => {
    seen.push([url, options.redirect]);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
  assert.deepEqual(await readLive('site.example.test', { fetchImpl: reply(200, { artifactSha256: 'x' }), now: () => 7 }), { artifactSha256: 'x' });
  assert.deepEqual(seen[0], ['https://site.example.test/source.json?plan=7', 'error']);
  assert.equal(await readLive('site.example.test', { fetchImpl: reply(404, 'not found') }), null);
  assert.equal(await readLive('site.example.test', { fetchImpl: reply(200, { site: 'no digest' }) }), null);
  assert.equal(await readLive('site.example.test', { fetchImpl: reply(200, 'not json') }), null);
  assert.equal(await readLive('site.example.test', { fetchImpl: async () => { throw new Error('DNS unavailable'); } }), null);
});

test('changedFiles lists staged paths in a destination worktree, including deletions and new files', t => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-plan-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.test', ...args], { encoding: 'utf8' });
  git('init', '-q');
  fs.mkdirSync(path.join(repo, 'dir with space'));
  for (const file of ['source.json', 'index.html', 'old.js', 'dir with space/page.html']) fs.writeFileSync(path.join(repo, file), file);
  git('add', '-A'); git('commit', '-q', '-m', 'seed');
  git('add', '-A');
  assert.deepEqual(changedFiles(repo), [], 'a tree that matches HEAD has nothing staged');
  fs.writeFileSync(path.join(repo, 'source.json'), 'new commit marker');
  git('add', '-A');
  assert.deepEqual(changedFiles(repo), ['source.json']);
  assert.equal(planPublish({ staged, changed: changedFiles(repo), live: same }).action, 'skip');
  fs.rmSync(path.join(repo, 'old.js'));
  fs.writeFileSync(path.join(repo, 'dir with space/new.html'), 'x');
  git('add', '-A');
  assert.deepEqual(changedFiles(repo).sort(), ['dir with space/new.html', 'old.js', 'source.json']);
  assert.equal(planPublish({ staged, changed: changedFiles(repo), live: same }).action, 'publish');
});
