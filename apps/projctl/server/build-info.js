// Version shown in /api/health and the controller header. An install writes
// build-info.json; a checkout without that file falls back to package.json and git.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function readBuildInfo({ root, env = process.env } = {}) {
  let version = '0.0.0';
  try { version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || version; } catch { /* keep fallback */ }
  let stamped = {};
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
    if (raw && typeof raw === 'object') stamped = raw;
  } catch { /* not installed from a stamped package */ }
  let commit = env.PROJCTL_COMMIT || stamped.commit || '';
  let builtAt = env.PROJCTL_BUILD_TIME || stamped.builtAt || '';
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: root, timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch { commit = ''; }
  }
  return {
    version: typeof stamped.version === 'string' && stamped.version ? stamped.version : version,
    commit: commit || null,
    builtAt: builtAt || null,
  };
}
