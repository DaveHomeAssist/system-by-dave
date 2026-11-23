#!/usr/bin/env node
// Import the upstream static export without losing the previous export on failure.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OMIT = new Set(['404.html', '404', '_not-found']);

function inventory(directory, omit = new Set(), prefix = '') {
  const entries = [];
  for (const name of fs.readdirSync(directory).sort()) {
    if (!prefix && omit.has(name)) continue;
    const relative = prefix ? `${prefix}/${name}` : name;
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    if (stat.isDirectory()) {
      entries.push(...inventory(file, new Set(), relative));
    } else if (stat.isFile()) {
      entries.push([relative, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
    } else {
      throw new Error(`Export must contain only regular files and directories: ${relative}`);
    }
  }
  return entries;
}

export function syncCheesesteaks(source, { root = ROOT, check = false } = {}) {
  if (!source) throw new Error('Supply a heatmap checkout with a built out/ directory.');
  source = fs.realpathSync(source);
  const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (fs.realpathSync(git('rev-parse', '--show-toplevel')) !== source) {
    throw new Error('Source must be the root of its Git checkout.');
  }
  const sha = git('rev-parse', '--verify', 'HEAD^{commit}');
  const out = path.join(source, 'out');
  if (!fs.readFileSync(path.join(out, 'index.html'), 'utf8').includes('/cheesesteaks/_next/')) {
    throw new Error('out/ must be built with basePath /cheesesteaks; run npm run build:static first.');
  }
  const expected = inventory(out, OMIT);
  if (expected.some(([name]) => name === 'SOURCE.txt')) throw new Error('out/SOURCE.txt is reserved for sync provenance.');
  const provenance = `philly-cheesesteak-heatmap ${sha}\n`;
  expected.push(['SOURCE.txt', createHash('sha256').update(provenance).digest('hex')]);
  expected.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const target = path.join(root, 'cheesesteaks');
  const verify = (directory) => {
    const actual = inventory(directory).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Cheesesteak export differs from the supplied build or source revision.');
  };
  if (check) {
    verify(target);
    return sha;
  }

  // Stage and verify on the same filesystem before moving the existing export.
  const staging = fs.mkdtempSync(path.join(root, '.cheesesteaks-sync-'));
  const candidate = path.join(staging, 'candidate');
  const previous = path.join(staging, 'previous');
  let backedUp = false;
  try {
    fs.cpSync(out, candidate, { recursive: true });
    for (const extra of OMIT) fs.rmSync(path.join(candidate, extra), { recursive: true, force: true });
    fs.writeFileSync(path.join(candidate, 'SOURCE.txt'), provenance);
    verify(candidate);
    if (fs.existsSync(target)) {
      fs.renameSync(target, previous);
      backedUp = true;
    }
    try {
      fs.renameSync(candidate, target);
    } catch (error) {
      if (backedUp) {
        try {
          fs.renameSync(previous, target);
          backedUp = false;
        } catch (restoreError) {
          throw new AggregateError([error, restoreError], `Restore failed. Previous export preserved at ${previous}`);
        }
      }
      throw error;
    }
    // Promotion succeeded. Only now may the prior export be removed.
    backedUp = false;
  } finally {
    if (!backedUp) fs.rmSync(staging, { recursive: true, force: true });
  }
  return sha;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args[0] === '--check';
  const source = args[check ? 1 : 0];
  try {
    if (args.length !== (check ? 2 : 1)) throw new Error('Usage: sync_cheesesteaks.mjs [--check] <heatmap checkout>');
    const sha = syncCheesesteaks(source, { check });
    console.log(`${check ? 'Verified' : 'Synced'} cheesesteaks/ from philly-cheesesteak-heatmap ${sha.slice(0, 7)}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
