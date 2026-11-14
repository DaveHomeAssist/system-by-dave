// Open the supervised relay. Never spawn another relay or restart a healthy one.
import { execFileSync, spawn } from 'node:child_process';
import os from 'node:os';
import { servicePaths } from './service-tools.js';
const paths = servicePaths(os.homedir());
const target = `gui/${process.getuid()}`;
const label = `${target}/com.avbydave.projctl`;
let port = '8080';
try { port = String(JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', paths.plist], { encoding: 'utf8', stdio: 'pipe' })).EnvironmentVariables?.PORT || port); } catch {}
if (!/^\d+$/.test(port)) throw new Error('Invalid service port.');
const url = `http://localhost:${port}/`;
async function healthy() {
  try {
    const r = await fetch(`${url}api/health`, { signal: AbortSignal.timeout(1500) });
    const body = await r.json();
    return r.ok && body.service === 'projctl' && body.ok === true;
  } catch { return false; }
}
try {
  if (!await healthy()) {
    try { execFileSync('launchctl', ['print', label], { stdio: 'ignore' }); }
    catch { execFileSync('launchctl', ['bootstrap', target, paths.plist], { stdio: 'pipe' }); }
    // No -k: a running service must not be killed by opening the controller.
    execFileSync('launchctl', ['kickstart', label], { stdio: 'pipe' });
    const deadline = Date.now() + 20000;
    while (!await healthy()) {
      if (Date.now() > deadline) throw new Error('Relay did not become ready. Open the service log for the startup error.');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  console.log(`Projctl is running: ${url}`);
} catch (error) {
  console.error(error.message);
  console.error(`Service log: ${paths.log}`);
  process.exitCode = 1;
}
