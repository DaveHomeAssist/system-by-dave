import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import net from 'node:net';
import { SHOW_PRESETS, showPreset, planShowPreset, resolvePattern, listShowPresets } from '../server/show-presets.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startRelay, until, oscInt } from './relay-helper.js';

// Fixture slots are deliberately not a production P-number map. Tests assert
// that lane letters follow whatever the current rig assigns.
const FIXTURE_ALPHA = [
  { slot: 'QA', lane: 'A', model: 'PT-DW830KU', driver: 'panasonic', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' } },
  { slot: 'QB', lane: 'B', model: 'PT-RZ970', driver: 'panasonic', inputs: { '31': 'HDMI', '33': 'SDI' } },
  { slot: 'QC', lane: 'C', model: 'UDM 4K22', driver: 'pulse', inputs: { HDMI: 'HDMI', SDI: 'SDI' } },
  { slot: 'QD', lane: 'D', model: 'PT-DW830KU', driver: 'panasonic', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' } },
];
const FIXTURE_BETA = [
  { slot: 'QA', lane: 'D', model: 'PT-DW830KU', driver: 'panasonic', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' } },
  { slot: 'QB', lane: 'C', model: 'UDM 4K22', driver: 'pulse', inputs: { HDMI: 'HDMI', SDI: 'SDI' } },
  { slot: 'QC', lane: 'B', model: 'PT-RZ970', driver: 'panasonic', inputs: { '31': 'HDMI', '33': 'SDI' } },
  { slot: 'QD', lane: 'A', model: 'PT-DW830KU', driver: 'panasonic', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' } },
];

function drivers(projectors, kindBySlot = {}) {
  return (slot) => {
    const p = projectors.find((x) => x.slot === slot);
    const kind = kindBySlot[slot] || p.driver;
    if (kind === 'pulse') return { kind, pattern: async () => 'OK' };
    if (kind === 'panasonic' || kind === 'simulator') return { kind, pattern: async () => 'OK' };
    return { kind: 'pjlink' }; // no pattern
  };
}

test('nine show items cover the Frozen list including portals and stage inverses', () => {
  const ids = listShowPresets().map((p) => p.id);
  assert.deepEqual(ids, [
    'preshow', 'top-of-show', 'intermission', 'focus', 'color-check',
    'blackout', 'portals-only', 'stage-only', 'backup-input', 'strike',
  ]);
  assert.equal(showPreset('blackout').osc, '/proj/all/shutter 1');
  assert.equal(showPreset('strike').confirmPowerOff, true);
});

test('pattern resolution: Pulse crosshatch, Panasonic focus/alignment, PJLink unsupported', () => {
  assert.equal(resolvePattern('pulse', 'UDM 4K22', 'crosshatch').code, 'internal:crosshatch');
  assert.equal(resolvePattern('panasonic', 'PT-DW830KU', 'crosshatch').code, '11');
  assert.equal(resolvePattern('panasonic', 'PT-RZ970', 'crosshatch').code, '11');
  assert.equal(resolvePattern('panasonic', 'PT-DW830KU', 'colorbars').code, '08');
  assert.equal(resolvePattern('pjlink', '', 'crosshatch'), null);
  assert.equal(resolvePattern('pjlink', '', 'colorbars'), null);
});

test('backup and show inputs stay unverified until configured; never invent ids', () => {
  const plan = planShowPreset(showPreset('backup-input'), FIXTURE_ALPHA, drivers(FIXTURE_ALPHA), {});
  assert.ok(plan.every((a) => a.status === 'unsupported/unverified'));
  assert.match(plan[0].detail, /not configured/);

  const configured = planShowPreset(showPreset('backup-input'), FIXTURE_ALPHA, drivers(FIXTURE_ALPHA), {
    backup: { QA: '31', QB: '33', QC: 'SDI', QD: '33' },
  });
  assert.ok(configured.every((a) => a.status === 'ok' && a.arg));
});

test('portals-only and stage-only follow lane letters from the current fixture, not a hard-coded slot map', () => {
  const planAlpha = planShowPreset(showPreset('portals-only'), FIXTURE_ALPHA, drivers(FIXTURE_ALPHA), {});
  const openA = planAlpha.filter((a) => a.cmd === 'shutter' && a.arg === false).map((a) => a.slot).sort();
  const closedA = planAlpha.filter((a) => a.cmd === 'shutter' && a.arg === true).map((a) => a.slot).sort();
  assert.deepEqual(openA, ['QA', 'QB', 'QD']);
  assert.deepEqual(closedA, ['QC']);

  const planBeta = planShowPreset(showPreset('portals-only'), FIXTURE_BETA, drivers(FIXTURE_BETA), {});
  const openB = planBeta.filter((a) => a.cmd === 'shutter' && a.arg === false).map((a) => a.slot).sort();
  const closedB = planBeta.filter((a) => a.cmd === 'shutter' && a.arg === true).map((a) => a.slot).sort();
  assert.deepEqual(openB, ['QA', 'QC', 'QD']);
  assert.deepEqual(closedB, ['QB']);

  const stageBeta = planShowPreset(showPreset('stage-only'), FIXTURE_BETA, drivers(FIXTURE_BETA), {});
  assert.deepEqual(stageBeta.filter((a) => a.cmd === 'shutter' && a.arg === false).map((a) => a.slot), ['QB']);
});

test('focus marks PJLink pattern unsupported while Pulse and Panasonic stay ok', () => {
  const plan = planShowPreset(showPreset('focus'), FIXTURE_ALPHA, drivers(FIXTURE_ALPHA, { QC: 'pjlink' }), {});
  const pulseSlot = plan.find((a) => a.slot === 'QC' && a.cmd === 'pattern');
  const panasonicSlot = plan.find((a) => a.slot === 'QA' && a.cmd === 'pattern');
  assert.equal(pulseSlot.status, 'unsupported/unverified');
  assert.equal(panasonicSlot.status, 'ok');
  assert.equal(panasonicSlot.arg, '11');
});

test('relay: blackout closes shutters under show lock; strike needs two-tap power-off', { timeout: 20000 }, async (t) => {
  const r = await startRelay(); t.after(r.close);
  await r.api('command', { slot: 'all', cmd: 'power', arg: 1 });
  await until(async () => (await r.state()).projectors.every((p) => p.status.power === 'on'));
  await r.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  await r.api('lock', { lock: true });

  const blackout = (await r.api('show-preset/recall', { id: 'blackout' })).body;
  assert.match(blackout.message, /recalled/i);
  await until(async () => (await r.state()).projectors.every((p) => p.status.shutter === 'closed'));

  // Input change blocked by lock (even when inputs are not configured yet)
  assert.equal((await r.api('show-preset/recall', { id: 'backup-input' })).status, 423);
  assert.equal((await r.api('show-preset/recall', { id: 'focus' })).status, 423);

  await r.api('lock', { lock: false });
  const first = (await r.api('show-preset/recall', { id: 'strike' })).body;
  assert.ok(first.confirm, 'strike issues power-off confirm after closing shutters');
  assert.deepEqual(first.targets, ['P1', 'P2', 'P3', 'P4']);
  assert.ok(!Object.keys(first.results || {}).some((k) => k.endsWith(':power')), 'first tap must not send power off');
  await until(async () => (await r.state()).projectors.every((p) => p.status.shutter === 'closed'));
  assert.ok((await r.state()).projectors.every((p) => p.status.power === 'on'), 'first tap leaves power on');

  const second = (await r.api('show-preset/recall', { id: 'strike', confirm: first.confirm })).body;
  for (const s of first.targets) assert.equal(second.results[`${s}:power`].result, 'OK');
  await until(async () => (await r.state()).projectors.every((p) => p.status.power === 'cooling'));
});

test('relay: saved presets still load and show presets appear in snapshot', { timeout: 15000 }, async (t) => {
  const r = await startRelay(); t.after(r.close);
  await r.api('preset/save', { name: 'my-custom' });
  const state = await r.state();
  assert.ok(state.presets.some((p) => p.name === 'my-custom'));
  assert.equal(state.showPresets.length, SHOW_PRESETS.length);
  assert.ok(state.showPresets.every((p) => p.plan && Object.keys(p.plan).length));

  // Configure show inputs then top-of-show
  await r.api('show-inputs', { show: { P1: 'HDMI', P2: '31', P3: '31', P4: '31' } });
  await r.api('command', { slot: 'all', cmd: 'shutter', arg: 1 });
  const top = (await r.api('show-preset/recall', { id: 'top-of-show' })).body;
  assert.ok(!Object.values(top.results).some((v) => v.result === 'unsupported/unverified' && String(v.detail || '').includes('input')));
  await until(async () => (await r.state()).projectors.every((p) => p.status.shutter === 'open'));

  // Legacy saved preset still recalls
  const legacy = (await r.api('preset/recall', { name: 'my-custom' })).body;
  assert.ok(legacy.P1 === 'OK' || legacy.confirm || legacy.projectors);
});

test('OSC /proj/all/shutter 1 remains the blackout cue; /proj/show/intermission works', { timeout: 15000 }, async (t) => {
  const r = await startRelay(); t.after(r.close);
  await r.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  const sock = dgram.createSocket('udp4'); t.after(() => sock.close());
  await new Promise((resolve) => sock.send(oscInt('/proj/all/shutter', 1), r.udp, '127.0.0.1', resolve));
  await until(async () => (await r.state()).projectors.every((p) => p.status.shutter === 'closed'));

  await r.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  await new Promise((resolve, reject) => {
    const tcp = net.connect(r.tcp, '127.0.0.1', () => tcp.end('/proj/show/intermission\n'));
    tcp.resume(); tcp.setTimeout(2000, () => tcp.destroy(new Error('TCP timeout'))); tcp.on('error', reject); tcp.on('close', resolve);
  });
  await until(async () => (await r.state()).projectors.every((p) => p.status.shutter === 'closed'));
});

async function startRelayWithProjectors(t, projectors) {
  const dir = await mkdtemp(path.join(tmpdir(), 'projctl-lanes-'));
  const file = path.join(dir, 'rig.json');
  await writeFile(file, JSON.stringify({
    show: 'fixture', lock: false,
    projectors: projectors.map((p) => ({
      slot: p.slot, lane: p.lane, label: p.slot, make: 'Sim', model: p.model || 'Sim',
      driver: 'simulator', mac: '', ip: 'sim', inputs: p.inputs || { '31': 'HDMI' }, notes: '',
    })),
    presets: [], events: [],
  }));
  const r = await startRelay({ REUSE_RIG: file });
  t.after(async () => { await r.close(); await rm(dir, { recursive: true, force: true }); });
  return r;
}

test('OSC /proj/A/shutter 1 hits the slot the fixture assigns to lane A, then follows a second assignment', { timeout: 20000 }, async (t) => {
  const r1 = await startRelayWithProjectors(t, FIXTURE_ALPHA);
  await r1.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  await until(async () => (await r1.state()).projectors.every((p) => p.status.shutter === 'open'));
  const sock = dgram.createSocket('udp4'); t.after(() => sock.close());
  await new Promise((resolve) => sock.send(oscInt('/proj/A/shutter', 1), r1.udp, '127.0.0.1', resolve));
  await until(async () => {
    const byLane = Object.fromEntries((await r1.state()).projectors.map((p) => [p.lane, p.status.shutter]));
    return byLane.A === 'closed';
  });
  const afterAlpha = Object.fromEntries((await r1.state()).projectors.map((p) => [p.lane, p.status.shutter]));
  assert.equal(afterAlpha.A, 'closed');
  assert.equal(afterAlpha.B, 'open');
  assert.equal(afterAlpha.C, 'open');
  assert.equal(afterAlpha.D, 'open');
  const alphaSlotA = (await r1.state()).projectors.find((p) => p.lane === 'A').slot;
  assert.equal(alphaSlotA, 'QA');

  const r2 = await startRelayWithProjectors(t, FIXTURE_BETA);
  await r2.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  await until(async () => (await r2.state()).projectors.every((p) => p.status.shutter === 'open'));
  await new Promise((resolve) => sock.send(oscInt('/proj/A/shutter', 1), r2.udp, '127.0.0.1', resolve));
  await until(async () => {
    const byLane = Object.fromEntries((await r2.state()).projectors.map((p) => [p.lane, p.status.shutter]));
    return byLane.A === 'closed';
  });
  const afterBeta = Object.fromEntries((await r2.state()).projectors.map((p) => [p.lane, p.status.shutter]));
  assert.equal(afterBeta.A, 'closed');
  assert.equal(afterBeta.B, 'open');
  assert.equal(afterBeta.C, 'open');
  assert.equal(afterBeta.D, 'open');
  const betaSlotA = (await r2.state()).projectors.find((p) => p.lane === 'A').slot;
  assert.equal(betaSlotA, 'QD');
});

test('Show Lock allows shutter close, refuses open/power/input/lens with a log entry; portals-only is refused', { timeout: 20000 }, async (t) => {
  const r = await startRelayWithProjectors(t, FIXTURE_ALPHA);
  await r.api('command', { slot: 'all', cmd: 'power', arg: 1 });
  await until(async () => (await r.state()).projectors.every((p) => p.status.power === 'on'));
  await r.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  await r.api('lock', { lock: true });

  const closeAll = await r.api('command', { slot: 'all', cmd: 'shutter', arg: 1 });
  assert.equal(closeAll.status, 200);
  await until(async () => (await r.state()).projectors.every((p) => p.status.shutter === 'closed'));

  // /api/command swallows per-slot errors into a 200 body, except power-off which throws 423 first.
  const openAll = await r.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
  assert.equal(openAll.status, 200);
  assert.match(JSON.stringify(openAll.body), /opening shutters is refused/i);

  const open = await r.api('command', { slot: 'A', cmd: 'shutter', arg: 0 });
  assert.equal(open.status, 200);
  assert.match(JSON.stringify(open.body), /opening shutters is refused/i);

  const closeLane = await r.api('command', { slot: 'A', cmd: 'shutter', arg: 1 });
  assert.equal(closeLane.status, 200);
  assert.ok(!/Show Lock is on/.test(JSON.stringify(closeLane.body)));

  const power = await r.api('command', { slot: 'A', cmd: 'power', arg: 0 });
  assert.equal(power.status, 423);
  assert.match(JSON.stringify(power.body), /power commands are refused/i);

  const input = await r.api('command', { slot: 'A', cmd: 'input', arg: '31' });
  assert.equal(input.status, 200);
  assert.match(JSON.stringify(input.body), /input changes are refused/i);

  const lens = await r.api('command', { slot: 'A', cmd: 'lens', arg: { op: 'move', axis: 'focus', dir: 1 } });
  assert.equal(lens.status, 200);
  assert.match(JSON.stringify(lens.body), /lens movement is refused/i);

  const stop = await r.api('command', { slot: 'A', cmd: 'lens', arg: { op: 'stop' } });
  assert.equal(stop.status, 200);
  assert.ok(!/Show Lock is on/.test(JSON.stringify(stop.body)), 'stop lens remains available under Show Lock');

  const portals = await r.api('show-preset/recall', { id: 'portals-only' });
  assert.equal(portals.status, 423);
  assert.match(JSON.stringify(portals.body), /opening shutters is refused/i);

  const events = (await r.state()).events || [];
  const refusals = events.filter((e) => e.result === 'ERR' && /Show Lock is on/i.test(e.detail || ''));
  assert.ok(refusals.length >= 4, `expected logged Show Lock refusals, got ${refusals.length}`);
});
