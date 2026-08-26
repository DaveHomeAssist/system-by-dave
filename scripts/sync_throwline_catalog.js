#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'ProjectorThrow/data/throwline-pilot-catalog.v1.json');
const TARGETS = [
  path.join(ROOT, 'ProjectorThrow/index.html'),
  path.join(ROOT, 'ProjectorThrow/Stage3D.html'),
];
const START = '<!-- THROWLINE_CATALOG_START -->';
const END = '<!-- THROWLINE_CATALOG_END -->';
const BLOCK_PATTERN = /<!-- THROWLINE_CATALOG_START -->[\s\S]*?<!-- THROWLINE_CATALOG_END -->/;
const checkOnly = process.argv.includes('--check');

const catalog = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const payload = JSON.stringify(catalog).replace(/</g, '\\u003c');
const stale = [];

for (const target of TARGETS) {
  const source = fs.readFileSync(target, 'utf8');
  if (!BLOCK_PATTERN.test(source)) {
    console.error(`${path.relative(ROOT, target)} is missing Throwline catalog markers.`);
    process.exitCode = 1;
    continue;
  }
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const block = `${START}${eol}<script id="throwlineCatalog" type="application/json">${payload}</script>${eol}${END}`;
  const next = source.replace(BLOCK_PATTERN, block);
  if (next === source) continue;
  stale.push(path.relative(ROOT, target));
  if (!checkOnly) fs.writeFileSync(target, next, 'utf8');
}

if (checkOnly && stale.length) {
  stale.forEach((target) => console.error(`${target} has a stale Throwline catalog snapshot.`));
  process.exitCode = 1;
} else if (checkOnly && process.exitCode !== 1) {
  console.log(`Throwline catalog snapshots are current (${catalog.meta.catalogId}).`);
} else if (!checkOnly) {
  console.log(stale.length ? `Updated Throwline catalog snapshots: ${stale.join(', ')}.` : 'Throwline catalog snapshots already current.');
}
