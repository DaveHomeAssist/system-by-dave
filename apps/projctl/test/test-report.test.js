import test from 'node:test';
import assert from 'node:assert/strict';
import { testReport } from '../scripts/test-report.js';

test('software receipts preserve failed checks and never claim physical acceptance', () => {
  const input = { sourceCommit: 'a'.repeat(40), runner: 'isolated-runner', results: [{ name: 'unit', code: 0, seconds: 1 }] };
  const passed = testReport(input);
  assert.equal(passed.testStatus, 'passed');
  assert.ok(Object.values(passed.acceptance).every(value => value === 'unverified'));
  const failed = testReport({ ...input, results: [...input.results, { name: 'browser', code: 124, seconds: 240 }] });
  assert.equal(failed.testStatus, 'failed');
  assert.equal(failed.checks[1].outcome, 'timed-out');
  assert.throws(() => testReport({ ...input, sourceCommit: 'latest' }), /full source commit/);
  assert.throws(() => testReport({ ...input, results: [...input.results, ...input.results] }), /unique/);
});
