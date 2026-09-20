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
    'p240-0.js', 'p240-catalog.json', 'ccu4-0.js', 'ccu4-catalog.json'].map(name => `models/assets/${name}`),
  'models/vendor/three.min.js', 'models/vendor/LICENSE', 'ptz/SuperJoy-G1-Interactive-Guide.html'
];

function modelContract(site) {
  // Every rig count claim, including the one the camera card renders, must match the catalog.
  // The data module holds only object literals; evaluate it in an empty context rather than importing ESM from CommonJS.
  const guideData = fs.readFileSync(path.join(site, 'fmp/rig/fmp-guide-data.js'), 'utf8');
  const components = Object.keys(vm.runInNewContext(`${guideData.replace(/^export const /gm, 'var ')}\n;catalog`, {}, { timeout: 1000 })).length;
  const evaluateCatalog = (source, globalName) => {
    const sandbox = {};
    vm.runInNewContext(source, sandbox, { timeout: 1000 });
    return sandbox[globalName].catalog.components.length;
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
  const modelCounts = {
    rig: components,
    'atem-hd8-iso': evaluateCatalog(fs.readFileSync(path.join(site, 'fmp/models/assets/atem-hd8-iso-1.js'), 'utf8'), 'ATEM'),
    superjoy: evaluateCatalog(superjoyCatalog, 'SuperJoy'),
    p240: JSON.parse(fs.readFileSync(path.join(site, 'fmp/models/assets/p240-catalog.json'), 'utf8')).components.length,
    ccu4: JSON.parse(fs.readFileSync(path.join(site, 'fmp/models/assets/ccu4-catalog.json'), 'utf8')).components.length
  };
  const componentsFor = name => {
    if (name === 'ptz/SuperJoy-G1-Interactive-Guide.html') return modelCounts.superjoy;
    for (const key of ['atem-hd8-iso', 'p240', 'ccu4']) if (name.startsWith(`models/${key}.`) || name.startsWith(`models/assets/${key}-`) || name === `models/assets/${key}.css`) return modelCounts[key];
    return components;
  };
  return { counts: modelCounts, componentsFor };
}
module.exports = { modelFiles, modelContract };
