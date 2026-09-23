#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// When installed under scripts/, this resolves the repository root. The
// SHADER_PRACTICE_ROOT override lets reviewers run this proposed verifier from
// a temporary file without copying it into the active checkout.
const ROOT = process.env.SHADER_PRACTICE_ROOT || path.resolve(__dirname, '..');
const { originFor, sitemapFor } = require(path.join(ROOT, 'scripts/domain_sites_lib'));
const failures = [];
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const fail = message => failures.push(message);
const requireMatch = (source, pattern, message) => { if (!pattern.test(source)) fail(message); };
const requireAbsent = (source, pattern, message) => { if (pattern.test(source)) fail(message); };

const page = read('shader/practice.html');
const css = read('shader/practice.css');
const theme = read('shader/practice-theme.js');
const engine = read('shader/shading-practice-state.js');
const renderer = read('shader/practice-render.js');
const app = read('shader/practice-app.js');
const worker = read('shader/practice-worker.js');
const reference = read('shader/index.html');
const redirect = read('ProjectorThrow/practice.html');
const registry = read('js/sbd-registry.js');
const throwline = read('ProjectorThrow/index.html') + read('ProjectorThrow/Stage3D.html');
const packageJson = JSON.parse(read('package.json'));
const route = 'shader/practice.html';
const canonical = `${originFor(route)}/${route}`;

// Canonical ownership, disclosure, public shell, and network safety.
requireMatch(page, /<link rel="canonical" href="https:\/\/housevideo\.app\/shader\/practice\.html">/, 'Shader Practice must declare the housevideo canonical route.');
requireMatch(page, /SIMULATION FOR PRACTICE/, 'Shader Practice must identify itself as a simulation.');
requireMatch(page, /Generated practice signal · not a measurement/, 'Shader Practice must disclaim measurement claims beside the scopes.');
requireMatch(page, /connect-src 'none'/, 'Shader Practice must not connect to equipment or network APIs.');
requireMatch(page, /<meta name="referrer" content="no-referrer">/, 'Shader Practice must suppress outbound referrer data.');
requireMatch(page, /frame-src 'none'/, 'Shader Practice CSP must block embedded frames.');
requireMatch(page, /script-src 'self'(?:;|\s)/, 'Shader Practice CSP must restrict scripts to same-origin external files.');
requireAbsent(page, /script-src[^;]*'unsafe-inline'/, 'Shader Practice CSP must not permit inline scripts.');
requireAbsent(page, /<script(?![^>]*\bsrc=)[^>]*>/i, 'Shader Practice must keep executable JavaScript in external, auditable files.');
requireMatch(page, /class="sbd-skip-link" href="#practiceWorkspace"/, 'Shader Practice must expose a first-focus skip link to the console.');
requireMatch(page, /href="index\.html" aria-label="Return to Camera control and shading reference"/, 'Shader Practice must return to its parent reference.');

