import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import {
  createHealthReports, createNotionPublisher, notionPage, readHealthConfig, ratedAmbientC, unitRow, summarize, buildReport, renderMarkdown, localStamp,
} from '../server/health-reports.js';
import { parseQtm, panasonicDriver } from '../server/drivers/panasonic.js';
import { pulseDriver } from '../server/drivers/pulse.js';

const RIG = [
  { slot: 'P1', lane: 'C', make: 'Barco', model: 'UDM 4K22', ip: '192.168.5.22', driver: 'pulse', password: 'secret-1' },
  { slot: 'P2', lane: 'B', make: 'Panasonic', model: 'PT-RZ970', ip: '192.168.5.21', driver: 'panasonic' },
  { slot: 'P3', lane: 'A', make: 'Panasonic', model: 'PT-DW830U', ip: '192.168.5.20', driver: 'panasonic' },
  { slot: 'P4', lane: 'D', make: 'Panasonic', model: 'PT-DW830U', ip: '192.168.5.23', driver: 'panasonic' },
];
const CONFIG = { enabled: true, titlePrefix: 'Frozen | Projectors | Health Log', watchHeadroomC: 5, ratedAmbientC: { P3: 40, P4: 40 }, notion: {} };
const ok = { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 };
const panasonic = (intake, other = 0) => ({ sensors: [{ id: 'intake', role: 'intake', label: 'Intake air (QTM:0)', c: intake }, { id: 'qtm1', role: 'internal', c: 37 }, { id: 'qtm2', role: 'internal', c: null }], other });
// The 2026-11-11 readings.
const NOV11 = {
  P1: { st: { online: true, power: 'on', errors: null, lightHours: 3922 }, readings: { sensors: [{ id: 'ambient', role: 'intake', label: 'Ambient, outside', c: 29.8 }], alarm: 'Ok' } },
  P2: { st: { online: true, power: 'on', errors: ok, lightHours: 3860 }, readings: panasonic(23) },
  P3: { st: { online: true, power: 'on', errors: { ...ok, other: 1 }, lightHours: 1059 }, readings: panasonic(27) },
  P4: { st: { online: true, power: 'on', errors: { ...ok, other: 1 }, lightHours: 824 }, readings: panasonic(37) },
};
const rows = (data = NOV11) => RIG.map((p) => unitRow(p, data[p.slot].st, { lastSuccessAt: '2026-11-12T03:58:16.000Z' }, data[p.slot].readings, null, CONFIG));

test('Panasonic QTM replies parse as °C and rated limits follow model and overrides', () => {
  assert.equal(parseQtm('0023/0073'), 23);
  assert.equal(parseQtm('0037/0098'), 37);
  assert.equal(parseQtm('-005/0023'), -5);
  assert.equal(parseQtm('31'), 31);
  assert.throws(() => parseQtm('ER401'), /Invalid Panasonic temperature/);
  assert.equal(ratedAmbientC(RIG[0]), 40);
  assert.equal(ratedAmbientC(RIG[1]), 45);
  assert.equal(ratedAmbientC(RIG[3]), 40, 'lane D is portrait, so the DW830 default is 40 °C');
  assert.equal(ratedAmbientC({ ...RIG[3], lane: 'C', orientation: 'landscape' }), 45);
  assert.equal(ratedAmbientC({ ...RIG[3], lane: '', orientation: 'portrait' }), 40);
  assert.equal(ratedAmbientC(RIG[3], { P4: 40 }), 40);
  const moved = { ...RIG[3], slot: 'P9', mac: '70:58:12:ee:27:0d', ip: '198.51.100.23' };
  assert.equal(ratedAmbientC(moved, { '70:58:12:ee:27:0d': 38 }), 38, 'a MAC override follows the unit onto a new slot');
  assert.equal(ratedAmbientC({ ...moved, mac: '' }, { '198.51.100.23': 37 }), 37);
  assert.equal(ratedAmbientC({ slot: 'X', model: 'Unknown' }), null);
  assert.equal(ratedAmbientC({ ...RIG[3], lane: 'C', orientation: 'landscape' }, {}, { reliable: false }), 40, 'an unreadable limits file does not keep the higher landscape rating');
});

