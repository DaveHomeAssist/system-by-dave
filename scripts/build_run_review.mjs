#!/usr/bin/env node
// Run Review managed release (docs/run-review.md).
//
// The viewer is built in DaveHomeAssist/frozen-rehearsal-capture. This script
// takes that build, byte-for-byte as committed there, and gives it the
// AV by Dave site shell: page metadata, breadcrumb, skip link, palette and the
// site's shared theme choice. It changes no viewer behavior.
//
//   node scripts/build_run_review.mjs                 write run-review/index.html
//   node scripts/build_run_review.mjs --check         fail if anything drifted
//   node scripts/build_run_review.mjs --sync <dir>    refresh the pinned viewer
//                                                     from a frozen-rehearsal-capture
//                                                     checkout, then write
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withReviewCsp } from '../wst/hosting/scripts/review-csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'apps/run-review');
const UPSTREAM = path.join(APP, 'upstream/rehearsal-review.html');
const RELEASE = path.join(APP, 'release.json');
const SKIN = path.join(APP, 'avbydave.css');
const OUTPUT = path.join(ROOT, 'run-review/index.html');
const SOURCE_REPOSITORY = 'DaveHomeAssist/frozen-rehearsal-capture';
const SOURCE_PATH = 'viewer/dist/rehearsal-review.html';
const CANONICAL = 'https://avbydave.com/run-review/';
export const SKIP_TARGET = 'run-review-workspace';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// Every edit names the exact upstream text it replaces. An upstream change that
// moves or rewords one of them fails the build instead of shipping half a shell.
function once(html, from, to, label) {
  const count = html.split(from).length - 1;
  if (count !== 1) throw new Error(`Run Review shell: expected one ${label} in the upstream viewer, found ${count}. Update scripts/build_run_review.mjs for the new viewer.`);
  return html.replace(from, () => to);
}

const DESCRIPTION = 'Step through a rehearsal capture cue by cue: photos, MIDI firings and observations, with review marks and notes kept in this browser.';
const BRAND = '<h1><a id="workspace-link" class="avd-crumb-home frozen-home-link" href="/">AV by Dave</a><span class="brand-divider" aria-hidden="true"> / </span><a class="avd-crumb-parent frozen-home-link" href="/av/">Console</a><span class="brand-divider" aria-hidden="true"> / </span><span class="avd-crumb-current" aria-current="page">Run Review</span></h1>';

// Application-only behavior fails clearly without JavaScript (AGENTS.md): the
// viewer is hidden and this says why, with the way home.
const NOSCRIPT = '<noscript><div class="rr-noscript" role="alert"><h1>Run Review needs JavaScript</h1><p>It opens rehearsal capture archives in this browser, so it cannot run with JavaScript turned off. Turn JavaScript on for avbydave.com and reload this page.</p><p><a href="/">AV by Dave home</a> · <a href="/av/">Console</a></p></div></noscript>';

export function buildRunReview(upstream, skin) {
  let html = upstream;
  // Metadata: AV by Dave title family, the site's canonical address.
  html = once(html, '<title>Rehearsal Review</title>', '<title>Run Review | AV by Dave</title>', 'title');
  html = once(html, '<meta name="description" content="Review Frozen rehearsal photos, individual MIDI firings and recorded observations.">', `<meta name="description" content="${DESCRIPTION}">`, 'description');
  html = once(html, '<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="noindex,follow">', 'robots policy');
  html = once(html, '<meta name="theme-color" content="#edf5fa">', '<meta name="theme-color" content="#f3f2ec">', 'theme color');
  html = once(html, '<link rel="canonical" href="https://wst.housevideo.app/run-review/">', `<link rel="canonical" href="${CANONICAL}">\n<link rel="icon" href="../av-home/favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="../css/avd/tokens.css">`, 'canonical link');
  html = once(html, '<meta property="og:title" content="Frozen Rehearsal Review">', '<meta property="og:title" content="Run Review | AV by Dave">', 'Open Graph title');
  html = once(html, '<meta property="og:description" content="Rehearsal photos and observations, organized by session and firing.">', `<meta property="og:description" content="${DESCRIPTION}">`, 'Open Graph description');
  html = once(html, '<meta property="og:url" content="https://wst.housevideo.app/run-review/">', `<meta property="og:url" content="${CANONICAL}">\n<meta property="og:site_name" content="AV by Dave">`, 'Open Graph address');
  html = once(html, '<meta name="twitter:card" content="summary">', `<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="Run Review | AV by Dave">\n<meta name="twitter:description" content="${DESCRIPTION}">`, 'Twitter card');
  // One theme owner per origin: avbydave.com tools share av-theme-mode.v1.
  // The console's White and Black read as light and dark here.
  html = once(html, "const KEY = 'frozen.theme.v1';", "const KEY = 'av-theme-mode.v1';", 'theme storage key');
  html = once(html, 'if (valid(saved)) return saved;', "if (valid(saved)) return saved;\n      if (saved === 'white') return 'light';\n      if (saved === 'black') return 'dark';", 'saved theme read');
  html = once(html, "theme() === 'dark' ? '#102438' : '#edf5fa'", "theme() === 'dark' ? '#0f0f0e' : '#f3f2ec'", 'theme color switch');
  html = once(html, "store.get('frozen.theme.v1')", "store.get('av-theme-mode.v1')", 'shared theme migration');
  html = once(html, "['light', 'dark', 'system'].includes(sharedTheme)", "['light', 'dark', 'system', 'white', 'black'].includes(sharedTheme)", 'shared theme check');
  // Palette and fonts follow the viewer's own styles.
  html = once(html, '</style>\n</head>', `\n${skin.trim()}\n</style>\n<noscript><style>.shell, .sbd-skip-link { display: none; }</style></noscript>\n</head>`, 'style block end');
  // Public shell: skip link first, then home, parent and current location.
  html = once(html, '<body>\n<div class="shell" id="shell">', `<body>\n<a class="sbd-skip-link" href="#${SKIP_TARGET}">Skip to the review</a>\n${NOSCRIPT}\n<div class="shell" id="shell">`, 'body start');
  html = once(html, '<h1><a id="workspace-link" class="frozen-brand frozen-home-link" href="/" aria-label="Frozen workspace home">Frozen <span aria-hidden="true">✳</span></a><span class="brand-divider" aria-hidden="true"> / </span>Run review</h1>', BRAND, 'Frozen breadcrumb');
  html = once(html, '<main class="panels">', `<main class="panels" id="${SKIP_TARGET}" tabindex="-1">`, 'workspace');
  html = once(html, "if (location.protocol === 'file:') $('#workspace-link').href = 'https://wst.housevideo.app/';", "if (location.protocol === 'file:') $('#workspace-link').href = 'https://avbydave.com/';", 'saved-copy home link');
  return withReviewCsp(html);
}

