import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const FILES = Object.freeze({ room: 'room.glb', plot: 'plot.glb', scan: 'scan.glb', preview: 'preview.png' });
const MAX_ASSET = 32 * 1024 * 1024;
const fail = () => new Error('Building model could not be loaded. Check the local venue bundle.');
async function readContained(root, name, max) {
  const base = await fs.realpath(root), file = await fs.realpath(path.join(base, name));
  if (path.dirname(file) !== base) throw fail();
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > max) throw fail();
    // Read at most the bound even if a file grows during the read.
    const buffer = Buffer.alloc(stat.size + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead !== stat.size) throw fail();
    return buffer.subarray(0, bytesRead);
  } finally { await handle.close(); }
}
const short = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
export async function readVenue(root) {
  try {
    let bytes;
    try { bytes = await readContained(root, 'manifest.json', 32768); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    const value = JSON.parse(bytes.toString('utf8'));
    if (value.version !== 1 || value.units !== 'metres' || value.up !== 'Y' || value.upstage !== '-Z' ||
        !short(value.title, 160) || !short(value.modelVersion, 40) || !short(value.notes, 2000) || !value.assets?.room) throw fail();
    const assets = {};
    const cutaway = value.cutaway ?? [];
    if (!Array.isArray(cutaway) || cutaway.length > 64 || cutaway.some(name => !short(name, 160))) throw fail();
    for (const role of Object.keys(FILES)) {
      const entry = value.assets[role]; if (!entry) continue;
      if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 12 || entry.bytes > MAX_ASSET || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw fail();
      assets[role] = { bytes: entry.bytes, sha256: entry.sha256, url: `/api/venue-model/${role}` };
    }
    return { version: 1, title: value.title, modelVersion: value.modelVersion, notes: value.notes,
      units: 'metres', up: 'Y', upstage: '-Z', cutaway, assets,
      registration: { status: short(value.registration?.status, 80) ? value.registration.status : 'unregistered', planningOverlayAllowed: value.registration?.planningOverlayAllowed === true } };
  } catch { throw fail(); }
}
function embeddedGLB(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 ||
      bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) throw fail();
  const end = 20 + bytes.readUInt32LE(12);
  if (end > bytes.length) throw fail();
  const gltf = JSON.parse(bytes.subarray(20, end).toString('utf8'));
  // Stock GLTFLoader must never fetch external geometry or images from a model.
  for (const item of [...(gltf.buffers || []), ...(gltf.images || [])]) {
    if (item.uri !== undefined && !/^data:/.test(item.uri)) throw fail();
  }
}
export async function readVenueAsset(root, role) {
  if (!Object.hasOwn(FILES, role)) return null;
  try {
    const venue = await readVenue(root), entry = venue?.assets[role];
    if (!entry) return null;
    const bytes = await readContained(root, FILES[role], MAX_ASSET);
    if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw fail();
    if (role !== 'preview') embeddedGLB(bytes);
    else if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw fail();
    return { bytes, type: role === 'preview' ? 'image/png' : 'model/gltf-binary' };
  } catch { throw fail(); }
}
