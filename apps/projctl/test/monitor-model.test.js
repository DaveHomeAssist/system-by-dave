// Frozen Monitor wording for the relay's signal and alarm readings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { signalText, faultSummary } from '../public/monitor/monitor.js';

test('signal wording follows what the driver reports', () => {
  assert.equal(signalText({ signal: { state: 'reported', value: true } }), 'Signal present');
  assert.equal(signalText({ signal: { state: 'reported', value: false } }), 'No signal');
  assert.equal(signalText({ signal: { state: 'reported', value: { width: 3840, height: 2400 } } }), '3840 × 2400');
  assert.equal(signalText({ signal: { state: 'reported', value: 'HDMI 1080p60' } }), 'HDMI 1080p60');
  assert.equal(signalText({ signal: { state: 'reported', value: { mode: 'x' } } }), 'Signal reported');
  assert.equal(signalText({ signal: { state: 'unsupported', value: null } }), 'Not reported');
  assert.equal(signalText({ signal: { state: 'offline', value: null } }), '—');
  assert.equal(signalText(null), 'Not reported');
});

test('PJLink alarms list errors before warnings and never invent an all-clear', () => {
  // Lane A on 2026-11-14: lamp error with an other warning; lane D: other warning only.
  assert.deepEqual(faultSummary({ fan: 0, lamp: 2, temp: 0, cover: 0, filter: 0, other: 1 }),
    { level: 'error', items: [{ key: 'lamp', name: 'lamp', level: 'error' }, { key: 'other', name: 'other', level: 'warning' }], text: 'Lamp error · other warning reported now' });
  assert.equal(faultSummary({ fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 1 }).text, 'Other warning reported now');
  assert.equal(faultSummary({ fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 1 }).level, 'warning');
  assert.equal(faultSummary({ temp: 1, fan: 2 }).text, 'Fan error · temperature warning reported now');
  assert.equal(faultSummary({ fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 }), null);
  assert.equal(faultSummary(null), null);
  assert.equal(faultSummary(undefined), null);
});