// External application structure and four-canvas scope design.
requireMatch(page, /<link rel="stylesheet" href="practice\.css">/, 'Shader Practice must load its external console stylesheet.');
['practice-theme.js', 'shading-practice-state.js', 'practice-render.js', 'practice-app.js'].forEach(asset => {
  requireMatch(page, new RegExp(`<script src=["']${asset.replace('.', '\\.')}["']`), `Shader Practice must load ${asset}.`);
});
['stateIdentity', 'cameraCanvasA', 'cameraCanvasB', 'controlList', 'exportButton', 'importButton', 'copyLinkButton', 'themeButton', 'scoreButton', 'scoreHeading', 'viewRail'].forEach(id => {
  requireMatch(page, new RegExp(`id=["']${id}["']`), `Shader Practice is missing ${id}.`);
});
['waveform', 'parade', 'vectorscope', 'histogram'].forEach(scope => {
  requireMatch(page, new RegExp(`id=["']scopeCanvas-${scope}["']`), `Shader Practice is missing the ${scope} canvas.`);
  requireMatch(page, new RegExp(`id=["']scopeFigure-${scope}["'][^>]*role=["']tabpanel["']`), `Shader Practice ${scope} output must be a tab panel.`);
  requireMatch(page, new RegExp(`id=["']legend-${scope}["']`), `Shader Practice ${scope} must expose its reference/target trace legend.`);
  if (!engine.includes(`'${scope}'`)) fail(`Shader Practice state is missing the ${scope} scope.`);
});
requireMatch(page, /id="roleTagA">REF · CAM A</, 'Camera A must keep a persistent reference role tag.');
requireMatch(page, /id="roleTagB">TGT · CAM B</, 'Camera B must keep a persistent target role tag.');
requireAbsent(`${page}\n${app}`, /\b(?:PGM|PVW)\b/, 'The simulator must not present reference and target roles as real program or preview tally.');
requireMatch(page, /id="viewRail" aria-label="Practice views"/, 'The mobile task rail must have an accessible label.');
['shade', 'scopes', 'exercise', 'score', 'demo'].forEach(view => {
  requireMatch(page, new RegExp(`<button[^>]+type=["']button["'][^>]+data-view=["']${view}["'][^>]+aria-pressed=["'](?:true|false)["']`), `The ${view} task-rail control must expose button and pressed semantics.`);
});
requireMatch(page, /id="scoreHeading" tabindex="-1"/, 'The debrief heading must be programmatically focusable.');
requireMatch(app, /scoreHeading[^\n]*(?:focus\(|\.focus\()/, 'Scoring must move keyboard focus to the debrief heading.');
requireMatch(app, /requestAnimationFrame/, 'Shader Practice must coalesce high-frequency visual updates through requestAnimationFrame.');
requireMatch(app, /window\.ShaderPracticeApp/, 'Shader Practice must expose its review and handoff API under Shader ownership.');
requireMatch(renderer, /root\.ShaderPracticeRender/, 'Shader Practice must expose its external canvas renderer.');
requireMatch(renderer, /drawWaveform[\s\S]*drawParade[\s\S]*drawVectorscope[\s\S]*drawHistogram/, 'Shader Practice renderer must implement all four generated scopes.');
requireMatch(theme, /shader\.practice\.theme\.v1/, 'Shader Practice must own its theme preference key.');

// Deterministic state, learner roles, controls, and exercises.
requireMatch(engine, /const SCHEMA = 'shader\.camera-practice\.v1'/, 'Shader Practice state must use its versioned Shader schema.');
['iris', 'pedestal', 'gain', 'gamma', 'whiteBalance', 'saturation', 'colorPhase'].forEach(control => {
  requireMatch(engine, new RegExp(`\\b${control}:\\s*\\[`), `Shader Practice is missing the ${control} range.`);
});
['match-cameras', 'recover-highlights', 'set-black-level', 'neutralize-cast'].forEach(scenario => {
  if (!engine.includes(`'${scenario}'`)) fail(`Shader Practice is missing the ${scenario} exercise.`);
});
requireMatch(engine, /referenceCameraId:\s*'camera-a'/, 'Scored exercises must identify Camera A as their reference.');
requireMatch(engine, /targetCameraId:\s*'camera-b'/, 'Scored exercises must identify Camera B as their learner target.');

// Offline release assets must match the external application split.
['practice.html', 'practice.css', 'practice-theme.js', 'practice-render.js', 'practice-app.js', 'shading-practice-state.js', 'index.html'].forEach(asset => {
  requireMatch(worker, new RegExp(`['"]\\./${asset.replace('.', '\\.')}['"]`), `Shader Practice offline worker must cache ${asset}.`);
});
requireMatch(worker, /SBD_OFFLINE_VERSION/, 'Shader Practice worker must report its cache version to the page.');
requireMatch(app, /practice-worker\.js/, 'Shader Practice must register its dedicated offline worker.');

// Product boundary and release integration.
requireMatch(reference, /href="practice\.html">Practice<\/a>/, 'The Shader reference navigation must expose Practice.');
requireMatch(reference, /href="practice\.html">Open camera shading practice →<\/a>/, 'The Shader matching section must expose the practice exercise.');
requireMatch(redirect, /noindex,follow/, 'The legacy Throwline practice route must be a noindex compatibility page.');
requireMatch(redirect, /https:\/\/housevideo\.app\/shader\/practice\.html/, 'The legacy Throwline practice route must point to Shader Practice.');
if (/scopePracticeLink|nav-practice|Scope Practice|camera shading practice/i.test(throwline)) fail('Throwline UI still promotes camera shading practice.');
if (/ProjectorThrow\/practice|throwline-practice-state|throwline\.practice\.theme/.test(registry)) fail('Throwline registry still owns Shader Practice assets or state.');
if (!packageJson.scripts['verify:shader-practice'] || !packageJson.scripts['test:shader-practice-browser']) fail('Shader Practice must have separate release and browser gates.');
if (!sitemapFor(route).includes(`<loc>${canonical}</loc>`)) fail(`Housevideo sitemap is missing ${canonical}.`);

// Guard against equipment I/O quietly entering a generated practice surface.
const runtime = `${engine}\n${renderer}\n${app}`;
requireAbsent(runtime, /\b(?:WebSocket|RTCPeerConnection|requestMIDIAccess|navigator\.(?:serial|usb|bluetooth)|getUserMedia)\b/, 'Shader Practice runtime must not contain live equipment, MIDI, media, or socket I/O.');

if (failures.length) {
  console.error('Shader Practice verification failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Shader Practice verification passed (canonical=${canonical}).`);
