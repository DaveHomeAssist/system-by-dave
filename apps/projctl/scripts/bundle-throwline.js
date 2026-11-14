import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { THROWLINE_FILES, canonicalThrowline, bundledThrowline } from '../server/throwline-assets.js';

// Copy only the canonical viewer runtime. No catalog, plot, job or private data.
const source = process.argv[2] ? path.resolve(process.argv[2]) : canonicalThrowline;
const files = {};
const inputs = await Promise.all(THROWLINE_FILES.map(async name => [name, await readFile(path.join(source, name))]));
for (const [name, bytes] of inputs) {
  const input = path.join(source, name), output = path.join(bundledThrowline, name);
  files[name] = createHash('sha256').update(bytes).digest('hex');
  await mkdir(path.dirname(output), { recursive: true });
  if (input !== output) await copyFile(input, output);
}
await writeFile(path.join(bundledThrowline, 'manifest.json'), JSON.stringify({ version: 1, producer: 'Throwline', threeRevision: 184, files }, null, 2) + '\n');
console.log('Packaged the canonical Throwline viewer and three.js r184 for local use.');
