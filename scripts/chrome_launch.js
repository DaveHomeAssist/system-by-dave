'use strict';

/* Start Chrome with a DevTools port for a CDP browser probe.

   A cold CI runner sometimes never opens the port: two Pages deploys failed
   in scripts/probe_av_themes.js that way in November 2026 ("Chrome DevTools
   endpoint did not start"), and each passed when rerun. So a start that does
   not answer, or exits, is killed and tried again on a fresh port and profile.
   When every attempt fails, the error says what happened on each one and what
   Chrome printed, which the single silent attempt never did. */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}

/**
 * @param {object} options
 * @param {string} options.chromeBin Chrome binary.
 * @param {string[]} [options.args] Flags other than the port, profile and start page.
 * @param {string} [options.profilePrefix] Temporary profile directory prefix.
 * @param {number} [options.portBase] First port to choose from.
 * @param {number} [options.portSpan] How many ports to choose from.
 * @param {number} [options.attempts] Starts to try before giving up.
 * @param {number} [options.timeoutMs] How long one start may take to answer.
 * @param {(line: string) => void} [options.log] Receives a line for each failed start and a late success.
 * @returns {Promise<{chrome: import('node:child_process').ChildProcess, port: number, profile: string, version: object, attempt: number}>}
 */
async function launchChrome(options) {
  const {
    chromeBin,
    args = [],
    profilePrefix = 'sbd-chrome-probe-',
    portBase = 9500,
    portSpan = 300,
    attempts = 3,
    timeoutMs = 30000,
    pollMs = 250,
    log = () => {},
    // Replaced in scripts/chrome_launch.test.js.
    spawn = childProcess.spawn,
    fetchVersion = (port) => fetch(`http://127.0.0.1:${port}/json/version`),
    makeProfile = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix)),
    removeProfile = removeDirectory,
    random = Math.random,
    wait = delay
  } = options;

  const problems = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = portBase + Math.floor(random() * portSpan);
    const profile = makeProfile(profilePrefix);
    let said = '';
    let exited = null;
    const chrome = spawn(chromeBin, [
      ...args,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    // Always read stderr so a chatty Chrome never blocks on a full pipe.
    if (chrome.stderr) chrome.stderr.on('data', (chunk) => { said = (said + chunk).slice(-2000); });
    chrome.once('exit', (code, signal) => { exited = `Chrome exited (code ${code}, signal ${signal})`; });
    chrome.once('error', (error) => { exited = `Chrome could not be started (${error.message})`; });

    let version = null;
    for (let waited = 0; waited < timeoutMs && !exited; waited += pollMs) {
      try {
        const response = await fetchVersion(port);
        if (response.ok) { version = await response.json(); break; }
      } catch (error) {
        // Chrome is still starting.
      }
      await wait(pollMs);
    }
    if (version) {
      if (attempt > 1) log(`Chrome started on attempt ${attempt} of ${attempts}.`);
      return { chrome, port, profile, version, attempt };
    }

    const lastLines = said.trim().split('\n').filter(Boolean).slice(-3).join(' | ');
    const problem = `Attempt ${attempt}: ${exited || `no DevTools endpoint on port ${port} after ${Math.round(timeoutMs / 1000)} s`}${lastLines ? `; Chrome said: ${lastLines}` : ''}.`;
    problems.push(problem);
    log(`Chrome did not start. ${problem}`);
    try { chrome.kill('SIGKILL'); } catch (error) { /* already gone */ }
    await wait(pollMs);
    try { removeProfile(profile); } catch (error) { /* a leftover temporary profile must not hide the real failure */ }
  }
  throw new Error(`Chrome DevTools endpoint did not start in ${attempts} attempts. ${problems.join(' ')}`);
}

module.exports = { launchChrome };
