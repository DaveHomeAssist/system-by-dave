import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommandFeedback } from '../server/command-feedback.js';

function fixture() {
  let clock = 0, reads = 0;
  const timers = new Set();
  const projector = { slot: 'P4', ip: 'test', driver: 'sim' };
  const reading = { online: true, power: 'on', shutter: 'closed' };
  let refresh = async () => { reads++; };
  const feedback = createCommandFeedback({ target: () => projector, status: () => reading,
    refresh: () => refresh(), now: () => clock,
    timer: (fn, delay) => { const item = { fn, at: clock + delay }; timers.add(item); return item; },
    cancelTimer: item => timers.delete(item),
  });
  return { feedback, reading, projector, timers, reads: () => reads,
    setRefresh(fn) { refresh = async () => { reads++; await fn(); }; },
    async next() {
      const item = [...timers].sort((a, b) => a.at - b.at)[0];
      assert.ok(item, 'expected a scheduled read');
      timers.delete(item); clock = item.at; await item.fn(); return clock;
    },
  };
}

test('delayed shutter movement gets a fresh follow-up and stops on confirmation', async () => {
  const f = fixture(); f.feedback.follow('P4', 'shutter', 'open');
  assert.equal(await f.next(), 400); assert.equal(f.reads(), 1);
  assert.equal(f.feedback.get('P4').phase, 'waiting');
  assert.equal(f.reading.shutter, 'closed', 'no optimistic mutation');
  f.setRefresh(() => { f.reading.shutter = 'open'; });
  assert.equal(await f.next(), 1400); assert.equal(f.reads(), 2); assert.equal(f.timers.size, 0);
  assert.equal(f.feedback.get('P4').phase, 'confirmed');
  assert.equal(f.feedback.get('P4').elapsedSeconds, 1.4);
  assert.equal(f.feedback.get('P4').identity, undefined, 'private target identity is not exposed');
});

test('cached matching state still requires a new read; offline matching state cannot confirm', async () => {
  const f = fixture(); f.reading.shutter = 'open';
  f.setRefresh(() => { f.reading.online = false; });
  f.feedback.follow('P4', 'shutter', 'open'); await f.next();
  assert.equal(f.reads(), 1); assert.equal(f.timers.size, 1);
  f.setRefresh(() => { f.reading.online = true; }); await f.next();
  assert.equal(f.timers.size, 0);
});

test('shutter reads have a 30-second deadline even if the device never moves', async () => {
  const f = fixture(); f.feedback.follow('P4', 'shutter', 'open');
  let last; while (f.timers.size) last = await f.next();
  assert.equal(last, 30000); assert.equal(f.reads(), 30);
  assert.equal(f.feedback.get('P4').phase, 'unconfirmed');
  assert.equal(f.reading.shutter, 'closed');
});

test('power transitions are read five seconds apart and stop at seven minutes', async () => {
  const f = fixture(); f.reading.power = 'cooling'; f.feedback.follow('P4', 'power', 'off');
  assert.equal(await f.next(), 400); assert.equal(await f.next(), 5400);
  let last; while (f.timers.size) last = await f.next();
  assert.equal(last, 420000); assert.equal(f.reads(), 84);
});

test('retargeting cancels the watch without querying the replacement', async () => {
  const f = fixture(); f.feedback.follow('P4', 'shutter', 'open'); f.projector.ip = 'replacement';
  await f.next(); assert.equal(f.reads(), 0); assert.equal(f.timers.size, 0);
  assert.equal(f.feedback.get('P4'), null);
});

test('a newer command supersedes an in-flight watch', async () => {
  const f = fixture(); let done;
  f.setRefresh(() => new Promise(resolve => { done = resolve; }));
  f.feedback.follow('P4', 'shutter', 'open'); const first = f.next();
  f.feedback.follow('P4', 'shutter', 'closed'); done(); await first;
  assert.equal(f.timers.size, 1);
  f.setRefresh(() => {}); await f.next(); assert.equal(f.timers.size, 0);
});

test('shutdown cancels timers and an in-flight read cannot schedule another', async () => {
  const f = fixture(); let done;
  f.setRefresh(() => new Promise(resolve => { done = resolve; }));
  f.feedback.follow('P4', 'power', 'off'); const first = f.next();
  f.feedback.close(); done(); await first;
  f.feedback.follow('P4', 'power', 'on'); assert.equal(f.timers.size, 0);
});

test('read failure is bounded and does not change the reported state', async () => {
  const f = fixture(); f.setRefresh(() => { throw new Error('unreachable'); });
  f.feedback.follow('P4', 'shutter', 'open'); await f.next();
  assert.equal(f.reading.shutter, 'closed'); assert.equal(f.timers.size, 1);
  f.feedback.close(); assert.equal(f.timers.size, 0);
});

test('a failed refresh cannot confirm a matching cached value', async () => {
  const f = fixture(); f.setRefresh(() => { throw new Error('unreachable'); });
  f.feedback.follow('P4', 'shutter', 'closed'); await f.next();
  assert.equal(f.timers.size, 1); f.feedback.close();
});

test('a connected projector cannot confirm an individually stale field', async () => {
  const f = fixture(); f.reading.stale = ['shutter'];
  f.feedback.follow('P4', 'shutter', 'closed'); await f.next();
  assert.equal(f.feedback.get('P4').phase, 'waiting');
  f.reading.stale = []; await f.next();
  assert.equal(f.feedback.get('P4').phase, 'confirmed');
});

test('a different control action clears the previous feedback and pending reads', () => {
  const f = fixture(); f.feedback.follow('P4', 'power', 'on'); f.feedback.clear('P4');
  assert.equal(f.feedback.get('P4'), null); assert.equal(f.timers.size, 0);
});
