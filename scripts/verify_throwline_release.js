#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const APPENDIX_SHA256 = '8afbcad015b0b4ce5d5a2904dac7d5d60d259cc8547940e97224e2656527a674';
const APPENDIX_ROWS_SHA256 = 'f1b3cb61adbf89cfd27965a383796ba90b763908a37bd5d45819211fcfc81ad7';
const APPENDIX_ROW_KEYS = [
  'projector_id',
  'manufacturer_id',
  'manufacturer_name',
  'model_number',
  'model_name',
  'canonical_model_key',
  'market_segment',
  'product_status',
  'projector_type',
  'light_source',
  'display_technology',
  'native_resolution',
  'native_aspect_ratio',
  'brightness_ansi_lm',
  'brightness_standard_or_mode',
  'contrast_ratio',
  'lens_mount_or_system',
  'has_interchangeable_lens',
  'operating_orientation_notes',
  'product_page_url',
  'primary_datasheet_url',
  'primary_manual_url',
  'last_verified_at',
  'confidence',
  'record_notes',
];
const APPENDIX_OVERLAP_POLICY = 'PRJ-001 through PRJ-004 retain the audited canonical records; appendix rows are raw evidence only.';
const APPENDIX_REVIEW_DISPOSITION = 'Do not use lifecycle, brightness, resolution, contrast, lens-system, or confidence claims as planning inputs until field-level provenance is normalized.';
// Frozen after the 2026-09-04 verification pass; any catalog edit must re-pin these deliberately.
const PILOT_ARRAY_SHA256 = {
  projectors: '34599a9db73725c42c7afae5d83919a31db8596178c86189bb34d334392dc7da',
  lenses: 'da1bd0a9c89e9e1ff00fb369d930a5af09a9d4c8714ad283ccd2232aa7b0447e',
  compatibility: '97e740b4c48ea9913119256a7ea5268f2754ddf98c485daee540aaca604b4085',
  opticalProfiles: '1ad1f31f8d472b4dd7b73d3d2da554b918b8cba0c63927087c420b8d0619ea9d',
};
const MAKER_DOMAINS = {
  'MFR-001': ['panasonic.com'],
  'MFR-002': ['epson.com'],
  'MFR-003': ['sony.net', 'sony.com'],
  'MFR-004': ['barco.com'],
};
const CALCULATION_READY_PROFILE_IDS = ['OPT-001', 'OPT-002', 'OPT-003', 'OPT-004', 'OPT-005', 'OPT-006', 'OPT-009', 'OPT-010', 'OPT-011', 'OPT-012'];
const CALCULATION_BLOCKED_PROFILE_IDS = ['OPT-007', 'OPT-008'];
const APPENDIX_OVERLAP_PROJECTOR_IDS = ['PRJ-001', 'PRJ-002', 'PRJ-003', 'PRJ-004'];
const APPENDIX_NEW_PROJECTOR_IDS = [
  'PRJ-005',
  'PRJ-006',
  'PRJ-007',
  'PRJ-008',
  'PRJ-009',
  'PRJ-010',
  'PRJ-011',
  'PRJ-012',
  'PRJ-013',
];
const REFERENCE_ONLY_PROJECTOR_IDS = new Set(APPENDIX_NEW_PROJECTOR_IDS);

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

