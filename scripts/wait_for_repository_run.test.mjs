import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waitForHeadRun } from './wait_for_repository_run.mjs';

const sha = 'c'.repeat(40);

function runs(workflowRuns, status = 200) {
  return new Response(JSON.stringify({ workflow_runs: workflowRuns }), { status, headers: { 'content-type': 'application/json' } });
}

test('waits until the Pages run for that commit succeeds, including a run that has not appeared yet', async () => {
  const calls = [];
  let now = 0;
  const fetchImpl = async (url, options) => {
    calls.push({ url, auth: options.headers.Authorization || '' });
    if (calls.length === 1) return runs([]);
    if (calls.length === 2) return runs([{ name: 'Deploy Pages', head_sha: sha, status: 'in_progress', conclusion: null }]);
    return runs([{ name: 'Deploy Pages', head_sha: sha, status: 'completed', conclusion: 'success', html_url: 'https://example.test/run' }]);
  };
  const result = await waitForHeadRun({
    repo: 'example/walk', sha, fetchImpl, token: 'job-token',
    sleep: async ms => { now += ms; }, now: () => now, log() {}, timeoutMs: 60000, intervalMs: 5000
  });
  assert.equal(result.conclusion, 'success');
  assert.equal(calls.length, 3);
  assert.match(calls[0].auth, /job-token/);
  assert.equal(now, 10000);
});

test('a failed destination deployment fails the publish', async () => {
  const fetchImpl = async () => runs([{ name: 'Deploy Pages', head_sha: sha, status: 'completed', conclusion: 'failure' }]);
  await assert.rejects(waitForHeadRun({
    repo: 'example/walk', sha, fetchImpl, sleep: async () => {}, now: () => 0, log() {}, timeoutMs: 1000
  }), /failure/);
});

test('a job token that cannot see the other repository falls back to the public run list', async () => {
  const authorizations = [];
  const fetchImpl = async (url, options) => {
    authorizations.push(options.headers.Authorization || '');
    if (options.headers.Authorization) return new Response('no', { status: 404 });
    return runs([{ name: 'Deploy Pages', head_sha: sha, status: 'completed', conclusion: 'success' }]);
  };
  const result = await waitForHeadRun({
    repo: 'example/walk', sha, fetchImpl, token: 'job-token', sleep: async () => {}, now: () => 0, log() {}
  });
  assert.equal(result.conclusion, 'success');
  assert.deepEqual(authorizations, ['Bearer job-token', '']);
});

test('an in-progress run of the same commit is not treated as done', async () => {
  let now = 0;
  let reads = 0;
  const fetchImpl = async () => {
    reads += 1;
    if (reads < 3) {
      return runs([
        { name: 'Deploy Pages', head_sha: sha, status: 'completed', conclusion: 'success' },
        { name: 'Deploy Pages', head_sha: sha, status: 'in_progress', conclusion: null }
      ]);
    }
    return runs([{ name: 'Deploy Pages', head_sha: sha, status: 'completed', conclusion: 'success' }]);
  };
  await waitForHeadRun({
    repo: 'example/walk', sha, fetchImpl, sleep: async ms => { now += ms; }, now: () => now, log() {}, timeoutMs: 60000, intervalMs: 5000
  });
  assert.equal(reads, 3);
});