test('settings are private, validated and optional', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-health-config-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'health-reports.json');
  const missing = readHealthConfig(file);
  assert.equal(missing.enabled, true); assert.deepEqual(missing.notion, {}); assert.equal(missing.error, null);
  fs.writeFileSync(file, JSON.stringify({ titlePrefix: 'Frozen | Projectors | Health Log', notion: { databaseId: '4cb4011c-f034-4eeb-942b-653b196ec25b' }, ratedAmbientC: { P3: 40, P4: 'hot' } }));
  const good = readHealthConfig(file);
  assert.equal(good.notion.databaseId, '4cb4011cf0344eeb942b653b196ec25b');
  assert.deepEqual(good.ratedAmbientC, { P3: 40 });
  assert.equal(good.titlePrefix, 'Frozen | Projectors | Health Log');
  fs.writeFileSync(file, '{ not json');
  const bad = readHealthConfig(file);
  assert.match(bad.error, /unreadable/); assert.deepEqual(bad.notion, {}); assert.equal(bad.enabled, true);
});

test('the 2026-11-11 readings produce the same findings as the hand-written report', () => {
  const units = rows();
  assert.deepEqual(units.map((u) => u.headroomC), [10.2, 22, 13, 3]);
  assert.deepEqual(units.map((u) => u.verdict), ['ok', 'ok', 'ok', 'watch']);
  assert.equal(units[0].password, undefined);
  const s = summarize(units);
  assert.match(s.findings, /^No overheating: 0 of 4 units flagged for temperature, fan or alarm\./);
  assert.match(s.findings, /Least headroom: P4 \(lane D, Panasonic PT-DW830U, 192\.168\.5\.23\) 3 °C \(37 °C intake, 40 °C limit\)\./);
  assert.match(s.findings, /PJLink warnings: P3 other warning; P4 other warning\./);
  assert.match(s.followUp, /P4 \(lane D, 192\.168\.5\.23\): inspect intake clearance and exhaust path, 3 °C headroom\./);
  assert.match(s.followUp, /P3, P4: read the Self Test screen for the "other" warning\./);
  assert.deepEqual(s.counts, { units: 4, reached: 4, flagged: 0, watch: 1, unreachable: 0 });
});

test('flags, alarms, unreachable units and missing readings are reported', () => {
  const data = structuredClone(NOV11);
  data.P2.st.errors = { ...ok, temp: 1, fan: 2 };
  data.P1.readings.alarm = 'Warning';
  data.P3.st.online = false;
  data.P4.readings = null;
  const units = RIG.map((p) => unitRow(p, data[p.slot].st, {}, data[p.slot].readings, p.slot === 'P4' ? 'timeout (port 1024)' : null, CONFIG));
  const s = summarize(units);
  assert.match(s.findings, /^2 of 4 units flagged: P1 \(lane C, Barco UDM 4K22, 192\.168\.5\.22\) alarm Warning; P2 \(lane B, Panasonic PT-RZ970, 192\.168\.5\.21\) temperature warning, fan error\./);
  assert.match(s.findings, /Not reached: P3 /);
  assert.match(s.findings, /Temperatures not read: P4\./);
  assert.match(s.followUp, /P2 \(lane B, 192\.168\.5\.21\): check temperature warning, fan error on the projector\./);
  assert.match(s.followUp, /P3 \(lane A, 192\.168\.5\.20\): not reachable/);
  const report = buildReport({ kind: 'hourly', startedAt: Date.parse('2026-11-13T00:00:00Z'), finishedAt: Date.parse('2026-11-13T00:00:03Z'), units, config: CONFIG });
  assert.equal(report.title, 'Frozen | Projectors | Health Log | 2026-11-12 19:00 | Hourly');
  const md = renderMarkdown(report);
  assert.match(md, /\| P3 \| A \| Panasonic PT-DW830U \| 192\.168\.5\.20 \| on \| 27 \| 40 \| 13 \| 37 \| Not reached \|/);
  assert.match(md, /readings: timeout \(port 1024\)/);
  const none = summarize(units.map((u) => ({ ...u, online: false, verdict: 'unreachable', headroomC: null })));
  assert.match(none.findings, /^No units reachable; 0 of 4 read\./);
});