function hashJson(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isObjectRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateObjectRows(rows, label) {
  let valid = true;
  rows.forEach((row, index) => {
    if (!isObjectRecord(row)) {
      fail(`${label} row ${index + 1} must be an object.`);
      valid = false;
    }
  });
  return valid;
}

function setsMatch(values, expectedValues) {
  return values.size === expectedValues.length && expectedValues.every((value) => values.has(value));
}

function validateProjectorReferenceAppendix(catalog, pilotProjectorIds, manufacturerRows) {
  const appendix = catalog.projectorReferenceAppendix;
  if (appendix === undefined) {
    fail('Throwline pilot catalog is missing projectorReferenceAppendix.');
    return;
  }
  if (!isObjectRecord(appendix)) {
    fail('Throwline pilot catalog projectorReferenceAppendix must be an object.');
    return;
  }

  if (appendix.catalogRole !== 'user_supplied_reference_only') {
    fail('Throwline projector reference appendix catalogRole must be user_supplied_reference_only.');
  }
  if (appendix.automaticPlanningInputsAllowed !== false) {
    fail('Throwline projector reference appendix must prohibit automatic planning inputs.');
  }
  if (appendix.sourceSha256 !== APPENDIX_SHA256) {
    fail('Throwline projector reference appendix source fingerprint does not match the supplied reference.');
  }
  if (appendix.sourceAttachment !== 'pasted-text.txt') {
    fail('Throwline projector reference appendix sourceAttachment must be pasted-text.txt.');
  }
  if (appendix.receivedOn !== '2026-08-24') {
    fail('Throwline projector reference appendix receivedOn must be 2026-08-24.');
  }
  if (appendix.overlapPolicy !== APPENDIX_OVERLAP_POLICY) {
    fail('Throwline projector reference appendix overlapPolicy changed from the reviewed disposition.');
  }
  if (appendix.reviewDisposition !== APPENDIX_REVIEW_DISPOSITION) {
    fail('Throwline projector reference appendix reviewDisposition changed from the reviewed disposition.');
  }
  if (!Array.isArray(appendix.rows)) {
    fail('Throwline projector reference appendix rows must be an array.');
    return;
  }

  const rows = appendix.rows;
  if (rows.length !== 13) {
    fail('Throwline projector reference appendix must contain exactly 13 rows.');
    return;
  }
  if (!validateObjectRows(rows, 'Throwline projector reference appendix')) return;

  rows.forEach((row, index) => {
    if (JSON.stringify(Object.keys(row)) !== JSON.stringify(APPENDIX_ROW_KEYS)) {
      fail(`Throwline projector reference appendix row ${index + 1} must use the exact ordered 25-field schema.`);
      return;
    }
    if (APPENDIX_ROW_KEYS.some((key) => typeof row[key] !== 'string')) {
      fail(`Throwline projector reference appendix row ${index + 1} fields must all be strings.`);
    }
  });
  if (hashJson(rows) !== APPENDIX_ROWS_SHA256) {
    fail('Throwline projector reference appendix rows changed from the supplied reference.');
  }

  const projectorIdValues = rows.map((row) => row.projector_id);
  const validProjectorIds = projectorIdValues.filter((value) => typeof value === 'string' && value.trim());
  const projectorIds = new Set(validProjectorIds);
  if (validProjectorIds.length !== 13 || projectorIds.size !== 13) {
    fail('Throwline projector reference appendix must contain 13 unique nonempty projector_id values.');
  }

  const canonicalModelKeyValues = rows.map((row) => row.canonical_model_key);
  const validCanonicalModelKeys = canonicalModelKeyValues.filter((value) => typeof value === 'string' && value.trim());
  if (canonicalModelKeyValues.some((value) => typeof value === 'string' && value !== value.trim())) {
    fail('Throwline projector reference appendix canonical_model_key values must not contain surrounding whitespace.');
  }
  if (validCanonicalModelKeys.length !== 13 || new Set(validCanonicalModelKeys).size !== 13) {
    fail('Throwline projector reference appendix must contain 13 unique nonempty canonical_model_key values.');
  }

  if (pilotProjectorIds) {
    const overlapIds = new Set([...projectorIds].filter((projectorId) => pilotProjectorIds.has(projectorId)));
    const newIds = new Set([...projectorIds].filter((projectorId) => !pilotProjectorIds.has(projectorId)));
    if (!setsMatch(overlapIds, APPENDIX_OVERLAP_PROJECTOR_IDS)) {
      fail(`Throwline projector reference appendix overlap IDs must be exactly ${APPENDIX_OVERLAP_PROJECTOR_IDS.join(', ')}.`);
    }
    if (!setsMatch(newIds, APPENDIX_NEW_PROJECTOR_IDS)) {
      fail(`Throwline projector reference appendix new IDs must be exactly ${APPENDIX_NEW_PROJECTOR_IDS.join(', ')}.`);
    }
  }

  if (manufacturerRows) {
    const manufacturerNamesById = new Map(manufacturerRows.map((row) => [row.manufacturer_id, row.manufacturer_name]));
    rows.forEach((row, index) => {
      if (typeof row.manufacturer_id !== 'string'
        || typeof row.manufacturer_name !== 'string'
        || manufacturerNamesById.get(row.manufacturer_id) !== row.manufacturer_name) {
        fail(`Throwline projector reference appendix row ${index + 1} manufacturer_id/name must resolve exactly to catalog.manufacturers.`);
      }
    });
  }
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
const avWorker = read('av-suite-worker.js');
const sceneState = read('ProjectorThrow/throwline-scene-state.js');
const sitemap = read('sitemap.xml');
const avRegistry = registry();
const catalogSource = read('ProjectorThrow/data/throwline-pilot-catalog.v1.json');
const catalog = readJson('ProjectorThrow/data/throwline-pilot-catalog.v1.json');
const packageJson = readJson('package.json');
const pagesWorkflow = read('.github/workflows/deploy-pages.yml');

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
    opticalProfiles: 12,
    sources: 18,
    researchExceptions: 8,
  };
  if (catalog.schemaVersion !== 1) fail('Throwline pilot catalog must use schema version 1.');
  if (catalog.meta?.sourceWorkbookSha256 !== '4a70b2b553df12beee1373592e251e30ed1d84257304848b9c32cbc1e3ea818d') {
    fail('Throwline pilot catalog workbook fingerprint does not match the audited source.');
  }
  if (JSON.stringify(catalog.meta?.counts) !== JSON.stringify(expectedCounts)) {
    fail(`Throwline pilot catalog counts must be ${JSON.stringify(expectedCounts)}.`);
  }
  const readyProfiles = Array.isArray(catalog.opticalProfiles) ? catalog.opticalProfiles.filter((profile) => profile && profile.automaticCalculationAllowed === true) : [];
  if (catalog.meta?.calculationReadyCount !== readyProfiles.length) fail('Throwline catalog calculationReadyCount must equal the number of calculation-ready profiles.');
  if (catalog.meta?.calculationReadyCount !== CALCULATION_READY_PROFILE_IDS.length) fail(`Throwline catalog must contain exactly ${CALCULATION_READY_PROFILE_IDS.length} calculation-ready profiles.`);
  if (!catalog.meta?.verificationPass?.id || !catalog.meta.verificationPass.rule) fail('Throwline catalog must record the verification pass and its rule.');

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
  const collectionRows = {};
  const validCollections = {};
  collections.forEach(([name, key]) => {
    if (!Array.isArray(catalog[name])) {
      fail(`Throwline pilot catalog ${name} must be an array.`);
      ids[name] = new Set();
      collectionRows[name] = [];
      validCollections[name] = false;
      return;
    }

    const rows = catalog[name];
    collectionRows[name] = rows;
    const hasExpectedCount = rows.length === expectedCounts[name];
    if (!hasExpectedCount) fail(`Throwline pilot catalog ${name} count is invalid.`);
    const hasObjectRows = validateObjectRows(rows, `Throwline pilot catalog ${name}`);
    if (!hasObjectRows) {
      ids[name] = new Set();
      validCollections[name] = false;
      return;
    }

    const values = rows.map((row) => row[key]);
    ids[name] = new Set(values);
    const hasValidIds = !values.some((value) => typeof value !== 'string' || !value);
    const hasUniqueIds = ids[name].size === values.length;
    if (!hasValidIds) fail(`Throwline pilot catalog ${name} contains a missing ID.`);
    if (!hasUniqueIds) fail(`Throwline pilot catalog ${name} contains duplicate IDs.`);
    validCollections[name] = hasExpectedCount && hasValidIds && hasUniqueIds;
  });

  Object.entries(PILOT_ARRAY_SHA256).forEach(([name, expectedSha256]) => {
    const rows = Array.isArray(catalog[name]) ? catalog[name] : [];
    if (hashJson(rows) !== expectedSha256) fail(`Throwline pilot catalog ${name} changed from the frozen pilot array.`);
  });

  validateProjectorReferenceAppendix(
    catalog,
    validCollections.projectors ? ids.projectors : null,
    validCollections.manufacturers ? collectionRows.manufacturers : null,
  );

  const compatibilityRows = validCollections.compatibility ? collectionRows.compatibility : [];
  const opticalProfileRows = validCollections.opticalProfiles ? collectionRows.opticalProfiles : [];
  const compatibilityById = new Map(compatibilityRows.map((row) => [row.compatibility_id, row]));
  if (validCollections.compatibility && validCollections.projectors && validCollections.lenses) {
    compatibilityRows.forEach((row) => {
      if (!ids.projectors.has(row.projector_id)) fail(`Compatibility ${row.compatibility_id} references a missing projector.`);
      if (!ids.lenses.has(row.lens_id)) fail(`Compatibility ${row.compatibility_id} references a missing lens.`);
      if (REFERENCE_ONLY_PROJECTOR_IDS.has(row.projector_id)) fail(`Compatibility ${row.compatibility_id} must not reference appendix-only projector ${row.projector_id}.`);
    });
  }
  if (validCollections.opticalProfiles && validCollections.projectors && validCollections.lenses && validCollections.compatibility) {
    opticalProfileRows.forEach((profile) => {
      if (!ids.projectors.has(profile.projector_id)) fail(`Profile ${profile.optical_profile_id} references a missing projector.`);
      if (!ids.lenses.has(profile.lens_id)) fail(`Profile ${profile.optical_profile_id} references a missing lens.`);
      const compatibility = compatibilityById.get(profile.compatibility_id);
      if (!compatibility) {
        fail(`Profile ${profile.optical_profile_id} references missing compatibility.`);
      } else if (compatibility.projector_id !== profile.projector_id || compatibility.lens_id !== profile.lens_id) {
        fail(`Profile ${profile.optical_profile_id} compatibility ${profile.compatibility_id} must reference the same projector and lens.`);
      }
      if (REFERENCE_ONLY_PROJECTOR_IDS.has(profile.projector_id)) fail(`Profile ${profile.optical_profile_id} must not reference appendix-only projector ${profile.projector_id}.`);
      if (!Number.isFinite(profile.throw_ratio_min) || !Number.isFinite(profile.throw_ratio_max) || profile.throw_ratio_min <= 0 || profile.throw_ratio_max < profile.throw_ratio_min) {
        fail(`Profile ${profile.optical_profile_id} has an invalid throw-ratio range.`);
      }
      const projectorRow = collectionRows.projectors.find((row) => row.projector_id === profile.projector_id);
      const sourcesById = new Map((collectionRows.sources || []).map((row) => [row.source_id, row]));
      if (CALCULATION_READY_PROFILE_IDS.includes(profile.optical_profile_id)) {
        // Calculation-ready profiles must carry maker evidence that the ratio is distance over image width.
        if (profile.automaticCalculationAllowed !== true || profile.calculationState !== 'verified_image_width') fail(`Profile ${profile.optical_profile_id} must be calculation-ready.`);
        if (profile.throw_ratio_basis !== 'image_width') fail(`Profile ${profile.optical_profile_id} must declare an image_width basis.`);
        if (!Number.isFinite(profile.basisAspect) || profile.basisAspect <= 0 || !profile.basisAspectLabel) fail(`Profile ${profile.optical_profile_id} must declare its basis picture shape.`);
        const evidence = profile.verificationEvidence;
        if (!evidence || !evidence.checkedOn || !evidence.method || !evidence.excerpt || !Array.isArray(evidence.crossChecks) || !evidence.crossChecks.length) {
          fail(`Profile ${profile.optical_profile_id} is missing verification evidence.`);
        } else {
          const source = sourcesById.get(evidence.source_id);
          const domains = MAKER_DOMAINS[projectorRow?.manufacturer_id] || [];
          let host = '';
          try { host = new URL(source?.url || '').hostname; } catch (error) { host = ''; }
          if (!source || !domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) fail(`Profile ${profile.optical_profile_id} evidence must cite a document on the maker's own domain (${domains.join(', ')}).`);
          evidence.crossChecks.forEach((check, index) => {
            const min = check.distanceMinM / check.imageWidthM;
            const max = check.distanceMaxM / check.imageWidthM;
            if (!(Math.abs(min - check.ratioMinPublished) / check.ratioMinPublished <= 0.02) || !(Math.abs(max - check.ratioMaxPublished) / check.ratioMaxPublished <= 0.02)) {
              fail(`Profile ${profile.optical_profile_id} cross-check ${index + 1} does not reproduce the published ratio within 2 percent.`);
            }
          });
        }
        (Array.isArray(profile.aspectVariants) ? profile.aspectVariants : []).forEach((item) => {
          if (!Number.isFinite(item.aspect) || !Number.isFinite(item.throw_ratio_min) || !Number.isFinite(item.throw_ratio_max) || item.throw_ratio_min <= 0 || item.throw_ratio_max < item.throw_ratio_min || !item.label) {
            fail(`Profile ${profile.optical_profile_id} has an invalid aspect variant.`);
          }
        });
      } else {
        if (!CALCULATION_BLOCKED_PROFILE_IDS.includes(profile.optical_profile_id)) fail(`Profile ${profile.optical_profile_id} is not in the reviewed ready or blocked lists.`);
        if (profile.automaticCalculationAllowed !== false) fail(`Profile ${profile.optical_profile_id} must be calculation-blocked.`);
        if (!['manufacturer_unspecified', 'conflicting', 'partial'].includes(profile.calculationState)) {
          fail(`Profile ${profile.optical_profile_id} has an invalid calculation state.`);
        }
        if (!String(profile.calculationGateReason || '').trim()) fail(`Profile ${profile.optical_profile_id} must explain why it is blocked.`);
      }
    });
    collectionRows.projectors.forEach((row) => {
      const body = row.body;
      if (!body || ![body.width_mm, body.height_mm, body.depth_mm, body.weight_kg].every((value) => Number.isFinite(value) && value > 0) || !body.source_id) fail(`Projector ${row.projector_id} must carry maker-published body dimensions with a source.`);
    });
  }
}

