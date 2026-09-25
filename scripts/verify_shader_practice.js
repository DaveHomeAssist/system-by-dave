#!/usr/bin/env node
'use strict';

// Source-level release gate for Camera Shading Practice. The browser probe
// proves behaviour; this proves the page stays a sealed, offline, deterministic
// simulation owned by Shader rather than Throwline.

const fs = require('node:fs');
const path = require('node:path');
const { originFor, sitemapFor } = require('./domain_sites_lib');
const ROOT = path.resolve(__dirname, '..');
const failures = [];
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const fail = message => failures.push(message);
const requireMatch = (source, pattern, message) => { if (!pattern.test(source)) fail(message); };

const page = read('shader/practice.html');
const styles = read('shader/practice.css');
const themeBoot = read('shader/practice-theme.js');
const engine = read('shader/shading-practice-state.js');
const renderer = read('shader/practice-render.js');
const app = read('shader/practice-app.js');
const training = read('shader/fmp-training.js');
const worker = read('shader/practice-worker.js');
const reference = read('shader/index.html');
const redirect = read('ProjectorThrow/practice.html');
const registry = read('js/sbd-registry.js');
const throwline = read('ProjectorThrow/index.html') + read('ProjectorThrow/Stage3D.html');
const packageJson = JSON.parse(read('package.json'));
const route = 'shader/practice.html';
const canonical = `${originFor(route)}/${route}`;
const scripts = { 'shader/practice-theme.js': themeBoot, 'shader/shading-practice-state.js': engine, 'shader/practice-render.js': renderer, 'shader/fmp-training.js': training, 'shader/practice-app.js': app };

// Identity, statements, and navigation.
requireMatch(page, /<link rel="canonical" href="https:\/\/housevideo\.app\/shader\/practice\.html">/, 'Shader Practice must declare the housevideo canonical route.');
requireMatch(page, /SIMULATION FOR PRACTICE/, 'Shader Practice must identify itself as a simulation.');
requireMatch(page, /Generated practice signal · not a measurement/, 'Shader Practice must disclaim measurement claims beside the scopes.');
requireMatch(page, /Nothing here reads or controls real equipment\./, 'Shader Practice must state that nothing reads or controls real equipment.');
requireMatch(page, /<noscript>[\s\S]*SIMULATION FOR PRACTICE[\s\S]*<\/noscript>/, 'Shader Practice must keep the simulation statement without JavaScript.');
requireMatch(page, /href="index\.html" aria-label="Return to Camera control and shading reference"/, 'Shader Practice must return to its parent reference.');
requireMatch(page, /href="\/fmp\/"/, 'Shader Practice must keep FMP Video Operations one link away.');
requireMatch(page, /<body[^>]*>\s*<a class="sbd-skip-link" href="#practiceWorkspace">/, 'Shader Practice must start with a skip link to the console.');

