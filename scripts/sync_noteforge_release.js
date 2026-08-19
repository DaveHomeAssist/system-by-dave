#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'noteforge');
const PROVENANCE_FILE = 'source_provenance.json';
const SOURCE_REPOSITORY = 'https://github.com/DaveHomeAssist/noteforge';
const REQUIRED_SOURCE_FILES = [
  'icon.svg',
  'index.html',
  'manifest.webmanifest',
  'og-image.svg',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
];
const BOOTSTRAP_MANAGED_FILES = new Set([
  ...REQUIRED_SOURCE_FILES,
  PROVENANCE_FILE,
]);
const PUBLIC_NAV_CSS = '<link rel="stylesheet" href="../css/sbd-public-nav.css">';
const PUBLIC_NAV_SCRIPT = '<script src="../js/sbd-public-nav.js" defer></script>';
const BREADCRUMB = `<nav class="sbd-site-return" aria-label="Breadcrumb">
  <a href="/">System by Dave</a>
  <span class="sbd-site-return__separator" aria-hidden="true">/</span>
  <a href="/tools.html">Tools</a>
  <span class="sbd-site-return__separator" aria-hidden="true">/</span>
  <span class="sbd-site-return__current" aria-current="page">NoteForge</span>
</nav>`;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--source' || token === '--source-commit') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) fail(`${token} requires a value`);
      args[token.slice(2)] = value;
      i += 1;
      continue;
    }
    fail(`Unknown argument: ${token}`);
  }
  if (!args.source) fail('Usage: npm run sync:noteforge -- --source /absolute/path/to/noteforge/dist --source-commit <40-character-sha>');
  if (!/^[0-9a-f]{40}$/.test(args['source-commit'] || '')) fail('--source-commit must be a lowercase 40-character git SHA');
  return { source: path.resolve(args.source), sourceCommit: args['source-commit'] };
}

function relativeFile(root, absolute) {
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  if (!relative || relative === '..' || relative.startsWith('../')) fail(`Path escapes managed root: ${absolute}`);
  return relative;
}

function managedPath(root, relative) {
  if (!relative || path.isAbsolute(relative)) fail(`Managed artifact path is invalid: ${relative || '(empty)'}`);
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${root}${path.sep}`)) fail(`Managed artifact path escapes ${root}: ${relative}`);
  return absolute;
}

function walk(root, current = root, files = [], directories = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = relativeFile(root, absolute);
    if (entry.isSymbolicLink()) fail(`Symbolic links are not allowed in release artifacts: ${relative}`);
    if (entry.isDirectory()) {
      directories.push(relative);
      walk(root, absolute, files, directories);
    } else if (entry.isFile()) {
      files.push(relative);
    } else {
      fail(`Unsupported filesystem entry in release artifacts: ${relative}`);
    }
  }
  return { files: files.sort(), directories: directories.sort() };
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function git(sourceRoot, args) {
  return execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8' }).trim();
}

function validateSource(source, sourceCommit) {
  if (!path.isAbsolute(source)) fail('--source must resolve to an absolute path');
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail(`Source dist directory does not exist: ${source}`);
  if (fs.lstatSync(source).isSymbolicLink()) fail('Source dist directory must not be a symbolic link');
  if (path.basename(source) !== 'dist') fail('Source must be the dist directory at the root of the NoteForge checkout');
  if (source === TARGET || source.startsWith(`${TARGET}${path.sep}`)) fail('Source and target must be separate directories');

  const sourceRoot = path.dirname(source);
  const packageJson = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
  if (packageJson.name !== 'noteforge') fail(`Source package is ${packageJson.name || 'unnamed'}, expected noteforge`);
  const actualCommit = git(sourceRoot, ['rev-parse', 'HEAD']);
  if (actualCommit !== sourceCommit) fail(`Source checkout HEAD ${actualCommit} does not match --source-commit ${sourceCommit}`);
  const trackedStatus = git(sourceRoot, ['status', '--short', '--untracked-files=no']);
  if (trackedStatus) fail(`Source checkout has tracked changes:\n${trackedStatus}`);

  walk(source);
  for (const relative of REQUIRED_SOURCE_FILES) {
    const absolute = managedPath(source, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`Source build is missing ${relative}`);
  }
  const index = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
  if (!index.includes('<link rel="canonical" href="https://systembydave.com/noteforge/">')) fail('Source index does not preserve the canonical System by Dave URL');
  if (!/Content-Security-Policy/i.test(index)) fail('Source index is missing its production CSP');
  if (/sbd-site-return|sbd-public-nav/i.test(index)) fail('Source index is already modified with System by Dave navigation');
  const assetRefs = [...index.matchAll(/(?:src|href)="\/noteforge\/(assets\/[^"?]+)"/g)].map((match) => match[1]);
  if (!assetRefs.some((file) => file.endsWith('.js')) || !assetRefs.some((file) => file.endsWith('.css'))) {
    fail('Source index must reference built JavaScript and CSS under /noteforge/assets/');
  }
  for (const relative of assetRefs) {
    if (!fs.existsSync(managedPath(source, relative))) fail(`Source index references missing asset ${relative}`);
  }
}

function injectSystemByDaveNavigation(index) {
  let next = index;
  if (!next.includes(PUBLIC_NAV_CSS)) next = next.replace(/<\/head>/i, `${PUBLIC_NAV_CSS}\n</head>`);
  if (!next.includes('class="sbd-site-return"')) next = next.replace(/<body[^>]*>/i, (body) => `${body}\n${BREADCRUMB}`);
  if (!next.includes(PUBLIC_NAV_SCRIPT)) next = next.replace(/<\/body>/i, `${PUBLIC_NAV_SCRIPT}\n</body>`);
  if ((next.match(/class="sbd-site-return"/g) || []).length !== 1) fail('Canonical index must contain exactly one static System by Dave breadcrumb');
  if ((next.match(/sbd-public-nav\.css/g) || []).length !== 1) fail('Canonical index must contain exactly one public-navigation stylesheet');
  if ((next.match(/sbd-public-nav\.js/g) || []).length !== 1) fail('Canonical index must contain exactly one public-navigation script');
  return next;
}

function artifactHashes(stage) {
  const hashes = {};
  const { files } = walk(stage);
  for (const relative of files) {
    if (relative === PROVENANCE_FILE) continue;
    hashes[relative] = sha256(managedPath(stage, relative));
  }
  return hashes;
}

function readManagedTargetFiles() {
  if (!fs.existsSync(TARGET)) return new Set();
  if (!fs.statSync(TARGET).isDirectory() || fs.lstatSync(TARGET).isSymbolicLink()) fail(`Target is not a real directory: ${TARGET}`);
  const { files } = walk(TARGET);
  const provenancePath = path.join(TARGET, PROVENANCE_FILE);
  let managed = new Set();
  if (fs.existsSync(provenancePath)) {
    const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    const declared = Object.keys(provenance.artifactHashes || {});
    for (const relative of declared) managedPath(TARGET, relative);
    managed = new Set([...declared, PROVENANCE_FILE]);
  } else {
    managed = new Set([...BOOTSTRAP_MANAGED_FILES, ...files.filter((file) => file.startsWith('assets/'))]);
  }
  const unmanaged = files.filter((file) => !managed.has(file));
  if (unmanaged.length) fail(`Refusing to overwrite unmanaged target files:\n${unmanaged.join('\n')}`);
  return managed;
}

function sameFile(left, right) {
  return fs.existsSync(right) && fs.statSync(right).isFile() && sha256(left) === sha256(right);
}

function atomicCopy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.noteforge-sync-${process.pid}`;
  fs.copyFileSync(source, temporary);
  fs.renameSync(temporary, target);
}

