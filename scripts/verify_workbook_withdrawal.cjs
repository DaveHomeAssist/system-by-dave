const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const registry = require('../js/sbd-registry.js').SBD_REGISTRY;
assert(!registry.tools.some(tool => tool.id === 'av-workbook'), 'Workbook must be absent from the public registry');
assert(!registry.offlineAssets().some(file => file.includes('av-workbook')), 'Workbook must be absent from offline caches');
for (const name of ['av-suite.html', 'tools.html']) {
  assert(!/av-workbook\/|AV Workbook/.test(fs.readFileSync(path.join(root, name), 'utf8')), `${name} promotes Workbook`);
}
for (const name of ['av-workbook.html', 'av-workbook/index.html']) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  assert(html.includes("location.replace('/av-suite.html?entry=toolbox')"), `${name} does not return directly to Toolbox`);
  assert(!/localStorage|indexedDB|av-workbook\.js/.test(html), `${name} loads the editor or touches saved data`);
}
assert(!fs.existsSync(path.join(root, 'av-workbook/assets')), 'Public editor assets must be removed');
if (process.argv[2]) {
  const staged = path.resolve(process.argv[2]);
  for (const rel of ['apps/av-workbook', 'av-workbook/assets']) {
    assert(!fs.existsSync(path.join(staged, rel)), `Public artifact contains ${rel}`);
  }
}
console.log('Workbook withdrawal verified: no public launch, editor assets, or offline dependency; aliases preserve storage.');
