import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { RELEASE } from '../public/release.js';

// A transportable test receipt for a future monitoring dashboard. It never polls
// the controller and never upgrades software checks into deployment acceptance.
export function testReport({ results, sourceCommit, runner, finishedAt = new Date().toISOString() }) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || '')) throw new Error('A full source commit is required');
  if (!Array.isArray(results) || !results.length) throw new Error('At least one check is required');
  if (!runner || !Number.isFinite(Date.parse(finishedAt))) throw new Error('Runner and finish time are required');
  const names = new Set();
  const checks = results.map(result => {
    if (!result.name || names.has(result.name)) throw new Error('Check names must be unique');
    names.add(result.name);
    if (!Number.isInteger(result.code) || result.code < 0 || !Number.isFinite(result.seconds) || result.seconds < 0) throw new Error('Invalid check result');
    return { name: result.name, outcome: result.code === 0 ? 'passed' : result.code === 124 ? 'timed-out' : 'failed', exitCode: result.code, durationSeconds: result.seconds };
  });
  return {
    schema: 'projctl.test-report.v1', release: RELEASE, sourceCommit, runner, finishedAt,
    environment: 'isolated-simulation', testStatus: checks.every(check => check.outcome === 'passed') ? 'passed' : 'failed', checks,
    acceptance: { installedVersion: 'unverified', liveReadback: 'unverified', physicalOutput: 'unverified', humanJourney: 'unverified' },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, sourceCommit, runner] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node scripts/test-report.js results.json report.json FULL_COMMIT RUNNER_LABEL');
  const report = testReport({ results: JSON.parse(await fs.readFile(input, 'utf8')), sourceCommit, runner });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(`Recorded ${report.checks.length} checks: ${report.testStatus}. Deployment and physical acceptance remain unverified.`);
}
