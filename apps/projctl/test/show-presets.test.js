import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import net from 'node:net';
import { SHOW_PRESETS, showPreset, planShowPreset, resolvePattern, listShowPresets } from '../server/show-presets.js';
import { startRelay, until, oscInt } from './relay-helper.js';

const WST = [
  { slot: 'P1', lane: 'C', model: 'UDM 4K22', driver: 'pulse', inputs: { HDMI: 'HDMI', SDI: 'SDI' } },
  { slot: 'P2', lane: 'A', model: 'PT-DW830KU', driver: 'panasonic', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' } },
  { slot: 'P3', lane: 'D', model: 'PT-DW830KU', driver: 'panasonic', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' } },
  { slot: 'P4', lane: 'B', model: 'PT-RZ970', driver: 'panasonic', inputs: { '31': 'HDMI', '33': 'SDI' } },
];

function drivers(kindBySlot = {}) {
  return (slot) => {
    const p = WST.find((x) => x.slot === slot);
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
  const plan = planShowPreset(showPreset('backup-input'), WST, drivers(), {});
  assert.ok(plan.every((a) => a.status === 'unsupported/unverified'));
  assert.match(plan[0].detail, /not configured/);

  const configured = planShowPreset(showPreset('backup-input'), WST, drivers(), {
    backup: { P1: 'SDI', P2: '33', P3: '33', P4: '33' },
  });
  assert.ok(configured.every((a) => a.status === 'ok' && a.arg));
});

test('portals-only opens A/B/D and closes stage C', () => {
  const plan = planShowPreset(showPreset('portals-only'), WST, drivers(), {});
  const open = plan.filter((a) => a.cmd === 'shutter' && a.arg === false).map((a) => a.slot).sort();
  const closed = plan.filter((a) => a.cmd === 'shutter' && a.arg === true).map((a) => a.slot).sort();
  assert.deepEqual(open, ['P2', 'P3', 'P4']);
  assert.deepEqual(closed, ['P1']);
});

test('focus marks PJLink pattern unsupported while Pulse and Panasonic stay ok', () => {
  const plan = planShowPreset(showPreset('focus'), WST, drivers({ P1: 'pjlink' }), {});
  const p1 = plan.find((a) => a.slot === 'P1' && a.cmd === 'pattern');
  const p2 = plan.find((a) => a.slot === 'P2' && a.cmd === 'pattern');
  assert.equal(p1.status, 'unsupported/unverified');
  assert.equal(p2.status, 'ok');
  assert.equal(p2.arg, '11');
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
