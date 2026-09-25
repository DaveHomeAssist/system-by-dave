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

test('the committed releases pass: fmp from its latest export, fmpwalk at its frozen pin', () => {
  assert.deepEqual(ACTIVE_RELEASES, ['fmp']);
  assert.equal(committed.fmpwalk.sourceCommit, FROZEN_RELEASES.fmpwalk, 'fmpwalk/ moved off its frozen pin; update FROZEN_RELEASES only if the walk was deliberately re-released');
  const result = releasePins(committed);
  assert.equal(result.status, 'pass', result.detail);
  assert.match(result.detail, /fmpwalk frozen at 5d67a9271378/);
});

test('a new fmp export does not fail the check, although fmpwalk stays behind', () => {
  const result = releasePins({ ...committed, fmp: { sourceCommit: 'f'.repeat(40) } });
  assert.equal(result.status, 'pass', result.detail);
});

test('a frozen release that moves fails', () => {
  const result = releasePins({ ...committed, fmpwalk: { sourceCommit: 'a'.repeat(40) } });
  assert.equal(result.status, 'fail');
  assert.match(result.detail, /fmpwalk moved to aaaaaaaaaaaa; it is frozen at 5d67a9271378/);
});

test('active releases that disagree fail', () => {
  const provenance = { fmp: { sourceCommit: 'b'.repeat(40) }, extra: { sourceCommit: 'c'.repeat(40) }, fmpwalk: committed.fmpwalk };
  const result = releasePins(provenance, ['fmp', 'extra']);
  assert.equal(result.status, 'fail');
  assert.match(result.detail, /active releases pin fmp bbbbbbbbbbbb vs extra cccccccccccc/);
});
