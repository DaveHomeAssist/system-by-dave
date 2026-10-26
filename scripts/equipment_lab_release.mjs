import { readFileSync, writeFileSync, existsSync, mkdirSync, lstatSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..'), target = resolve(root, 'equipment-lab/data');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const safe = (base, path) => { const full = resolve(base,path); if (!full.startsWith(base + sep) || lstatSync(full).isSymbolicLink()) throw Error(`Unsafe release path: ${path}`); return full; };
function verify(base) {
  const manifest = read(resolve(base,'manifest.json')); if (manifest.schema !== 'equipment.lab.release.v1' || manifest.revision !== '1.0.0') throw Error('Unsupported Equipment Lab release');
  for (const [name, record] of Object.entries(manifest.files)) { const bytes = readFileSync(safe(base,name)); if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) throw Error(`Equipment Lab integrity mismatch: ${name}`); }
  const catalog = read(resolve(base,manifest.catalog)); if (catalog.schema !== 'equipment.lab.catalog.v1' || catalog.entries.length !== 43 || new Set(catalog.entries.map(row => row.inventoryId)).size !== 43) throw Error('Equipment Lab catalog must preserve 43 unique entries');
  const camera = catalog.entries.find(row => row.inventoryId === 'C03'); if (camera.identity.model !== 'unknown' || camera.identity.geometry !== 'generic') throw Error('Panasonic must remain generic');
  return manifest;
}
if (process.argv.includes('--check')) {
  const manifest = verify(target), provenance = read(resolve(target,'source_provenance.json'));
  if (provenance.repository !== 'DaveHomeAssist/equipment-lab' || !/^[a-f0-9]{40}$/.test(provenance.commit) || provenance.manifestHash !== hash(readFileSync(resolve(target,'manifest.json')))) throw Error('Equipment Lab provenance mismatch');
  console.log(`Equipment Lab: 43 catalog entries, ${Object.keys(manifest.files).length} pinned files, generic Panasonic`);
} else {
  const arg = process.argv.indexOf('--source'); if (arg < 0 || !process.argv[arg+1]) throw Error('Use --source with the clean Equipment Lab checkout');
  const source = resolve(process.argv[arg+1]); const git = (...args) => execFileSync('git',['-C',source,...args],{encoding:'utf8'}).trim();
  if (git('status','--porcelain','--untracked-files=normal')) throw Error('Equipment Lab source must be clean and committed');
  const release = resolve(source,'release'), manifest = verify(release), commit = git('rev-parse','HEAD');
  const previous = existsSync(resolve(target,'manifest.json')) ? verify(target) : {files:{}};
  const walk = (dir, prefix='') => existsSync(dir) ? readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(resolve(dir,entry.name), prefix+entry.name+'/') : [prefix+entry.name]) : [];
  // index.html is the host-owned return route for the original checklist backlink.
  for (const name of walk(target)) if (!previous.files[name] && !['manifest.json','source_provenance.json','index.html'].includes(name)) throw Error(`Unmanaged consumer file: ${name}`);
  for (const name of Object.keys(previous.files)) if (!manifest.files[name]) throw Error(`Removal needs explicit migration: ${name}`);
  for (const name of [...Object.keys(manifest.files),'manifest.json']) { const file=safe(release,name), out=resolve(target,name); mkdirSync(dirname(out),{recursive:true}); copyFileSync(file,out); }
  writeFileSync(resolve(target,'source_provenance.json'),JSON.stringify({schema:'equipment.lab.consumer.v1',repository:'DaveHomeAssist/equipment-lab',commit,manifestHash:hash(readFileSync(resolve(release,'manifest.json'))),files:Object.keys(manifest.files).length},null,2)+'\n');
  console.log(`Imported Equipment Lab ${commit}`);
}
