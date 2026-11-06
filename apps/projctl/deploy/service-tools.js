// macOS service helpers. Importing this module never changes the machine.
import fs from 'node:fs';
import path from 'node:path';

export function servicePaths(home) {
  const root = path.join(home, 'Library', 'Application Support', 'Projctl');
  return { root, app: path.join(root, 'app'), data: path.join(root, 'data'), log: path.join(root, 'relay.log'),
    plist: path.join(home, 'Library', 'LaunchAgents', 'com.avbydave.projctl.plist'),
    launcher: path.join(home, 'Applications', 'Open Projctl.command') };
}
// Preserve existing private configuration unless an operator explicitly supplies
// one password variable. A new choice replaces the alias, avoiding two authorities.
export function withAuthEnvironment(previous, supplied) {
  const next = { ...previous };
  const key = Object.hasOwn(supplied, 'PROJCTL_PASSWORD') ? 'PROJCTL_PASSWORD' : Object.hasOwn(supplied, 'PJ_PASSCODE') ? 'PJ_PASSCODE' : null;
  if (key) {
    delete next.PROJCTL_PASSWORD; delete next.PJ_PASSCODE;
    next[key] = supplied[key];
  }
  return next;
}
export function xml(value) { return String(value).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }
export function servicePlist({ node, app, log, env }) {
  const pair = (k, v) => `<key>${xml(k)}</key><string>${xml(v)}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
${pair('Label', 'com.avbydave.projctl')}
<key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(path.join(app, 'server/index.js'))}</string></array>
${pair('WorkingDirectory', app)}
<key>EnvironmentVariables</key><dict>${Object.entries(env).map(([k, v]) => pair(k, v)).join('')}</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>5</integer>
${pair('StandardOutPath', log)}${pair('StandardErrorPath', log)}
</dict></plist>\n`;
}
export function assertSavedRig(file) {
  const bytes = fs.readFileSync(file);
  let rig;
  try { rig = JSON.parse(bytes); } catch { throw new Error('Saved rig is invalid JSON; no installation changes made.'); }
  if (!rig || !Array.isArray(rig.projectors) || !Array.isArray(rig.presets) || !Array.isArray(rig.events)) throw new Error('Invalid saved rig; no installation changes made.');
  return bytes;
}
export function launcherText({ node, app }) {
  // JSON string syntax is not shell quoting. Single-quote the actual path.
  const quote = s => "'" + s.replaceAll("'", "'\\''") + "'";
  return `#!/bin/bash\nexec ${quote(node)} ${quote(path.join(app, 'deploy/open-service.js'))}\n`;
}

// Stage code/dependencies first; snapshot settings only after the writer is stopped.
export async function snapshotSettingsAfterStop({ sourceData, data, backup, stop }) {
  await stop();
  const original = assertSavedRig(path.join(sourceData, 'rig.json'));
  fs.writeFileSync(path.join(backup, 'rig.json'), original, { mode: 0o600 });
  if (!fs.existsSync(path.join(data, 'rig.json'))) {
    const staged = path.join(path.dirname(data), `data-next-${process.pid}`);
    fs.mkdirSync(staged, { mode: 0o700 });
    for (const name of ['rig.json', 'stage-plot.json', 'venue']) {
      const from = path.join(sourceData, name);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(staged, name), { recursive: true });
    }
    if (!fs.readFileSync(path.join(staged, 'rig.json')).equals(original)) throw new Error('Rig copy verification failed. Original preserved.');
    fs.renameSync(staged, data);
  }
  return original;
}
