#!/usr/bin/env node
// Wait until the destination repository's Pages workflow for this push has
// finished. publish_domain_site.sh calls this before anything reads the live
// site: a read during the deploy caches the previous release.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PAGE_WORKFLOW = 'Deploy Pages';

export async function waitForHeadRun({
  repo, sha, fetchImpl = fetch, token = '', sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  now = Date.now, log = console.log, timeoutMs = 180000, intervalMs = 5000
} = {}) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo || '')) throw new Error('A repository owner/name is required');
  if (!/^[0-9a-f]{40}$/.test(sha || '')) throw new Error('A full destination commit is required');
  const deadline = now() + timeoutMs;
  let anonymous = !token;
  for (;;) {
    const url = `https://api.github.com/repos/${repo}/actions/runs?head_sha=${sha}&per_page=20&_=${now()}`;
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (!anonymous) headers.Authorization = `Bearer ${token}`;
    const response = await fetchImpl(url, { headers, redirect: 'error' });
    if (!anonymous && (response.status === 401 || response.status === 403 || response.status === 404)) {
      anonymous = true;
      log(`Actions API declined the job token for ${repo}; reading the public run list.`);
      continue;
    }
    if (response.status === 202 || response.status === 429) {
      if (now() >= deadline) throw new Error(`Timed out waiting for ${repo} @ ${sha.slice(0, 12)} to start a Pages deployment`);
      await sleep(intervalMs);
      continue;
    }
    if (!response.ok) throw new Error(`Could not read Actions runs for ${repo}: HTTP ${response.status}`);
    const body = await response.json();
    const runs = (body.workflow_runs || []).filter(run => run.head_sha === sha);
    const named = runs.filter(run => run.name === PAGE_WORKFLOW);
    const relevant = named.length ? named : runs;
    const pending = relevant.filter(run => run.status !== 'completed');
    const failed = relevant.find(run => run.status === 'completed' && run.conclusion !== 'success');
    if (failed) throw new Error(`${repo} ${failed.name || PAGE_WORKFLOW} for ${sha.slice(0, 12)} ${failed.conclusion}`);
    if (relevant.some(run => run.status === 'completed' && run.conclusion === 'success') && pending.length === 0) {
      log(`Destination ${repo} @ ${sha.slice(0, 12)} Pages deployment succeeded.`);
      return relevant.find(run => run.conclusion === 'success');
    }
    if (now() >= deadline) {
      const detail = relevant.length ? relevant.map(run => `${run.name}:${run.status}`).join(', ') : 'no run yet';
      throw new Error(`Timed out waiting for ${repo} @ ${sha.slice(0, 12)} Pages deployment (${detail})`);
    }
    log(`Waiting for ${repo} @ ${sha.slice(0, 12)} Pages deployment${pending[0] ? ` (${pending[0].status})` : ''}.`);
    await sleep(intervalMs);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [repo, sha] = process.argv.slice(2);
  waitForHeadRun({ repo, sha, token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '' })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
