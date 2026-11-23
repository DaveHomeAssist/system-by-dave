import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizePlot, projectorForLane } from '../public/stage-plot.js';
import { stageFixture } from './stage-fixture.js';
import { startRelay } from './relay-helper.js';

test('stage plot accepts reference geometry and rejects unsupported or malformed input', () => {
  const input = stageFixture(); input.secret = 'not exposed'; input.views.front.lanes.A.slot = 'P4';
  const result = normalizePlot(input);
  assert.equal(result.secret, undefined); assert.equal(result.views.front.lanes.A.slot, undefined);
  assert.deepEqual(result.views.front.lanes.A.control, [125, 300]);
  for (const mutate of [
    (x) => x.version = 2,
    (x) => delete x.views.plan,
    (x) => x.views.front.lanes.A.projector = [Infinity, 2],
    (x) => x.views.front.lanes.B.coverage[0] = [-1, 50],
    (x) => x.views.plan.lanes.C.control = [1, 601],
    (x) => x.views.front.outline = Array(25).fill([[1, 1], [2, 2]]),
    (x) => x.title = '',
  ]) { const bad = stageFixture(); mutate(bad); assert.throws(() => normalizePlot(bad)); }
  const rig = [{ slot: 'P1', lane: 'C' }, { slot: 'P3', lane: 'A' }];
  assert.equal(projectorForLane(rig, 'A').slot, 'P3');
  assert.equal(projectorForLane(rig, 'D'), null);
  assert.equal(projectorForLane([...rig, { slot: 'P4', lane: 'A' }], 'A'), null);
});

test('local plot API handles absent, valid, invalid and oversized files without changing the rig', async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  const file = path.join(path.dirname(relay.rigFile), 'stage-plot.json');
  assert.deepEqual((await relay.api('stage-plot')).body, { plot: null });
  const before = (await relay.state()).projectors.map((p) => [p.slot, p.lane]);
  await writeFile(file, JSON.stringify(stageFixture()));
  assert.equal((await relay.api('stage-plot')).body.plot.title, 'Test stage');
  assert.equal((await relay.state()).simulation, true);
  for (const bad of ['{invalid json', JSON.stringify({ version: 20 }), ' '.repeat(64001)]) {
    await writeFile(file, bad);
    const response = await relay.api('stage-plot');
    assert.equal(response.status, 500);
    assert.match(response.body.error, /Stage plot could not be loaded/);
    assert.ok(!response.body.error.includes(file));
  }
  assert.deepEqual((await relay.state()).projectors.map((p) => [p.slot, p.lane]), before);
});
