#!/usr/bin/env node
// Cutover helper for scripts/domain-sites.json: rewrites absolute
// https://systembydave.com/<path> URLs that name a page or file moving to the
// given site so they name the site's own domain instead (canonical, og:url,
// structured data and cross-site links). Relative links are left alone: links
// between pages that moved together keep working, and systembydave.com pages
// keep linking to the old paths, whose redirect stubs offer the data move.
//
//   node scripts/domain_cutover_rewrite.mjs --site avbydave           # dry run
//   node scripts/domain_cutover_rewrite.mjs --site avbydave --write
//
// Generated and managed files are reported, not edited: change their source
// (apps/av-workbook/, the fmpwalk exporter) and regenerate them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_FILE, read, loadRegistry, siteEntries, routeFor } from './stage_domain_sites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', '_site', '_sites', 'docs', 'scripts']);
// Generated or managed: change the source and regenerate (sitemap.xml via gen_sitemap.py).
const MANAGED = ['av-workbook/', 'fmp/', 'fmpwalk/', 'noteforge/', 'sitemap.xml'];
const TEXT = /\.(?:html?|js|mjs|json|xml|webmanifest|css|txt)$/i;
const SOURCE_URL = /https:\/\/(?:www\.)?systembydave\.com\/([^"'\\\s<>)\]]*)/g;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--site') args.site = argv[++i];
    else if (argv[i] === '--write') args.write = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.site) throw new Error('Pass --site <id> from scripts/domain-sites.json.');
  return args;
}

function walk(dir, prefix, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) walk(path.join(dir, entry.name), `${rel}/`, out);
    else if (entry.isFile() && TEXT.test(entry.name)) out.push(rel);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const config = JSON.parse(read(CONFIG_FILE));
const site = config.sites.find((item) => item.id === args.site);
if (!site) throw new Error(`Unknown site ${args.site}.`);
const entries = siteEntries(site, loadRegistry());
const moved = new Set();
for (const file of entries.pages) {
  moved.add(file);
  moved.add(routeFor(file));
}

const changes = [];
const managed = [];
for (const file of walk(ROOT, '', [])) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let count = 0;
  const next = text.replace(SOURCE_URL, (url, rest) => {
    const pathname = rest.split(/[?#]/)[0];
    let decoded = pathname;
    try { decoded = decodeURI(pathname); } catch { /* keep the raw path */ }
    if (!moved.has(decoded)) return url;
    count += 1;
    return `https://${site.domain}/${rest}`;
  });
  if (!count) continue;
  if (MANAGED.some((dir) => file.startsWith(dir))) {
    managed.push(`${file} (${count})`);
    continue;
  }
  changes.push(`${file} (${count})`);
  if (args.write) fs.writeFileSync(path.join(ROOT, file), next);
}

console.log(`${args.write ? 'Rewrote' : 'Would rewrite'} ${changes.length} files for ${site.domain}:`);
changes.forEach((line) => console.log(`  ${line}`));
if (managed.length) {
  console.log('Generated or managed files to change at their source, then regenerate:');
  managed.forEach((line) => console.log(`  ${line}`));
}
