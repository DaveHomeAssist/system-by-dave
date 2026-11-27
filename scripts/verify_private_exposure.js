#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function privatePath(name) {
  return /^(?:house\/|flooring-contract-review\.html$|cross-project-|\.agent-claim$)/.test(name);
}

// Paths that may stay in the git repository but must not be copied to the
// published site. scripts/pages-publish.filter is the deploy copy of this list.
function publishForbidden(name) {
  const norm = String(name).split('\\').join('/');
  if (privatePath(norm)) return 'private workspace material';
  if (norm === 'career-market.html') return 'private career page';
  if (/^(?:docs|scripts|reports|schemas|design)\//.test(norm) || norm.startsWith('.claude/')) return 'internal tree';
  if (norm.startsWith('apps/') && !norm.startsWith('apps/projctl/public/')) return 'application source';
  if (norm.startsWith('wst/hosting/scripts/')) return 'hosting tooling';
  const siteMarkdown = norm.startsWith('equipment-lab/data/') || norm === 'systembydave/assets/img/08_storyboard_scripts.md';
  if (norm.endsWith('.md') && !siteMarkdown) return 'internal markdown';
  if (norm.endsWith('.py')) return 'tooling script';
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(norm)) return 'test';
  if (/(^|\/)[^/]*probe\.[cm]?js$/.test(norm)) return 'probe';
  if (norm.endsWith('.d.ts') || norm.endsWith('.d.mts')) return 'type declarations';
  if (norm === 'implementation_plan.txt' || norm === 'date_project_implementation_plan.txt' || norm === 'systembydave-site.zip' || norm === 'youtube-pipeline-regression-2026-06-11.js' || norm === 'build_site.py') return 'internal file';
  if (/(^|\/)package(?:-lock)?\.json$/.test(norm)) return 'package metadata';
  if (norm.startsWith('av-workbook/assets/')) return 'withdrawn workbook assets';
  const parts = norm.split('/');
  if (parts.some((part, index) => part.startsWith('.') && !(index === parts.length - 1 && part === '.nojekyll'))) return 'dotfile';
  return '';
}

function inspectFiles(root, files, options = {}) {
  const failures = [];
  for (const name of files) {
    const absolute = path.join(root, name);
    if (!fs.existsSync(absolute)) continue;
    if (privatePath(name)) {
      failures.push(`${name}: private workspace material`);
      continue;
    }
    if (options.publish) {
      const reason = publishForbidden(name);
      if (reason) {
        failures.push(`${name}: ${reason}`);
        continue;
      }
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
  const failures = inspectFiles(root, files, { publish: Boolean(process.argv[2]) });
  if (failures.length) {
    console.error('Private exposure verification failed:\n' + failures.join('\n'));
    process.exitCode = 1;
  } else console.log(`Private exposure verification passed (${files.length} paths checked).`);
}

module.exports = { inspectFiles, privatePath, publishForbidden };
