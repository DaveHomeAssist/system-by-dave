import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';

export async function until(fn, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await fn()) return; await delay(30); }
  throw new Error('Timed out waiting for relay state');
}

// files: { name: text } written beside the rig before the relay starts, e.g. health-reports.json.
export async function startRelay(overrides = {}, { files = {} } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'projctl-test-'));
  for (const [name, text] of Object.entries(files)) await writeFile(path.join(dir, path.basename(name)), text);
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, SIM: '1', PJ_PASSCODE: '', PROJCTL_PASSWORD: '', RIG: path.join(dir, 'rig.json'), STAGE_PLOT: path.join(dir, 'stage-plot.json'), VENUE_MODEL: path.join(dir, 'venue'), PORT: '0', OSC_PORT: '0', TCP_PORT: '0', POLL_MS: '50', ...overrides },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (b) => { log += b; });
  child.stderr.on('data', (b) => { log += b; });
  async function close() {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    await rm(dir, { recursive: true, force: true });
  }
  try {
    await until(() => {
      if (child.exitCode !== null) throw new Error(log);
      return /http:\/\/0\.0\.0\.0:\d+/.test(log) && /udp \d+/.test(log) && /\[tcp\] listening \d+/.test(log);
    });
    const base = 'http://127.0.0.1:' + log.match(/http:\/\/0\.0\.0\.0:(\d+)/)[1];
    const api = async (route, data) => {
      const r = await fetch(base + '/api/' + route, data === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      return { status: r.status, body: await r.json() };
    };
    const state = async () => (await api('state')).body;
    if (!overrides.PJ_PASSCODE && !overrides.PROJCTL_PASSWORD) await until(async () => (await state()).projectors.every((p) => p.status.online));
    return { base, api, state, close, child, rigFile: path.join(dir, 'rig.json'), udp: Number(log.match(/udp (\d+)/)[1]), tcp: Number(log.match(/\[tcp\] listening (\d+)/)[1]) };
  } catch (e) { await close(); throw e; }
}

export function oscInt(address, value) {
  const padded = (s) => { const b = Buffer.alloc(Math.ceil((Buffer.byteLength(s) + 1) / 4) * 4); b.write(s); return b; };
  const arg = Buffer.alloc(4); arg.writeInt32BE(value);
  return Buffer.concat([padded(address), padded(',i'), arg]);
}
