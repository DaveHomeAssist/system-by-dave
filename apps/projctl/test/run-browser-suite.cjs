const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const browserTests = [
  'browser.cjs',
  'reconnect-browser.cjs',
  'stage-planner-browser.cjs',
  'live-menu-browser.cjs',
  'stage-visibility-browser.cjs',
  'workspace-browser.cjs',
  'rig-workspace-browser.cjs',
  'short-viewport-browser.cjs',
  'poll-controls-browser.cjs',
  'card-containment-browser.cjs',
  'lens-workspace-browser.cjs',
  'shutter-feedback-browser.cjs',
  'multiview-browser.cjs',
  'power-schedules-browser.cjs',
  'power-schedules-integration-browser.cjs',
  'power-schedules-audit-browser.cjs',
  'connection-feedback-browser.cjs',
  'adjust-poll-browser.cjs',
  'status-burst-browser.cjs',
  'operator-console-browser.cjs',
  'all-projectors-browser.cjs',
  'anticipatory-browser.cjs',
  'details-controls-browser.cjs',
  'monitor-browser.cjs',
  'monitor-notes-browser.cjs',
  'software-checks-browser.cjs',
  'thermal-browser.cjs',
  'feedback-honesty-browser.cjs',
  'command-progress-browser.cjs',
  'theme-journeys-browser.cjs',
  'dashboard-space-browser.cjs',
  'login-recovery-browser.cjs',
  'show-backup-browser.cjs',
];

const args = process.argv.slice(2);
const listOnly = args.at(-1) === '--list';
if (listOnly) args.pop();

let tests = browserTests;
if (args.length) {
  const shard = args.length === 2 && args[0] === '--shard' && /^([1-9][0-9]*)\/([1-9][0-9]*)$/.exec(args[1]);
  const index = Number(shard?.[1]);
  const total = Number(shard?.[2]);
  if (!shard || index > total || total > browserTests.length) {
    console.error('Use --shard INDEX/TOTAL, with 1 <= INDEX <= TOTAL <= ' + browserTests.length);
    process.exit(1);
  }
  tests = browserTests.filter((_, offset) => offset % total === index - 1);
}

for (const test of tests) {
  if (listOnly) {
    console.log(test);
    continue;
  }
  console.log('Running ' + test);
  const result = spawnSync(process.execPath, [resolve(__dirname, test)], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
