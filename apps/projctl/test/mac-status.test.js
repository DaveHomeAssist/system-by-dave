// Show Mac status reports: validation, the in-memory store, the projector summary and the status token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateReport, createMacStatus, projectorSummary, statusToken, bearerToken, tokenMatches, REPORT_SCHEMA, STATUS_ROUTES } from '../server/mac-status.js';

const golden = () => JSON.parse(fs.readFileSync(new URL('./fixtures/status-report.example.json', import.meta.url), 'utf8'));
const withChange = (change) => { const r = golden(); change(r); return r; };
const invalid = (change, pattern) => assert.throws(() => validateReport(withChange(change)), { status: 400, message: pattern });

test('the documented example report is valid, including the timestamp format the Mac sends', () => {
  const report = validateReport(golden());
  assert.equal(report.host, 'm5');
  assert.equal(report.reportedAt, '2026-11-20T20:14:03.482Z');
  assert.equal(report.checks.length, 5);
});

test('reports are strict: unknown fields, wrong types and limits are refused', () => {
  invalid(r => { r.extra = 1; }, /unknown field "extra"/);
  invalid(r => { r.schema = 'other'; }, /schema must be/);
  invalid(r => { r.host = 'M5 Studio'; }, /host/);
  invalid(r => { r.host = ''; }, /host/);
  invalid(r => { r.phase = 'boot'; }, /phase must be one of/);
  invalid(r => { r.state = 'green'; }, /state must be one of/);
  invalid(r => { r.execution = 'prod'; }, /execution must be one of/);
  invalid(r => { r.reportedAt = 'yesterday at noon'; }, /ISO 8601/);
  invalid(r => { r.cycle = -1; }, /cycle/);
  invalid(r => { r.cycle = 1.5; }, /cycle/);
  invalid(r => { r.intervalSeconds = 5; }, /intervalSeconds/);
  invalid(r => { r.hostName = 'x'.repeat(81); }, /hostName/);
  invalid(r => { r.role = 'Projectors'; }, /role/);
  invalid(r => { r.runID = 'bad id!'; }, /runID/);
  invalid(r => { r.message = 'line\nbreak'; }, /message/);
  invalid(r => { r.checks = []; }, /between 1 and 24/);
  invalid(r => { r.checks = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, label: 'x', status: 'PASS', observed: '' })); }, /between 1 and 24/);
  invalid(r => { r.checks[0].status = 'OK'; }, /status must be one of/);
  invalid(r => { r.checks[0].id = 'Displays'; }, /unique lowercase/);
  invalid(r => { r.checks[1].id = 'displays'; }, /unique lowercase/);
  invalid(r => { r.checks[0].observed = 'x'.repeat(241); }, /observed/);
  invalid(r => { r.checks[0].observed = 'a\u0000b'; }, /observed/);
  invalid(r => { r.checks[0].command = 'reboot'; }, /unknown field/);
  invalid(r => { r.checks[0] = 'PASS'; }, /must be an object/);
  for (const bad of [null, [], 'text', 7]) assert.throws(() => validateReport(bad), { status: 400 });
});

test('a report cannot contradict its own checks', () => {
  invalid(r => { r.checks[0].status = 'FAIL'; }, /ok cannot include a failing check/);
  invalid(r => { r.state = 'fault'; }, /fault must name a failing check/);
  const fault = withChange(r => { r.state = 'fault'; r.checks[0].status = 'FAIL'; });
  assert.equal(validateReport(fault).state, 'fault');
  const running = withChange(r => { r.phase = 'startup'; r.state = 'running'; r.checks = r.checks.map(c => ({ ...c, status: 'RUNNING' })); });
  assert.equal(validateReport(running).state, 'running');
});

test('the relay keeps the latest report per Mac and decides freshness by its own clock', () => {
  let clock = 1_000_000;
  const store = createMacStatus({ now: () => clock, staleAfterMs: 180000, simulation: false });
  assert.deepEqual(store.view().hosts, []);
  const receipt = store.accept(golden());
  assert.deepEqual([receipt.ok, receipt.host], [true, 'm5']);
  clock += 60000;
  let [host] = store.view().hosts;
  assert.equal(host.ageMs, 60000);
  assert.equal(host.stale, false);
  assert.equal(host.reportedAt, '2026-11-20T20:14:03.482Z', 'the Mac\'s own report time is kept for display');
  assert.ok(Math.abs(host.clockSkewMs) > 1e9, 'a Mac whose clock is far off is visible, but it cannot look fresh');
  clock += 130000;
  [host] = store.view().hosts;
  assert.equal(host.stale, true, 'no report within three minutes is stale');
  store.accept(withChange(r => { r.cycle = 13; }));
  assert.equal(store.size, 1, 'a new report replaces the old one');
  assert.equal(store.view().hosts[0].stale, false);
  assert.equal(store.view().hosts[0].cycle, 13);
});

