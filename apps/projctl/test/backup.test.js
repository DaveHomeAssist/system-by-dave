import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test('private backup handles spaces, preserves scheduling state and never prunes unrelated folders', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'projctl backup '));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const data = path.join(root, 'live data'), output = path.join(root, 'backup copies');
  await fs.mkdir(data); await fs.mkdir(output);
  const payloads = { 'rig.json': JSON.stringify({ projectors: [{ password: 'fixture secret' }], presets: [], events: [] }), 'power-schedules.json': '{"schedules":[]}', 'stage-plot.json': '{"plot":"saved"}', 'power-schedules.json.claims/used.json': '{"claimed":true}' };
  for (const [name, bytes] of Object.entries(payloads)) { await fs.mkdir(path.dirname(path.join(data, name)), { recursive: true }); await fs.writeFile(path.join(data, name), bytes); }
  for (let i = 0; i < 32; i++) await fs.mkdir(path.join(output, `unrelated ${i}`));
  const run = () => execFileSync('bash', ['deploy/backup.sh', output], { env: { ...process.env, PROJCTL_DATA: data }, encoding: 'utf8' });
  const message = run(); assert.doesNotMatch(message, /fixture secret/);
  const entries = await fs.readdir(output), snapshot = entries.find(n => n.startsWith('projctl-'));
  assert.equal(entries.filter(n => n.startsWith('unrelated')).length, 32);
  const manifest = JSON.parse(await fs.readFile(path.join(output, snapshot, 'BACKUP.json')));
  for (const [name, bytes] of Object.entries(payloads)) {
    const file = path.join(output, snapshot, name);
    assert.equal(await fs.readFile(file, 'utf8'), bytes);
    assert.equal(manifest.files[name], createHash('sha256').update(bytes).digest('hex'));
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  }
  run(); assert.equal((await fs.readdir(output)).filter(n => n.startsWith('projctl-')).length, 2, 'same-second backups do not overwrite');
  await fs.writeFile(path.join(data, 'rig.json'), '{broken');
  assert.throws(run);
  assert.equal((await fs.readdir(output)).filter(n => n.startsWith('projctl-')).length, 2);
});
