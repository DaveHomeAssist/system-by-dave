import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lensDirection } from '../public/lens-direction.js';
import { openStore } from '../server/store.js';
import { startRelay, until } from './relay-helper.js';

test('image directions are installation-specific and do not reverse focus or zoom', () => {
  const reversed = { slot: 'P1', reverseH: true, reverseV: true };
  assert.equal(lensDirection(reversed, 'h', '-'), '+', 'house left sends native positive');
  assert.equal(lensDirection(reversed, 'h', '+'), '-', 'house right sends native negative');
  assert.equal(lensDirection(reversed, 'v', '+'), '-', 'up sends native negative');
  assert.equal(lensDirection(reversed, 'v', '-'), '+', 'down sends native positive');
  for (const axis of ['h', 'v', 'focus', 'zoom']) {
    for (const dir of ['-', '+']) assert.equal(lensDirection({ slot: 'P2' }, axis, dir), dir);
  }
  for (const axis of ['focus', 'zoom']) {
    for (const dir of ['-', '+']) assert.equal(lensDirection(reversed, axis, dir), dir);
  }
  assert.equal(lensDirection({ reverseH: true }, 'v', '+'), '+');
  assert.equal(lensDirection({ reverseV: true }, 'h', '-'), '-');
  assert.equal(lensDirection({ reverseH: 'false' }, 'h', '-'), '-');
});

test('direction settings persist, reject invalid edits atomically and reset without losing rig data', async () => {
  const relay = await startRelay();
  try {
    const before = (await relay.state()).projectors.map(({ slot, label, ip, driver, inputs }) => ({ slot, label, ip, driver, inputs }));
    assert.equal((await relay.api('projector', { slot: 'P1', reverseH: true, reverseV: true })).status, 200);
    for (const value of ['true', 1, null, {}, []]) {
      assert.equal((await relay.api('projector', { slot: 'P1', reverseH: false, reverseV: value, label: 'must not change' })).status, 400);
    }
    assert.deepEqual((await relay.state()).projectors.map(({ slot, label, ip, driver, inputs }) => ({ slot, label, ip, driver, inputs })), before);
    await until(() => fs.existsSync(relay.rigFile) && JSON.parse(fs.readFileSync(relay.rigFile)).projectors[0].reverseV === true);
    const saved = openStore(relay.rigFile);
    assert.equal(saved.projector('P1').reverseH, true);
    assert.equal(saved.projector('P1').reverseV, true);
    assert.equal(saved.projector('P2').reverseH, undefined);
    assert.equal((await relay.api('projector', { slot: 'P1', reverseH: false, reverseV: false })).status, 200);
    await until(() => JSON.parse(fs.readFileSync(relay.rigFile)).projectors[0].reverseH === false);
    assert.equal(openStore(relay.rigFile).projector('P1').reverseV, false);
  } finally { await relay.close(); }
});