test('Notion page carries the four properties and a unit table', () => {
  const report = buildReport({ kind: 'power-off', reason: 'power off from ui (P1)', startedAt: Date.parse('2026-11-12T03:57:57Z'), finishedAt: Date.parse('2026-11-12T03:57:59Z'), units: rows(), events: [{ at: '2026-11-12T03:54:10.000Z', slot: 'P3', text: 'offline · timeout' }], config: CONFIG });
  report.findings += ' x'.repeat(2000);
  const page = notionPage(report, '4cb4011cf0344eeb942b653b196ec25b');
  assert.deepEqual(page.parent, { database_id: '4cb4011cf0344eeb942b653b196ec25b' });
  assert.deepEqual(Object.keys(page.properties), ['Log', 'Check window', 'Findings', 'Follow-up']);
  assert.equal(page.properties.Log.title[0].text.content, 'Frozen | Projectors | Health Log | 2026-11-11 22:57 | Power off');
  assert.deepEqual(page.properties['Check window'].date, { start: '2026-11-12T03:57:57.000Z', end: '2026-11-12T03:57:59.000Z' });
  assert.ok(page.properties.Findings.rich_text[0].text.content.length <= 2000);
  const tables = page.children.filter((b) => b.type === 'table');
  assert.equal(tables.length, 2);
  assert.equal(tables[0].table.table_width, 12);
  assert.equal(tables[0].table.children.length, 5);
  assert.ok(tables[0].table.children.every((r) => r.table_row.cells.every((c) => c[0].text.content.length > 0)));
  assert.doesNotMatch(JSON.stringify(page), /secret-1/);
});

test('Notion publisher sends the page, classifies failures and redacts the token', async () => {
  const report = buildReport({ kind: 'manual', startedAt: 0, finishedAt: 1, units: rows(), config: CONFIG });
  const calls = [];
  const reply = (status, body) => async (url, init) => { calls.push({ url, init }); return { ok: status < 300, status, json: async () => body }; };
  const token = async () => 'ntn_test_token';
  const published = await createNotionPublisher({ databaseId: 'd'.repeat(32), token, fetch: reply(200, { id: 'page-1', url: 'https://notion.example/page-1' }) })(report);
  assert.deepEqual(published, { id: 'page-1', url: 'https://notion.example/page-1' });
  assert.equal(calls[0].url, 'https://api.notion.com/v1/pages');
  assert.equal(calls[0].init.headers.authorization, 'Bearer ntn_test_token');
  assert.equal(calls[0].init.headers['notion-version'], '2022-06-28');
  await assert.rejects(createNotionPublisher({ databaseId: 'd'.repeat(32), token, fetch: reply(429, { message: 'slow down' }) })(report), (e) => e.retry === true && /Notion 429: slow down/.test(e.message));
  await assert.rejects(createNotionPublisher({ databaseId: 'd'.repeat(32), token, fetch: reply(404, { message: 'Could not find database with ID ntn_test_token' }) })(report), (e) => e.retry === false && !e.message.includes('ntn_test_token'));
  await assert.rejects(createNotionPublisher({ databaseId: 'd'.repeat(32), token, fetch: async () => { throw new TypeError('fetch failed'); } })(report), (e) => e.retry === true && /unreachable/.test(e.message));
  await assert.rejects(createNotionPublisher({ databaseId: 'd'.repeat(32), token: async () => null, fetch: reply(200, {}) })(report), (e) => e.code === 'NO_TOKEN' && e.retry === true);
});

function fakeClock(start) {
  let t = start; const timers = new Set();
  const flush = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };
  return {
    now: () => t,
    timer: (fn, ms) => { const h = { at: t + Math.max(0, ms), fn }; timers.add(h); return h; },
    cancel: (h) => timers.delete(h),
    flush,
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const due = [...timers].filter((h) => h.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        t = due.at; timers.delete(due); due.fn(); await flush();
      }
      t = end; await flush();
    },
  };
}
function rigEngine(t, { start = '2026-11-12T22:10:00Z', config = CONFIG, publish = null, dir, readTelemetry, ...rest } = {}) {
  dir ||= fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-health-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const clock = fakeClock(Date.parse(start));
  const live = new Map(RIG.map((p) => [p.slot, { online: true, power: 'off', errors: ok }]));
  const engine = createHealthReports({
    dir, config, publish, projectors: () => RIG, status: (slot) => live.get(slot), connection: () => ({ lastSuccessAt: new Date(clock.now()).toISOString() }),
    events: () => [], readTelemetry: readTelemetry || ((p) => NOV11[p.slot].readings), now: clock.now, timer: clock.timer, cancelTimer: clock.cancel,
    log: { log() {}, error() {} }, ...rest,
  }).start();
  const set = (power, slots = RIG.map((p) => p.slot)) => { for (const s of slots) { live.get(s).power = power; engine.observe(s, power); } };
  const kinds = () => engine.view().reports.map((r) => r.kind).reverse();
  return { engine, clock, live, set, kinds, dir };
}

