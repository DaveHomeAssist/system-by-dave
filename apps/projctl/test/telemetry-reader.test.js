import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetryReader } from '../server/telemetry-reader.js';
import { createPoller } from '../server/polling.js';

const lost = () => new Error('connection closed before Panasonic reply');
const READING = { sensors: [{ id: 'intake', role: 'intake', c: 37 }] };
// A driver whose healthReadings answers from a script of results (Error = rejection).
function scripted(results, log = []) {
  return { healthReadings: async () => { log.push('read'); const r = results.shift(); if (r instanceof Error) throw r; return r; } };
}

test('each attempt waits for the status poll to finish, and a lost connection is retried', async () => {
  const log = [];
  let release;
  const settled = () => { log.push('settled?'); return log.filter((e) => e === 'settled?').length === 1 ? new Promise((r) => { release = () => { log.push('poll done'); r(); }; }) : Promise.resolve(); };
  const waits = [];
  const reader = createTelemetryReader({ settled, wait: async (ms) => { waits.push(ms); }, retryDelayMs: 1500 });
  const result = reader.read('P4', scripted([lost(), READING], log), { attempts: 3 });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(log, ['settled?'], 'no connection is opened while the poll is still running');
  release();
  assert.deepEqual(await result, READING);
  assert.deepEqual(log, ['settled?', 'poll done', 'read', 'settled?', 'read']);
  assert.deepEqual(waits, [1500]);
});

test('retries stop at the attempt limit, and refusals are not retried', async () => {
  const reader = createTelemetryReader({ wait: async () => {} });
  const log = [];
  await assert.rejects(reader.read('P3', scripted([lost(), lost(), lost(), READING], log), { attempts: 3 }), (e) => e.attempts === 3 && /connection closed/.test(e.message));
  assert.equal(log.length, 3);
  const refused = Object.assign(new Error('projector refuses this now (no signal, wrong state, or unsupported)'), { code: 'ER401' });
  const once = [];
  await assert.rejects(reader.read('P3', scripted([refused, READING], once), { attempts: 3 }), /refuses/);
  assert.equal(once.length, 1, 'a refusal is an answer, not a lost connection');
  const single = [];
  await assert.rejects(reader.read('P2', scripted([lost(), READING], single)), /connection closed/);
  assert.equal(single.length, 1, 'one attempt by default (the Thermal watch tries again next minute)');
});

test('an aborted read stops retrying', async () => {
  const controller = new AbortController();
  const reader = createTelemetryReader({ wait: (ms, signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) });
  const log = [];
  const read = reader.read('P4', scripted([lost(), READING], log), { attempts: 3, signal: controller.signal });
  await new Promise((r) => setImmediate(r));
  controller.abort(Object.assign(new Error('health reading timed out'), { code: 'POLL_TIMEOUT' }));
  await assert.rejects(read, /health reading timed out/);
  assert.equal(log.length, 1);
});

test('reads for one projector run one after another', async () => {
  const reader = createTelemetryReader();
  const order = [];
  let finishFirst;
  const slow = { healthReadings: () => { order.push('first start'); return new Promise((r) => { finishFirst = () => { order.push('first end'); r(READING); }; }); } };
  const fast = { healthReadings: async () => { order.push('second start'); return READING; } };
  const a = reader.read('P4', slow), b = reader.read('P4', fast);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(order, ['first start']);
  finishFirst();
  await Promise.all([a, b]);
  assert.deepEqual(order, ['first start', 'first end', 'second start']);
});

test('the poller reports when a slot has no status read in flight', async () => {
  let answer;
  const poller = createPoller({ target: () => ({ slot: 'P4', ip: '192.168.5.23' }), read: () => new Promise((r) => { answer = r; }), intervalMs: 60000, timer: () => null, cancelTimer: () => {} });
  let done = false;
  poller.poll('P4');
  const settled = poller.settled('P4').then(() => { done = true; });
  await new Promise((r) => setImmediate(r));
  assert.equal(done, false, 'still polling');
  answer({ online: true });
  await settled;
  assert.equal(done, true);
  await poller.settled('P3'); // nothing in flight resolves at once
  poller.close();
});
