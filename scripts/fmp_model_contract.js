'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
// Exact managed equipment artifacts. The release verifier also checks provenance.
const modelFiles = [
  ...['atem-hd8-iso', 'p240', 'ccu4'].map(name => `models/${name}.html`),
  ...['bench-core.js', 'bench.css', 'model-shell.js', 'model-shell.css', 'atem-hd8-iso.css',
    'atem-hd8-iso-0.js', 'atem-hd8-iso-1.js', 'atem-hd8-iso-2.js', 'atem-hd8-iso-3.js',
    'p240-0.js', 'p240-catalog.json', 'ccu4-0.js', 'ccu4-catalog.json',
    // Supplied HD8 ISO reference views; served as files since fmp-suite e643c91.
    'atem-photo-front.png', 'atem-photo-perspective.png', 'atem-photo-rear.png',
    'atem-photo-side.png'].map(name => `models/assets/${name}`),
  'models/vendor/three.min.js', 'models/vendor/LICENSE', 'ptz/SuperJoy-G1-Interactive-Guide.html'
];

// Evidence vocabulary for every FMP equipment catalog; docs/fmp-model-catalog-contract.md
// carries each value's meaning.
const CONFIDENCE = new Set(['Confirmed', 'Documented', 'Reported', 'Inferred', 'Unknown', 'Contradicted']);
const GEOMETRY = new Set(['documented_geometry', 'documented_motion', 'documented_type_photo_grounded',
  'documented_type_approximate_position', 'documented_type_unverified_position', 'photo_grounded',
  'photo_approximation', 'illustrative', 'virtual_route']);
// Every catalog declares these.
const CATALOG_FIELDS = ['schema_version', 'guide_id', 'revision', 'model'];

// Structure and internal consistency only: never equipment truth, geometry accuracy or rendered behaviour.
function catalogContract(catalogs) {
  for (const [name, catalog] of Object.entries(catalogs)) {
    for (const field of CATALOG_FIELDS) {
      assert.ok(typeof catalog[field] === 'string' && catalog[field].trim(), `${name}: catalog must declare ${field}`);
    }
    const sources = new Set((catalog.sources || []).map(source => source.source_id));
    assert.ok(sources.size, `${name}: catalog must declare its sources`);
    const seen = new Set();
    for (const component of catalog.components) {
      const id = component.component_id;
      for (const field of ['component_id', 'label', 'confidence', 'geometry_status']) {
        assert.ok(typeof component[field] === 'string' && component[field].trim(), `${name}: ${id || '(unnamed)'} must declare ${field}`);
      }
      assert.ok(!seen.has(id), `${name}: duplicate component_id ${id}`);
      seen.add(id);
      assert.ok(CONFIDENCE.has(component.confidence),
        `${name}: ${id} confidence ${JSON.stringify(component.confidence)} is outside the documented vocabulary`);
      assert.ok(GEOMETRY.has(component.geometry_status),
        `${name}: ${id} geometry_status ${JSON.stringify(component.geometry_status)} is outside the documented vocabulary`);
      const refs = component.source_ids || [];
      assert.ok(Array.isArray(refs), `${name}: ${id} source_ids must be an array`);
      for (const ref of refs) assert.ok(sources.has(ref), `${name}: ${id} cites unknown source ${ref}`);
      // A component that states evidence must say what that evidence is.
      if (component.confidence !== 'Unknown') assert.ok(refs.length, `${name}: ${id} states evidence without citing a source`);
    }
  }
}

function modelContract(site) {
  // Every rig count claim, including the one the camera card renders, must match the catalog.
  // The data module holds only object literals; evaluate it in an empty context rather than importing ESM from CommonJS.
  const guideData = fs.readFileSync(path.join(site, 'fmp/rig/fmp-guide-data.js'), 'utf8');
  const components = Object.keys(vm.runInNewContext(`${guideData.replace(/^export const /gm, 'var ')}\n;catalog`, {}, { timeout: 1000 })).length;
  const loadCatalog = (source, globalName) => {
    const sandbox = {};
    vm.runInNewContext(source, sandbox, { timeout: 1000 });
    return sandbox[globalName].catalog;
  };
  const superjoy = fs.readFileSync(path.join(site, 'fmp/ptz/SuperJoy-G1-Interactive-Guide.html'), 'utf8');
  const superjoyCatalog = [...superjoy.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).find(source => source.includes('root.SuperJoy={catalog}'));
  assert.ok(superjoyCatalog, 'SuperJoy must carry its source-built component catalog');
  for (const name of ['p240', 'ccu4']) {
    const html = fs.readFileSync(path.join(site, `fmp/models/${name}.html`), 'utf8');
    const inline = html.match(/<script[^>]*id="equipment-catalog"[^>]*>([\s\S]*?)<\/script>/i);
    assert.ok(inline, `${name} must carry a readable equipment catalog`);
    assert.deepEqual(JSON.parse(inline[1]), JSON.parse(fs.readFileSync(path.join(site, `fmp/models/assets/${name}-catalog.json`), 'utf8')), `${name} runtime catalog differs from its release catalog`);
  }
  const catalogs = {
    'atem-hd8-iso': loadCatalog(fs.readFileSync(path.join(site, 'fmp/models/assets/atem-hd8-iso-1.js'), 'utf8'), 'ATEM'),
    superjoy: loadCatalog(superjoyCatalog, 'SuperJoy'),
    p240: JSON.parse(fs.readFileSync(path.join(site, 'fmp/models/assets/p240-catalog.json'), 'utf8')),
    ccu4: JSON.parse(fs.readFileSync(path.join(site, 'fmp/models/assets/ccu4-catalog.json'), 'utf8'))
  };
  catalogContract(catalogs);
  const modelCounts = {
    rig: components,
    'atem-hd8-iso': catalogs['atem-hd8-iso'].components.length,
    superjoy: catalogs.superjoy.components.length,
    p240: catalogs.p240.components.length,
    ccu4: catalogs.ccu4.components.length
  };
  const componentsFor = name => {
    if (name === 'ptz/SuperJoy-G1-Interactive-Guide.html') return modelCounts.superjoy;
    for (const key of ['atem-hd8-iso', 'p240', 'ccu4']) if (name.startsWith(`models/${key}.`) || name.startsWith(`models/assets/${key}-`) || name === `models/assets/${key}.css`) return modelCounts[key];
    return components;
  };
  return { counts: modelCounts, componentsFor };
}
module.exports = { modelFiles, modelContract, catalogContract };