test('power-on, hourly and power-off reports follow the lit session', async (t) => {
  const { engine, clock, set, kinds, dir } = rigEngine(t);
  set('off');
  await clock.advance(3 * 3600000);
  assert.deepEqual(kinds(), [], 'nothing while the rig is dark');
  set('warming', ['P1']);
  await clock.advance(60000);
  set('on', ['P2', 'P3', 'P4']);
  assert.deepEqual(kinds(), [], 'power-on waits for the other units');
  await clock.advance(60000);
  assert.deepEqual(kinds(), ['power-on'], 'one power-on report, two minutes after the first lit unit');
  const first = engine.view().reports[0];
  assert.equal(first.counts.reached, 4);
  set('on');
  await clock.advance(2 * 3600000);
  assert.deepEqual(kinds(), ['power-on', 'hourly', 'hourly'], 'hourly on the hour while lit');
  engine.powerOff('P1', 'ui'); engine.powerOff('P2', 'ui'); engine.powerOff('P3', 'schedule');
  await clock.flush();
  set('cooling');
  await clock.flush();
  assert.deepEqual(kinds(), ['power-on', 'hourly', 'hourly', 'power-off'], 'one report per batch power-off');
  const off = JSON.parse(fs.readFileSync(path.join(dir, `${engine.view().reports[0].id}.json`), 'utf8'));
  assert.ok(off.units.every((u) => u.power === 'on'), 'readings snapshot taken before the units changed state');
  assert.equal(off.notion.state, 'local-only');
  assert.ok(fs.existsSync(path.join(dir, `${off.id}.md`)));
  set('off');
  await clock.advance(2 * 3600000);
  assert.equal(kinds().length, 4, 'no hourly reports once dark');
  assert.equal(engine.powerOff('P1', 'ui'), null, 'powering off a dark rig writes nothing');
});

test('hourly is skipped right after another report and relay stop writes a final report', async (t) => {
  const { engine, clock, set, kinds } = rigEngine(t, { start: '2026-11-12T22:55:00Z' });
  set('off'); set('on', ['P1']);
  await clock.advance(10 * 60000); // power-on at 22:57, hourly at 23:00 is skipped
  assert.deepEqual(kinds(), ['power-on']);
  await clock.advance(30 * 60000);
  await engine.stop();
  assert.deepEqual(kinds(), ['power-on', 'relay-stop']);
  assert.equal(engine.view().engine.state, 'stopped');
  assert.equal(engine.powerOff('P1'), null);
});

test('a reading that never answers is capped and stop never hangs', async (t) => {
  const { engine, clock, set } = rigEngine(t, { readTelemetry: (p) => (p.slot === 'P4' ? new Promise(() => {}) : NOV11[p.slot].readings), telemetryTimeoutMs: 12000, stopTimeoutMs: 6000 });
  set('off'); set('on');
  const job = engine.run();
  await clock.flush(); // let the capture start and arm its reading deadlines
  await clock.advance(12000);
  const summary = await job;
  assert.match(summary.findings, /Temperatures not read: P4\./);
  const pendingStop = engine.stop();
  await clock.advance(6000);
  await pendingStop;
});

test('Notion failures stay local, retry later and survive a restart', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-health-retry-'));
  let mode = 'down';
  const publish = async () => { if (mode === 'down') throw Object.assign(new Error('Notion unreachable: fetch failed'), { retry: true }); if (mode === 'refused') throw Object.assign(new Error('Notion 404'), { retry: false }); return { id: 'p1', url: 'https://notion.example/p1' }; };
  const config = { ...CONFIG, notion: { databaseId: 'd'.repeat(32) } };
  const a = rigEngine(t, { dir, config, publish });
  a.set('off'); a.set('on');
  const first = await a.engine.run();
  assert.equal(first.notion.state, 'pending');
  assert.equal(a.engine.view().engine.notion.pending, 1);
  await a.engine.stop();
  const b = rigEngine(t, { dir, config, publish });
  assert.equal(b.engine.view().engine.notion.pending, 1, 'pending reports reload after restart');
  mode = 'up';
  await b.clock.advance(10 * 60000);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, `${first.id}.json`), 'utf8'));
  assert.equal(saved.notion.state, 'published');
  assert.equal(saved.notion.url, 'https://notion.example/p1');
  mode = 'refused';
  b.set('off'); b.set('on');
  const refused = await b.engine.run();
  assert.equal(refused.notion.state, 'failed');
  assert.equal(b.engine.view().engine.notion.pending, 0);
});

