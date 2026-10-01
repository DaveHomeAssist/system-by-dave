#!/usr/bin/env node
'use strict';
// Writes the Gear Reference sheets for the FMP equipment catalogs (data/gear/<id>.json).
//   node scripts/build_gear_from_fmp.js          regenerate after an FMP re-export changes a catalog
//   node scripts/build_gear_from_fmp.js --check  fail when a sheet no longer matches its catalog
const fs = require('node:fs');
const path = require('node:path');
const { loadEquipmentCatalogs } = require('./fmp_model_contract');
const { EQUIPMENT, buildSheet } = require('./gear_equipment_adapter');

const ROOT = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

function sheetFile(id) {
  return `data/gear/${id}.json`;
}

function render(sheet) {
  return `${JSON.stringify(sheet, null, 2)}\n`;
}

function build(root = ROOT) {
  const catalogs = loadEquipmentCatalogs(root);
  return EQUIPMENT.map(config => {
    const catalog = catalogs[config.catalog];
    if (!catalog) throw new Error(`${config.id}: catalog ${config.catalog} was not loaded`);
    return { file: sheetFile(config.id), text: render(buildSheet(config, catalog)) };
  });
}

function main() {
  const outputs = build();
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/gear/index.json'), 'utf8'));
  const problems = [];
  for (const config of EQUIPMENT) {
    const entry = index.entries.find(item => item.id === config.id);
    if (!entry) problems.push(`data/gear/index.json has no entry for ${config.id}`);
    else if (entry.file !== sheetFile(config.id)) problems.push(`data/gear/index.json points ${config.id} at ${entry.file}`);
  }
  for (const { file, text } of outputs) {
    const target = path.join(ROOT, file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (check) {
      if (current !== text) problems.push(`${file} does not match its FMP catalog; run npm run build:gear-from-fmp`);
    } else if (current !== text) {
      fs.writeFileSync(target, text);
      console.log(`wrote ${file}`);
    }
  }
  if (problems.length) {
    console.error('Gear Reference sheets from FMP catalogs:');
    problems.forEach(problem => console.error(`- ${problem}`));
    process.exit(1);
  }
  console.log(`Gear Reference sheets ${check ? 'match' : 'built from'} ${outputs.length} FMP equipment catalogs.`);
}

if (require.main === module) main();
module.exports = { build, sheetFile };
