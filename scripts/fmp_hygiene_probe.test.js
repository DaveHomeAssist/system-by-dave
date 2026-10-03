'use strict';
// Unit checks for the FMP hygiene probe's release-pin rule (P5). The rest of the probe reads the
// live site; this part only compares provenance files, so it runs offline.
//
// Usage: node --test scripts/fmp_hygiene_probe.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { releasePins, releaseCurrency, pageScroll, classifyExternal, externalStatus, ACTIVE_RELEASES, FROZEN_RELEASES, WEB2_DEBT } = require('./fmp_hygiene_probe');

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

test('L3 reports a bot challenge from a browser-checked host as unverified, never as a pass', () => {
  const seat = 'https://aviewfrommyseat.com/venue/Freedom+Mortgage+Pavilion/seating-chart/concert/';
  assert.equal(classifyExternal(seat, 403), 'challenged');
  assert.equal(classifyExternal(seat.replace('https://', 'https://www.'), 429), 'challenged');
  assert.equal(classifyExternal(seat, 404), 'broken', 'a missing page is still a broken link');
  assert.equal(classifyExternal(seat, 503), 'broken', 'an outage is not a challenge');
  assert.equal(externalStatus(0, 3), 'grey', 'challenged links are unverified by this run');
  assert.equal(externalStatus(1, 3), 'warn');
  assert.equal(externalStatus(0, 0), 'pass');
  assert.equal(classifyExternal('https://example.com/', 403), 'broken', 'only browser-checked hosts get the exception');
  assert.equal(classifyExternal('https://example.com/', 0), 'broken');
  assert.equal(classifyExternal('https://example.com/', 200), 'ok');
});

test('P4 passes when main is only a merge commit with the released files, and warns on real drift', () => {
  const sha = '20d23c6c88c2'.padEnd(40, '0');
  assert.equal(releaseCurrency(sha, 0).status, 'pass');
  const merged = releaseCurrency(sha, 1, 'tree-a', 'tree-a');
  assert.equal(merged.status, 'pass');
  assert.match(merged.detail, /1 commit\(s\) ahead of released 20d23c6c88c2 with identical files/);
  const drift = releaseCurrency(sha, 2, 'tree-a', 'tree-b');
  assert.equal(drift.status, 'warn');
  assert.match(drift.detail, /main is 2 commit\(s\) ahead of released 20d23c6c88c2$/);
  assert.equal(releaseCurrency(sha, 1, undefined, undefined).status, 'warn', 'missing trees never pass');
});

test('W8 warns on new page scroll and on a recorded page that now fits, not on recorded debt', () => {
  const fits = { scrollHeight: 900, clientHeight: 900 };
  const tall = { scrollHeight: 1700, clientHeight: 900 };
  const debt = ['/fmp/gear/', '/fmp/ptz/'];
  const known = pageScroll([{ route: '/fmp/', desktop: fits, phone: fits }, { route: '/fmp/gear/', desktop: tall, phone: tall }, { route: '/fmp/ptz/', desktop: fits, phone: tall }], debt);
  assert.equal(known.status, 'pass');
  assert.match(known.detail, /recorded debt: \/fmp\/gear\/ \(1440×900, 375×812\); \/fmp\/ptz\/ \(375×812\)/);
  const fresh = pageScroll([{ route: '/fmpwalk/', desktop: fits, phone: tall }, { route: '/fmp/gear/', desktop: tall, phone: tall }, { route: '/fmp/ptz/', desktop: tall, phone: tall }], debt);
  assert.equal(fresh.status, 'warn');
  assert.match(fresh.detail, /new page scroll: \/fmpwalk\/ \(375×812\)/);
  const fixed = pageScroll([{ route: '/fmp/gear/', desktop: fits, phone: fits }, { route: '/fmp/ptz/', desktop: tall, phone: tall }], debt);
  assert.equal(fixed.status, 'warn');
  assert.match(fixed.detail, /now fits, remove from WEB2_DEBT: \/fmp\/gear\//);
  assert.equal(pageScroll([{ route: '/fmp/', desktop: fits, phone: null }], []).status, 'pass', 'a missing phone measurement is not scroll');
  assert.ok(Array.isArray(WEB2_DEBT));
});
