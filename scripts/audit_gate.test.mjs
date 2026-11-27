import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from './audit_gate.mjs';

const advisory = (id, name = 'pkg', severity = 'high') => ({
  vulnerabilities: {
    [name]: { via: [{ name, severity, title: 't', url: `https://github.com/advisories/${id}` }] },
  },
});
const empty = { vulnerabilities: {} };

test('excepted dev-only advisory passes before expiry', () => {
  assert.deepEqual(evaluate(advisory('GHSA-fc5q-39xc-vjpf', 'picomatch'), empty, '2026-11-17'), []);
});

test('excepted advisory fails after expiry', () => {
  assert.equal(evaluate(advisory('GHSA-fc5q-39xc-vjpf', 'picomatch'), empty, '2027-02-01').length, 1);
});

test('excepted advisory still fails in production dependencies', () => {
  const report = advisory('GHSA-fc5q-39xc-vjpf', 'picomatch');
  assert.equal(evaluate(report, report, '2026-11-17').length, 1);
});

test('any other high advisory fails', () => {
  assert.equal(evaluate(advisory('GHSA-xxxx-yyyy-zzzz'), empty, '2026-11-17').length, 1);
});

test('moderate advisories do not block', () => {
  assert.deepEqual(evaluate(advisory('GHSA-xxxx-yyyy-zzzz', 'pkg', 'moderate'), empty), []);
});
