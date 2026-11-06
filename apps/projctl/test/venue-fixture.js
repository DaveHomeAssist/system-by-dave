import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function fixtureGLB(uri, extraNames = []) {
  const floats = new Float32Array([-2, 0, -2, 2, 0, -2, 0, 3, 0]);
  const binary = Buffer.from(floats.buffer);
  const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 1] }], nodes: [{ mesh: 0 }, { mesh: 0, name: 'Roof.001', translation: [0, 3, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [.4, .7, .8, 1], metallicFactor: 0 } }],
    buffers: [{ byteLength: binary.length, ...(uri ? { uri } : {}) }], bufferViews: [{ buffer: 0, byteLength: binary.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-2, 0, -2], max: [2, 3, 0] }] };
  for (const name of extraNames) { gltf.scenes[0].nodes.push(gltf.nodes.length); gltf.nodes.push({mesh:0,name,translation:[0,0,0]}); }
  const raw = Buffer.from(JSON.stringify(gltf)), json = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32); raw.copy(json);
  const head = Buffer.alloc(20), binHead = Buffer.alloc(8);
  head.writeUInt32LE(0x46546c67); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + json.length + binary.length, 8);
  head.writeUInt32LE(json.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  binHead.writeUInt32LE(binary.length); binHead.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, json, binHead, binary]);
}
export async function writeVenueFixture(root, glb = fixtureGLB()) {
  await mkdir(root, { recursive: true });
  const manifest = { version: 1, title: 'Synthetic venue', modelVersion: 'test', notes: 'Synthetic geometry; no real venue measurements.', units: 'metres', up: 'Y', upstage: '-Z', cutaway: ['Roof.001'], assets: {} };
  for (const role of ['room', 'plot', 'scan']) {
    await writeFile(path.join(root, `${role}.glb`), glb);
    manifest.assets[role] = { bytes: glb.length, sha256: createHash('sha256').update(glb).digest('hex') };
  }
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  return manifest;
}
