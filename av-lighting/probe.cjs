// Preserve the documented entry point; the native probe serves the built app over HTTP.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const result = spawnSync(process.execPath, [resolve(__dirname, '../scripts/probe_av_lighting_console.mjs')], { stdio: 'inherit', env: { ...process.env, ...(process.env.PLAYWRIGHT_CHROME_CHANNEL ? { CHROME_CHANNEL: process.env.PLAYWRIGHT_CHROME_CHANNEL } : {}), ...(process.env.PROBE_OUTPUT_DIR ? { LIGHTING_OUTPUT: process.env.PROBE_OUTPUT_DIR } : {}) } });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