// A sealed page: external files only, no network, no equipment APIs. The
// policy must match this list exactly, so no directive can be loosened or
// dropped without failing here.
const EXPECTED_CSP = {
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self'",
  'img-src': "'self' data:",
  'font-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'connect-src': "'none'",
  'worker-src': "'self'",
  'frame-src': "'none'",
  'media-src': "'none'"
};
const csp = page.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
if (!csp) fail('Shader Practice must declare a Content Security Policy.');
if (/unsafe-inline|unsafe-eval/.test(csp)) fail('Shader Practice CSP must not allow inline or evaluated code.');
const directives = new Map();
csp.split(';').map(part => part.trim()).filter(Boolean).forEach(part => {
  const [name, ...values] = part.split(/\s+/);
  if (directives.has(name)) fail(`Shader Practice CSP repeats ${name}.`);
  directives.set(name, values.join(' '));
});
Object.entries(EXPECTED_CSP).forEach(([name, value]) => {
  if (directives.get(name) !== value) fail(`Shader Practice CSP must set ${name} ${value} (found ${directives.has(name) ? directives.get(name) : 'nothing'}).`);
});
[...directives.keys()].filter(name => !(name in EXPECTED_CSP)).forEach(name => fail(`Shader Practice CSP has an unreviewed directive: ${name}.`));
requireMatch(page, /<meta name="referrer" content="no-referrer">/, 'Shader Practice must send no referrer.');
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(page)) fail('Shader Practice must not contain inline scripts.');
if (/<style[\s>]/i.test(page) || /\sstyle="/i.test(page)) fail('Shader Practice must not contain inline styles.');
if (/\son[a-z]+="/i.test(page)) fail('Shader Practice must not use inline event handlers.');
for (const [file, source] of Object.entries(scripts)) {
  if (/\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.usb|navigator\.serial|navigator\.hid|RTCPeerConnection/.test(source)) fail(`${file} must not open network or device connections.`);
  if (/\.innerHTML\s*=|insertAdjacentHTML|document\.write/.test(source)) fail(`${file} must build DOM without HTML injection.`);
  if (/\beval\(|new Function\(/.test(source)) fail(`${file} must not evaluate code.`);
}
if (/@import|url\((?!data:)/.test(styles)) fail('shader/practice.css must not load further resources.');

const loaded = [...page.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
['practice.css', 'practice-theme.js', 'shading-practice-state.js', 'practice-render.js', 'fmp-training.js', 'practice-app.js'].forEach(file => {
  if (!loaded.includes(file)) fail(`Shader Practice must load ${file}.`);
});
if (loaded.indexOf('fmp-training.js') > loaded.indexOf('practice-app.js')) fail('Shader Practice must load fmp-training.js before its controller.');
if (loaded.indexOf('shading-practice-state.js') > loaded.indexOf('practice-app.js') || loaded.indexOf('practice-render.js') > loaded.indexOf('practice-app.js')) fail('Shader Practice must load its engine and renderer before the controller.');
requireMatch(app, /window\.ShaderPracticeApp = Object\.freeze/, 'Shader Practice must expose its review and handoff API under Shader ownership.');
requireMatch(app, /practice-worker\.js/, 'Shader Practice must register its dedicated offline worker.');
['stateIdentity', 'cameraCanvasA', 'cameraCanvasB', 'wipeCanvas', 'controlList', 'scopeCanvas-waveform', 'scopeCanvas-parade', 'scopeCanvas-vectorscope', 'scopeCanvas-histogram', 'exportButton', 'importButton', 'copyLinkButton', 'themeButton', 'scoreButton', 'shareDialog', 'viewRail', 'sideTabs', 'blinkButton', 'freezeButton', 'undoButton', 'redoButton', 'startDemoButton'].forEach(id => {
  requireMatch(page, new RegExp(`id=["']${id}["']`), `Shader Practice is missing ${id}.`);
});
requireMatch(page, /id="cameraCardA"|id="monitorLeft"[\s\S]*?id="monitorRight"/, 'Shader Practice must expose two virtual camera monitors.');

// Deterministic engine contract.
requireMatch(engine, /const SCHEMA = 'shader\.camera-practice\.v1'/, 'Shader Practice state must use its versioned Shader schema.');
requireMatch(engine, /const LEGACY_SCHEMA = 'throwline\.camera-practice\.v1'/, 'Shader Practice must keep importing legacy Throwline practice exports.');
['iris', 'pedestal', 'gain', 'gamma', 'whiteBalance', 'saturation', 'colorPhase'].forEach(control => {
  requireMatch(engine, new RegExp(`\\b${control}:\\s*\\[`), `Shader Practice is missing the ${control} range.`);
});
['match-cameras', 'recover-highlights', 'set-black-level', 'neutralize-cast'].forEach(scenario => {
  if (!engine.includes(`'${scenario}'`)) fail(`Shader Practice is missing the ${scenario} exercise.`);
});
['waveform', 'parade', 'vectorscope', 'histogram'].forEach(scope => {
  if (!engine.includes(`'${scope}'`)) fail(`Shader Practice is missing the ${scope} scope.`);
});
if (/Math\.random|Date\.now|performance\.now/.test(engine)) fail('Shader Practice engine must stay deterministic (no random or clock input).');

// Training memory stays on this device in one fmp-prefixed key, which the
// housevideo.app saved-data transfer carries.
requireMatch(training, /const KEY = 'fmpTraining\.v1'/, 'Training memory must keep its fmpTraining.v1 key.');
if (/sessionStorage|indexedDB|document\.cookie/.test(training)) fail('Training memory must keep to its one localStorage key.');

// One release identifier across engine, renderer, controller, and worker.
const build = engine.match(/const BUILD = '([^']+)'/)?.[1];
const builds = {
  renderer: renderer.match(/const BUILD = '([^']+)'/)?.[1],
  controller: app.match(/const OFFLINE_CACHE_VERSION = '([^']+)'/)?.[1],
  worker: worker.match(/const VERSION = '([^']+)'/)?.[1]
};
if (!build) fail('Shader Practice engine must declare its BUILD.');
Object.entries(builds).forEach(([name, value]) => { if (value !== build) fail(`Shader Practice ${name} build ${value} does not match engine ${build}.`); });
requireMatch(app, /Practice\.BUILD !== OFFLINE_CACHE_VERSION|Practice\.BUILD === OFFLINE_CACHE_VERSION/, 'Shader Practice must detect a stale cached engine.');

// The dedicated offline worker caches everything the page needs.
const assets = JSON.parse((worker.match(/const ASSETS = (\[[\s\S]*?\]);/)?.[1] || '[]').replace(/'/g, '"'));
['./practice.html', ...loaded.map(file => `./${file}`), './index.html'].forEach(asset => {
  if (!assets.includes(asset)) fail(`Shader Practice offline worker must cache ${asset}.`);
});
assets.forEach(asset => {
  const file = path.posix.normalize(path.posix.join('shader', asset));
  if (!fs.existsSync(path.join(ROOT, file))) fail(`Shader Practice offline asset ${asset} does not exist.`);
  if (asset.startsWith('../') && !reference.includes(`/${file}`)) fail(`Offline asset ${asset} is not loaded by shader/index.html, so housevideo.app may not publish it.`);
});
requireMatch(worker, /SBD_OFFLINE_VERSION/, 'Shader Practice worker must report its cache version to the page.');

// Product boundary: this belongs to Camera Control & Shading, not Throwline.
requireMatch(reference, /href="practice\.html">Practice<\/a>/, 'The Shader reference navigation must expose Practice.');
requireMatch(reference, /href="practice\.html">Open camera shading practice →<\/a>/, 'The Shader matching section must expose the practice exercise.');
requireMatch(redirect, /noindex,follow/, 'The legacy Throwline practice route must be a noindex compatibility page.');
requireMatch(redirect, /https:\/\/housevideo\.app\/shader\/practice\.html/, 'The legacy Throwline practice route must point to Shader Practice.');
if (/scopePracticeLink|nav-practice|Scope Practice|camera shading practice/i.test(throwline)) fail('Throwline UI still promotes camera shading practice.');
if (/ProjectorThrow\/practice|throwline-practice-state|throwline\.practice\.theme|shader\//.test(registry)) fail('The AV registry must not own Shader Practice assets or storage.');
// Legacy import support is the only permitted mention: the old schema, the old
// theme key, and the sentence telling operators their old exports still import.
const allowedThrowline = /throwline\.camera-practice\.v1|throwline-camera-practice-session|throwline\.practice\.theme\.v1|older Throwline practice exports/g;
for (const [file, source] of Object.entries({ 'shader/practice.html': page, 'shader/practice.css': styles, ...scripts, 'shader/practice-worker.js': worker })) {
  if (/throwline/i.test(source.replace(allowedThrowline, ''))) fail(`${file} mentions Throwline beyond the legacy import schema and theme key.`);
}
if (!packageJson.scripts['verify:shader-practice'] || !packageJson.scripts['test:shader-practice-browser']) fail('Shader Practice must have separate release and browser gates.');
if (!sitemapFor(route).includes(`<loc>${canonical}</loc>`)) fail(`Housevideo sitemap is missing ${canonical}.`);

if (failures.length) {
  console.error('Shader Practice verification failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Shader Practice verification passed (canonical=${canonical}, build=${build}, offline assets=${assets.length}).`);
