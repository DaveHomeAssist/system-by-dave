// Rig page Mac tiles: the model that decides green, red, stale and what each tile says.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tileModels, tileSummary, agoText } from '../public/monitor/mac-tiles.js';

const check = (id, status, observed = '', label = id) => ({ id, label, status, observed });
const host = (overrides = {}) => ({ host: 'm5', phase: 'watch', state: 'ok', execution: 'mac', reportedAt: '2026-11-20T20:14:03.000Z', ageMs: 4000, clockSkewMs: 0,
  checks: [check('displays', 'PASS', '5 displays present', 'Displays'), check('show', 'CHANGED', 'Changed since startup (saved about 20:12)', 'Show file')], ...overrides });
const view = (hosts, staleAfterMs = 180000) => ({ schema: 'projctl.mac-status.v1', staleAfterMs, hosts });
const tiles = (hosts, extra = {}) => Object.fromEntries(tileModels({ view: view(hosts), fetchedAt: 1000, now: 1000, ...extra }).map(t => [t.host, t]));

test('a fresh ok report is green with its time, phase and notes', () => {
  const m5 = tiles([host()]).m5;
  assert.deepEqual([m5.state, m5.word, m5.failing], ['ok', 'OK', null]);
  assert.match(m5.line, /^Last report 3:14:03 PM EST · watching · just now$/);
  assert.deepEqual(m5.notes, ['Show file: Changed since startup (saved about 20:12)']);
  assert.equal(m5.title, 'M5 · Projectors');
});

test('a fault is red and names the failing check', () => {
  const fault = host({ state: 'fault', checks: [check('displays', 'FAIL', 'B display is missing', 'Displays'), check('disk', 'FAIL', '2 GB free', 'Disk space'), check('relay', 'PASS', 'ok', 'Projctl relay')] });
  const m5 = tiles([fault]).m5;
  assert.equal(m5.state, 'fault');
  assert.deepEqual(m5.failing, { label: 'Displays', observed: 'B display is missing', more: 1 });
});

test('no report within the stale window turns the tile stale, whatever the last report said, and it never reads as live', () => {
  for (const state of ['ok', 'fault']) {
    const h = host({ state, ageMs: 100000, checks: [check('displays', state === 'fault' ? 'FAIL' : 'PASS', 'x', 'Displays')] });
    assert.equal(tiles([h], { fetchedAt: 0, now: 50000 }).m5.state, state, 'still inside three minutes');
    const stale = tiles([h], { fetchedAt: 0, now: 100000 }).m5;
    assert.equal(stale.state, 'stale');
    assert.equal(stale.word, 'Stale');
    assert.equal(stale.failing, null, 'a stale tile does not present the old fault as current');
    assert.match(stale.lastKnown, state === 'fault' ? /Last known: fault · Displays/ : /Last known: ok/);
    assert.match(stale.line, /min ago/);
  }
});

test('the relay decides how long is too long', () => {
  const h = host({ ageMs: 5000 });
  assert.equal(tileModels({ view: view([h], 3000), fetchedAt: 0, now: 0 })[0].state, 'stale');
  assert.equal(tileModels({ view: { hosts: [h] }, fetchedAt: 0, now: 0 })[0].state, 'ok', 'falls back to three minutes');
});

test('startup reports show Starting, not green', () => {
  const m1 = tiles([host({ host: 'm1', phase: 'startup', state: 'running' })]).m1;
  assert.deepEqual([m1.state, m1.word], ['starting', 'Starting']);
  assert.match(m1.line, /startup checks/);
});

test('a Mac that has never reported, and a relay that cannot be reached, are never green', () => {
  const none = tiles([]);
  assert.deepEqual([none.m5.state, none.m1.state, none.m5.word], ['none', 'none', 'No report']);
  const offline = tileModels({ view: view([host()]), connected: false, attempted: true });
  assert.ok(offline.every(t => t.state === 'unknown' && t.word === 'Relay offline'));
  const connecting = tileModels({ view: null, connected: false, attempted: false });
  assert.ok(connecting.every(t => t.word === 'Connecting'));
  const unread = tileModels({ view: null, connected: true });
  assert.ok(unread.every(t => t.state === 'unknown' && /could not be read/.test(t.line)));
});

test('a Mac with a wrong clock is flagged and a practice report is labelled', () => {
  const skewed = tiles([host({ clockSkewMs: 600000, execution: 'offline fixture' })]).m5;
  assert.ok(skewed.notes.some(n => /clock is 10 min ahead/.test(n)));
  assert.equal(skewed.practice, true);
  assert.equal(tiles([host()]).m5.practice, false);
});

test('an unexpected host still gets a tile and the summary counts every state', () => {
  const all = tileModels({ view: view([host(), host({ host: 'lab', role: 'projectors', hostName: 'Lab Mac' })]), fetchedAt: 0, now: 0 });
  assert.deepEqual(all.map(t => t.host), ['m5', 'm1', 'lab']);
  assert.equal(all[1].state, 'none');
  assert.equal(tileSummary(all), '1 not reporting · 2 ok');
  assert.equal(tileSummary(tileModels({ view: view([host({ state: 'fault', checks: [check('d', 'FAIL', 'x')] })]), fetchedAt: 0, now: 0 })), '1 fault · 1 not reporting');
  assert.equal(tileSummary([]), 'Waiting for the relay');
});

test('ages read plainly', () => {
  assert.deepEqual([agoText(1000), agoText(30000), agoText(150000), agoText(4000000)], ['just now', '30 s ago', '3 min ago', 'over an hour ago']);
});

test('the Monitor makes no sound and sends nothing from the Mac tiles (MF-2: a red tile only)', () => {
  const dir = new URL('../public/monitor/', import.meta.url);
  for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const source = fs.readFileSync(new URL(name, dir), 'utf8');
    for (const marker of ['new Audio', 'AudioContext', 'Notification', 'navigator.vibrate', '.play()']) assert.ok(!source.includes(marker), `${name} uses ${marker}`);
  }
  const rig = fs.readFileSync(new URL('page-rig.js', dir), 'utf8');
  const macs = rig.slice(rig.indexOf('Show Macs'), rig.indexOf("$('#rig-plot')"));
  assert.ok(!/method:\s*'POST'|stopLens|api\/command/.test(macs), 'the tiles only read');
  assert.ok(!fs.readFileSync(new URL('rig.html', dir), 'utf8').includes('<audio'));
});
