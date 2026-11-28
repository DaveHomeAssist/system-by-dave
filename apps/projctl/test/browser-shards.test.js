import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const runner = fileURLToPath(new URL('./run-browser-suite.cjs', import.meta.url));
const testDir = new URL('./', import.meta.url);

function list(...args) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [runner, ...args, '--list'], { encoding: 'utf8' });
  assert.equal(status, 0, stderr);
  return stdout.trim().split('\n');
}

test('the four CI shards partition the full Projctl browser suite', () => {
  const separate = new Set([
    'stage-3d-browser.cjs', 'stage-browser.cjs', 'venue-browser.cjs', 'wst-public-stage-browser.cjs',
  ]);
  const expected = readdirSync(testDir)
    .filter(file => (file === 'browser.cjs' || file.endsWith('-browser.cjs')) && !separate.has(file))
    .sort();
  assert.deepEqual(list().sort(), expected);
  const groups = [1, 2, 3, 4].map(index => list('--shard', index + '/4'));
  assert.ok(groups.every(group => group.length > 0));
  assert.deepEqual(groups.flat().sort(), expected);
});

test('an invalid shard fails before running anything', () => {
  for (const value of ['0/4', '5/4', '1/0', '1/100', 'bad']) {
    const { status, stdout } = spawnSync(process.execPath, [runner, '--shard', value, '--list'], { encoding: 'utf8' });
    assert.equal(status, 1, value);
    assert.equal(stdout, '');
  }
});
