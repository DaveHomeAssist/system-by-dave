#!/usr/bin/env node
'use strict';

/*
 * The AV service worker (av-suite-worker.js) names its cache after SBD_REGISTRY.version and serves
 * every non-navigation offline asset cache-first. The stated invariant is "bump SBD_REGISTRY.version
 * whenever a tool or shared asset changes"; without a bump, installed field devices keep serving the
 * previous copy of a changed asset. This gate enforces the invariant from git history: no offline
 * asset may have a commit newer than the commit that last changed the registry version line, and no
 * offline asset may be modified in the working tree while the version line is untouched.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = 'js/sbd-registry.js';
const failures = [];

function fail(message) {
  failures.push(message);
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function loadRegistry() {
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, REGISTRY), 'utf8'), context, { filename: REGISTRY });
  return context.self.SBD_REGISTRY;
}

function versionLineNumber(version) {
  const lines = fs.readFileSync(path.join(ROOT, REGISTRY), 'utf8').split(/\r?\n/);
  const index = lines.findIndex((line) => /^\s*version:\s*['"]/.test(line) && line.includes(version));
  return index >= 0 ? index + 1 : 0;
}

function commitTimeOfLine(file, line) {
  const blame = git(['blame', '-L', `${line},${line}`, '--porcelain', file]);
  const hash = blame.split(/\s/)[0];
  if (!/^[0-9a-f]{40}$/.test(hash)) throw new Error(`Could not blame ${file}:${line}.`);
  if (/^0{40}$/.test(hash)) return { hash, time: Number.POSITIVE_INFINITY }; // uncommitted edit
  return { hash, time: Number(git(['show', '-s', '--format=%ct', hash])) };
}

function lastCommitTime(file) {
  const value = git(['log', '-1', '--format=%ct', '--', file]);
  return value ? Number(value) : 0;
}

function assetFiles(assets) {
  // Directory routes (pixelforge/, av-workbook/, ProjectorThrow/) resolve to their index document.
  return assets
    .map((asset) => asset.replace(/^\.\//, ''))
    .map((asset) => (asset.endsWith('/') ? `${asset}index.html` : asset))
    .filter((asset) => fs.existsSync(path.join(ROOT, asset)));
}

let registry;
try {
  registry = loadRegistry();
} catch (error) {
  fail(`Could not load ${REGISTRY}: ${error.message}`);
}

if (registry) {
  const version = String(registry.version || '');
  const line = versionLineNumber(version);
  if (!version || !line) fail(`Could not find the SBD_REGISTRY.version line for "${version}" in ${REGISTRY}.`);
  const assets = assetFiles(registry.offlineAssets ? registry.offlineAssets() : []);
  if (!assets.length) fail('The registry offline manifest is empty.');

  if (line && assets.length) {
    // A shallow clone can only under-report: a line whose true origin predates the cutoff is attributed to
    // the boundary commit, which is older than any reachable asset change, so violations are still caught
    // inside the available history. Say so rather than pass silently.
    const shallow = git(['rev-parse', '--is-shallow-repository']) === 'true';
    if (shallow) console.warn(`Offline cache version gate: shallow clone (${git(['rev-list', '--count', 'HEAD'])} commits); violations older than the cutoff cannot be seen.`);

    const bump = commitTimeOfLine(REGISTRY, line);
    // git() trims the whole output, which would eat the leading status column of the first line, so parse each
    // porcelain line by its two status characters rather than by position.
    const dirty = new Set(
      git(['status', '--porcelain', '--', ...assets])
        .split('\n')
        .map((entry) => entry.match(/^.?.?\s(.+)$/))
        .filter(Boolean)
        .map((match) => match[1].trim())
    );
    const versionDirty = bump && bump.time === Number.POSITIVE_INFINITY;

    assets.forEach((asset) => {
      if (dirty.has(asset) && !versionDirty && asset !== REGISTRY) {
        fail(`${asset} is modified in the working tree but SBD_REGISTRY.version is unchanged; bump the offline cache version.`);
      }
      if (bump && Number.isFinite(bump.time) && lastCommitTime(asset) > bump.time) {
        fail(`${asset} changed after SBD_REGISTRY.version "${version}" was last bumped (${bump.hash.slice(0, 7)}); installed devices would keep serving the cached copy.`);
      }
    });
  }
}

if (failures.length) {
  console.error('Offline cache version verification failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Offline cache version verification passed (registry=${registry.version}, offlineAssets=${registry.offlineAssets().length}).`);