test('a reporting fault never interrupts polling or the power-off path', async (t) => {
  const { engine, clock, set } = rigEngine(t, { projectors: () => { throw new Error('rig unreadable'); } });
  set('off');
  assert.doesNotThrow(() => set('on'));
  assert.equal(engine.powerOff('P1', 'ui'), null);
  assert.equal(await engine.run(), null);
  await clock.advance(2 * 3600000); // power-on timer and hourly ticks run without throwing
  assert.deepEqual(engine.view().reports, []);
});

test('disabled settings write nothing', async (t) => {
  const { engine, clock, set, kinds } = rigEngine(t, { config: { ...CONFIG, enabled: false } });
  set('off'); set('on');
  await clock.advance(2 * 3600000);
  assert.equal(engine.powerOff('P1'), null);
  assert.deepEqual(kinds(), []);
  assert.throws(() => engine.run(), (e) => e.status === 409);
  assert.equal(engine.view().engine.state, 'disabled');
});

test('local stamps use New York time across daylight saving', () => {
  assert.equal(localStamp(Date.parse('2026-11-12T03:57:00Z')), '2026-11-11 22:57');
  assert.equal(localStamp(Date.parse('2026-07-01T00:30:00Z')), '2026-06-30 20:30');
});

async function fakeServer(t, onLine) {
  const sockets = new Set();
  const server = net.createServer((socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); onLine(socket); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const s of sockets) s.destroy(); server.close(); });
  return server.address().port;
}

test('Panasonic health readings query QTM:0-2 read-only and tolerate a refused sensor', async (t) => {
  const sent = [];
  const replies = { 'QTM:0': '0037/0098', 'QTM:1': '0037/0098', 'QTM:2': 'ER401' };
  const port = await fakeServer(t, (socket) => {
    socket.write('NTCONTROL 0\r');
    let text = '';
    socket.on('data', (b) => { text += b; if (!text.includes('\r')) return; const cmd = text.trim().replace(/^00/, ''); sent.push(cmd); socket.write(`00${replies[cmd] ?? 'ER402'}\r`); });
  });
  const driver = panasonicDriver({ host: '127.0.0.1', port, timeoutMs: 500 });
  const out = await driver.healthReadings();
  assert.deepEqual(sent, ['QTM:0', 'QTM:1', 'QTM:2']);
  assert.deepEqual(out.sensors.map((s) => [s.id, s.role, s.c]), [['intake', 'intake', 37], ['qtm1', 'internal', 37], ['qtm2', 'internal', null]]);
});

test('Barco health readings read ambient and alarm state only', async (t) => {
  const asked = [];
  const values = { 'environment.temperature.ambient_outside.value': 29.83, 'environment.alarmstate': 'Ok' };
  const port = await fakeServer(t, (socket) => {
    let text = '';
    socket.on('data', (b) => {
      text += b; if (!text.includes('\n')) return;
      const request = JSON.parse(text); asked.push([request.method, request.params?.property]);
      const reply = { jsonrpc: '2.0', id: request.id };
      if (request.method === 'property.get' && request.params.property in values) reply.result = values[request.params.property];
      else reply.error = { code: -32601, message: 'unsupported property' };
      socket.end(JSON.stringify(reply));
    });
  });
  const driver = pulseDriver({ host: '127.0.0.1', port, timeoutMs: 200 });
  const out = await driver.healthReadings();
  assert.deepEqual(asked.map(([m]) => m), ['property.get', 'property.get']);
  assert.deepEqual(out, { sensors: [{ id: 'ambient', label: 'Ambient, outside', role: 'intake', c: 29.8 }], alarm: 'Ok' });
  delete values['environment.temperature.ambient_outside.value'];
  const missing = await driver.healthReadings();
  assert.equal(missing.sensors[0].c, null, 'an unsupported sensor is not read as 0 °C');
});
