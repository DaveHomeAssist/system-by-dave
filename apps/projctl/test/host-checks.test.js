// Host checks: things about the relay computer the relay cannot see itself. Each reads "cannot
// check" until a provider answers it. A guess is never turned into a pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HOST_CHECKS, REPORT_STALE_MS, readHostChecks, reportFileProvider } from '../server/host-checks.js';
import { startRelay } from './relay-helper.js';

const NOW = Date.parse('2026-11-18T23:00:00Z');
const states = result => Object.fromEntries(result.checks.map(check => [check.id, check.state]));
async function folder(t) { const dir = await mkdtemp(path.join(tmpdir(), 'projctl-host-checks-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }

test('with no provider every check reads "cannot check"', async () => {
  const result = await readHostChecks([], { now: () => NOW });
  assert.deepEqual(HOST_CHECKS.map(check => check.id), ['playback-app', 'midi-interface', 'computer-awake']);
  assert.deepEqual(result.checks.map(check => [check.id, check.state, check.reading, check.at]), HOST_CHECKS.map(check => [check.id, 'cannot-check', 'No provider is configured for this check.', null]));
  assert.deepEqual([result.providers, result.checkedAt], [0, new Date(NOW).toISOString()]);
  assert.deepEqual(result.checks.map(check => check.label), ['Playback app running with its fullscreen outputs', 'MIDI interface present', 'Computer awake and unlocked']);
});

test('a provider answers pass or fail with a reading; anything else stays "cannot check"', async () => {
  const provider = { name: 'fixture', read: async () => ({
    'playback-app': { state: 'pass', reading: 'Running, 5 fullscreen outputs', at: NOW - 5000 },
    'midi-interface': { state: 'fail', reading: '', at: NOW - 5000 },
    'computer-awake': { state: 'probably', reading: 'a guess', at: NOW - 5000 },
    'not-a-check': { state: 'pass', reading: 'ignored', at: NOW },
  }) };
  const result = await readHostChecks([provider], { now: () => NOW });
  assert.deepEqual(states(result), { 'playback-app': 'pass', 'midi-interface': 'fail', 'computer-awake': 'cannot-check' });
  assert.deepEqual(result.checks.map(check => check.reading), ['Running, 5 fullscreen outputs', 'Reported not good.', 'The provider did not report this check.']);
  assert.deepEqual([result.checks[0].provider, result.checks[0].at, result.providers], ['fixture', new Date(NOW - 5000).toISOString(), 1]);
});

test('a stale answer, an answer from the future, one with no time and a provider that throws are not readings', async () => {
  const at = offset => ({ name: 'fixture', read: async () => ({ 'playback-app': { state: 'pass', reading: 'Running', at: NOW - offset } }) });
  assert.equal(states(await readHostChecks([at(REPORT_STALE_MS)], { now: () => NOW }))['playback-app'], 'pass', 'exactly at the limit still counts');
  const stale = await readHostChecks([at(REPORT_STALE_MS + 1000)], { now: () => NOW });
  assert.deepEqual([stale.checks[0].state, stale.checks[0].reading], ['cannot-check', 'The last report is 2 min old.']);
  assert.equal((await readHostChecks([at(-60000)], { now: () => NOW })).checks[0].reading, 'The last report is dated in the future.');
  const timeless = { name: 'fixture', read: async () => ({ 'playback-app': { state: 'pass', reading: 'Running' } }) };
  assert.equal(states(await readHostChecks([timeless], { now: () => NOW }))['playback-app'], 'cannot-check');
  const broken = { name: 'broken', read: async () => { throw new Error('no'); } };
  assert.deepEqual((await readHostChecks([broken], { now: () => NOW })).checks.map(check => [check.state, check.reading]), HOST_CHECKS.map(() => ['cannot-check', 'The provider could not be read.']));
  // The first provider to answer a check wins; a broken one does not hide a working one.
  const second = { name: 'second', read: async () => ({ 'playback-app': { state: 'fail', reading: 'Not running', at: NOW }, 'computer-awake': { state: 'pass', reading: 'Awake', at: NOW } }) };
  const both = await readHostChecks([broken, at(1000), second], { now: () => NOW });
  assert.deepEqual([both.checks[0].state, both.checks[0].provider, both.checks[2].state, both.checks[2].provider], ['pass', 'fixture', 'pass', 'second']);
});

test('the report-file provider reads a small JSON report written on the relay computer', async t => {
  const dir = await folder(t), file = path.join(dir, 'host-checks.json');
  const read = () => readHostChecks([reportFileProvider(file)], { now: () => NOW });
  assert.deepEqual(Object.values(states(await read())), ['cannot-check', 'cannot-check', 'cannot-check'], 'no report yet');
  await writeFile(file, JSON.stringify({ unixSeconds: (NOW - 10000) / 1000, checks: [
    { id: 'playback-app', state: 'pass', reading: 'Running, 5 fullscreen outputs' }, { id: 'midi-interface', state: 'fail', reading: 'No interface seen' },
    { id: 'computer-awake', state: 'pass', reading: 'Awake', unixSeconds: (NOW - 600000) / 1000 }, { id: 'playback-app', state: 'maybe' }, 'junk', null] }));
  let result = await read();
  assert.deepEqual(states(result), { 'playback-app': 'pass', 'midi-interface': 'fail', 'computer-awake': 'cannot-check' });
  assert.deepEqual([result.checks[1].reading, result.checks[2].reading, result.checks[0].provider], ['No interface seen', 'The last report is 10 min old.', 'report-file']);
  for (const text of ['not json', '{}', '{"checks":"none"}', JSON.stringify({ checks: [{ id: 'playback-app', state: 'pass' }] }), JSON.stringify({ unixSeconds: NOW / 1000, pad: 'x'.repeat(20000), checks: [] })]) {
    await writeFile(file, text);
    assert.deepEqual(Object.values(states(await read())), ['cannot-check', 'cannot-check', 'cannot-check'], text.slice(0, 24));
  }
});

test('the relay serves host checks behind the sign-in and reads the report named in its private settings', async t => {
  const plain = await startRelay();
  try {
    const reply = await plain.api('host-checks');
    assert.deepEqual([reply.status, reply.body.providers, Object.values(states(reply.body))], [200, 0, ['cannot-check', 'cannot-check', 'cannot-check']]);
    assert.equal((await fetch(`${plain.base}/api/host-checks`, { method: 'POST' })).status, 405, 'read only');
  } finally { await plain.close(); }
  const dir = await folder(t), file = path.join(dir, 'report.json');
  await writeFile(file, JSON.stringify({ unixSeconds: Date.now() / 1000, checks: [{ id: 'computer-awake', state: 'pass', reading: 'Awake and unlocked' }] }));
  const relay = await startRelay({}, { files: { 'host-paths.json': JSON.stringify({ hostChecks: file }) } });
  try {
    const reply = await relay.api('host-checks');
    assert.deepEqual([reply.body.providers, states(reply.body)], [1, { 'playback-app': 'cannot-check', 'midi-interface': 'cannot-check', 'computer-awake': 'pass' }]);
    assert.equal(reply.body.checks[2].reading, 'Awake and unlocked');
  } finally { await relay.close(); }
  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' });
  try { assert.equal((await fetch(`${locked.base}/api/host-checks`)).status, 401); } finally { await locked.close(); }
});
