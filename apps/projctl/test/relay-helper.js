import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
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

export async function startRelay() {
  const dir = await mkdtemp(path.join(tmpdir(), 'projctl-test-'));
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, SIM: '1', PJ_PASSCODE: '', RIG: path.join(dir, 'rig.json'), PORT: '0', OSC_PORT: '0', TCP_PORT: '0', POLL_MS: '50' },
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
    await until(async () => (await state()).projectors.every((p) => p.status.online));
    return { base, api, state, close, child, udp: Number(log.match(/udp (\d+)/)[1]), tcp: Number(log.match(/\[tcp\] listening (\d+)/)[1]) };
  } catch (e) { await close(); throw e; }
}

export function oscInt(address, value) {
  const padded = (s) => { const b = Buffer.alloc(Math.ceil((Buffer.byteLength(s) + 1) / 4) * 4); b.write(s); return b; };
  const arg = Buffer.alloc(4); arg.writeInt32BE(value);
  return Buffer.concat([padded(address), padded(',i'), arg]);
}
