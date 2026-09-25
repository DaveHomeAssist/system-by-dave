// Release metadata for the FMP Camera Simulator.
//
// The newest entry in apps/fmp-camera-sim/CHANGELOG.md is the simulator's version. The Vite build
// embeds it, with a fingerprint of the shipped source, in the page metadata, Help and exported
// projects (apps/fmp-camera-sim/vite.config.ts). scripts/verify_camera_sim_release.mjs checks the
// log's shape, that the committed build carries its newest entry, and that a change to the
// published build adds a new entry.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CHANGELOG = 'apps/fmp-camera-sim/CHANGELOG.md';
export const BUILD_DIR = 'camera-sim/';
export const BUILD_PAGES = ['camera-sim/index.html', 'camera-sim/fmp-camera-simulator-offline.html'];
export const VERSION_META = 'fmp-camera-sim-version';

// Everything that shapes the shipped page except dependencies and the log itself. Tests and
// dotfiles are left out, so a test-only change or a stray .DS_Store never alters the build.
const FINGERPRINT_INPUTS = [
  'apps/fmp-camera-sim/index.html',
  'apps/fmp-camera-sim/vite.config.ts',
  'apps/fmp-camera-sim/public',
  'apps/fmp-camera-sim/src',
  // Training memory shared with Shading practice, bundled into the page.
  'shader/fmp-training.js',
  'scripts/build_camera_sim_offline.mjs',
  'scripts/camera_sim_release.mjs',
];
const HEADING = /^## (\d+)\.(\d+)\.(\d+) — (\d{4}-\d{2}-\d{2}) — (\S.*)$/;
const HEADING_FORMAT = '"## <major>.<minor>.<patch> — <YYYY-MM-DD> — <title>"';

/** Numeric semantic-version comparison: negative, zero or positive. */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

const isRealDate = (date) => {
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date;
};

/** Reads the log's entries, newest first, and reports every formatting problem. */
export function parseChangelog(text) {
  const entries = [];
  const errors = [];
  let current = null;
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.startsWith('## ')) {
      current = null;
      const match = HEADING.exec(line.trimEnd());
      if (!match) {
        errors.push(`line ${index + 1}: expected ${HEADING_FORMAT}, found "${line}"`);
        return;
      }
      current = { version: `${match[1]}.${match[2]}.${match[3]}`, date: match[4], title: match[5], line: index + 1, bullets: 0 };
      entries.push(current);
    } else if (current && /^- \S/.test(line)) {
      current.bullets += 1;
    }
  });
  if (entries.length === 0 && errors.length === 0) errors.push(`no release entries; add one headed ${HEADING_FORMAT}`);
  entries.forEach((entry, index) => {
    if (!isRealDate(entry.date)) errors.push(`line ${entry.line}: ${entry.date} is not a real date`);
    if (entry.bullets === 0) errors.push(`line ${entry.line}: ${entry.version} needs at least one "- " bullet describing the change`);
    const older = entries[index + 1];
    if (!older) return;
    if (compareVersions(entry.version, older.version) <= 0) {
      errors.push(`line ${entry.line}: ${entry.version} must be newer than the entry below it (${older.version}); newest entries go first`);
    }
    if (entry.date < older.date) errors.push(`line ${entry.line}: ${entry.version} is dated ${entry.date}, before ${older.version} (${older.date})`);
  });
  return { entries, errors };
}

function listFiles(root, rel) {
  const path = join(root, rel);
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [rel];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .flatMap((entry) => listFiles(root, `${rel}/${entry.name}`));
}

/** Short hash of the simulator's shipped source: identical source gives an identical stamp. */
export function sourceFingerprint(root = ROOT) {
  const hash = createHash('sha256');
  const files = FINGERPRINT_INPUTS.flatMap((input) => listFiles(root, input))
    .filter((file) => !/\.test\.[cm]?[jt]sx?$/.test(file))
    .sort();
  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update(readFileSync(join(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 8);
}

/** The running release: the newest log entry plus the source fingerprint. Throws on a malformed log. */
export function readRelease(root = ROOT) {
  const { entries, errors } = parseChangelog(readFileSync(join(root, CHANGELOG), 'utf8'));
  if (errors.length) throw new Error(`${CHANGELOG}:\n  ${errors.join('\n  ')}`);
  return { version: entries[0].version, date: entries[0].date, build: sourceFingerprint(root) };
}

/** "1.6.0+1a2b3c4d": the value of the fmp-camera-sim-version meta tag. */
export const releaseStamp = (release) => `${release.version}+${release.build}`;

/**
 * A change to the published build must come with a newer entry than the base had. Returns the
 * problems: none when camera-sim/ is untouched, the base predates the log, or the version moved on.
 */
export function checkVersionBump({ changedFiles, baseVersion, headVersion }) {
  const shipped = changedFiles.filter((file) => file.startsWith(BUILD_DIR));
  if (shipped.length === 0 || !baseVersion) return [];
  if (headVersion && compareVersions(headVersion, baseVersion) > 0) return [];
  const listed = shipped.slice(0, 3).join(', ') + (shipped.length > 3 ? `, +${shipped.length - 3} more` : '');
  return [
    `camera-sim/ changed (${listed}), but ${CHANGELOG} still tops at ${headVersion ?? 'no version'}, ` +
      `not newer than the base's ${baseVersion}. Add a ${HEADING_FORMAT} entry above it that says what changed, ` +
      'run npm run build:camera-sim, and commit camera-sim/ with it.',
  ];
}
