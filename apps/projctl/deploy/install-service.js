// Install a private, supervised macOS runtime with one durable live settings copy.
// Usage: node deploy/install-service.js /absolute/path/to/existing/projctl
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { servicePaths, servicePlist, launcherText, assertSavedRig } from './service-tools.js';

if (process.platform !== 'darwin') throw new Error('This installer requires macOS launchd.');
const existing = fs.realpathSync(process.argv[2] || '');
const source = fs.realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const paths = servicePaths(os.homedir());
const oldData = path.join(existing, 'data');
const data = paths.data;
const rig = path.join(data, 'rig.json');
const sourceRig = fs.existsSync(rig) ? rig : path.join(oldData, 'rig.json');
const original = assertSavedRig(sourceRig);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const before = digest(original);
const uid = process.getuid(), domain = `gui/${uid}`, label = `${domain}/com.avbydave.projctl`;
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...options });
// Preserve any previously installed service environment, including authentication.
let env = {};
if (fs.existsSync(paths.plist)) {
  env = JSON.parse(run('plutil', ['-convert', 'json', '-o', '-', paths.plist])).EnvironmentVariables || {};
}
if (Object.hasOwn(process.env, 'PJ_PASSCODE')) env.PJ_PASSCODE = process.env.PJ_PASSCODE;
const port = process.env.PROJCTL_PORT || env.PORT || '8080';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid relay port.');
const url = `http://localhost:${port}`;
Object.assign(env, { PORT: port, SIM: '0', RIG: rig, STAGE_PLOT: path.join(data, 'stage-plot.json'), VENUE_MODEL: path.join(data, 'venue') });
// Identify the listener before touching the service. Refuse unrelated processes.
let pids = [];
try { pids = run('lsof', ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN']).trim().split(/\s+/).filter(Boolean); } catch {}
for (const pid of pids) {
  const command = run('ps', ['-p', pid, '-o', 'command=']).trim();
  if (![path.join(existing, 'server/index.js'), path.join(paths.app, 'server/index.js')].some(p => command.endsWith(p))) throw new Error('The relay port belongs to another application. No changes made.');
}
if (pids.length && !fs.existsSync(paths.plist) && !Object.hasOwn(process.env, 'PJ_PASSCODE')) {
  const response = await fetch(`${url}/api/state`, { signal: AbortSignal.timeout(3000) });
  if (response.status === 401) throw new Error('Existing relay requires login but has no saved service configuration. Preserve its PJ_PASSCODE before installing.');
}
const next = path.join(paths.root, `app-next-${process.pid}`);
fs.mkdirSync(paths.root, { recursive: true, mode: 0o700 });
fs.mkdirSync(next);
for (const name of ['server', 'public', 'runtime', 'scripts', 'docs', 'deploy', 'package.json', 'package-lock.json', 'README.md', 'node_modules']) {
  const from = path.join(source, name);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(next, name), { recursive: true });
}
if (!fs.existsSync(path.join(next, 'node_modules/ws'))) throw new Error('Run npm ci --omit=dev in the source app first.');
if (!fs.existsSync(path.join(next, 'runtime/throwline/three-d-stage.js'))) throw new Error('Run npm run bundle:throwline in the source app first.');
const backup = path.join(paths.root, `backup-${new Date().toISOString().replaceAll(':', '-')}`);
fs.mkdirSync(backup, { mode: 0o700 });
fs.writeFileSync(path.join(backup, 'rig.json'), original, { mode: 0o600 });
// Migrate app settings only on first install. Never merge older settings on update.
if (!fs.existsSync(rig)) {
  const stagedData = path.join(paths.root, `data-next-${process.pid}`);
  fs.mkdirSync(stagedData, { mode: 0o700 });
  for (const name of ['rig.json', 'stage-plot.json', 'venue']) {
    const from = path.join(oldData, name);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(stagedData, name), { recursive: true });
  }
  if (digest(fs.readFileSync(path.join(stagedData, 'rig.json'))) !== before) throw new Error('Rig copy verification failed. Original preserved.');
  fs.renameSync(stagedData, data);
}
if (fs.existsSync(paths.plist)) fs.copyFileSync(paths.plist, path.join(backup, 'service.plist'));
// Only stop the verified relay after staging and backing up everything needed.
try { run('launchctl', ['bootout', label]); } catch {}
for (const pid of pids) { try { process.kill(Number(pid), 'SIGTERM'); } catch (e) { if (e.code !== 'ESRCH') throw e; } }
for (let n = 0; n < 40; n++) {
  let occupied = false;
  try { occupied = !!run('lsof', ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN']).trim(); } catch {}
  if (!occupied) break;
  if (n === 39) throw new Error('Old relay did not stop. Staged runtime and backup preserved.');
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (fs.existsSync(paths.app)) fs.renameSync(paths.app, path.join(backup, 'app'));
fs.renameSync(next, paths.app);
fs.mkdirSync(path.dirname(paths.plist), { recursive: true });
fs.writeFileSync(paths.plist, servicePlist({ node: process.execPath, app: paths.app, log: paths.log, env }), { mode: 0o600 });
fs.mkdirSync(path.dirname(paths.launcher), { recursive: true });
fs.writeFileSync(paths.launcher, launcherText({ node: process.execPath, app: paths.app }), { mode: 0o755 });
fs.chmodSync(paths.launcher, 0o755);
if (digest(fs.readFileSync(rig)) !== before) throw new Error('Saved rig changed during installation. Backup preserved; service not started.');
run('launchctl', ['bootstrap', domain, paths.plist]);
let ready = false;
for (let n = 0; n < 60; n++) {
  try { const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) }); const body = await r.json(); ready = r.ok && body.service === 'projctl' && body.ok; } catch {}
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!ready) throw new Error(`Service is installed but not ready. Inspect ${paths.log}. Backup: ${backup}`);
console.log(`Controller: ${url}/\nLauncher: ${paths.launcher}\nRuntime: ${paths.app}\nLive settings: ${data}\nOriginal settings preserved: ${oldData}\nLog: ${paths.log}\nBackup: ${backup}\nSaved rig preserved byte for byte during installation.`);