if (!avRegistry || !Array.isArray(avRegistry.tools)) fail('SBD_REGISTRY.tools did not load.');

requireMatch(main, /<!DOCTYPE html>/i, 'ProjectorThrow/index.html is missing its HTML document type.');
requireMatch(main, /<html\s+lang=["']en["']>/i, 'Throwline must remain a standalone HTML document without shared-theme opt-in attributes.');
requireMatch(main, /const DEFAULT_WORKSPACE = ["']Stage3D\.html["']/, 'Throwline must make Stage 3D the default workspace.');
requireMatch(main, /query\.get\(["']workspace["']\) === ["']planner["']/, 'Throwline must retain an explicit planner launch route.');
requireMatch(main, /window\.location\.hash\.length > 1/, 'Throwline must preserve existing hash-based planner share links.');
requireMatch(main, /window\.location\.replace\(`\$\{DEFAULT_WORKSPACE\}\$\{window\.location\.search\}`\)/, 'Throwline default launch must preserve query parameters when opening Stage 3D.');
if (/data-av-theme|data-av-tool|av-theme\.css/i.test(main)) fail('Throwline must not load or opt into the shared AV theme.');
if (/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/i.test(main)) fail('Throwline main app must not load an external stylesheet.');
const mainScriptSources = Array.from(main.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
if (JSON.stringify(mainScriptSources) !== JSON.stringify(['./throwline-scene-state.js', '../js/vendor/gsap.min.js'])) {
  fail('Throwline main app must load only its shared scene-state contract and locally bundled GSAP runtime.');
}
if (!fs.existsSync(path.join(ROOT, 'js/vendor/gsap.min.js'))) fail('Throwline locally bundled GSAP runtime is missing.');
if (!avRegistry?.offlineAssets?.().includes('./js/vendor/gsap.min.js')) fail('Throwline GSAP runtime must remain in the AV offline asset manifest.');
if (/unpkg\.com|three(?:\.module)?\.js/i.test(main)) fail('Throwline main app must not depend on Three.js or unpkg.');
requireMatch(main, /const APP_VERSION = 4;/, 'Throwline must retain state schema 4.');
requireMatch(main, /html,\s*body\s*\{[\s\S]*?overflow:\s*hidden;/, 'Throwline must keep the document viewport locked without page scrolling.');
requireMatch(main, /--console-raised:\s*#fffdf8;[\s\S]*?--signal:\s*#216f9d;/, 'Throwline must retain the light optical-console surface and signal tokens.');
requireMatch(main, /html\[data-theme=["']dark["']\]\s*\{[\s\S]*?--console-raised:\s*#20242b;[\s\S]*?--signal:\s*#6bb8eb;/, 'Throwline must retain the dark optical-console surface and signal tokens.');
requireMatch(main, /\.readout::before\s*\{[\s\S]*?border-radius:\s*50%;/, 'Throwline must retain the live readout lens treatment.');
requireMatch(main, /\.badge::before\s*\{[\s\S]*?box-shadow:\s*0 0 8px currentColor;/, 'Throwline must retain illuminated status indicators.');
requireMatch(main, /class=["']workspace-tabs["'][^>]*role=["']tablist["']/, 'Throwline must expose setup stages as an accessible tablist.');
requireMatch(main, /class=["']result-tabs["'][^>]*role=["']tablist["']/, 'Throwline must expose diagnostics as an accessible tablist.');
requireMatch(main, /function\s+setSetupPanel\s*\(/, 'Throwline must retain setup-panel navigation.');
requireMatch(main, /function\s+setResultPanel\s*\(/, 'Throwline must retain diagnostic-panel navigation.');
requireMatch(main, /function\s+setMobileView\s*\(/, 'Throwline must retain the compact Setup, Live, and Inspect workspace switcher.');
requireMatch(main, /window\.gsap\.matchMedia\s*\(/, 'Throwline motion must use GSAP matchMedia for reduced-motion handling.');
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
requireMatch(main, /CAN[’']T CALCULATE YET/, 'Throwline must visibly identify calculation-blocked catalog selections in plain language.');
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
if (/matchMedia\(["'`]\s*\(prefers-color-scheme/i.test(main)) fail('Throwline must not override its explicit light default from the operating-system theme.');
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

requireMatch(stage, /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*script-src 'self' 'unsafe-inline'[^>]*connect-src 'self'/i, 'Stage 3D CSP must keep the runtime local and offline-ready.');
if (/unpkg\.com|cdn\.jsdelivr\.net/.test(stage) || /unpkg\.com|cdn\.jsdelivr\.net/.test(sidecar)) fail('Stage 3D must not depend on a remote module CDN.');
requireMatch(stage, /"three":\s*"\.\/vendor\/three\/three\.module\.js"/, 'Stage 3D import map must use the locally vendored Three.js engine.');
requireMatch(stage, /<script\s+src=["']\.\/throwline-scene-state\.js["']><\/script>[\s\S]*?<script\s+src=["']\.\.\/js\/vendor\/gsap\.min\.js["']><\/script>[\s\S]*?<script\s+src=["']\.\/three-d-stage\.js["']><\/script>/, 'Stage 3D must load the scene contract, local GSAP runtime, and sidecar in order.');
requireMatch(stage, /<script\s+src=["']\.\/three-d-stage\.js["']><\/script>/, 'Stage 3D must load its colocated sidecar.');
requireMatch(stage, /href=["']index\.html\?workspace=planner["']/, 'Stage 3D must expose the detailed Throwline planner.');
requireMatch(stage, /fallback=["']index\.html\?workspace=planner["']/, 'Stage 3D must offer the offline planner fallback.');
requireMatch(sidecar, /this\.getAttribute\(["']fallback["']\) \|\| ["']index\.html\?workspace=planner["']/, 'Stage 3D renderer failures must return to the explicit planner route.');
requireMatch(stage, /Preparing offline use · local engine/i, 'Stage 3D must start with truthful offline-preparation wording.');
requireMatch(stage, /navigator\.serviceWorker\.register\(['"]\.\.\/av-suite-worker\.js['"]\)/, 'Stage 3D must register the existing AV offline worker on direct visits.');
requireMatch(stage, /function\s+controllingWorkerVersion\s*\([\s\S]*?navigator\.serviceWorker\?\.controller[\s\S]*?SBD_OFFLINE_VERSION/, 'Stage 3D must read the controlling service worker version before claiming offline readiness.');
requireMatch(stage, /if\(version!==OFFLINE_CACHE_VERSION\)return false;[\s\S]*?setOfflineStatus\(['"]ready['"]/, 'Stage 3D must claim Offline ready only for the current cache version.');
if (!stage.includes(`const OFFLINE_CACHE_VERSION = '${avRegistry?.version}';`)) fail('Stage 3D offline readiness must pin the current AV cache version.');
requireMatch(avWorker, /SBD_OFFLINE_VERSION[\s\S]*?SBD_REGISTRY\.version/, 'The AV service worker must report its active offline cache version.');
requireMatch(stage, /id=["']offlineBadge["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/, 'Stage 3D must expose its offline state visibly and accessibly.');
const localThreeAssets = [
  'ProjectorThrow/vendor/three/three.module.js',
  'ProjectorThrow/vendor/three/three.core.js',
  'ProjectorThrow/vendor/three/addons/controls/OrbitControls.js',
  'ProjectorThrow/vendor/three/addons/exporters/OBJExporter.js',
  'ProjectorThrow/vendor/three/addons/exporters/GLTFExporter.js',
];
localThreeAssets.forEach((asset) => {
  if (!fs.existsSync(path.join(ROOT, asset))) fail(`Stage 3D local engine asset is missing: ${asset}.`);
  if (!avRegistry?.offlineAssets?.().includes(`./${asset}`)) fail(`Stage 3D offline manifest is missing ./${asset}.`);
});
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
requireMatch(stage, /id=["']stageCalculationGate["'][^>]*role=["']status["']/, 'Stage 3D must expose its calculation gate as an accessible status.');
if (!stage.includes('MANUAL SIMULATION')) fail('Direct-open Stage 3D must be explicitly labeled MANUAL SIMULATION.');
['parseStageCatalog', 'resolveStageTransfer', 'opticalGeometryAllowed'].forEach((name) => {
  requireMatch(stage, new RegExp(`function\\s+${name}\\s*\\(`), `Stage 3D is missing the ${name} safety boundary.`);
});
requireMatch(stage, /dataset\.calculationMode\s*=/, 'Stage 3D must expose its calculation mode for diagnostics.');
requireMatch(stage, /new\s+URLSearchParams\(location\.search\)/, 'Stage 3D must validate planner transfer parameters.');
requireMatch(stage, /requestedMode\s*===\s*["']legacy_unverified["'][\s\S]*?Broad legacy source rows are reference-only/, 'Stage 3D must preserve the legacy-unverified gate reason from planner transfers.');
requireMatch(stage, /if\s*\(opticalGeometryAllowed\(\)\)[\s\S]*?buildProjection\s*\(/, 'Stage 3D must gate projection geometry through opticalGeometryAllowed().');
requireMatch(sceneState, /optical\.min\s*\*\s*optical\.basisWidth/, 'Throwline throw limits must use the transferred projected-raster width basis.');
requireMatch(stage, /geometry\.envelope\.wideDistance/, 'Stage 3D throw limits must come from the shared scene-state envelope.');
requireMatch(stage, /state\.dist\s*\/\s*state\.basisW/, 'Stage 3D required ratio must use the projected-raster width basis.');
requireMatch(stage, /type:\s*['"]snap-distance['"]/, 'Stage 3D snap controls must use the exact optical-stop intent instead of quarter-foot rounding.');
requireMatch(stage, /SceneState\.roomConflicts\(/, 'Stage 3D must derive room conflicts from the shared scene-state contract.');
requireMatch(stage, /geometry\.shift\b/, 'Stage 3D must judge lens shift through the direction-aware scene-state assessment.');
requireMatch(stage, /requestedMode\s*===\s*['"]field_verified['"][\s\S]*?number\(['"]md['"][\s\S]*?number\(['"]mw['"][\s\S]*?Date\.parse\(stamp\)/, 'Stage 3D must require measurement evidence and a real timestamp before honoring a FIELD VERIFIED transfer.');
requireMatch(main, /put\(["']md["'][\s\S]*?put\(["']mw["'][\s\S]*?put\(["']vb["']/, 'The planner must transfer the field measurement evidence with a field-verified Stage 3D link.');
['roomConflicts', 'PLACEMENT_TOLERANCE', "'snap-distance'", 'resolveProfileRatio', 'bodyExtents', "'set-body'", 'clearance'].forEach((token) => {
  if (!sceneState.includes(token)) fail(`Throwline scene-state contract is missing ${token}.`);
});
if (!fs.existsSync(path.join(ROOT, 'scripts/probe_throwline_stage3d.js'))) fail('The Stage 3D browser regression probe is missing.');
if (packageJson?.scripts?.['test:throwline-browser'] !== 'node scripts/probe_throwline_stage3d.js --no-sandbox && node scripts/probe_throwline_stage3d.js --no-sandbox --no-webgl') fail('Throwline browser verification must hard-fail both WebGL and degraded-renderer probe runs.');
requireMatch(pagesWorkflow, /Verify Throwline browser runtime[\s\S]*?run:\s*npm run test:throwline-browser/, 'The Pages release gate must run the hard-fail Throwline browser regression suite.');
const stageTryIndex = stage.indexOf('const { THREE } = await stage.ready');
['function rebuildFacts(', 'function readout(', 'function updateWorkspaceFacts(', 'function applySceneIntent(', 'SceneState.createSceneState('].forEach((token) => {
  const index = stage.indexOf(token);
  if (index < 0 || stageTryIndex < 0 || index > stageTryIndex) fail(`Stage 3D must hydrate ${token.trim()} before awaiting the WebGL renderer so calculations survive a renderer failure.`);
});
requireMatch(stage, /SceneState\.assessInstallation\(/, 'Stage 3D headline must come from the aggregate installation check.');
requireMatch(stage, /bounded\(['"]tolPct['"]/, 'Stage 3D must accept the transferred planning tolerance.');
requireMatch(stage, /SceneState\.resolveProfileRatio\(profile,\s*rasterAspect\)/, 'Stage 3D must resolve verified catalog ratios by picture shape.');
requireMatch(stage, /id=["']roomC["']/, 'Stage 3D must expose the keep-clear margin control.');
requireMatch(stage, /type:\s*['"]set-body['"]/, 'Stage 3D must edit projector bodies through the scene contract.');
requireMatch(stage, /buildProjector\(bodyDims\(/, 'Stage 3D must draw projector bodies at their scene dimensions.');
requireMatch(main, /put\(["']bw["']/, 'The planner must transfer maker body dimensions to Stage 3D.');
requireMatch(main, /sceneApi\.resolveProfileRatio\(catalogSelection\.profile,\s*raster\.asp\)/, 'The planner must resolve verified catalog ratios by picture shape.');
requireMatch(main, /put\(["']tolPct["']/, 'The planner must transfer its planning tolerance to Stage 3D.');
['assessInstallation', "'set-tolerance'", 'axisOverlapInterval', 'COVERAGE_TOLERANCE'].forEach((token) => {
  if (!sceneState.includes(token)) fail(`Throwline scene-state contract is missing ${token}.`);
});
if (/id=["']hState["'][^>]*>FITS SUPPLIED RANGE</.test(stage)) fail('Stage 3D must not ship a hard-coded verdict in its markup.');
requireMatch(main, /id=["']stage3dLink["']/, 'The planner Stage 3D link must be state-aware.');
requireMatch(main, /function\s+stage3dUrlFor\s*\(/, 'The planner must serialize validated Stage 3D transfer state.');
requireMatch(main, /ThrowlineSceneState[\s\S]*?createSceneState/, 'The planner must normalize Stage 3D transfer values through the shared scene-state contract.');
requireMatch(sidecar, /Use keys 1 through 5 for cameras/, 'Stage 3D canvas instructions must expose all five camera shortcuts.');
requireMatch(stage, /<details\b[^>]*class=["'][^"']*adjust-panel/, 'Stage 3D controls must use a native Adjust disclosure.');
requireMatch(stage, /function\s+syncAdjustLayout\s*\(/, 'Stage 3D must synchronize the Adjust disclosure when crossing its mobile breakpoint.');
requireMatch(stage, /id=["']fieldVerifyToggle["']/, 'Stage 3D must expose a Field Verify control.');
requireMatch(stage, /id=["']fieldVerificationError["'][^>]*role=["']alert["'][^>]*hidden/, 'Stage 3D Field Verify must expose a visible validation alert.');
requireMatch(stage, /function\s+showFieldVerificationError\s*\([\s\S]*?aria-invalid[\s\S]*?\.focus\(\)/, 'Stage 3D Field Verify must mark invalid fields and focus the first error.');
requireMatch(stage, /class=["'][^"']*scene-toolbar/, 'Stage 3D must expose camera and layer controls beside the scene.');
requireMatch(stage, /class=["'][^"']*mobile-exports/, 'Stage 3D must place phone export actions after scene controls.');
requireMatch(stage, /<dialog\b[^>]*id=["']onboardingDialog["'][^>]*aria-labelledby=["']onboardingTitle["'][^>]*aria-describedby=["']onboardingIntro["']/, 'Stage 3D must expose an accessible first-run onboarding dialog.');
requireMatch(stage, /id=["']quickStartToggle["']/, 'Stage 3D must expose a persistent Quick Start control.');
['screen','projector','verify'].forEach((target) => {
  requireMatch(stage, new RegExp(`data-onboarding-target=["']${target}["']`), `Stage 3D onboarding is missing the ${target} workflow step.`);
});
requireMatch(stage, /const ONBOARDING_STORAGE_KEY = ["']throwline:stage-onboarding:v1["']/, 'Stage 3D onboarding must use its registered versioned storage key.');
requireMatch(stage, /window\.gsap\.matchMedia\(\)/, 'Stage 3D onboarding motion must use GSAP matchMedia.');
requireMatch(stage, /function\s+beginWorkflowStep\s*\(/, 'Stage 3D onboarding must launch real workflow controls.');
requireMatch(stage, /requestAnimationFrame\(\(\)=>\{if\(!onboardingDialog\.open\)return;animateOnboarding\(\);onboardingStart\.focus\(\);\}\)/, 'Stage 3D onboarding must not move focus after a same-frame dismissal.');
requireMatch(stage, /html,body\{overflow:hidden\}/, 'Stage 3D must lock the document to one viewport.');
requireMatch(stage, /height:100dvh;[^}]*grid-template-areas:"header" "stage" "dock"/, 'Stage 3D phone layout must keep the stage permanent above the dock.');
requireMatch(stage, /class=["']mobile-dock["'][^>]*>[\s\S]*data-mobile-panel-button=["']adjust["'][\s\S]*data-mobile-panel-button=["']view["'][\s\S]*data-mobile-panel-button=["']facts["'][\s\S]*data-mobile-panel-button=["']export["']/, 'Stage 3D phone workspace must expose Adjust, View, Facts, and Export sheets.');
requireMatch(stage, /body\[data-mobile-panel=adjust\][\s\S]*body\[data-mobile-panel=view\][\s\S]*body\[data-mobile-panel=facts\][\s\S]*body\[data-mobile-panel=export\]/, 'Stage 3D phone sheets must use one exclusive mobile-panel state.');
requireMatch(stage, /dataset\.fieldVerify\s*=/, 'Stage 3D must expose Field Verify state on the document.');
requireMatch(stage, /if\s*\(enabled\s*&&\s*window\.innerWidth\s*>\s*820\)\s*adjustPanel\.open\s*=\s*true/, 'Stage 3D Field Verify must keep phone adjustments compact.');
requireMatch(main, /id=["']plannerFieldVerify["']/, 'Throwline main app must expose a Field Verify mode control.');
requireMatch(main, /dataset\.fieldVerify\s*=/, 'Throwline main app must expose Field Verify state on the document.');
requireMatch(main, /@media\(max-width:760px\)[\s\S]*?body\[data-field-verify=["']true["']\]\s+main\s*\{[^}]*grid-template-columns:\s*1fr/s, 'Throwline main Field Verify must collapse to one column on phone.');
requireMatch(sidecar, /id\s*=\s*["']controlsHelp["']/, 'Stage 3D must retain a discoverable Controls help trigger.');
requireMatch(sidecar, /stage-first-interaction/, 'Stage 3D must dismiss first-use help after a successful interaction.');
requireMatch(sidecar, /setManipulationTargets\s*\(targets\)/, 'Stage 3D renderer must expose registered direct-manipulation targets.');
requireMatch(sidecar, /stage-manipulation/, 'Stage 3D renderer must emit manipulation intents instead of owning geometry.');
['set-distance','set-lens-height','set-projector-x','set-projector-target-x','set-screen-width','set-screen-bottom'].forEach((intent) => {
  if (!stage.includes(intent)) fail(`Stage 3D is missing its ${intent} direct-manipulation path.`);
});
['placement_envelope','wide_stop','tele_stop','shift_guide','lens_shift_envelope','screen_width_dimension'].forEach((token) => {
  if (!stage.includes(token)) fail(`Stage 3D is missing the ${token} spatial overlay.`);
});
['addUnit','stackUnits','blendUnits','addObstacle','collisionAlert','roomW','roomD','roomH'].forEach((id) => {
  requireMatch(stage, new RegExp(`id=["']${id}["']`), `Stage 3D is missing the ${id} planning control.`);
});
['saveScene','restoreScene','importScene','downloadScene','resetScene'].forEach((id) => {
  requireMatch(stage, new RegExp(`id=["']${id}["']`), `Stage 3D is missing the ${id} scene-data control.`);
});
['normalizeSceneState','calculateProjectorGeometry','applyIntent','stampFieldVerification','obstacleIntersectsBeam'].forEach((name) => {
  requireMatch(sceneState, new RegExp(`function\\s+${name}\\s*\\(`), `Throwline scene state is missing the pure ${name} boundary.`);
});
requireMatch(sceneState, /provenance\.mode !== 'field_verified'[\s\S]*?MANUAL ESTIMATE/, 'Driving scene edits must invalidate field verification.');
requireMatch(sceneState, /const STORAGE_KEY = 'throwline:stage-scene:v1'/, 'Stage 3D scene storage must use the registered versioned key.');
requireMatch(stage, /min-height:\s*44px/, 'Stage 3D must retain 44-pixel touch targets on phone.');
requireMatch(sidecar, /:host\(\[field-verify\]\)\s+\.toolbar/, 'Stage exports must yield to planning data in Field Verify mode.');
requireMatch(sidecar, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.toolbar\s*\{[^}]*display:\s*none/s, 'Stage 3D must hide its internal export toolbar on phone.');
requireMatch(sidecar, /\n\s+runExport\s*\(format\)/, 'Stage 3D must expose its existing export flow to phone controls.');
requireMatch(stage, /function\s+disposeObject3D\s*\(/, 'Stage 3D must dispose resources replaced during model rebuilds.');
requireMatch(sidecar, /visibilitychange/, 'Stage 3D must pause or gate rendering when the document is hidden.');
requireMatch(sidecar, /_contextLostHandler\s*=\s*\(event\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?_showContextLoss\(\)[\s\S]*?webglcontextlost/, 'Stage 3D must handle runtime WebGL loss and permit restoration.');
requireMatch(sidecar, /_contextRestoredHandler\s*=\s*\(\)[\s\S]*?_restoreContext\(\)[\s\S]*?webglcontextrestored/, 'Stage 3D must restore its existing scene after WebGL returns.');
requireMatch(sidecar, /stage-context-lost[\s\S]*?stage-context-restored/, 'Stage 3D must report both runtime graphics transitions to the workspace.');
requireMatch(stage, /surf\.name\s*=\s*['"]screen['"]/, 'Stage 3D exports must name the screen mesh exactly screen.');
requireMatch(stage, /M\.alu,\s*['"]cart['"]\)/, 'Stage 3D exports must name the cart mesh exactly cart.');
requireMatch(sidecar, /requestRender\s*\(/, 'Stage 3D must use invalidation-driven rendering.');
if (/preserveDrawingBuffer\s*:\s*true/.test(sidecar)) fail('Stage 3D must not keep preserveDrawingBuffer enabled globally.');
requireMatch(sidecar, /captureCanvas\s*\(/, 'Stage 3D must expose a capture-specific immediate render path.');
requireMatch(sidecar, /renderer\.dispose\s*\(/, 'Stage 3D must dispose its renderer on final teardown.');
requireMatch(stage, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Stage 3D must respect reduced-motion preferences.');
requireMatch(stage, /\.band::before/, 'Stage 3D range bars must include a non-color tick treatment.');
requireMatch(stage, /if\s*\(objectMounted\)\s*setCamera\(activeCamera/, 'Stage 3D must reframe the active camera after geometry changes.');
requireMatch(stage, /front:\s*\[0,\s*cy,\s*d\*0\.22\]/, 'Stage 3D front camera must inspect image fit from the projector side of the screen.');
requireMatch(main, /\.zoom-track::before/, 'Throwline main range bars must include a non-color tick treatment.');
const changelog = read('CHANGELOG.md');
requireMatch(changelog, /Throwline Stage 3D audit/i, 'CHANGELOG must describe the Throwline Stage 3D audit release.');
requireMatch(changelog, /Throwline Stage 3D spatial workspace/i, 'CHANGELOG must describe the no-scroll spatial workspace release.');
if (!fs.existsSync(path.join(ROOT, 'ProjectorThrow/README.md'))) fail('Throwline architecture documentation is missing.');
['pilot catalog', 'exact compatibility', 'calculation gate', 'manual simulation', 'field calibration', 'legacy migration', 'optical geometry suppression'].forEach((term) => {
  if (!changelog.toLowerCase().includes(term)) fail(`CHANGELOG must document Throwline ${term}.`);
});

const throwlineTools = (avRegistry?.tools || []).filter((tool) => tool.id === 'throwline');
if (throwlineTools.length !== 1 || throwlineTools[0].href !== 'ProjectorThrow/') {
  fail('Registry must contain exactly one Throwline entry at ProjectorThrow/.');
}
if (!throwlineTools[0]?.storageKeys?.some((item) => item.key === 'throwline:stage-scene:v1')) {
  fail('Registry must include the versioned Throwline Stage scene storage key.');
}
if (!throwlineTools[0]?.storageKeys?.some((item) => item.key === 'throwline:stage-onboarding:v1')) {
  fail('Registry must include the versioned Throwline Stage onboarding key.');
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
