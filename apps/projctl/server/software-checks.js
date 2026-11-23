import fs from 'node:fs/promises';

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const label = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
async function readSmallJson(file) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.size > 262144) throw new Error('Invalid report file');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

// Local release records are evidence about software, never about equipment state.
export async function readSoftwareChecks(reportFile, deliveryFile, release, now = Date.now()) {
  let report;
  try { report = await readSmallJson(reportFile); }
  catch (error) { return { state: error.code === 'ENOENT' ? 'absent' : 'invalid' }; }
  if (report?.schema !== 'projctl.test-report.v1' || report.environment !== 'isolated-simulation'
    || !sha(report.sourceCommit) || !label(report.release?.name) || !label(report.release?.version)
    || !Number.isFinite(Date.parse(report.finishedAt)) || Date.parse(report.finishedAt) > now + 60000
    || !Array.isArray(report.checks) || !report.checks.length || report.checks.length > 500) return { state: 'invalid' };
  const names = new Set(), checks = [];
  for (const check of report.checks) {
    if (!label(check?.name) || names.has(check.name) || !Number.isInteger(check.exitCode) || check.exitCode < 0
      || !Number.isFinite(check.durationSeconds) || check.durationSeconds < 0) return { state: 'invalid' };
    names.add(check.name);
    const outcome = check.exitCode === 0 ? 'passed' : check.exitCode === 124 ? 'timed-out' : 'failed';
    if (check.outcome !== outcome) return { state: 'invalid' };
    checks.push({ name: check.name, outcome });
  }
  let installed;
  try { installed = await readSmallJson(deliveryFile); } catch { /* A source checkout has no delivery manifest. */ }
  const matching = sha(installed?.sourceCommit) && installed.sourceCommit === report.sourceCommit
    && release.name === report.release.name && release.version === report.release.version;
  return { state: matching ? 'matched' : sha(installed?.sourceCommit) ? 'different' : 'recorded',
    release: { name: report.release.name, version: report.release.version }, sourceCommit: report.sourceCommit,
    finishedAt: new Date(report.finishedAt).toISOString(), passed: checks.every(check => check.outcome === 'passed'), checks };
}
