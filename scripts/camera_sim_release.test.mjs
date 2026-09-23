// Tests for scripts/camera_sim_release.mjs: the release-log parser, the new-entry rule and the
// source fingerprint. Run with npm run verify:camera-sim-release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CHANGELOG, checkVersionBump, compareVersions, parseChangelog, readRelease, sourceFingerprint } from './camera_sim_release.mjs';

const log = (...entries) => `# Log\n\nIntro text.\n\n${entries.join('\n\n')}\n`;
const entry = (version, date = '2026-09-23', bullets = ['- Changed something.']) =>
  `## ${version} — ${date} — Title ${version}\n\n${bullets.join('\n')}`;

test('reads entries newest first', () => {
  const { entries, errors } = parseChangelog(log(entry('1.2.0'), entry('1.1.0'), entry('1.0.0', '2026-09-22')));
  assert.deepEqual(errors, []);
  assert.deepEqual(entries.map((e) => e.version), ['1.2.0', '1.1.0', '1.0.0']);
  assert.equal(entries[0].title, 'Title 1.2.0');
});

test('rejects malformed headings, missing bullets, wrong order and impossible dates', () => {
  const cases = [
    [log('## 1.2 — 2026-09-23 — Two-part version\n\n- x'), /expected "## <major>/],
    [log(entry('1.0.0', '2026-09-23', ['No bullet here.'])), /needs at least one "- " bullet/],
    [log(entry('1.0.0'), entry('1.1.0')), /must be newer than the entry below it/],
    [log(entry('1.1.0'), entry('1.1.0')), /must be newer than the entry below it/],
    [log(entry('1.1.0', '2026-09-22'), entry('1.0.0', '2026-09-23')), /is dated 2026-09-22, before 1\.0\.0/],
    [log(entry('1.0.0', '2026-02-30')), /is not a real date/],
    ['# Log\n\nNothing yet.\n', /no release entries/],
  ];
  for (const [text, pattern] of cases) {
    const { errors } = parseChangelog(text);
    assert.ok(errors.some((error) => pattern.test(error)), `${pattern} not in ${JSON.stringify(errors)}`);
  }
});

test('compares versions numerically, not as text', () => {
  assert.ok(compareVersions('1.10.0', '1.9.3') > 0);
  assert.ok(compareVersions('2.0.0', '1.99.99') > 0);
  assert.equal(compareVersions('1.5.3', '1.5.3'), 0);
});

test('a change to camera-sim/ needs a newer entry than the base had', () => {
  const shipped = ['camera-sim/index.html', 'apps/fmp-camera-sim/src/ui/App.tsx'];
  assert.equal(checkVersionBump({ changedFiles: shipped, baseVersion: '1.6.0', headVersion: '1.6.0' }).length, 1);
  assert.equal(checkVersionBump({ changedFiles: shipped, baseVersion: '1.6.0', headVersion: '1.5.9' }).length, 1);
  assert.deepEqual(checkVersionBump({ changedFiles: shipped, baseVersion: '1.6.0', headVersion: '1.6.1' }), []);
  // Tests and docs never ship; an unrebuilt source change is caught by the build drift check.
  const unshipped = ['apps/fmp-camera-sim/src/sim/ptz.test.ts', 'docs/fmp-camera-simulator.md'];
  assert.deepEqual(checkVersionBump({ changedFiles: unshipped, baseVersion: '1.6.0', headVersion: '1.6.0' }), []);
  // The change that introduces the log has nothing to compare with.
  assert.deepEqual(checkVersionBump({ changedFiles: shipped, baseVersion: null, headVersion: '1.6.0' }), []);
  assert.match(checkVersionBump({ changedFiles: shipped, baseVersion: '1.6.0', headVersion: '1.6.0' })[0], /Add a "## <major>/);
});

test('the fingerprint follows shipped source, not tests, dotfiles or the log', () => {
  const root = mkdtempSync(join(tmpdir(), 'camera-sim-release-'));
  const write = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  try {
    write('apps/fmp-camera-sim/src/app.ts', 'export const a = 1;\n');
    write('apps/fmp-camera-sim/index.html', '<!doctype html>\n');
    write(CHANGELOG, log(entry('1.0.0')));
    const first = sourceFingerprint(root);
    assert.match(first, /^[0-9a-f]{8}$/);
    write('apps/fmp-camera-sim/src/app.test.ts', 'test("x", () => {});\n');
    write('apps/fmp-camera-sim/src/.DS_Store', 'finder');
    write(CHANGELOG, log(entry('1.0.1'), entry('1.0.0')));
    assert.equal(sourceFingerprint(root), first);
    write('apps/fmp-camera-sim/src/app.ts', 'export const a = 2;\n');
    assert.notEqual(sourceFingerprint(root), first);
    const release = readRelease(root);
    assert.deepEqual({ version: release.version, date: release.date }, { version: '1.0.1', date: '2026-09-23' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the repository's release log is valid", () => {
  assert.match(readRelease().version, /^\d+\.\d+\.\d+$/);
});
