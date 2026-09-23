#!/usr/bin/env node
// Verifies the FMP Camera Simulator release log (apps/fmp-camera-sim/CHANGELOG.md):
//   - the log is well formed, newest entry first;
//   - the committed build (camera-sim/index.html and the offline file) carries the newest version
//     and the fingerprint of the current source;
//   - with --base <ref>, a change to camera-sim/ since <ref> comes with a newer entry than <ref> had.
//
// Usage: node scripts/verify_camera_sim_release.mjs [--base <git ref>]
// The pull-request workflow passes the PR's base commit. Locally, merge main first and pass
// --base origin/main; the comparison includes uncommitted changes.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BUILD_DIR,
  BUILD_PAGES,
  CHANGELOG,
  ROOT,
  VERSION_META,
  checkVersionBump,
  parseChangelog,
  releaseStamp,
  sourceFingerprint,
} from './camera_sim_release.mjs';

const args = process.argv.slice(2);
const baseFlag = args.indexOf('--base');
const base = baseFlag >= 0 ? args[baseFlag + 1] : null;
if (baseFlag >= 0 && !base) {
  console.error('--base needs a git ref, for example --base origin/main.');
  process.exit(2);
}

const problems = [];
const { entries, errors } = parseChangelog(readFileSync(join(ROOT, CHANGELOG), 'utf8'));
problems.push(...errors.map((error) => `${CHANGELOG} ${error}`));
const newest = entries[0];
const build = sourceFingerprint();

if (newest) {
  const expected = releaseStamp({ version: newest.version, build });
  const metaPattern = new RegExp(`<meta name="${VERSION_META}" content="([^"]*)"`);
  for (const page of BUILD_PAGES) {
    const found = metaPattern.exec(readFileSync(join(ROOT, page), 'utf8'))?.[1];
    if (found !== expected) {
      problems.push(`${page} carries ${found ? `stamp ${found}` : 'no version stamp'}, expected ${expected}. Run npm run build:camera-sim and commit camera-sim/.`);
    }
  }
}

let comparison = 'no --base given, so the new-entry rule was not checked';
if (base) {
  const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let changed = null;
  try {
    changed = git('diff', '--name-only', base, '--').split('\n').filter(Boolean);
  } catch (error) {
    problems.push(`cannot compare with ${base}: ${String(error.stderr || error.message).trim().split('\n')[0]}`);
  }
  if (changed) {
    let baseVersion = null;
    try {
      baseVersion = parseChangelog(git('show', `${base}:${CHANGELOG}`)).entries[0]?.version ?? null;
    } catch {
      baseVersion = null; // The base predates the release log.
    }
    problems.push(...checkVersionBump({ changedFiles: changed, baseVersion, headVersion: newest?.version }));
    const shipped = changed.filter((file) => file.startsWith(BUILD_DIR)).length;
    comparison = shipped === 0
      ? `camera-sim/ unchanged since ${base}`
      : `camera-sim/ changed in ${shipped} file(s) since ${base}, ${baseVersion ? `${baseVersion} → ${newest?.version}` : 'where there was no release log yet'}`;
  }
}

if (problems.length) {
  console.error(`FMP Camera Simulator release check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`FMP Camera Simulator ${newest.version} (build ${build}), ${entries.length} release entries; ${comparison}.`);
