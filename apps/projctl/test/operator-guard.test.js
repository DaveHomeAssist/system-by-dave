import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfirmGate, createLensHold, formatCommandArg, disabledDangerReason } from '../public/operator-guard.js';

test('power off ignores a double-click and sends only after the confirm label has been up', () => {
  let now = 1_000;
  const gate = createConfirmGate({ now: () => now });
  assert.equal(gate.press('all:power:off'), 'arm');
  assert.equal(gate.armed('all:power:off'), true);
  now += 100;
  assert.equal(gate.press('all:power:off'), 'ignore');
  assert.equal(gate.armed('all:power:off'), true);
  now += 400;
  assert.equal(gate.press('all:power:off'), 'send');
  assert.equal(gate.armed('all:power:off'), false);
});

test('a per-projector power off uses the same beat as the all-projectors control', () => {
  let now = 5_000;
  const gate = createConfirmGate({ now: () => now });
  assert.equal(gate.press('P2:power:off'), 'arm');
  now += 30;
  assert.equal(gate.press('P2:power:off'), 'ignore');
  now += 3_100;
  assert.equal(gate.press('P2:power:off'), 'arm');
});

test('input reset and input change confirm before anything is sent', () => {
  let now = 0;
  const gate = createConfirmGate({ now: () => now });
  assert.equal(gate.press('P2:resetInput'), 'arm');
  now += 40;
  assert.equal(gate.press('P2:resetInput'), 'ignore');
  now += 500;
  assert.equal(gate.press('P2:resetInput'), 'send');
  assert.equal(gate.press('P2:input:32'), 'arm');
  now += 20;
  assert.equal(gate.press('P2:input:32'), 'ignore');
  now += 500;
  assert.equal(gate.press('P2:input:32'), 'send');
});

test('two lens clicks 30ms apart do not both pass, and a stopped motor releases after the minimum hold', () => {
  let now = 10_000;
  const hold = createLensHold({ now: () => now });
  const stopped = { hState: 'Stopped', vState: 'Stopped', focusState: 'Stopped', zoomState: 'Stopped' };
  hold.begin('P2');
  now += 30;
  assert.equal(hold.blocking('P2', { busy: false, lens: stopped }), true);
  now += 500;
  assert.equal(hold.blocking('P2', { busy: false, lens: stopped }), false);
  hold.begin('P2');
  now += 600;
  assert.equal(hold.blocking('P2', { busy: false, lens: { ...stopped, hState: 'Moving' } }), true);
  now += 8_000;
  assert.equal(hold.blocking('P2', { busy: false, lens: { hState: 'Moving' } }), false);
});

test('command log text does not stringify a lens-recall target as an object', () => {
  assert.equal(formatCommandArg({ op: 'recall', targets: { h: 10, v: 20 } }), 'op recall targets {"h":10,"v":20}');
  assert.equal(formatCommandArg(0), '0');
});

test('disabled danger reasons name the block', () => {
  assert.equal(disabledDangerReason({ locked: true }), 'show lock');
  assert.equal(disabledDangerReason({ offline: true }), 'no reply');
  assert.equal(disabledDangerReason({ connected: false, locked: true }), 'relay offline');
  assert.equal(disabledDangerReason({ busy: true }), 'lens moving');
});
