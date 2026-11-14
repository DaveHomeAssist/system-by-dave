import { readFileSync, writeFileSync, existsSync, mkdirSync, lstatSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..'), target = resolve(root, 'equipment-lab/data');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const safe = (base, path) => { const full = resolve(base,path); if (!full.startsWith(base + sep) || lstatSync(full).isSymbolicLink()) throw Error(`Unsafe release path: ${path}`); return full; };
// The family Dave confirmed stays at 43. Each release names the entries it adds to it, one by one.
const FAMILY = 43, RELEASES = { '1.0.0': [], '1.1.0': ['P01'], '1.2.0': ['P01', 'P02', 'P03'] }, CURRENT = '1.2.0';
function verify(base, revisions = [CURRENT]) {
  const manifest = read(resolve(base,'manifest.json')); if (manifest.schema !== 'equipment.lab.release.v1' || !revisions.includes(manifest.revision)) throw Error('Unsupported Equipment Lab release');
  for (const [name, record] of Object.entries(manifest.files)) { const bytes = readFileSync(safe(base,name)); if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) throw Error(`Equipment Lab integrity mismatch: ${name}`); }
  const catalog = read(resolve(base,manifest.catalog)), additions = RELEASES[manifest.revision], ids = catalog.entries.map(row => row.inventoryId);
  if (catalog.schema !== 'equipment.lab.catalog.v1' || new Set(ids).size !== ids.length || ids.filter(id => !additions.includes(id)).length !== FAMILY) throw Error('Equipment Lab catalog must preserve 43 unique family entries');
  if (ids.length !== FAMILY + additions.length || !additions.every(id => ids.includes(id))) throw Error('Equipment Lab catalog additions do not match its release');
  const camera = catalog.entries.find(row => row.inventoryId === 'C03'); if (camera.identity.model !== 'unknown' || camera.identity.geometry !== 'generic') throw Error('Panasonic must remain generic');
  // Every native package the catalog names must be allowlisted and agree with its own manifest.
  for (const row of catalog.entries.filter(row => row.representation.kind === 'glb')) {
    const name = row.representation.base + row.representation.manifest, record = manifest.files[name]; if (!record) throw Error(`Equipment Lab package is not allowlisted: ${row.inventoryId}`);
    const pack = read(safe(base,name)); if (pack.schema !== 'equipment.reference.manifest.v1' || pack.assetId !== row.inventoryId) throw Error(`Equipment Lab package identity mismatch: ${row.inventoryId}`);
    for (const file of Object.values(pack.files)) { const listed = manifest.files[row.representation.base + file.name]; if (!listed || listed.bytes !== file.bytes || listed.sha256 !== file.sha256) throw Error(`Equipment Lab package file mismatch: ${row.inventoryId} ${file.name}`); }
  }
  return { ...manifest, entries: ids.length, additions };
}
const describe = manifest => `${manifest.entries} catalog entries (${FAMILY} family${manifest.additions.length ? ' + ' + manifest.additions.join(', ') : ''})`;
if (process.argv.includes('--check')) {
  const manifest = verify(target), provenance = read(resolve(target,'source_provenance.json'));
  if (provenance.repository !== 'DaveHomeAssist/equipment-lab' || !/^[a-f0-9]{40}$/.test(provenance.commit) || provenance.manifestHash !== hash(readFileSync(resolve(target,'manifest.json')))) throw Error('Equipment Lab provenance mismatch');
  console.log(`Equipment Lab: ${describe(manifest)}, ${Object.keys(manifest.files).length} pinned files, generic Panasonic`);
} else {
  const arg = process.argv.indexOf('--source'); if (arg < 0 || !process.argv[arg+1]) throw Error('Use --source with the clean Equipment Lab checkout');
  const source = resolve(process.argv[arg+1]); const git = (...args) => execFileSync('git',['-C',source,...args],{encoding:'utf8'}).trim();
  if (git('status','--porcelain','--untracked-files=normal')) throw Error('Equipment Lab source must be clean and committed');
  const release = resolve(source,'release'), manifest = verify(release), commit = git('rev-parse','HEAD');
  // The copy already here may be any release this host has known; the incoming one must be the current release.
  const previous = existsSync(resolve(target,'manifest.json')) ? verify(target, Object.keys(RELEASES)) : {files:{}};
  const walk = (dir, prefix='') => existsSync(dir) ? readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(resolve(dir,entry.name), prefix+entry.name+'/') : [prefix+entry.name]) : [];
  // index.html is the host-owned return route for the original checklist backlink.
  for (const name of walk(target)) if (!previous.files[name] && !['manifest.json','source_provenance.json','index.html'].includes(name)) throw Error(`Unmanaged consumer file: ${name}`);
  for (const name of Object.keys(previous.files)) if (!manifest.files[name]) throw Error(`Removal needs explicit migration: ${name}`);
  for (const name of [...Object.keys(manifest.files),'manifest.json']) { const file=safe(release,name), out=resolve(target,name); mkdirSync(dirname(out),{recursive:true}); copyFileSync(file,out); }
  writeFileSync(resolve(target,'source_provenance.json'),JSON.stringify({schema:'equipment.lab.consumer.v1',repository:'DaveHomeAssist/equipment-lab',commit,manifestHash:hash(readFileSync(resolve(release,'manifest.json'))),files:Object.keys(manifest.files).length},null,2)+'\n');
  console.log(`Imported Equipment Lab ${commit}: ${describe(manifest)}`);
}
