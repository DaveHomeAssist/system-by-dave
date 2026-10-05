#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function privatePath(name) {
  return /^(?:house\/|flooring-contract-review\.html$|cross-project-|\.agent-claim$)/.test(name);
}

function inspectFiles(root, files) {
  const failures = [];
  for (const name of files) {
    const absolute = path.join(root, name);
    if (!fs.existsSync(absolute)) continue;
    if (privatePath(name)) {
      failures.push(`${name}: private workspace material`);
      continue;
    }
    if (!/\.(?:html?|[cm]?js|json|md|py|txt|ya?ml|css|csv)$/i.test(name)) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    // Report the filename only; never echo the potentially private value.
    if (source.includes('/' + 'Users/')) failures.push(`${name}: absolute local user path`);
  }
  return failures;
}

function walk(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(root, name) : [name];
  });
}

if (require.main === module) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
  const files = process.argv[2] ? walk(root) : execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const failures = inspectFiles(root, files);
  if (failures.length) {
    console.error('Private exposure verification failed:\n' + failures.join('\n'));
    process.exitCode = 1;
  } else console.log(`Private exposure verification passed (${files.length} paths checked).`);
}

module.exports = { inspectFiles, privatePath };
