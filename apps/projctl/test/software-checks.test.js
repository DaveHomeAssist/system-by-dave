import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readSoftwareChecks } from '../server/software-checks.js';
import { testReport } from '../scripts/test-report.js';
import { RELEASE } from '../public/release.js';
import { startRelay } from './relay-helper.js';

const sourceCommit = 'a'.repeat(40);
const receipt = () => testReport({ results: [{ name: 'Login and recovery', code: 0, seconds: 1 }], sourceCommit, runner: 'private-runner' });
test('software reports retain failures, require an exact package and omit private metadata', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'software-checks-'));
  const file = path.join(dir, 'software-checks.json'), delivery = path.join(dir, 'DELIVERY.json');
  const read = () => readSoftwareChecks(file, delivery, RELEASE);
  try {
    assert.deepEqual(await read(), { state: 'absent' });
    const r = receipt();
    await fs.writeFile(file, JSON.stringify(r));
    assert.equal((await read()).state, 'recorded');
    await fs.writeFile(delivery, JSON.stringify({ sourceCommit }));
    const match = await read();
    assert.equal(match.state, 'matched'); assert.equal(match.passed, true);
    assert.equal(JSON.stringify(match).includes('private-runner'), false);
    r.checks.push({ name: 'Connection recovery', outcome: 'timed-out', exitCode: 124, durationSeconds: 10 });
    await fs.writeFile(file, JSON.stringify(r));
    assert.equal((await read()).passed, false, 'a claimed passed status cannot hide a failed check');
    await fs.writeFile(delivery, JSON.stringify({ sourceCommit: 'b'.repeat(40) }));
    assert.equal((await read()).state, 'different');
    r.checks[1].outcome = 'passed'; await fs.writeFile(file, JSON.stringify(r));
    assert.deepEqual(await read(), { state: 'invalid' });
    await fs.writeFile(file, JSON.stringify({ ...receipt(), finishedAt: '2999-01-01T00:00:00Z' }));
    assert.deepEqual(await read(), { state: 'invalid' });
    await fs.writeFile(file, JSON.stringify({ ...receipt(), finishedAt: '2020-01-01T00:00:00Z' }));
    assert.equal((await read()).finishedAt, '2020-01-01T00:00:00.000Z', 'older records keep their date');
    await fs.writeFile(file, '{broken'); assert.deepEqual(await read(), { state: 'invalid' });
    await fs.writeFile(file, 'x'.repeat(262145)); assert.deepEqual(await read(), { state: 'invalid' });
    await fs.unlink(file); await fs.symlink(delivery, file); assert.deepEqual(await read(), { state: 'invalid' });
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('software report endpoint is read only and authenticated', async () => {
  const relay = await startRelay({ PJ_PASSCODE: 'fixture' }, { files: { 'software-checks.json': JSON.stringify(receipt()) } });
  try {
    assert.equal((await relay.api('software-checks')).status, 401);
    const login = await fetch(relay.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'fixture' }) });
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const response = await fetch(relay.base + '/api/software-checks', { headers: { cookie } });
    assert.equal(response.status, 200); assert.equal((await response.json()).state, 'recorded');
    const post = await fetch(relay.base + '/api/software-checks', { method: 'POST', headers: { cookie } });
    assert.equal(post.status, 404);
  } finally { await relay.close(); }
});