function syncStage(stage) {
  fs.mkdirSync(TARGET, { recursive: true });
  const managedBefore = readManagedTargetFiles();
  const { files: stageFiles, directories: stageDirectories } = walk(stage);
  const expected = new Set(stageFiles);
  let deleted = 0;
  for (const relative of managedBefore) {
    if (expected.has(relative)) continue;
    const absolute = managedPath(TARGET, relative);
    if (fs.existsSync(absolute)) {
      if (fs.lstatSync(absolute).isSymbolicLink() || !fs.statSync(absolute).isFile()) fail(`Refusing to delete non-file target entry: ${relative}`);
      fs.unlinkSync(absolute);
      deleted += 1;
    }
  }

  for (const relative of stageDirectories) fs.mkdirSync(managedPath(TARGET, relative), { recursive: true });
  let changed = 0;
  let unchanged = 0;
  for (const relative of stageFiles) {
    const source = managedPath(stage, relative);
    const target = managedPath(TARGET, relative);
    if (sameFile(source, target)) {
      unchanged += 1;
    } else {
      atomicCopy(source, target);
      changed += 1;
    }
  }

  const { directories: targetDirectories } = walk(TARGET);
  for (const relative of targetDirectories.sort((a, b) => b.length - a.length)) {
    const absolute = managedPath(TARGET, relative);
    if (!fs.readdirSync(absolute).length) fs.rmdirSync(absolute);
  }
  return { changed, deleted, unchanged };
}

function main() {
  const { source, sourceCommit } = parseArgs(process.argv.slice(2));
  validateSource(source, sourceCommit);
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'system-by-dave-noteforge-'));
  try {
    fs.cpSync(source, stage, { recursive: true });
    const indexPath = path.join(stage, 'index.html');
    fs.writeFileSync(indexPath, injectSystemByDaveNavigation(fs.readFileSync(indexPath, 'utf8')));
    const provenance = {
      schemaVersion: 1,
      sourceRepository: SOURCE_REPOSITORY,
      sourceCommit,
      artifactHashes: artifactHashes(stage),
    };
    fs.writeFileSync(path.join(stage, PROVENANCE_FILE), `${JSON.stringify(provenance, null, 2)}\n`);
    const result = syncStage(stage);
    console.log(`NoteForge release synced from ${sourceCommit}: changed=${result.changed} deleted=${result.deleted} unchanged=${result.unchanged}`);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`NoteForge release sync failed: ${error.message}`);
  process.exit(1);
}
