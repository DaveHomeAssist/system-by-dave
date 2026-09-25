#!/usr/bin/env node
// Keep the previous release's hashed assets for one more deploy.
//
// A tab that loaded an app's index.html shortly before a deploy (the HTML is
// cached for a few minutes) still points at the old hashed files. The publish
// step mirrors the staged site with `rsync --delete`, so without this those
// files 404 and the app never starts. Vite's hashed names never collide, so
// restoring them is safe.
//
//   node scripts/domain_keep_previous_assets.mjs <previous-site> <new-site> <app-dir>...
//   node scripts/domain_keep_previous_assets.mjs --apps <site-id>
//
// --apps prints the site's keepPreviousAssets list from scripts/domain-sites.json.
//
// <previous-site> is a copy of the target repository before the mirror,
// <new-site> is the target after it. For each <app-dir> (e.g. camera-sim), the
// files under <app-dir>/assets/ that the previous <app-dir>/index.html used,
// directly or through other assets, are copied back when the new release lacks
// them. Anything the previous release did not reference (including files it
// had itself kept from the release before) is not restored, so at most one
// older release is ever kept.
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TEXT = /\.(?:js|mjs|css|html|json|map)$/i;

/** Names of files in `assetsDir` that `entryText` uses, followed through text assets. */
export function referencedAssets(entryText, assetsDir) {
  if (!existsSync(assetsDir)) return [];
  const names = readdirSync(assetsDir).filter((name) => statSync(join(assetsDir, name)).isFile());
  const used = new Set();
  const queue = [entryText];
  while (queue.length) {
    const text = queue.shift();
    for (const name of names) {
      if (used.has(name) || !text.includes(name)) continue;
      used.add(name);
      if (TEXT.test(name)) queue.push(readFileSync(join(assetsDir, name), 'utf8'));
    }
  }
  return [...used].sort();
}

/** Restore the previous release's assets for one app. Returns the names restored. */
export function keepPreviousAssets(previousSite, newSite, appDir) {
  const previousIndex = join(previousSite, appDir, 'index.html');
  const newAssets = join(newSite, appDir, 'assets');
  if (!existsSync(previousIndex) || !existsSync(newAssets)) return [];
  const previousAssets = join(previousSite, appDir, 'assets');
  const restored = [];
  for (const name of referencedAssets(readFileSync(previousIndex, 'utf8'), previousAssets)) {
    const target = join(newAssets, name);
    if (existsSync(target)) continue;
    copyFileSync(join(previousAssets, name), target);
    restored.push(name);
  }
  return restored;
}

/** The app directories a site keeps previous assets for (domain-sites.json keepPreviousAssets). */
export function appsForSite(siteId, configPath = join(dirname(fileURLToPath(import.meta.url)), 'domain-sites.json')) {
  const site = JSON.parse(readFileSync(configPath, 'utf8')).sites.find((entry) => entry.id === siteId);
  if (!site) throw new Error(`no site ${siteId} in ${configPath}`);
  const apps = site.keepPreviousAssets || [];
  for (const app of apps) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(app)) throw new Error(`${siteId} keepPreviousAssets has a bad directory: ${app}`);
  }
  return apps;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] === '--apps') {
    console.log(appsForSite(process.argv[3]).join(' '));
    process.exit(0);
  }
  const [previousSite, newSite, ...apps] = process.argv.slice(2);
  if (!previousSite || !newSite || apps.length === 0) {
    console.error('usage: domain_keep_previous_assets.mjs <previous-site> <new-site> <app-dir>...');
    process.exit(2);
  }
  for (const app of apps) {
    const restored = keepPreviousAssets(previousSite, newSite, app);
    console.log(`${app}: kept ${restored.length} previous asset(s)${restored.length ? `: ${restored.join(', ')}` : ''}`);
  }
}
