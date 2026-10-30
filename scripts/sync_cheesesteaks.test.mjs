import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { syncCheesesteaks } from './sync_cheesesteaks.mjs';

function fixture(t, withGit = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cheesesteaks-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'upstream');
  const out = path.join(source, 'out');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), '<script src="/cheesesteaks/_next/app.js"></script>');
  fs.mkdirSync(path.join(out, '_next'));
  fs.writeFileSync(path.join(out, '_next/app.js'), 'window.heatmap = true;');
  fs.writeFileSync(path.join(out, '404.html'), 'not found');
  fs.mkdirSync(path.join(root, 'cheesesteaks'));
  fs.writeFileSync(path.join(root, 'cheesesteaks/previous.txt'), 'keep this export');
  if (withGit) {
    const git = (...args) => execFileSync('git', ['-C', source, ...args], { stdio: 'pipe' });
    git('init');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-m', 'Fixture');
  }
  return { root, source, out, target: path.join(root, 'cheesesteaks') };
}
function preserved(target) {
  assert.deepEqual(fs.readdirSync(target), ['previous.txt']);
  assert.equal(fs.readFileSync(path.join(target, 'previous.txt'), 'utf8'), 'keep this export');
}

test('invalid Git source preserves the existing export', (t) => {
  const { root, source, target } = fixture(t, false);
  assert.throws(() => syncCheesesteaks(source, { root }));
  preserved(target);
});
test('wrong base path preserves the existing export', (t) => {
  const { root, source, out, target } = fixture(t);
  fs.writeFileSync(path.join(out, 'index.html'), 'wrong build');
  assert.throws(() => syncCheesesteaks(source, { root }), /basePath/);
  preserved(target);
});
test('unsupported export entries preserve the existing export', (t) => {
  const { root, source, out, target } = fixture(t);
  fs.symlinkSync('/missing-export-file', path.join(out, 'bad-link'));
  assert.throws(() => syncCheesesteaks(source, { root }), /regular files/);
  preserved(target);
});
test('sync preserves build bytes, removes exported 404, and records source; check detects drift without writing', (t) => {
  const { root, source, out, target } = fixture(t);
  const sha = syncCheesesteaks(source, { root });
  assert.equal(fs.existsSync(path.join(target, '404.html')), false);
  assert.deepEqual(fs.readFileSync(path.join(target, '_next/app.js')), fs.readFileSync(path.join(out, '_next/app.js')));
  assert.equal(fs.readFileSync(path.join(target, 'SOURCE.txt'), 'utf8'), `philly-cheesesteak-heatmap ${sha}\n`);
  assert.equal(syncCheesesteaks(source, { root, check: true }), sha);
  fs.writeFileSync(path.join(target, '_next/app.js'), 'changed');
  assert.throws(() => syncCheesesteaks(source, { root, check: true }), /differs/);
  assert.equal(fs.readFileSync(path.join(target, '_next/app.js'), 'utf8'), 'changed');
  assert.equal(fs.readdirSync(root).some(name => name.startsWith('.cheesesteaks-sync-')), false);
});
test('copy failure leaves the prior export in place', (t) => {
  const { root, source, target } = fixture(t);
  t.mock.method(fs, 'cpSync', () => { throw new Error('Simulated full disk'); });
  assert.throws(() => syncCheesesteaks(source, { root }), /full disk/);
  preserved(target);
});
test('promotion failure restores the prior export', (t) => {
  const { root, source, target } = fixture(t);
  const rename = fs.renameSync;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (path.basename(from) === 'candidate') throw new Error('Simulated promotion failure');
    return rename(from, to);
  });
  assert.throws(() => syncCheesesteaks(source, { root }), /promotion failure/);
  preserved(target);
});
test('failed rollback retains the previous export for recovery', (t) => {
  const { root, source } = fixture(t);
  const rename = fs.renameSync;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (['candidate', 'previous'].includes(path.basename(from))) throw new Error('Simulated rename failure');
    return rename(from, to);
  });
  assert.throws(() => syncCheesesteaks(source, { root }), /Previous export preserved/);
  const backup = fs.readdirSync(root).find(name => name.startsWith('.cheesesteaks-sync-'));
  preserved(path.join(root, backup, 'previous'));
});
