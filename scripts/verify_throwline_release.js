#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) fail(message);
}

function registry() {
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(read('js/sbd-registry.js'), context, { filename: 'js/sbd-registry.js' });
  return context.SBD_REGISTRY || context.self.SBD_REGISTRY;
}

function duplicateIds(source) {
  const ids = new Set();
  const duplicates = new Set();
  for (const match of source.matchAll(/\sid=["']([^"']+)["']/g)) {
    if (ids.has(match[1])) duplicates.add(match[1]);
    ids.add(match[1]);
  }
  return [...duplicates];
}

const main = read('ProjectorThrow/index.html');
const stage = read('ProjectorThrow/Stage3D.html');
const sidecar = read('ProjectorThrow/three-d-stage.js');
const sitemap = read('sitemap.xml');
const avRegistry = registry();

if (!avRegistry || !Array.isArray(avRegistry.tools)) fail('SBD_REGISTRY.tools did not load.');

requireMatch(main, /<!DOCTYPE html>/i, 'ProjectorThrow/index.html is missing its HTML document type.');
requireMatch(main, /<html\s+lang=["']en["']>/i, 'Throwline must remain a standalone HTML document without shared-theme opt-in attributes.');
if (/data-av-theme|data-av-tool|av-theme\.css/i.test(main)) fail('Throwline must not load or opt into the shared AV theme.');
if (/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/i.test(main)) fail('Throwline main app must not load an external stylesheet.');
if (/<script\b[^>]*\bsrc=/i.test(main)) fail('Throwline main app must not load an external script.');
if (/unpkg\.com|three(?:\.module)?\.js/i.test(main)) fail('Throwline main app must not depend on Three.js or unpkg.');
requireMatch(main, /const APP_VERSION = 4;/, 'Throwline must retain state schema 4.');
requireMatch(main, /theme:\s*["']throwline:theme:v1["']/, 'Throwline theme storage key is missing.');
requireMatch(main, /localStorage\.getItem\(["']throwline:theme:v1["']\) === ["']dark["']/, 'Throwline startup must restore an explicit dark preference only.');
requireMatch(main, /localStorage\.setItem\(STORAGE\.theme, dark \? ["']dark["'] : ["']light["']\)/, 'Throwline theme toggle must persist its explicit choice.');
if (/localStorage\.removeItem\(["']throwline:theme:v1["']\)/.test(main)) fail('Throwline must not remove a saved theme preference.');
if (/matchMedia\(/.test(main)) fail('Throwline must not override its explicit light default from the operating-system theme.');
requireMatch(main, /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'/i, 'Throwline main CSP is missing the offline standalone policy.');
['canonical', 'og:type', 'og:title', 'og:description', 'og:url', 'twitter:card', 'twitter:title', 'twitter:description'].forEach((token) => {
  if (!main.includes(token)) fail(`Throwline main metadata is missing ${token}.`);
});
requireMatch(main, /href=["']Stage3D\.html["']/, 'Throwline main app does not link to its optional Stage 3D companion.');
const cameras = Array.from(main.matchAll(/data-camera=["']([^"']+)["']/g), (match) => match[1]);
const expectedCameras = ['three-quarter', 'side', 'front', 'top', 'operator'];
if (cameras.length !== expectedCameras.length || expectedCameras.some((camera) => !cameras.includes(camera))) {
  fail(`Throwline must retain five inline SVG cameras (${expectedCameras.join(', ')}).`);
}
const duplicatedIds = duplicateIds(main);
if (duplicatedIds.length) fail(`Throwline has duplicate IDs: ${duplicatedIds.join(', ')}.`);

requireMatch(stage, /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*https:\/\/unpkg\.com/i, 'Stage 3D CSP must allow its pinned unpkg modules.');
requireMatch(stage, /https:\/\/unpkg\.com\/three@0\.184\.0\/build\/three\.module\.js/, 'Stage 3D import map must pin Three.js r184.');
requireMatch(stage, /<script\s+src=["']\.\/three-d-stage\.js["']><\/script>/, 'Stage 3D must load its colocated sidecar.');
requireMatch(stage, /fallback=["']index\.html["']/, 'Stage 3D must offer the offline main-app fallback.');
requireMatch(stage, /Optional online companion/i, 'Stage 3D must identify itself as an optional online companion.');
requireMatch(sidecar, /renderer\.shadowMap\.type = THREE\.PCFShadowMap;/, 'Stage 3D must use PCFShadowMap.');
if (/PCFSoftShadowMap/.test(stage) || /PCFSoftShadowMap/.test(sidecar)) fail('Stage 3D must not use deprecated PCFSoftShadowMap.');
const stageCameraIds = Array.from(stage.matchAll(/<button\b[^>]*\bdata-cam=["']([^"']+)["'][^>]*>/g), (match) => match[1]);
const expectedStageCameraIds = ['three', 'side', 'front', 'top', 'op'];
if (stageCameraIds.length !== expectedStageCameraIds.length || expectedStageCameraIds.some((id, index) => stageCameraIds[index] !== id)) {
  fail(`Stage 3D camera contract must remain ${expectedStageCameraIds.join(', ')}; found ${stageCameraIds.join(', ') || 'none'}.`);
}
if (/data-cam=["']flown["']/.test(stage)) fail('Stage 3D must not add a flown-projector preset.');
[
  ['beam_volume', 'Stage 3D must render a named beam volume.'],
  ['beam_edges', 'Stage 3D must render named structural beam edges.'],
  ['optical_centerline', 'Stage 3D must render a named optical centerline.'],
  ['projected_image', 'Stage 3D must render a named projected-image plane.'],
  ['spill_left', 'Stage 3D must render named left spill geometry.'],
  ['spill_right', 'Stage 3D must render named right spill geometry.'],
  ['missing_coverage', 'Stage 3D must render named missing-coverage geometry.'],
].forEach(([token, message]) => {
  if (!stage.includes(token)) fail(message);
});
requireMatch(stage, /dataset\.projectionState\s*=/, 'Stage 3D must expose its derived projection state to styling and diagnostics.');
requireMatch(stage, /id=["']sceneSummary["'][^>]*role=["']status["']/, 'Stage 3D must expose an accessible scene summary status region.');
requireMatch(sidecar, /Use keys 1 through 5 for cameras/, 'Stage 3D canvas instructions must expose all five camera shortcuts.');
requireMatch(stage, /<details\b[^>]*class=["'][^"']*adjust-panel/, 'Stage 3D controls must use a native Adjust disclosure.');
requireMatch(stage, /id=["']fieldVerifyToggle["']/, 'Stage 3D must expose a Field Verify control.');
requireMatch(stage, /class=["'][^"']*scene-toolbar/, 'Stage 3D must expose camera and layer controls beside the scene.');
requireMatch(stage, /grid-template-areas:[^}]*["']hud["'][^}]*["']controls["'][^}]*["']stage["']/s, 'Stage 3D phone layout must order the answer and controls before the scene.');
requireMatch(stage, /dataset\.fieldVerify\s*=/, 'Stage 3D must expose Field Verify state on the document.');
requireMatch(main, /id=["']plannerFieldVerify["']/, 'Throwline main app must expose a Field Verify mode control.');
requireMatch(main, /dataset\.fieldVerify\s*=/, 'Throwline main app must expose Field Verify state on the document.');
requireMatch(sidecar, /id\s*=\s*["']controlsHelp["']/, 'Stage 3D must retain a discoverable Controls help trigger.');
requireMatch(sidecar, /stage-first-interaction/, 'Stage 3D must dismiss first-use help after a successful interaction.');
requireMatch(stage, /min-height:\s*44px/, 'Stage 3D must retain 44-pixel touch targets on phone.');
requireMatch(sidecar, /:host\(\[field-verify\]\)\s+\.toolbar/, 'Stage exports must yield to planning data in Field Verify mode.');

const throwlineTools = (avRegistry?.tools || []).filter((tool) => tool.id === 'throwline');
if (throwlineTools.length !== 1 || throwlineTools[0].href !== 'ProjectorThrow/') {
  fail('Registry must contain exactly one Throwline entry at ProjectorThrow/.');
}
['https://systembydave.com/ProjectorThrow/', 'https://systembydave.com/ProjectorThrow/Stage3D.html'].forEach((url) => {
  if (!sitemap.includes(`<loc>${url}</loc>`)) fail(`Sitemap is missing ${url}.`);
});

if (failures.length) {
  console.error('Throwline release verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Throwline release verification passed (schema=4, cameras=${cameras.length}, registry=${avRegistry.version}).`);
