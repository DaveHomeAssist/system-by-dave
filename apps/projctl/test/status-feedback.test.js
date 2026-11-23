import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldFeedback, feedbackAge } from '../public/status-feedback.js';

test('missing and explicitly stale fields never become current just because power replied', () => {
  const p = { status: { power: 'off', pattern: null, shutter: 'unknown', input: '32', errors: { lamp: 2 }, stale: ['input', 'errors'] } };
  assert.equal(fieldFeedback(p, 'power', { current: true }).current, true);
  for (const field of ['pattern', 'shutter', 'input', 'errors']) assert.equal(fieldFeedback(p, field, { current: true }).current, false, field);
  assert.equal(fieldFeedback(p, 'input', { current: true }).lastKnown, true);
  assert.equal(fieldFeedback(p, 'pattern', { current: true }).present, false);
  assert.equal(fieldFeedback(p, 'power', { current: false }).lastKnown, true);
});

test('feedback ages are bounded and unknown clocks do not look fresh', () => {
  assert.equal(feedbackAge(0), 'Just now');
  assert.equal(feedbackAge(18000), '18s ago');
  assert.equal(feedbackAge(125000), '2m ago');
  assert.equal(feedbackAge(7200000), '2h ago');
  assert.equal(feedbackAge(NaN), 'Time unavailable');
  assert.equal(feedbackAge(-5000), 'Time unavailable');
});
