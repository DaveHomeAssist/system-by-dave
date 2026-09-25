'use strict';
// Unit checks for the FMP hygiene probe's release-pin rule (P5). The rest of the probe reads the
// live site; this part only compares provenance files, so it runs offline.
//
// Usage: node --test scripts/fmp_hygiene_probe.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { releasePins, ACTIVE_RELEASES, FROZEN_RELEASES } = require('./fmp_hygiene_probe');

const root = path.resolve(__dirname, '..');
const provenanceOf = dir => JSON.parse(fs.readFileSync(path.join(root, dir, 'source_provenance.json'), 'utf8'));
const committed = { fmp: provenanceOf('fmp'), fmpwalk: provenanceOf('fmpwalk') };

test('the committed releases pass: fmp and fmpwalk from one export', () => {
  assert.deepEqual(ACTIVE_RELEASES, ['fmp', 'fmpwalk']);
  assert.deepEqual(FROZEN_RELEASES, {});
  assert.equal(committed.fmp.sourceCommit, committed.fmpwalk.sourceCommit, 'fmp and fmpwalk must ship from one export');
  const result = releasePins(committed);
  assert.equal(result.status, 'pass', result.detail);
  assert.match(result.detail, new RegExp(`fmp ${committed.fmp.sourceCommit.slice(0, 12)}; fmpwalk ${committed.fmp.sourceCommit.slice(0, 12)}`));
});

test('an export that updates one release but not the other fails', () => {
  const result = releasePins({ ...committed, fmp: { sourceCommit: 'f'.repeat(40) } });
  assert.equal(result.status, 'fail');
  assert.match(result.detail, /active releases pin fmp ffffffffffff vs fmpwalk/);
});

test('a frozen release stays at its pin and fails when it moves', () => {
  const frozen = { fmpwalk: 'e'.repeat(40) };
  assert.equal(releasePins({ fmp: committed.fmp, fmpwalk: { sourceCommit: 'e'.repeat(40) } }, ['fmp'], frozen).status, 'pass');
  const result = releasePins({ fmp: committed.fmp, fmpwalk: { sourceCommit: 'a'.repeat(40) } }, ['fmp'], frozen);
  assert.equal(result.status, 'fail');
  assert.match(result.detail, /fmpwalk moved to aaaaaaaaaaaa; it is frozen at eeeeeeeeeeee/);
});

test('active releases that disagree fail', () => {
  const provenance = { fmp: { sourceCommit: 'b'.repeat(40) }, extra: { sourceCommit: 'c'.repeat(40) } };
  const result = releasePins(provenance, ['fmp', 'extra'], {});
  assert.equal(result.status, 'fail');
  assert.match(result.detail, /active releases pin fmp bbbbbbbbbbbb vs extra cccccccccccc/);
});
