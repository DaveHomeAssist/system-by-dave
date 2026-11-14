import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { createPoller } from '../server/polling.js';
import { pjlinkDriver } from '../server/drivers/pjlink.js';
import { pulseDriver } from '../server/drivers/pulse.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message) {
  for (let i = 0; i < 100; i++) { if (check()) return; await delay(10); }
  assert.fail(message);
}
function clock() {
  let time = 0, id = 0;
  const jobs = new Map();
  return { now: () => time, timer(fn, ms) { const key = ++id; jobs.set(key, { fn, at: time + ms }); return key; },
    cancelTimer: key => jobs.delete(key),
    async advance(ms) { time += ms; for (const [key, job] of [...jobs]) if (job.at <= time) { jobs.delete(key); job.fn(); } for (let i = 0; i < 8; i++) await Promise.resolve(); },
    next: () => Math.min(...[...jobs.values()].map(x => x.at)), count: () => jobs.size };
}
test('saved-target retry backs off, resets after recovery and closes without scanning or commands', async () => {
  const c = clock(), target = { slot: 'P3', ip: '198.51.100.20', lane: 'A' }, original = JSON.stringify(target);
  const failures = [], successes = []; let up = false, reads = 0;
  const p = createPoller({ ...c, intervalMs: 5, maxRetryMs: 15, timeoutMs: 100,
    target: () => target, read: async () => { reads++; if (!up) throw new Error('cable disconnected'); return { power: 'on' }; },
    failed: (_, e, state) => failures.push(state), succeeded: (_, state) => successes.push(state) });
  await p.poll('P3'); assert.equal(c.next(), 5); await c.advance(5);
  assert.equal(c.next(), 15); await c.advance(10); assert.equal(c.next(), 30);
  assert.deepEqual(failures.map(x => x.retryDelayMs), [5, 10, 15]);
  up = true; await c.advance(15); assert.equal(successes.length, 1); assert.equal(c.next(), 35);
  up = false; await c.advance(5); assert.equal(failures.at(-1).retryDelayMs, 5);
  assert.equal(JSON.stringify(target), original); p.close(); assert.equal(c.count(), 0);
  const before = reads; await c.advance(100); assert.equal(reads, before);
});

test('overlapping polls share work; an old target cannot publish after an explicit retarget', async () => {
  const c = clock(), t = { slot: 'P1', ip: '198.51.100.22', lane: 'C' }, resolve = [], seen = [], starts = [];
  const p = createPoller({ ...c, target: () => t, read: x => new Promise(r => resolve.push({ ip: x.ip, r })),
    started: (_, info) => starts.push(info), succeeded: (x, value) => seen.push([x.ip, value]), failed: () => assert.fail('superseded read must not report a device failure') });
  const first = p.poll('P1'); assert.equal(p.poll('P1'), first); await Promise.resolve();
  t.ip = '198.51.100.23'; const second = p.poll('P1'); await Promise.resolve();
  resolve[1].r('new'); await second; resolve[0].r('old'); await first;
  assert.deepEqual(seen, [['198.51.100.23', 'new']]); assert.equal(starts[1].identityChanged, true); p.close();
});

test('a stalled read has a deadline and a healthy peer continues independently', async () => {
  const c = clock(), failures = [], seen = [];
  const p = createPoller({ ...c, target: slot => ({ slot, ip: slot }), timeoutMs: 10, intervalMs: 5,
    read: p => p.slot === 'silent' ? new Promise(() => {}) : Promise.resolve('reply'),
    failed: (p, e) => failures.push([p.slot, e.code]), succeeded: p => seen.push(p.slot) });
  const silent = p.poll('silent'); await p.poll('healthy'); await c.advance(10); await silent;
  assert.deepEqual(failures, [['silent', 'POLL_TIMEOUT']]); assert.ok(seen.length >= 2); p.close();
});

test('explicit verification waits for an older poll then obtains a genuinely fresh read', async () => {
  const c = clock(), pending = [], seen = [];
  const p = createPoller({ ...c, target: () => ({ slot: 'P1', ip: 'saved' }), read: () => new Promise(resolve => pending.push(resolve)), succeeded: (_, value) => seen.push(value) });
  const old = p.poll('P1'); await Promise.resolve(); const fresh = p.refresh('P1');
  pending[0]('before-command'); await old; await Promise.resolve();
  assert.equal(pending.length, 2); pending[1]('after-command'); await fresh;
  assert.deepEqual(seen, ['before-command', 'after-command']); p.close();
});

async function fixture(t, handler) {
  const sockets = new Set(), requests = [];
  const server = net.createServer(s => { sockets.add(s); s.on('close', () => sockets.delete(s)); handler(s, requests); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const s of sockets) s.destroy(); server.close(); });
  return { server, sockets, requests, port: server.address().port };
}
test('PJLink silent/closed cable recovers on fresh sockets and sends queries only', async t => {
  let mode = 'silent';
  const f = await fixture(t, (s, requests) => {
    if (mode === 'silent') return;
    if (mode === 'closed') { s.end(); return; }
    s.write('PJLINK 0\r'); s.once('data', b => {
      const command = b.toString().trim(); requests.push(command);
      const name = command.slice(2, 6), values = { POWR: '1', AVMT: '30', INPT: '31', ERST: '000000', LAMP: '10 1', NAME: 'fixture' };
      s.end(`%1${name}=${values[name]}\r`);
    });
  });
  const d = pjlinkDriver({ host: '127.0.0.1', port: f.port, timeoutMs: 35 });
  await assert.rejects(d.getStatus(), /timeout/); await until(() => f.sockets.size === 0, 'timed-out socket leaked');
  mode = 'closed'; await assert.rejects(d.getStatus(), /closed/);
  mode = 'online'; assert.equal((await d.getStatus()).power, 'on');
  assert.ok(f.requests.every(x => /^%1[A-Z]{4} \?$/.test(x)));
});

test('Pulse cancellation after core reply drains no optional backlog and reconnects without setters', async t => {
  let mode = 'stall-optional';
  const f = await fixture(t, (s, requests) => {
    s.on('data', b => {
      const r = JSON.parse(b.toString()); requests.push(r);
      const core = r.params?.property === 'system.state';
      if (mode === 'stall-optional' && !core) return;
      if (mode === 'drop-optional' && !core) { s.destroy(); return; }
      s.end(JSON.stringify({ jsonrpc: '2.0', id: r.id, ...(core ? { result: 'on' } : { error: { code: -32601, message: 'unsupported' } }) }));
    });
  });
  const d = pulseDriver({ host: '127.0.0.1', port: f.port, timeoutMs: 500 });
  const a = new AbortController(), pending = d.getStatus({ signal: a.signal });
  await until(() => f.requests.length === 2, 'optional query did not start');
  a.abort(new Error('test poll deadline')); await assert.rejects(pending, /deadline/);
  await until(() => f.sockets.size === 0, 'aborted socket leaked'); assert.equal(f.requests.length, 2);
  mode = 'online'; assert.equal((await d.getStatus()).power, 'on');
  mode = 'drop-optional'; await assert.rejects(d.getStatus(), /closed/);
  mode = 'online'; assert.equal((await d.getStatus()).power, 'on');
  assert.ok(f.requests.every(r => r.method === 'property.get' || r.method === 'image.source.list' || r.method === 'introspect'));
});
