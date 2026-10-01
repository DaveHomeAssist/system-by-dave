#!/usr/bin/env node
// Copies the Philly Cheesesteak Heatmap static export into cheesesteaks/.
// The export is built in the private DaveHomeAssist/philly-cheesesteak-heatmap
// repository with `npm run build:static` (basePath /cheesesteaks). Usage:
//   npm run sync:cheesesteaks -- ~/Code/philly-cheesesteak-heatmap
// GitHub Pages serves only the site's root 404.html, so the export's own
// not-found pages are dropped. Do not hand-edit cheesesteaks/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] ?? '');
const out = path.join(source, 'out');
if (!process.argv[2] || !fs.existsSync(path.join(out, 'index.html'))) {
  console.error('Usage: npm run sync:cheesesteaks -- <philly-cheesesteak-heatmap checkout with a built out/>');
  process.exit(1);
}
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (!html.includes('/cheesesteaks/_next/')) {
  console.error('out/ was not built with basePath /cheesesteaks; run `npm run build:static` first.');
  process.exit(1);
}
const target = path.join(ROOT, 'cheesesteaks');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(out, target, { recursive: true });
for (const extra of ['404.html', '404', '_not-found']) fs.rmSync(path.join(target, extra), { recursive: true, force: true });
const sha = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(target, 'SOURCE.txt'), `philly-cheesesteak-heatmap ${sha}\n`);
console.log(`Synced cheesesteaks/ from philly-cheesesteak-heatmap ${sha.slice(0, 7)}.`);
