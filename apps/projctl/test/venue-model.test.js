import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, symlink, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';
import { startRelay, until } from './relay-helper.js';
import { fixtureGLB, writeVenueFixture } from './venue-fixture.js';

test('private model serves verified embedded geometry, strips unknown fields and preserves the rig', async t => {
  const relay = await startRelay(); t.after(relay.close);
  const root = path.join(path.dirname(relay.rigFile), 'venue');
  assert.deepEqual((await relay.api('venue-model')).body, { venue: null });
  await relay.api('projector', { slot: 'P1', notes: 'Existing saved rig' });
  await until(async () => { try { await readFile(relay.rigFile); return true; } catch { return false; } });
  const before = await readFile(relay.rigFile, 'utf8');
  const manifest = await writeVenueFixture(root); manifest.secret = 'private path'; manifest.assets.room.file = '../rig.json';
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  const descriptor = await relay.api('venue-model');
  assert.equal(descriptor.body.venue.secret, undefined); assert.equal(descriptor.body.venue.assets.room.file, undefined);
  const response = await fetch(relay.base + descriptor.body.venue.assets.room.url);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-type'), 'model/gltf-binary');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), fixtureGLB());
  assert.equal((await relay.api('venue-model/manifest.json')).status, 404);
  assert.equal((await relay.api('venue-model/constructor')).status, 404);
  await writeFile(path.join(root, 'room.glb'), 'corrupt');
  const bad = await relay.api('venue-model/room'); assert.equal(bad.status, 500); assert.ok(!bad.body.error.includes(root));
  await writeVenueFixture(root, fixtureGLB('https://example.com/private.bin'));
  assert.equal((await relay.api('venue-model/room')).status, 500);
  await writeVenueFixture(root);
  await unlink(path.join(root, 'room.glb')); await symlink(relay.rigFile, path.join(root, 'room.glb'));
  assert.equal((await relay.api('venue-model/room')).status, 500);
  await writeFile(path.join(root, 'manifest.json'), ' '.repeat(32769));
  assert.equal((await relay.api('venue-model')).status, 500);
  assert.equal(await readFile(relay.rigFile, 'utf8'), before);
});

test('model descriptor and geometry require the same authentication as the rig', async t => {
  const relay = await startRelay({ PJ_PASSCODE: 'test-code' }); t.after(relay.close);
  await writeVenueFixture(path.join(path.dirname(relay.rigFile), 'venue'));
  for (const route of ['venue-model', 'venue-model/room']) assert.equal((await relay.api(route)).status, 401);
  const login = await fetch(relay.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'test-code' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  for (const route of ['venue-model', 'venue-model/room']) {
    assert.equal((await fetch(relay.base + '/api/' + route, { headers: { cookie } })).status, 200);
  }
});
