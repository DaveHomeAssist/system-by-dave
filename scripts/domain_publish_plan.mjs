#!/usr/bin/env node
// Decide whether a staged domain site needs a push to its destination repository.
//
// Every destination (housevideo.app, walk.housevideo.app, avbydave.com) lives in its own
// repository, and every push to it starts that repository's own Pages deploy. The staged
// source.json carries the source commit, so it differs on every run; comparing whole trees
// therefore always found a change and every push to this repository redeployed every
// destination, even when the push touched none of that site's pages. docs/domain-sites.md
// has always said unchanged content produces no commit. This helper makes that true:
//
//   publish     the site's files differ from the destination repository.
//   skip        only source.json differs, and the live site already serves this content.
//   republish   only source.json differs (or nothing does), but the live site does not serve
//               this content, so the destination's last Pages deploy did not land. Push the
//               new source.json (an empty commit when nothing differs) to start another.
//
// Usage: node scripts/domain_publish_plan.mjs <staged directory> <destination worktree>
// Prints "<action><TAB><reason>". Run it after `git add -A` in the destination worktree.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROVENANCE = 'source.json';
const short = (digest) => String(digest || '').slice(0, 12);

export function planPublish({ staged, changed, live }) {
  const content = changed.filter((file) => file !== PROVENANCE);
  if (content.length) {
    return { action: 'publish', reason: `${content.length} file${content.length === 1 ? '' : 's'} changed` };
  }
  if (live && live.artifactSha256 === staged.artifactSha256) {
    return { action: 'skip', reason: `${staged.domain} already serves content ${short(staged.artifactSha256)}` };
  }
  return {
    action: 'republish',
    reason: live
      ? `${staged.domain} serves content ${short(live.artifactSha256)}, not ${short(staged.artifactSha256)}; its last Pages deploy did not land`
      : `${staged.domain} could not be read, so its last Pages deploy is unconfirmed`
  };
}

// The live site's provenance, or null when it cannot be read (a failed read must never skip a push).
export async function readLive(domain, { fetchImpl = fetch, now = Date.now } = {}) {
  try {
    const response = await fetchImpl(`https://${domain}/${PROVENANCE}?plan=${now()}`, {
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    if (response.status !== 200) return null;
    const body = await response.json();
    return typeof body?.artifactSha256 === 'string' ? body : null;
  } catch {
    return null;
  }
}

export function changedFiles(worktree) {
  const out = execFileSync('git', ['-C', worktree, 'diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

async function main() {
  const [stagedDir, worktree] = process.argv.slice(2);
  if (!stagedDir || !worktree) {
    console.error('Usage: domain_publish_plan.mjs <staged directory> <destination worktree>');
    process.exit(2);
  }
  const staged = JSON.parse(fs.readFileSync(path.join(stagedDir, PROVENANCE), 'utf8'));
  const changed = changedFiles(worktree);
  // Only look at the live site when the content matches; a content change publishes regardless.
  const needsLive = changed.every((file) => file === PROVENANCE);
  const live = needsLive ? await readLive(staged.domain) : null;
  const plan = planPublish({ staged, changed, live });
  process.stdout.write(`${plan.action}\t${plan.reason}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
