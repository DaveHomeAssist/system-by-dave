import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetryReader, sleep } from '../server/telemetry-reader.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));
const lost = () => new Error('connection closed before Panasonic reply');
const reading = { sensors: [{ id: 'intake', role: 'intake', c: 37 }] };
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('status and telemetry exclude each other in both directions, across retries', async () => {
  const retry = deferred(), poll = deferred(), temperature = deferred();
  const log = [];
  const reader = createTelemetryReader({ wait: async (ms) => {
    assert.equal(ms, 4000); log.push('retry wait'); await retry.promise;
  } });
  const first = reader.poll('P1', async () => { log.push('poll'); await poll.promise; });
  let attempts = 0;
  const report = reader.read('P1', { healthReadings: async () => {
    log.push('temperature');
    if (++attempts === 1) throw lost();
    await temperature.promise;
    return reading;
  } }, { attempts: 3 });
  await tick();
  assert.deepEqual(log, ['poll']);
  assert.equal(await reader.poll('P2', async () => 'independent'), 'independent');
  poll.resolve(); await first; await tick();
  assert.deepEqual(log, ['poll', 'temperature', 'retry wait']);
  await reader.poll('P1', async () => log.push('between retries'));
  retry.resolve(); await tick();
  const next = reader.poll('P1', async () => log.push('next poll'));
  await tick();
  assert.deepEqual(log, ['poll', 'temperature', 'retry wait', 'between retries', 'temperature']);
  temperature.resolve();
  assert.equal(await report, reading); await next;
  assert.equal(log.at(-1), 'next poll');
});

test('retries are capped at three and only transport failures retry', async () => {
  for (const attempts of [3, 1000, Infinity]) {
    let calls = 0, waits = 0;
    const reader = createTelemetryReader({ wait: async () => { waits++; } });
    await assert.rejects(reader.read('P1', { healthReadings: async () => { calls++; throw lost(); } }, { attempts }), (e) => e.attempts === 3);
    assert.equal(calls, 3); assert.equal(waits, 2);
  }
  for (const error of [Object.assign(new Error('refused'), { code: 'ER401' }), new Error('Invalid Panasonic temperature reply'), new Error('auth failed')]) {
    let calls = 0;
    const reader = createTelemetryReader({ wait: async () => assert.fail('unexpected retry') });
    await assert.rejects(reader.read('P1', { healthReadings: async () => { calls++; throw error; } }, { attempts: 3 }), (e) => e === error);
    assert.equal(calls, 1);
  }
});

test('successful partial readings and default single attempts do not retry', async () => {
  const reader = createTelemetryReader({ wait: async () => assert.fail('unexpected retry') });
  const partial = { ...reading, readError: 'connection closed before Panasonic reply' };
  assert.equal(await reader.read('P1', { healthReadings: async () => partial }, { attempts: 3 }), partial);
  await assert.rejects(reader.read('P1', { healthReadings: async () => { throw lost(); } }), /connection closed/);
  assert.equal(await reader.poll('P1', async () => 'recovered'), 'recovered');
});

test('queued cancellation returns promptly, skips I/O and retains active ownership', async () => {
  const reader = createTelemetryReader(), active = deferred();
  const firstController = new AbortController(), queuedController = new AbortController();
  const first = reader.poll('P1', () => active.promise, { signal: firstController.signal });
  await tick();
  const queued = reader.read('P1', { healthReadings: () => assert.fail('cancelled read started') }, { signal: queuedController.signal });
  queuedController.abort(new Error('queued cancelled'));
  await assert.rejects(queued, /queued cancelled/);
  firstController.abort(new Error('active cancelled'));
  await assert.rejects(first, /active cancelled/);
  let started = false;
  const last = reader.poll('P1', async () => { started = true; });
  await tick(); assert.equal(started, false);
  active.resolve(); await last; assert.equal(started, true);
});

test('cancellation during retry sleep prevents another attempt', async () => {
  const controller = new AbortController(), waiting = deferred();
  let calls = 0;
  const reader = createTelemetryReader({ wait: (ms, signal) => { waiting.resolve(); return sleep(ms, signal); } });
  const report = reader.read('P1', { healthReadings: async () => { calls++; throw lost(); } }, { attempts: 3, signal: controller.signal });
  await waiting.promise;
  controller.abort(new Error('deadline'));
  await assert.rejects(report, /deadline/);
  assert.equal(calls, 1);
  assert.equal(await reader.poll('P1', async () => 'available'), 'available');
});
