#!/usr/bin/env node
// Copy the public site into a directory for GitHub Pages.
// The rules live in scripts/pages-publish.filter. The repository keeps its
// docs, scripts, plans, and private pages; this step does not.
//
//   node scripts/stage_public_site.mjs --out _site
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLISH_FILTER = path.join(ROOT, 'scripts/pages-publish.filter');

export function stagePublicSite(outDir, source = ROOT) {
  const destination = path.resolve(outDir);
  const from = path.resolve(source);
  const relative = path.relative(from, destination);
  const insideRepo = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  if (insideRepo && relative !== '_site' && !relative.startsWith(`_site${path.sep}`)) {
    throw new Error(`Refusing to stage into ${destination}. Use _site or a directory outside the repository.`);
  }
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  execFileSync('rsync', ['-a', `--filter=merge ${PUBLISH_FILTER}`, `${from}/`, `${destination}/`], { stdio: 'inherit' });
  return destination;
}

function fileCount(dir) {
  let count = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(current, entry.name));
      else if (entry.isFile()) count += 1;
    }
  };
  walk(dir);
  return count;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outFlag = process.argv.indexOf('--out');
  const out = outFlag >= 0 ? process.argv[outFlag + 1] : path.join(ROOT, '_site');
  if (!out) throw new Error('--out needs a directory.');
  const destination = stagePublicSite(out);
  console.log(`Staged ${fileCount(destination)} files in ${destination}.`);
}
