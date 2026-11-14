// Produce a source-only update directory. Optional private venue is opt-in.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readVenue, readVenueAsset } from '../server/venue-model.js';

const app = fileURLToPath(new URL('../', import.meta.url));
const output = process.argv[2] && path.resolve(process.argv[2]);
if (!output) throw new Error('Usage: node scripts/package-update.js NEW_OUTPUT_DIRECTORY [PRIVATE_VENUE_DIRECTORY]');
const venueRoot = process.argv[3] && path.resolve(process.argv[3]);
let venue;
if (venueRoot) {
  venue = await readVenue(venueRoot);
  if (!venue) throw new Error('Private venue manifest is missing');
  for (const role of Object.keys(venue.assets)) await readVenueAsset(venueRoot, role);
}
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: app, encoding: 'utf8' }).trim();
await fs.mkdir(output); // Deliberately refuse an existing output directory.
execFileSync(process.execPath, [path.join(app, 'scripts/bundle-throwline.js')], { cwd: app, stdio: 'inherit' });
for (const name of ['server', 'public', 'runtime', 'scripts', 'docs', 'deploy', 'package.json', 'package-lock.json', 'README.md']) {
  await fs.cp(path.join(app, name), path.join(output, name), { recursive: true });
}
await fs.copyFile(path.join(app, 'deploy/Update Existing Projctl.command'), path.join(output, 'Update Existing Projctl.command'));
await fs.chmod(path.join(output, 'Update Existing Projctl.command'), 0o755);
if (venueRoot) await fs.cp(venueRoot, path.join(output, 'data/venue'), { recursive: true });
const files = {};
async function checksum(dir, prefix = '') {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const relative = prefix + entry.name, absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await checksum(absolute, relative + '/');
    else files[relative] = createHash('sha256').update(await fs.readFile(absolute)).digest('hex');
  }
}
await checksum(output);
await fs.writeFile(path.join(output, 'DELIVERY.json'), JSON.stringify({ version: 1, sourceCommit,
  builtAt: new Date().toISOString(), modelVersion: venue?.modelVersion || null, files }, null, 2) + '\n');
console.log(`Update package: ${output}. Saved rig and stage plot intentionally excluded.`);
