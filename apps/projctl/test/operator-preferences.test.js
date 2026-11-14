import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperatorPreferences, normalizePreferences } from '../public/operator-preferences.js';
import { nextOperatorAction } from '../public/operator-intent.js';

test('preferences validate stored fields and keep credentials or state out', () => {
  const value = normalizePreferences({ version: 1, theme: 'dark', lastLane: 'D', lastView: 'all', password: 'secret', power: 'on', favoritePatterns: { 'pulse:UDM': ['internal:red'] } });
  assert.equal(value.lastLane, 'D');
  assert.equal(value.theme, 'dark');
  assert.equal(value.password, undefined);
  assert.equal(value.power, undefined);
  assert.deepEqual(value.favoritePatterns['pulse:UDM'], ['internal:red']);
  assert.equal(normalizePreferences({ version: 2, lastLane: 'Z' }).lastLane, 'A');
});

test('denied and malformed storage keeps usable session preferences', () => {
  const denied = createOperatorPreferences(() => { throw new Error('denied'); });
  assert.equal(denied.update({ lastLane: 'C' }), false);
  assert.equal(denied.value.lastLane, 'C');
  const broken = createOperatorPreferences(() => ({ getItem: () => '{', setItem() { throw new Error('quota'); } }));
  assert.equal(broken.value.lastLane, 'A');
  assert.equal(broken.reset(), false);
});

test('suggestions require fresh actionable state and prioritize reported faults', () => {
  const projector = { driver: 'panasonic', inputs: { '31': 'DVI-D', '32': 'HDMI' }, status: { power: 'on', input: '31', pattern: '08' } };
  assert.equal(nextOperatorAction(projector, { current: true }, false).action, 'clear');
  projector.status.pattern = '00';
  assert.equal(nextOperatorAction(projector, { current: true }, false).action, 'reset');
  assert.equal(nextOperatorAction(projector, { current: true }, true), null);
  projector.status.errors = { lamp: 2 };
  assert.equal(nextOperatorAction(projector, { current: true }, false).action, 'details');
  assert.equal(nextOperatorAction(projector, { current: false }, false).id, 'connection');
});
