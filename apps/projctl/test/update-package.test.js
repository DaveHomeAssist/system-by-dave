import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('desktop updater preserves saved rig, plot and launcher, backs up replaced code, and stops before changes on install failure', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'projctl update ')); t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'update'), target = path.join(root, 'installed'), bin = path.join(root, 'bin');
  for (const dir of [source, target]) {
    await mkdir(path.join(dir, 'server'), { recursive: true }); await mkdir(path.join(dir, 'data/venue'), { recursive: true });
    await writeFile(path.join(dir, 'server/index.js'), dir === source ? 'new source' : 'old source');
  }
  await writeFile(path.join(source, 'data/venue/manifest.json'), 'new model');
  for (const name of ['rig.json', 'rig.sim.json', 'stage-plot.json']) await writeFile(path.join(target, 'data', name), 'saved ' + name);
  await writeFile(path.join(target, 'Start Projctl.command'), 'existing launcher');
  await mkdir(bin); await writeFile(path.join(bin, 'npm'), '#!/bin/sh\nexit "${TEST_NPM_STATUS:-0}"\n', { mode: 0o755 });
  await writeFile(path.join(bin, 'lsof'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const script = path.join(source, 'Update Existing Projctl.command');
  await cp(new URL('../deploy/Update Existing Projctl.command', import.meta.url), script);
  const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, PROJCTL_UPDATE_TARGET: target };
  assert.throws(() => execFileSync('bash', [script], { env: { ...env, TEST_NPM_STATUS: '1' }, stdio: 'pipe' }));
  assert.equal(await readFile(path.join(target, 'server/index.js'), 'utf8'), 'old source');
  execFileSync('bash', [script], { env, stdio: 'pipe' });
  assert.equal(await readFile(path.join(target, 'server/index.js'), 'utf8'), 'new source');
  assert.equal(await readFile(path.join(target, 'data/venue/manifest.json'), 'utf8'), 'new model');
  for (const name of ['rig.json', 'rig.sim.json', 'stage-plot.json']) assert.equal(await readFile(path.join(target, 'data', name), 'utf8'), 'saved ' + name);
  assert.equal(await readFile(path.join(target, 'Start Projctl.command'), 'utf8'), 'existing launcher');
  const backup = (await readdir(root)).find(name => name.startsWith('installed.backup-'));
  assert.equal(await readFile(path.join(root, backup, 'server/index.js'), 'utf8'), 'old source');
  assert.equal(await readFile(path.join(root, backup, 'data/rig.json'), 'utf8'), 'saved rig.json');
});