test('a report dated far in the future still goes stale by the relay clock', () => {
  let clock = 0;
  const store = createMacStatus({ now: () => clock, staleAfterMs: 1000 });
  store.accept(withChange(r => { r.reportedAt = '2099-01-01T00:00:00Z'; r.execution = 'mac'; }));
  clock = 5000;
  assert.equal(store.view().hosts[0].stale, true);
});

test('only a practice-mode relay accepts offline fixture reports, and the number of Macs is capped', () => {
  const fixture = withChange(r => { r.execution = 'offline fixture'; });
  assert.throws(() => createMacStatus({ simulation: false }).accept(fixture), { status: 400, message: /practice-mode/ });
  const practice = createMacStatus({ simulation: true });
  assert.equal(practice.accept(fixture).ok, true);
  assert.equal(practice.view().simulation, true);
  const store = createMacStatus({ maxHosts: 2 });
  for (const host of ['m5', 'm1']) store.accept(withChange(r => { r.host = host; }));
  assert.throws(() => store.accept(withChange(r => { r.host = 'extra'; })), { status: 409 });
  store.accept(withChange(r => { r.host = 'm1'; })); // an existing Mac may still report
  assert.deepEqual(store.view().hosts.map(h => h.host), ['m1', 'm5']);
});

test('a rejected report leaves the stored one untouched', () => {
  const store = createMacStatus();
  store.accept(golden());
  assert.throws(() => store.accept(withChange(r => { r.state = 'fault'; })), { status: 400 });
  assert.equal(store.view().hosts[0].state, 'ok');
});

test('the projector summary has power, shutter and reply state and nothing that identifies a device', () => {
  const projectors = [{ slot: 'P1', lane: 'A', ip: '192.0.2.10', password: 'secret', serial: 'X1' }, { slot: 'P2', lane: 'B', ip: '192.0.2.11' }, { slot: 'P3', lane: null }];
  const now = Date.parse('2026-11-20T20:00:00Z');
  const statuses = {
    P1: { online: true, power: 'on', shutter: 'closed', connection: { state: 'online', lastSuccessAt: '2026-11-20T19:59:58Z' } },
    P2: { online: true, power: 'on', shutter: 'open', connection: { state: 'online', lastSuccessAt: '2026-11-20T19:55:00Z' } },
    P3: { online: false, power: 'unknown', shutter: 'unknown', connection: { state: 'unassigned', lastSuccessAt: null } },
  };
  const out = projectorSummary({ projectors: () => projectors, status: slot => statuses[slot], maxStatusAgeMs: 15000, now: () => now });
  assert.deepEqual(out.projectors.map(p => [p.slot, p.lane, p.current, p.power, p.shutter]),
    [['P1', 'A', true, 'on', 'closed'], ['P2', 'B', false, 'on', 'open'], ['P3', null, false, 'unknown', 'unknown']]);
  assert.doesNotMatch(JSON.stringify(out), /192\.0\.2|secret|X1|password|ip"/);
});

test('the status token is optional, long enough, compared in constant time and opens only its two routes', () => {
  assert.equal(statusToken({}), '');
  assert.equal(statusToken({ PROJCTL_STATUS_TOKEN: '  ' }), '');
  assert.throws(() => statusToken({ PROJCTL_STATUS_TOKEN: 'short' }), /at least 24/);
  assert.throws(() => statusToken({ PROJCTL_STATUS_TOKEN: 'has a space inside it 1234567890' }), /no spaces/);
  const token = 'a'.repeat(32);
  assert.equal(statusToken({ PROJCTL_STATUS_TOKEN: ` ${token} ` }), token);
  assert.equal(bearerToken({ headers: { authorization: `Bearer ${token}` } }), token);
  for (const header of [undefined, '', 'Basic abc', `bearer ${token}`, 'Bearer', 'Bearer a b']) assert.equal(bearerToken({ headers: { authorization: header } }), '');
  assert.equal(tokenMatches(token, token), true);
  assert.equal(tokenMatches(token.slice(1), token), false);
  assert.equal(tokenMatches('', token), false);
  assert.equal(tokenMatches(token, ''), false);
  assert.deepEqual([...STATUS_ROUTES].sort(), ['GET /api/mac-status/projectors', 'POST /api/mac-status']);
});

test('the schema name matches the one the Mac side sends', () => {
  assert.equal(REPORT_SCHEMA, golden().schema);
});
