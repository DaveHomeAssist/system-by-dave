#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { originFor, sitemapFor } = require('./domain_sites_lib');
const ROOT = path.resolve(__dirname, '..');
const failures = [];
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const fail = message => failures.push(message);
const requireMatch = (source, pattern, message) => { if (!pattern.test(source)) fail(message); };

const page = read('shader/practice.html');
const engine = read('shader/shading-practice-state.js');
const worker = read('shader/practice-worker.js');
const reference = read('shader/index.html');
const redirect = read('ProjectorThrow/practice.html');
const registry = read('js/sbd-registry.js');
const throwline = read('ProjectorThrow/index.html') + read('ProjectorThrow/Stage3D.html');
const packageJson = JSON.parse(read('package.json'));
const route = 'shader/practice.html';
const canonical = `${originFor(route)}/${route}`;

requireMatch(page, /<link rel="canonical" href="https:\/\/housevideo\.app\/shader\/practice\.html">/, 'Shader Practice must declare the housevideo canonical route.');
requireMatch(page, /SIMULATION FOR PRACTICE/, 'Shader Practice must identify itself as a simulation.');
requireMatch(page, /Generated practice signal · not a measurement/, 'Shader Practice must disclaim measurement claims beside the scopes.');
requireMatch(page, /shading-practice-state\.js/, 'Shader Practice must load its deterministic state engine.');
requireMatch(page, /window\.ShaderPracticeApp/, 'Shader Practice must expose its review and handoff API under Shader ownership.');
requireMatch(page, /connect-src 'none'/, 'Shader Practice must not connect to equipment or network APIs.');
requireMatch(page, /practice-worker\.js/, 'Shader Practice must register its dedicated offline worker.');
requireMatch(page, /href="index\.html" aria-label="Return to Camera control and shading reference"/, 'Shader Practice must return to its parent reference.');
requireMatch(page, /id="cameraCardA"[\s\S]*?id="cameraCardB"/, 'Shader Practice must expose two virtual camera monitors.');
['stateIdentity','cameraCanvasA','cameraCanvasB','controlList','scopeCanvas','exportButton','importButton','copyLinkButton','themeButton'].forEach(id => {
  requireMatch(page, new RegExp(`id=["']${id}["']`), `Shader Practice is missing ${id}.`);
});
requireMatch(engine, /const SCHEMA = 'shader\.camera-practice\.v1'/, 'Shader Practice state must use its versioned Shader schema.');
['iris','pedestal','gain','gamma','whiteBalance','saturation','colorPhase'].forEach(control => {
  requireMatch(engine, new RegExp(`\\b${control}:\\s*\\[`), `Shader Practice is missing the ${control} range.`);
});
['match-cameras','recover-highlights','set-black-level','neutralize-cast'].forEach(scenario => {
  if (!engine.includes(`'${scenario}'`)) fail(`Shader Practice is missing the ${scenario} exercise.`);
});
['waveform','parade','vectorscope','histogram'].forEach(scope => {
  if (!engine.includes(`'${scope}'`)) fail(`Shader Practice is missing the ${scope} scope.`);
});
requireMatch(worker, /const ASSETS = \['\.\/practice\.html', '\.\/shading-practice-state\.js', '\.\/index\.html'\]/, 'Shader Practice offline worker must cache the page, engine, and parent reference.');
requireMatch(worker, /SBD_OFFLINE_VERSION/, 'Shader Practice worker must report its cache version to the page.');
requireMatch(reference, /href="practice\.html">Practice<\/a>/, 'The Shader reference navigation must expose Practice.');
requireMatch(reference, /href="practice\.html">Open camera shading practice →<\/a>/, 'The Shader matching section must expose the practice exercise.');
requireMatch(redirect, /noindex,follow/, 'The legacy Throwline practice route must be a noindex compatibility page.');
requireMatch(redirect, /https:\/\/housevideo\.app\/shader\/practice\.html/, 'The legacy Throwline practice route must point to Shader Practice.');
if (/scopePracticeLink|nav-practice|Scope Practice|camera shading practice/i.test(throwline)) fail('Throwline UI still promotes camera shading practice.');
if (/ProjectorThrow\/practice|throwline-practice-state|throwline\.practice\.theme/.test(registry)) fail('Throwline registry still owns Shader Practice assets or storage.');
if (!packageJson.scripts['verify:shader-practice'] || !packageJson.scripts['test:shader-practice-browser']) fail('Shader Practice must have separate release and browser gates.');
if (!sitemapFor(route).includes(`<loc>${canonical}</loc>`)) fail(`Housevideo sitemap is missing ${canonical}.`);

if (failures.length) {
  console.error('Shader Practice verification failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Shader Practice verification passed (canonical=${canonical}).`);
