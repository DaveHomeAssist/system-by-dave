import test from 'node:test';
import assert from 'node:assert/strict';
import { commandProgress, samePendingCommand } from '../public/command-progress.js';

const p = (phase = 'waiting') => ({ status: { power: 'warming', shutter: 'closed' },
  commandFeedback: { field: 'power', expected: 'on', phase, startedAt: 1000, elapsedSeconds: 5.4 } });

test('operator sees elapsed waiting time, not command acceptance as success', () => {
  assert.deepEqual(commandProgress(p(), { current: true }, 12000), {
    phase: 'waiting', text: 'Warming up · 11 s since request. Checking feedback.',
  });
  assert.equal(samePendingCommand(p(), 'power', 'on'), true);
  assert.equal(samePendingCommand(p(), 'power', 'off'), false);
});
test('connection loss cannot leave a current confirmation visible', () => {
  assert.match(commandProgress(p(), { current: false }).text, /Connection lost; confirmation unavailable/);
  assert.equal(commandProgress(p('confirmed'), { current: false }), null);
});
test('confirmed message requires the matching current field and shows measured time', () => {
  const projector = p('confirmed');
  assert.equal(commandProgress(projector, { current: true }), null);
  projector.status.power = 'on';
  assert.match(commandProgress(projector, { current: true }).text, /confirmed by projector in 5.4 s/);
  projector.status.stale = ['power'];
  assert.equal(commandProgress(projector, { current: true }), null);
});
test('timeout gives a concrete next step without claiming the command failed or replaying it', () => {
  const projector = p('unconfirmed'); projector.commandFeedback.elapsedSeconds = 420;
  assert.equal(commandProgress(projector, { current: true }).text,
    'Power ON not confirmed after 420 s. Check projector before retrying.');
});
