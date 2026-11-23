// Runs the real scripts/publish_domain_site.sh against a local bare repository, the way the Pages workflow
// calls it: from the repository root, with a relative staged path. Nothing leaves the machine: git rewrites
// the SSH remote to a local path, curl and fetch are stubbed, and the destination's Pages wait is a no-op.
//   node --test scripts/publish_domain_site.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const DIGEST = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const hasRsync = spawnSync('rsync', ['--version']).status === 0;

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@example.test', ...args], { encoding: 'utf8' });
const write = (root, file, body) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), body); };
const source = (commit, digest = DIGEST) => JSON.stringify({ site: 'site', domain: 'site.example.test', sourceCommit: commit, artifactSha256: digest, files: 2 });

// A sandbox with a destination repository, a copy of the publish scripts, and a staged site at a relative path.
function sandbox(t, { destinationIndex, stagedIndex, destinationCommit = '1'.repeat(40), stagedCommit = '2'.repeat(40) }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-site-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remotes', 'owner', 'repo.git');
  fs.mkdirSync(remote, { recursive: true });
  git(remote, 'init', '-q', '--bare', '--initial-branch=main');
  const seed = path.join(root, 'seed');
  git(root, 'clone', '-q', remote, seed);
  git(seed, 'checkout', '-q', '-b', 'main');
  write(seed, 'index.html', destinationIndex);
  write(seed, 'source.json', source(destinationCommit));
  write(seed, 'README.md', 'destination readme, never overwritten');
  git(seed, 'add', '-A'); git(seed, 'commit', '-q', '-m', 'seed'); git(seed, 'push', '-q', 'origin', 'main');

  const scripts = path.join(root, 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  for (const file of ['publish_domain_site.sh', 'domain_publish_plan.mjs']) fs.copyFileSync(path.join(SCRIPTS, file), path.join(scripts, file));
  fs.chmodSync(path.join(scripts, 'publish_domain_site.sh'), 0o755);
  write(scripts, 'wait_for_repository_run.mjs', 'process.exit(0);\n');
  write(scripts, 'domain_keep_previous_assets.mjs', 'process.exit(0);\n');

  const work = path.join(root, 'work');
  write(work, '_sites/site/index.html', stagedIndex);
  write(work, '_sites/site/source.json', source(stagedCommit));

  write(root, 'shims/curl', '#!/bin/sh\necho \'{"ssh_keys":["ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAItest"]}\'\n');
  fs.chmodSync(path.join(root, 'shims/curl'), 0o755);
  write(root, 'shims/live-fetch.mjs', `globalThis.fetch = async () => process.env.SHIM_LIVE_DIGEST
    ? new Response(JSON.stringify({ artifactSha256: process.env.SHIM_LIVE_DIGEST }), { status: 200 })
    : new Response('not found', { status: 404 });\n`);

  const publish = (liveDigest) => spawnSync('bash', [path.join(scripts, 'publish_domain_site.sh'), 'site', '_sites/site', 'owner/repo', 'f'.repeat(40)], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${path.join(root, 'shims')}${path.delimiter}${process.env.PATH}`,
      DEPLOY_KEY: 'not-a-real-key',
      KEEP_PREVIOUS_ASSETS: '',
      NODE_OPTIONS: `--import ${path.join(root, 'shims/live-fetch.mjs')}`,
      ...(liveDigest ? { SHIM_LIVE_DIGEST: liveDigest } : {}),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: `url.${path.join(root, 'remotes')}/.insteadOf`,
      GIT_CONFIG_VALUE_0: 'git@github.com:'
    }
  });
  const head = () => git(remote, 'rev-parse', 'main').trim();
  const show = (file) => git(remote, 'show', `main:${file}`);
  return { publish, head, show, remote };
}

test('a changed page is published when the staged path is relative', { skip: !hasRsync && 'rsync is not installed' }, (t) => {
  const site = sandbox(t, { destinationIndex: '<p>old</p>', stagedIndex: '<p>new</p>' });
  const before = site.head();
  const run = site.publish(DIGEST);
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /Publishing site to owner\/repo: 1 file changed\./);
  assert.notEqual(site.head(), before, 'the destination received a commit');
  assert.equal(site.show('index.html'), '<p>new</p>');
  assert.equal(site.show('README.md'), 'destination readme, never overwritten');
});

test('only source.json differing, with the live site serving the staged content, pushes nothing', { skip: !hasRsync && 'rsync is not installed' }, (t) => {
  const site = sandbox(t, { destinationIndex: '<p>same</p>', stagedIndex: '<p>same</p>' });
  const before = site.head();
  const run = site.publish(DIGEST);
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /already serves site .*nothing to publish/);
  assert.equal(site.head(), before, 'no commit reached the destination');
});

test('only source.json differing, with a stale live site, republishes the new source.json', { skip: !hasRsync && 'rsync is not installed' }, (t) => {
  const site = sandbox(t, { destinationIndex: '<p>same</p>', stagedIndex: '<p>same</p>' });
  const before = site.head();
  const run = site.publish(OTHER);
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /Publishing site to owner\/repo: .*did not land/);
  assert.notEqual(site.head(), before);
  assert.match(site.show('source.json'), new RegExp('"sourceCommit":"2{40}"'));
});

test('an unreadable live site republishes rather than skipping', { skip: !hasRsync && 'rsync is not installed' }, (t) => {
  const site = sandbox(t, { destinationIndex: '<p>same</p>', stagedIndex: '<p>same</p>' });
  const before = site.head();
  const run = site.publish(undefined);
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /could not be read/);
  assert.notEqual(site.head(), before);
});
