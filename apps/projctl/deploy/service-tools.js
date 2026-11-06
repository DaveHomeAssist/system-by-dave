// macOS service helpers. Importing this module never changes the machine.
import fs from 'node:fs';
import path from 'node:path';

export function servicePaths(home) {
  const root = path.join(home, 'Library', 'Application Support', 'Projctl');
  return { root, app: path.join(root, 'app'), data: path.join(root, 'data'), log: path.join(root, 'relay.log'),
    plist: path.join(home, 'Library', 'LaunchAgents', 'com.avbydave.projctl.plist'),
    launcher: path.join(home, 'Applications', 'Open Projctl.command') };
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
