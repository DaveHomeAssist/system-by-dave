import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startRelay, until } from './relay-helper.js';

const off = { slot: 'all', cmd: 'power', arg: 0 };
const reports = async (relay) => (await relay.api('health-reports')).body;

test('relay writes power-on, manual and power-off health reports without holding the off command', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PROJCTL_HEALTH_POWER_ON_DELAY_MS: '300' }); t.after(relay.close);
  const dir = path.join(path.dirname(relay.rigFile), 'health-reports');
  let view = await reports(relay);
  assert.equal(view.engine.state, 'running');
  assert.equal(view.engine.notion.databaseConfigured, false);
  assert.deepEqual(view.reports, []);

  await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
  await until(async () => (await reports(relay)).reports.some((r) => r.kind === 'power-on'));

  const manual = (await relay.api('health-reports/run', {})).body.report;
  assert.equal(manual.kind, 'manual');
  assert.deepEqual(manual.counts, { units: 4, reached: 4, flagged: 0, watch: 0, unreachable: 0 });
  assert.match(manual.findings, /^No overheating: 0 of 4 units flagged/);
  assert.equal(manual.notion.state, 'local-only');

  const first = (await relay.api('command', off)).body;
  const second = (await relay.api('command', { ...off, confirm: first.all.confirm })).body;
  for (const s of first.all.targets) assert.equal(second[s].result, 'OK');
  await until(async () => (await reports(relay)).reports.some((r) => r.kind === 'power-off'));
  view = await reports(relay);
  assert.equal(view.reports.filter((r) => r.kind === 'power-off').length, 1, 'one report for the batch');
  assert.equal(view.reports.filter((r) => r.kind === 'power-on').length, 1);

  const files = fs.readdirSync(dir);
  const offJson = files.find((f) => f.endsWith('-power-off.json'));
  assert.ok(files.includes(offJson.replace(/\.json$/, '.md')));
  const report = JSON.parse(fs.readFileSync(path.join(dir, offJson), 'utf8'));
  assert.ok(report.units.every((u) => u.power === 'on' || u.power === 'warming'), 'readings reflect the lit rig');
  assert.ok(report.units.every((u) => u.intakeC === 24 && u.password === undefined));
  assert.match(report.title, /^Projectors \| Health Log \| \d{4}-\d{2}-\d{2} \d{2}:\d{2} \| Power off$/);
  await until(async () => (await relay.state()).projectors.every((p) => p.status.power === 'cooling' || p.status.power === 'off'));
});
