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

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    fail(`${relativePath} could not be loaded: ${error.message}`);
    return null;
  }
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
const catalogSource = read('ProjectorThrow/data/throwline-pilot-catalog.v1.json');
const catalog = readJson('ProjectorThrow/data/throwline-pilot-catalog.v1.json');
const packageJson = readJson('package.json');

if (catalogSource.includes('\uFFFD')) fail('Throwline pilot catalog contains Unicode replacement characters.');

function embeddedCatalog(source, label) {
  const match = source.match(/<!-- THROWLINE_CATALOG_START -->\s*<script id=["']throwlineCatalog["'] type=["']application\/json["']>([\s\S]*?)<\/script>\s*<!-- THROWLINE_CATALOG_END -->/);
  if (!match) {
    fail(`${label} is missing its embedded Throwline catalog snapshot.`);
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`${label} contains an invalid embedded Throwline catalog: ${error.message}`);
    return null;
  }
}

const mainCatalog = embeddedCatalog(main, 'Throwline main app');
const stageCatalog = embeddedCatalog(stage, 'Stage 3D');
if (mainCatalog && JSON.stringify(mainCatalog) !== JSON.stringify(catalog)) fail('Throwline main embedded catalog is stale.');
if (stageCatalog && JSON.stringify(stageCatalog) !== JSON.stringify(catalog)) fail('Stage 3D embedded catalog is stale.');
if (!fs.existsSync(path.join(ROOT, 'scripts/sync_throwline_catalog.js'))) fail('Throwline catalog sync script is missing.');
if (packageJson?.scripts?.['sync:throwline-catalog'] !== 'node scripts/sync_throwline_catalog.js') fail('Package catalog sync command is missing.');
if (packageJson?.scripts?.['check:throwline-catalog'] !== 'node scripts/sync_throwline_catalog.js --check') fail('Package catalog check command is missing.');
if (!String(packageJson?.scripts?.['verify:throwline'] || '').includes('sync_throwline_catalog.js --check')) fail('Throwline verification must reject stale embedded catalogs.');

if (catalog) {
  const expectedCounts = {
    manufacturers: 5,
    projectors: 4,
    lenses: 13,
    compatibility: 13,
    opticalProfiles: 8,
    sources: 13,
    researchExceptions: 6,
  };
  if (catalog.schemaVersion !== 1) fail('Throwline pilot catalog must use schema version 1.');
  if (catalog.meta?.sourceWorkbookSha256 !== '4a70b2b553df12beee1373592e251e30ed1d84257304848b9c32cbc1e3ea818d') {
    fail('Throwline pilot catalog workbook fingerprint does not match the audited source.');
  }
  if (JSON.stringify(catalog.meta?.counts) !== JSON.stringify(expectedCounts)) {
    fail(`Throwline pilot catalog counts must be ${JSON.stringify(expectedCounts)}.`);
  }
  if (catalog.meta?.calculationReadyCount !== 0) fail('Throwline pilot catalog must contain zero calculation-ready profiles.');

  const collections = [
    ['manufacturers', 'manufacturer_id'],
    ['projectors', 'projector_id'],
    ['lenses', 'lens_id'],
    ['compatibility', 'compatibility_id'],
    ['opticalProfiles', 'optical_profile_id'],
    ['sources', 'source_id'],
    ['researchExceptions', 'exception_id'],
  ];
  const ids = {};
  collections.forEach(([name, key]) => {
    const rows = Array.isArray(catalog[name]) ? catalog[name] : [];
    const values = rows.map((row) => row[key]);
    ids[name] = new Set(values);
    if (rows.length !== expectedCounts[name]) fail(`Throwline pilot catalog ${name} count is invalid.`);
    if (values.some((value) => typeof value !== 'string' || !value)) fail(`Throwline pilot catalog ${name} contains a missing ID.`);
    if (ids[name].size !== values.length) fail(`Throwline pilot catalog ${name} contains duplicate IDs.`);
  });
  catalog.compatibility.forEach((row) => {
    if (!ids.projectors.has(row.projector_id)) fail(`Compatibility ${row.compatibility_id} references a missing projector.`);
    if (!ids.lenses.has(row.lens_id)) fail(`Compatibility ${row.compatibility_id} references a missing lens.`);
  });
  catalog.opticalProfiles.forEach((profile) => {
    if (!ids.projectors.has(profile.projector_id)) fail(`Profile ${profile.optical_profile_id} references a missing projector.`);
    if (!ids.lenses.has(profile.lens_id)) fail(`Profile ${profile.optical_profile_id} references a missing lens.`);
    if (!ids.compatibility.has(profile.compatibility_id)) fail(`Profile ${profile.optical_profile_id} references missing compatibility.`);
    if (!Number.isFinite(profile.throw_ratio_min) || !Number.isFinite(profile.throw_ratio_max) || profile.throw_ratio_min <= 0 || profile.throw_ratio_max < profile.throw_ratio_min) {
      fail(`Profile ${profile.optical_profile_id} has an invalid throw-ratio range.`);
    }
    if (profile.automaticCalculationAllowed !== false) fail(`Profile ${profile.optical_profile_id} must be calculation-blocked.`);
    if (!['manufacturer_unspecified', 'conflicting', 'partial'].includes(profile.calculationState)) {
      fail(`Profile ${profile.optical_profile_id} has an invalid calculation state.`);
    }
  });
}

if (!avRegistry || !Array.isArray(avRegistry.tools)) fail('SBD_REGISTRY.tools did not load.');

requireMatch(main, /<!DOCTYPE html>/i, 'ProjectorThrow/index.html is missing its HTML document type.');
requireMatch(main, /<html\s+lang=["']en["']>/i, 'Throwline must remain a standalone HTML document without shared-theme opt-in attributes.');
if (/data-av-theme|data-av-tool|av-theme\.css/i.test(main)) fail('Throwline must not load or opt into the shared AV theme.');
if (/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/i.test(main)) fail('Throwline main app must not load an external stylesheet.');
if (/<script\b[^>]*\bsrc=/i.test(main)) fail('Throwline main app must not load an external script.');
if (/unpkg\.com|three(?:\.module)?\.js/i.test(main)) fail('Throwline main app must not depend on Three.js or unpkg.');
requireMatch(main, /const APP_VERSION = 4;/, 'Throwline must retain state schema 4.');
['catalogProjector', 'catalogLens', 'catalogEvidence', 'calculationGate'].forEach((id) => {
  requireMatch(main, new RegExp(`id=["']${id}["']`), `Throwline main app is missing the ${id} catalog control.`);
});
['parseCatalog', 'eligibleProfile', 'resolveCatalogSelection', 'calculationInputFor'].forEach((name) => {
  requireMatch(main, new RegExp(`function\\s+${name}\\s*\\(`), `Throwline main app is missing the ${name} safety boundary.`);
});
['legacy_unverified', 'manufacturer_unspecified', 'manual', 'field_verified'].forEach((state) => {
  if (!main.includes(state)) fail(`Throwline main app is missing the ${state} calculation state.`);
});
requireMatch(main, /calculationState:\s*["']legacy_unverified["']/, 'Legacy built-in lenses must be explicitly calculation-blocked.');
requireMatch(main, /CALCULATION BLOCKED/, 'Throwline must visibly identify calculation-blocked catalog selections.');
requireMatch(main, /function\s+solveGear\s*\([^)]+\)[\s\S]*?eligibleProfile\s*\(/, 'The gear solver must use the centralized automatic-calculation eligibility policy.');
requireMatch(main, /catalogProjectorId:\s*c\.catalogSelection\.projector/, 'Saved Throwline jobs must preserve the exact catalog projector selection.');
requireMatch(main, /catalogLensId:\s*c\.catalogSelection\.lens/, 'Saved Throwline jobs must preserve the exact catalog lens selection.');
requireMatch(main, /calculationState:\s*c\.calculationMode/, 'Saved Throwline jobs must preserve their calculation state.');
requireMatch(main, /put\(["']cp["'],\s*s\.catalogProjectorId\).*put\(["']cl["'],\s*s\.catalogLensId\).*put\(["']cs["'],\s*s\.calculationState\)/, 'Share links must preserve exact catalog IDs and calculation state.');
requireMatch(main, /calculationState:\s*p\.get\(["']cs["']\)\s*\|\|\s*["']legacy_unverified["']/, 'Legacy share links must migrate to calculation-blocked state.');
requireMatch(main, /\["actualDist",\s*"actualWidth",\s*"actualFl",\s*"verifiedBy"\][\s\S]*?verifiedAt\s*=\s*["']["']/, 'Editing field measurements must invalidate the field-verification stamp.');
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
requireMatch(stage, /function\s+syncAdjustLayout\s*\(/, 'Stage 3D must synchronize the Adjust disclosure when crossing its mobile breakpoint.');
requireMatch(stage, /id=["']fieldVerifyToggle["']/, 'Stage 3D must expose a Field Verify control.');
requireMatch(stage, /class=["'][^"']*scene-toolbar/, 'Stage 3D must expose camera and layer controls beside the scene.');
requireMatch(stage, /class=["'][^"']*mobile-exports/, 'Stage 3D must place phone export actions after scene controls.');
requireMatch(stage, /grid-template-areas:[^}]*["']hud["'][^}]*["']controls["'][^}]*["']stage["']/s, 'Stage 3D phone layout must order the answer and controls before the scene.');
requireMatch(stage, /dataset\.fieldVerify\s*=/, 'Stage 3D must expose Field Verify state on the document.');
requireMatch(stage, /if\s*\(enabled\s*&&\s*window\.innerWidth\s*>\s*820\)\s*adjustPanel\.open\s*=\s*true/, 'Stage 3D Field Verify must keep phone adjustments compact.');
requireMatch(main, /id=["']plannerFieldVerify["']/, 'Throwline main app must expose a Field Verify mode control.');
requireMatch(main, /dataset\.fieldVerify\s*=/, 'Throwline main app must expose Field Verify state on the document.');
requireMatch(main, /@media\(max-width:760px\)[\s\S]*?body\[data-field-verify=["']true["']\]\s+main\s*\{[^}]*grid-template-columns:\s*1fr/s, 'Throwline main Field Verify must collapse to one column on phone.');
requireMatch(sidecar, /id\s*=\s*["']controlsHelp["']/, 'Stage 3D must retain a discoverable Controls help trigger.');
requireMatch(sidecar, /stage-first-interaction/, 'Stage 3D must dismiss first-use help after a successful interaction.');
requireMatch(stage, /min-height:\s*44px/, 'Stage 3D must retain 44-pixel touch targets on phone.');
requireMatch(sidecar, /:host\(\[field-verify\]\)\s+\.toolbar/, 'Stage exports must yield to planning data in Field Verify mode.');
requireMatch(sidecar, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.toolbar\s*\{[^}]*display:\s*none/s, 'Stage 3D must hide its internal export toolbar on phone.');
requireMatch(sidecar, /\n\s+runExport\s*\(format\)/, 'Stage 3D must expose its existing export flow to phone controls.');
requireMatch(stage, /function\s+disposeObject3D\s*\(/, 'Stage 3D must dispose resources replaced during model rebuilds.');
requireMatch(sidecar, /visibilitychange/, 'Stage 3D must pause or gate rendering when the document is hidden.');
requireMatch(sidecar, /requestRender\s*\(/, 'Stage 3D must use invalidation-driven rendering.');
if (/preserveDrawingBuffer\s*:\s*true/.test(sidecar)) fail('Stage 3D must not keep preserveDrawingBuffer enabled globally.');
requireMatch(sidecar, /captureCanvas\s*\(/, 'Stage 3D must expose a capture-specific immediate render path.');
requireMatch(sidecar, /renderer\.dispose\s*\(/, 'Stage 3D must dispose its renderer on final teardown.');
requireMatch(stage, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Stage 3D must respect reduced-motion preferences.');
requireMatch(stage, /\.band::before/, 'Stage 3D range bars must include a non-color tick treatment.');
requireMatch(stage, /if\s*\(objectMounted\)\s*setCamera\(activeCamera/, 'Stage 3D must reframe the active camera after geometry changes.');
requireMatch(stage, /front:\s*\[0,\s*cy,\s*d\*0\.22\]/, 'Stage 3D front camera must inspect image fit from the projector side of the screen.');
requireMatch(main, /\.zoom-track::before/, 'Throwline main range bars must include a non-color tick treatment.');
requireMatch(read('CHANGELOG.md'), /Throwline Stage 3D audit/i, 'CHANGELOG must describe the Throwline Stage 3D audit release.');

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
