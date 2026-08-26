#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'noteforge');
const PROVENANCE_FILE = 'source_provenance.json';
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function relativeFile(root, absolute) {
  return path.relative(root, absolute).split(path.sep).join('/');
}

function isManagedRelative(relative) {
  if (!relative || path.isAbsolute(relative)) return false;
  const absolute = path.resolve(TARGET, relative);
  return absolute.startsWith(`${TARGET}${path.sep}`);
}

function walk(root, current = root, files = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = relativeFile(root, absolute);
    if (entry.isSymbolicLink()) {
      fail(`symbolic link is not allowed: ${relative}`);
    } else if (entry.isDirectory()) {
      walk(root, absolute, files);
    } else if (entry.isFile()) {
      files.push(relative);
    } else {
      fail(`unsupported filesystem entry: ${relative}`);
    }
  }
  return files.sort();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function htmlAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

function htmlTags(index, name) {
  return [...index.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function hasCanonicalLink(index) {
  return htmlTags(index, 'link').some((tag) => {
    const rel = htmlAttribute(tag, 'rel');
    const href = htmlAttribute(tag, 'href');
    return rel?.toLowerCase().split(/\s+/).includes('canonical')
      && href === 'https://systembydave.com/noteforge/';
  });
}

function hasResource(index, tagName, attribute, expected) {
  return htmlTags(index, tagName).some((tag) => htmlAttribute(tag, attribute) === expected);
}

function assetReferences(index) {
  const references = new Set();
  for (const tag of [...htmlTags(index, 'link'), ...htmlTags(index, 'script')]) {
    for (const name of ['href', 'src']) {
      const value = htmlAttribute(tag, name);
      if (!value?.startsWith('/noteforge/assets/')) continue;
      references.add(value.slice('/noteforge/'.length).split(/[?#]/, 1)[0]);
    }
  }
  return [...references];
}

if (!fs.existsSync(TARGET) || !fs.statSync(TARGET).isDirectory() || fs.lstatSync(TARGET).isSymbolicLink()) {
  fail('noteforge target is missing or is not a real directory');
} else {
  const provenancePath = path.join(TARGET, PROVENANCE_FILE);
  if (!fs.existsSync(provenancePath)) {
    fail(`${PROVENANCE_FILE} is missing`);
  } else {
    let provenance;
    try {
      provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    } catch (error) {
      fail(`${PROVENANCE_FILE} is invalid JSON: ${error.message}`);
    }
    if (provenance) {
      if (provenance.schemaVersion !== 1) fail(`unexpected provenance schemaVersion ${provenance.schemaVersion}`);
      if (provenance.sourceRepository !== 'https://github.com/DaveHomeAssist/noteforge') fail('unexpected NoteForge source repository');
      if (!/^[0-9a-f]{40}$/.test(provenance.sourceCommit || '')) fail('provenance sourceCommit is not a 40-character SHA');
      const expectedHashes = provenance.artifactHashes || {};
      const actualFiles = walk(TARGET).filter((file) => file !== PROVENANCE_FILE);
      const expectedFiles = Object.keys(expectedHashes).sort();
      for (const relative of expectedFiles.filter((file) => !isManagedRelative(file))) fail(`unsafe provenance path: ${relative}`);
      for (const relative of expectedFiles.filter((file) => !actualFiles.includes(file))) fail(`provenance file is missing: ${relative}`);
      for (const relative of actualFiles.filter((file) => !expectedFiles.includes(file))) fail(`unmanaged artifact is present: ${relative}`);
      for (const relative of expectedFiles.filter((file) => actualFiles.includes(file))) {
        const actual = sha256(path.join(TARGET, relative));
        if (actual !== expectedHashes[relative]) fail(`hash mismatch for ${relative}`);
      }
      notes.push(`sourceCommit=${provenance.sourceCommit || 'invalid'}`);
      notes.push(`artifacts=${expectedFiles.length}`);
    }
  }

  const indexPath = path.join(TARGET, 'index.html');
  if (!fs.existsSync(indexPath)) {
    fail('index.html is missing');
  } else {
    const index = fs.readFileSync(indexPath, 'utf8');
    if (!hasCanonicalLink(index)) fail('canonical URL is missing or incorrect');
    if (!/Content-Security-Policy/i.test(index)) fail('production CSP is missing');
    if ((index.match(/class="sbd-site-return"/g) || []).length !== 1) fail('exactly one static breadcrumb is required');
    if (!index.includes('href="../css/sbd-public-nav.css"')) fail('public-navigation stylesheet path is missing');
    if (!index.includes('src="../js/sbd-public-nav.js"')) fail('public-navigation script path is missing');
    if ((index.match(/data-noteforge-sbd-shell/g) || []).length !== 1) fail('exactly one NoteForge shell integration style is required');
    if (!index.includes('.sbd-site-return { box-sizing: border-box; height: 44px; }')) fail('canonical breadcrumb height is not bounded');
    if (!index.includes('.sbd-site-return + .mobile-bar { top: 44px; }')) fail('mobile bar is not offset below the canonical breadcrumb');
    if (!index.includes('.sbd-site-return ~ .app .sidebar { top: 44px; }')) fail('mobile sidebar is not offset below the canonical breadcrumb');
    if (!hasResource(index, 'link', 'href', '/noteforge/manifest.webmanifest')) fail('PWA manifest path is incorrect');
    const assetRefs = assetReferences(index);
    if (!assetRefs.some((file) => file.endsWith('.js'))) fail('built JavaScript asset reference is missing');
    if (!assetRefs.some((file) => file.endsWith('.css'))) fail('built CSS asset reference is missing');
    for (const relative of assetRefs) {
      if (!fs.existsSync(path.join(TARGET, relative))) fail(`index references missing asset ${relative}`);
    }
  }

  const manifestPath = path.join(TARGET, 'manifest.webmanifest');
  if (!fs.existsSync(manifestPath)) {
    fail('manifest.webmanifest is missing');
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.start_url !== './' || manifest.scope !== './') fail('PWA start_url and scope must remain relative to /noteforge/');
      for (const icon of manifest.icons || []) {
        const relative = String(icon.src || '').replace(/^\.\//, '');
        if (!relative || !fs.existsSync(path.join(TARGET, relative))) fail(`manifest references missing icon ${icon.src || '(empty)'}`);
      }
    } catch (error) {
      fail(`manifest.webmanifest is invalid JSON: ${error.message}`);
    }
  }

  const workerPath = path.join(TARGET, 'sw.js');
  if (!fs.existsSync(workerPath)) {
    fail('sw.js is missing');
  } else {
    const worker = fs.readFileSync(workerPath, 'utf8');
    if (worker.includes('__BUILD_HASH__')) fail('service-worker build hash placeholder was not replaced');
    if (!/const CACHE = 'noteforge-[0-9a-f]{12}'/.test(worker)) fail('service-worker cache version is not content-derived');
  }
}

if (failures.length) {
  console.error('NoteForge release verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`NoteForge release verification passed (${notes.join(', ')}).`);