function readRelease() {
  const release = JSON.parse(fs.readFileSync(RELEASE, 'utf8'));
  if (release.schema !== 'system-by-dave.run-review-release.v1' || release.sourceRepository !== SOURCE_REPOSITORY || release.sourcePath !== SOURCE_PATH || !/^[0-9a-f]{40}$/.test(release.sourceCommit) || !/^[0-9a-f]{64}$/.test(release.sourceSha256)) {
    throw new Error('apps/run-review/release.json is not a valid Run Review release record.');
  }
  return release;
}

function sync(checkout) {
  const dir = path.resolve(checkout);
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
  const remote = git('remote', 'get-url', 'origin');
  if (!remote.includes(SOURCE_REPOSITORY)) throw new Error(`${dir} is not a ${SOURCE_REPOSITORY} checkout (origin ${remote}).`);
  if (git('status', '--porcelain', '--', SOURCE_PATH)) throw new Error(`${SOURCE_PATH} has uncommitted changes. Sync a committed viewer build only.`);
  const commit = git('rev-parse', 'HEAD');
  const body = fs.readFileSync(path.join(dir, SOURCE_PATH));
  fs.mkdirSync(path.dirname(UPSTREAM), { recursive: true });
  fs.writeFileSync(UPSTREAM, body);
  const built = /const BUILT = '([^']+)';/.exec(body.toString('utf8'))?.[1] || null;
  const release = { schema: 'system-by-dave.run-review-release.v1', sourceRepository: SOURCE_REPOSITORY, sourceCommit: commit, sourcePath: SOURCE_PATH, sourceSha256: sha256(body), viewerBuilt: built };
  fs.writeFileSync(RELEASE, JSON.stringify(release, null, 2) + '\n');
  console.log(`run-review: pinned ${SOURCE_REPOSITORY}@${commit.slice(0, 7)} (${SOURCE_PATH}, built ${built})`);
}

function main(argv) {
  const syncAt = argv.indexOf('--sync');
  if (syncAt !== -1) {
    if (!argv[syncAt + 1]) throw new Error('--sync needs a frozen-rehearsal-capture checkout path.');
    sync(argv[syncAt + 1]);
  }
  const release = readRelease();
  const upstream = fs.readFileSync(UPSTREAM);
  if (sha256(upstream) !== release.sourceSha256) throw new Error('apps/run-review/upstream/rehearsal-review.html does not match its pinned release. Do not edit it by hand; run --sync from a frozen-rehearsal-capture checkout.');
  const built = buildRunReview(upstream.toString('utf8'), fs.readFileSync(SKIN, 'utf8'));
  if (argv.includes('--check')) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
    if (current !== built) throw new Error('run-review/index.html is out of date or hand-edited. Run node scripts/build_run_review.mjs and commit the result.');
    console.log(`run-review: OK (${SOURCE_REPOSITORY}@${release.sourceCommit.slice(0, 7)})`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, built);
  console.log(`run-review: wrote run-review/index.html from ${SOURCE_REPOSITORY}@${release.sourceCommit.slice(0, 7)} (${(built.length / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exit(1); }
}
