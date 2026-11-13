// Decide whether tailscale funnel may publish the relay. Cue and projector
// ports are never a funnel target. A public share also requires a passcode
// on the installed service or the running relay, not merely in this shell.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const BLOCKED_FUNNEL_PORTS = new Set([9000, 9001, 4352, 1024, 9090]);

export function passcodeFromPlist(text) {
  if (typeof text !== 'string' || !text.includes('<key>EnvironmentVariables</key>')) return '';
  const block = text.split('<key>EnvironmentVariables</key>')[1] || '';
  for (const key of ['PROJCTL_PASSWORD', 'PJ_PASSCODE']) {
    const match = block.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
    if (match && match[1].trim()) return match[1].trim();
  }
  return '';
}

export function funnelDecision({ port = 8080, plist = '', health = null, env = {} } = {}) {
  const number = Number(port);
  if (!Number.isInteger(number) || number < 1 || number > 65535) return { ok: false, reason: 'Invalid port.' };
  if (BLOCKED_FUNNEL_PORTS.has(number)) return { ok: false, reason: `Port ${number} is a cue or projector port and must not be published.` };
  if (health && health.login === 'passcode') return { ok: true, reason: 'Relay reports passcode login.' };
  if (health && health.login === 'open') return { ok: false, reason: 'The running relay has no passcode. Refusing to publish it.' };
  if (passcodeFromPlist(plist)) return { ok: true, reason: 'Installed service has a passcode.' };
  if (String(env.PROJCTL_PASSWORD || env.PJ_PASSCODE || '').trim()) return { ok: true, reason: 'Passcode is set in this environment.' };
  return { ok: false, reason: 'No passcode on the installed service, the running relay, or this environment. Refusing to publish.' };
}

function installedPlist() {
  const file = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.avbydave.projctl.plist');
  if (!fs.existsSync(file)) return '';
  try { return execFileSync('plutil', ['-convert', 'xml1', '-o', '-', file], { encoding: 'utf8' }); }
  catch { return fs.readFileSync(file, 'utf8'); }
}

async function runningHealth(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const port = Number(process.argv[2] || 8080);
  const decision = funnelDecision({ port, plist: installedPlist(), health: await runningHealth(port), env: process.env });
  if (!decision.ok) { console.error(decision.reason); process.exit(1); }
  console.log(decision.reason);
}
