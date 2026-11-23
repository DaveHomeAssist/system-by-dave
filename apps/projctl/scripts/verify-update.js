// Verify a packaged source directory without starting a service or sending commands.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export async function verifyUpdate(directory) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'DELIVERY.json'), 'utf8'));
  if (manifest.version !== 1 || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit || '') || !manifest.files || Array.isArray(manifest.files)) throw Error('Invalid delivery manifest');
  const entries = Object.entries(manifest.files);
  if (!entries.length || !manifest.files['server/index.js'] || !manifest.files['public/release.js']) throw Error('Incomplete update package');
  for (const [name, expected] of entries) {
    if (!name || path.isAbsolute(name) || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(expected)) throw Error('Unsafe or invalid delivery entry');
    const pieces = name.split('/');
    for (let i = 1; i <= pieces.length; i++) {
      const stat = await fs.lstat(path.join(root, ...pieces.slice(0, i)));
      if (stat.isSymbolicLink() || (i === pieces.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`Unexpected file type: ${name}`);
    }
    const actual = createHash('sha256').update(await fs.readFile(path.join(root, name))).digest('hex');
    if (actual !== expected) throw Error(`Checksum mismatch: ${name}`);
  }
  // A complete inventory catches stale source left behind from another release.
  async function inventory(dir, prefix = '') {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (name === 'DELIVERY.json') continue;
      if (entry.isDirectory()) await inventory(path.join(dir, entry.name), name + '/');
      else if (!Object.hasOwn(manifest.files, name)) throw Error(`Unlisted file: ${name}`);
    }
  }
  await inventory(root);
  return { files: entries.length, sourceCommit: manifest.sourceCommit, release: manifest.release || null };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw Error('Usage: node scripts/verify-update.js UPDATE_DIRECTORY');
    console.log(JSON.stringify(await verifyUpdate(process.argv[2]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
