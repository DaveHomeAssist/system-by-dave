import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stageFixture } from './stage-fixture.js';
import { stageReference } from '../public/stage-reference.js';
import { normalizePlot } from '../public/stage-plot.js';
import { startRelay } from './relay-helper.js';
import { THROWLINE_FILES, canonicalThrowline, throwlineAsset } from '../server/throwline-assets.js';

test('3D reference preserves drawing edges and crossed paths without mutating the plot', () => {
  const plot = normalizePlot(stageFixture()), before = JSON.stringify(plot);
  const model = stageReference(plot);
  assert.equal(JSON.stringify(plot), before);
  const a = model.lanes.A, d = model.lanes.D;
  assert.ok(a.projector[0] < d.projector[0]);
  assert.ok(a.coverage[0][0] > d.coverage[0][0]);
  assert.ok(model.height > 0);
  for (const lane of Object.values(model.lanes)) {
    assert.equal(lane.projector[1], model.height * .65);
    assert.ok(lane.coverage.flat().every(Number.isFinite));
  }
  assert.throws(() => stageReference({ ...plot, views: { ...plot.views, plan: plot.views.front } }), /triangular/);
  const bad = structuredClone(plot); bad.views.plan.lanes.C.coverage[2][0] = bad.views.plan.lanes.C.coverage[1][0];
  assert.throws(() => stageReference(bad), /triangular/);
});

test('relay serves only the canonical Throwline runtime allowlist', async t => {
  const relay = await startRelay(); t.after(relay.close);
  for (const route of ['/', '/index.html']) {
    const html = await (await fetch(relay.base + route)).text();
    const map = JSON.parse(html.match(/<script type="importmap">([^<]+)<\/script>/)[1]);
    assert.deepEqual(Object.keys(map.imports), ['three', 'three/addons/controls/OrbitControls.js']);
    for (const asset of Object.values(map.imports)) assert.equal((await fetch(relay.base + asset)).status, 200);
    assert.ok(html.indexOf('type="importmap"') < html.indexOf('type="module"'), 'configure imports before app modules');
  }
  for (const name of THROWLINE_FILES) {
    const response = await fetch(relay.base + '/ProjectorThrow/' + name);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(canonicalThrowline + name));
  }
  for (const name of ['Stage3D.html', 'data/throwline-pilot-catalog.v1.json', '../data/rig.json', 'vendor/three/../../server/index.js']) {
    assert.equal(throwlineAsset('/ProjectorThrow/' + name), null);
  }
  assert.equal((await fetch(relay.base + '/ProjectorThrow/Stage3D.html')).status, 404);
});

test('metric reference preserves dimensions, lens offsets and unknown elevations', () => {
  const raw = stageFixture();
  raw.measurements = {
    version: 1, units: 'metres', source: 'Synthetic measured drawing',
    referenceWidth: 8, referenceHeight: 5,
    projectors: Object.fromEntries(['A', 'B', 'C', 'D'].map((lane, i) => [lane, {
      model: 'Synthetic enclosure', x: [-2, -1, .5, 2][i], y: null, z: null,
      body: [.5, .2, .6], portrait: lane === 'A' || lane === 'D', yaw: lane === 'C' ? 90 : null,
      dimensionsSource: 'Synthetic manufacturer envelope', positionSource: 'Synthetic plot offsets',
    }])),
  };
  const original = JSON.stringify(raw), plot = normalizePlot(raw), model = stageReference(plot);
  assert.equal(JSON.stringify(raw), original);
  assert.equal(model.metric, true);
  assert.equal(model.heightsKnown, false);
  assert.deepEqual(model.lanes.A.body, [.2, .5, .6], 'portrait swaps enclosure width and height');
  assert.deepEqual(model.lanes.B.body, [.5, .2, .6]);
  assert.equal(model.lanes.C.yaw, 90);
  for (const [lane, p] of Object.entries(model.lanes)) {
    assert.equal(p.projector[0], raw.measurements.projectors[lane].x);
    assert.equal(p.projector[1], 0, 'unknown heights use the labeled plan plane');
    assert.equal(p.heightKnown, false);
  }
  assert.equal(model.lanes.C.coverage[1][0] - model.lanes.C.coverage[0][0], 8);
  assert.equal(model.lanes.C.coverage[0][1] - model.lanes.C.coverage[3][1], 5);
  plot.measurements.projectors.C.y = 4.2;
  plot.measurements.projectors.C.z = 12.3;
  const measured = stageReference(plot).lanes.C;
  assert.deepEqual(measured.projector, [.5, 4.2, 12.3]);
  assert.equal(measured.heightKnown, true);
  for (const mutate of [
    p => { p.measurements.units = 'feet'; },
    p => { p.measurements.referenceWidth = 0; },
    p => { p.measurements.projectors.A.body[0] = -1; },
    p => { p.measurements.projectors.A.x = NaN; },
    p => { delete p.measurements.projectors.D; },
    p => { p.measurements.projectors.B.y = 'unknown'; },
  ]) {
    const bad = structuredClone(raw); mutate(bad);
    assert.throws(() => normalizePlot(bad), /Invalid stage plot/);
  }
});
