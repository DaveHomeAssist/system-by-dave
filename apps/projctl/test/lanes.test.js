import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startRelay, until } from './relay-helper.js';
import { laneOf, orderedProjectors, rigLanes } from '../public/lanes.js';
import { openStore } from '../server/store.js';

test('lane edits preserve legacy identity and persist without changing routes', async () => {
  const relay = await startRelay();
  try {
    const before = (await relay.state()).projectors.map(({ slot, label, ip, driver }) => ({ slot, label, ip, driver }));
    assert.ok((await relay.state()).projectors.every((p) => !p.lane));
    assert.equal((await relay.api('projector', { slot: 'P1', lane: 'C' })).status, 200);
    for (const lane of ['Z', null, ['A'], {}]) {
      assert.equal((await relay.api('projector', { slot: 'P2', lane, label: 'must not apply' })).status, 400);
    }
    assert.equal((await relay.api('projector', { slot: 'P2', lane: 'C', ip: 'must not apply' })).status, 409);
    assert.deepEqual((await relay.state()).projectors.map(({ slot, label, ip, driver }) => ({ slot, label, ip, driver })), before);
    await until(() => fs.existsSync(relay.rigFile) && JSON.parse(fs.readFileSync(relay.rigFile)).projectors[0].lane === 'C');
    const reopened = openStore(relay.rigFile);
    assert.equal(reopened.projector('P1').lane, 'C');
    assert.equal((await relay.api('projector', { slot: 'P1', lane: '' })).status, 200);
    assert.equal((await relay.api('projector', { slot: 'P2', lane: 'C' })).status, 200);
    assert.equal((await relay.state()).projectors.find((p) => p.slot === 'P2').lane, 'C');
  } finally { await relay.close(); }
});

test('invalid imported lane metadata falls back without losing slot order', () => {
  const projectors = [{ slot: 'P1', lane: ['A'] }, { slot: 'P2', lane: null }, { slot: 'P3', lane: 'D' }];
  assert.equal(laneOf(projectors[0]), null);
  assert.deepEqual(orderedProjectors(projectors).map((p) => p.slot), ['P3', 'P1', 'P2']);
  assert.deepEqual(projectors.map((p) => p.slot), ['P1', 'P2', 'P3']);
});

test('missing and duplicate lanes keep A B C D positions without guessing routes', () => {
  const projectors = [{ slot: 'P1', lane: 'C' }, { slot: 'P2', lane: 'B' }, { slot: 'P3', lane: '' }, { slot: 'P4', lane: 'D' }];
  const rows = rigLanes(projectors);
  assert.deepEqual(rows.map(({ lane }) => lane), ['A', 'B', 'C', 'D']);
  assert.deepEqual(rows.map(({ projector }) => projector?.slot || null), [null, 'P2', 'P1', 'P4']);
  assert.equal(rows[1].projector, projectors[1]);
  const ambiguous = rigLanes([...projectors, { slot: 'P5', lane: 'C' }]);
  assert.equal(ambiguous[2].projector, null);
  assert.equal(ambiguous[2].conflict, true);
  assert.deepEqual(projectors.map((p) => p.slot), ['P1', 'P2', 'P3', 'P4']);
});
