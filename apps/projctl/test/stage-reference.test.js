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
