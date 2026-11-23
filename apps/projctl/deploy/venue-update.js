// Only an explicitly packaged, validated venue can replace managed venue settings.
import fs from 'node:fs/promises';
import path from 'node:path';
import { readVenue, readVenueAsset } from '../server/venue-model.js';
export async function stagePackagedVenue(source, staged) {
  let delivery;
  try { delivery = JSON.parse(await fs.readFile(path.join(source, 'DELIVERY.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return false; throw new Error('Invalid update delivery manifest.'); }
  if (!delivery.modelVersion) return false;
  const root = path.join(source, 'data/venue');
  const venue = await readVenue(root);
  if (!venue || venue.modelVersion !== delivery.modelVersion) throw new Error('Packaged venue version does not match delivery manifest.');
  for (const role of Object.keys(venue.assets)) await readVenueAsset(root, role);
  await fs.cp(root, staged, { recursive: true });
  return true;
}
export async function applyPackagedVenue(staged, data, backup) {
  const current = path.join(data, 'venue');
  try { await fs.rename(current, path.join(backup, 'venue')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.rename(staged, current);
}
