import test from 'node:test';
import assert from 'node:assert/strict';
import { quickPatterns } from '../public/operator-console.js';
import { PATTERNS, PATTERNS_RZ970 } from '../server/drivers/panasonic.js';
import { PULSE_PATTERNS } from '../server/drivers/pulse.js';
import { hdmiSource, recoverOutput } from '../public/output-recovery.js';

const projector = () => ({ slot: 'P1', driver: 'pulse', ip: '192.0.2.1', inputs: { 'L1 HDMI': 'L1 HDMI', DP: 'DisplayPort' }, status: { online: true, input: 'DP', pattern: 'internal:colorbars', connection: { state: 'online', fresh: true } } });

test('HDMI resolves reported names, including Barco, and rejects ambiguity', () => {
  assert.equal(hdmiSource(projector()), 'L1 HDMI');
  assert.equal(hdmiSource({ inputs: { '31': 'DVI-D', '32': 'HDMI' } }), '32');
  assert.equal(hdmiSource({ inputs: { '1': 'HDMI 1', '2': 'HDMI 2' } }), null);
  assert.equal(hdmiSource({ inputs: { '31': 'DVI-D' } }), null);
  assert.equal(hdmiSource({ inputPreference: { available: true, value: '31', label: 'DVI-D' }, inputs: { '31': 'DVI-D', '32': 'HDMI' } }), '32');
});

test('HDMI recovery clears pattern before input and verifies both states', async () => {
  const p = projector(), commands = [];
  const message = await recoverOutput({ projector: p, reset: true, read: async () => ({ projectors: [p], lock: false }), progress() {}, send: async (cmd, arg) => {
    commands.push([cmd,arg]);
    p.status.updatedAt = Date.now() + 10;
    if (cmd === 'pattern') p.status.pattern = 'off';
    if (cmd === 'input') p.status.input = arg;
    return true;
  } });
  assert.deepEqual(commands, [['pattern','00'], ['input','L1 HDMI']]);
  assert.match(message, /HDMI restored/);
});

test('partial input failure preserves clear and reports the failed step', async () => {
  const p = projector();
  await assert.rejects(recoverOutput({ projector: p, reset: true, read: async () => ({ projectors: [p] }), progress() {}, send: async cmd => {
    if (cmd === 'pattern') { p.status.pattern = 'off'; return true; }
    return false;
  } }), /Pattern clear sent. HDMI was not acknowledged/);
  assert.equal(p.status.pattern, 'off');
  assert.equal(p.status.input, 'DP');
});

test('changed target blocks the HDMI step', async () => {
  const p = projector(), commands = [];
  await assert.rejects(recoverOutput({ projector: p, reset: true, read: async () => ({ projectors: [p] }), progress() {}, send: async cmd => { commands.push(cmd); p.ip='192.0.2.2'; return true; } }), /assignment changed/);
  assert.deepEqual(commands, ['pattern']);
});

test('stale feedback never confirms a clear', async () => {
  const p = projector(); p.status.pattern='off'; p.status.connection.fresh=false;
  await assert.rejects(recoverOutput({ projector: p, reset: false, timeoutMs: 10, intervalMs: 1, read: async () => ({ projectors: [p] }), progress() {}, send: async () => true }), /could not be confirmed/);
});


test('quick pattern buttons use each actual driver table', () => {
  assert.deepEqual(quickPatterns(PATTERNS).map(p => p.code), ['08', '01', '11']);
  assert.deepEqual(quickPatterns(PATTERNS_RZ970).map(p => p.code), ['08', '01', '11']);
  assert.deepEqual(quickPatterns(PULSE_PATTERNS).map(p => p.code), ['internal:colorbars', 'internal:white', 'internal:crosshatch']);
});
