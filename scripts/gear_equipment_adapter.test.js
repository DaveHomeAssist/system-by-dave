'use strict';
// Keeps Gear Reference equipment sheets consistent with the exported FMP catalogs they come from.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadEquipmentCatalogs } = require('./fmp_model_contract');
const { EQUIPMENT, VENUE_KEYS, buildSheet } = require('./gear_equipment_adapter');

const catalogs = loadEquipmentCatalogs(path.resolve(__dirname, '..'));
const sheets = Object.fromEntries(EQUIPMENT.map((config) => [config.id, buildSheet(config, catalogs[config.catalog])]));
const partsOf = (sheet) => sheet.sections.find((section) => section.type === 'parts').parts.groups.flatMap((group) => group.parts.map((part) => ({ ...part, category: group.category })));
test('public sheets contain equipment evidence without venue sections, links or sources', () => {
  for (const config of EQUIPMENT) {
    const sheet = sheets[config.id];
    const content = { ...sheet };
    delete content.generated;
    assert.doesNotMatch(JSON.stringify(content), /\bfmp\b|housevideo|freedom mortgage|kept-with-fmp|fmpEvidence/i);
    assert.ok(sheet.sources.every(source => ['manufacturer', 'product-photo'].includes(source.kind)));
    assert.equal(sheet.sections.find(section => section.type === 'parts').parts.interactive, undefined);
    const sourceIds = new Set(sheet.sources.map(source => source.id));
    const ids = new Set();
    for (const part of partsOf(sheet)) {
      assert.ok(!ids.has(part.id)); ids.add(part.id);
      assert.ok(part.sourceRefs.length && part.sourceRefs.every(ref => sourceIds.has(ref)));
    }
  }
});

test('equipment descriptions remain exact unless they mix in workspace evidence', () => {
  for (const config of EQUIPMENT) {
    const byId = new Map(catalogs[config.catalog].components.map(c => [c.component_id, c]));
    for (const part of partsOf(sheets[config.id])) {
      const source = byId.get(part.id);
      assert.equal(part.label, source.label);
      assert.equal(part.category, source.category);
      assert.notEqual(source.geometry_status, 'virtual_route');
      if (part.descriptionPending) {
        assert.equal(part.description, 'Equipment description awaiting source review.');
        assert.equal(part.evidence, 'Unknown');
      } else {
        assert.equal(part.description, String(source.purpose || '').trim());
        assert.equal(part.evidence, source.confidence);
      }
    }
  }
});

test('mixed descriptions cannot leak via Parts, Open facts, sources or the accuracy log', () => {
  const config = EQUIPMENT.find(item => item.catalog === 'p240');
  const catalog = structuredClone(catalogs.p240);
  const part = catalog.components.find(item => item.component_id === 'p240.io.sdi');
  part.purpose = 'Installed camera 4 routes through SECRET-VENUE-PATCH.';
  part.confidence = 'Contradicted';
  const before = JSON.stringify(catalog);
  const sheet = buildSheet(config, catalog);
  assert.doesNotMatch(JSON.stringify(sheet), /SECRET-VENUE-PATCH/);
  const output = partsOf(sheet).find(item => item.id === part.component_id);
  assert.ok(output.descriptionPending);
  assert.equal(output.evidence, 'Unknown');
  assert.ok(!output.sourceRefs.includes('dave-sdi-2026-09-23'));
  assert.equal(JSON.stringify(catalog), before, 'the workspace source must remain intact');
});

test('venue routes and unit-only evidence stay out; descriptive venue text fails closed', () => {
  const config = EQUIPMENT.find(item => item.catalog === 'p240');
  const catalog = structuredClone(catalogs.p240);
  const chassis = catalog.components.find(item => item.component_id === 'p240.chassis');
  chassis.purpose = 'FMP mounted base with venue inventory details.';
  const sheet = buildSheet(config, catalog);
  assert.ok(partsOf(sheet).find(part => part.id === chassis.component_id).descriptionPending);
  assert.ok(!partsOf(sheet).some(part => part.id === 'p240.path.video' || part.id === 'p240.mount'));
  for (const key of VENUE_KEYS) {
    for (const value of Object.values(catalog[key] || {})) {
      if (typeof value === 'string' && value.length > 12) assert.ok(!JSON.stringify(sheet).includes(value));
    }
  }
});

test('display names match the model each catalog names', () => {
  for (const config of EQUIPMENT) {
    const model = catalogs[config.catalog].model;
    if (config.catalog === 'superjoy') {
      assert.equal(model, 'PT-SUPERJOY-G1');
      assert.match(config.displayName, /SuperJoy G1$/);
    } else {
      assert.equal(config.displayName, model);
    }
  }
  assert.equal(catalogs.ccu4.part_number, 'SWPANELCCU4');
});

test('representative part mappings', () => {
  const find = (sheet, id) => partsOf(sheets[sheet]).find((part) => part.id === id);
  assert.equal(find('blackmagic-atem-television-studio-hd8-iso', 'atem.program.1').category, 'Switching');
  assert.equal(find('blackmagic-atem-camera-control-panel', 'ccu4.ch1.nd').evidence, 'Unknown');
  assert.ok(find('birddog-p240', 'p240.io.sdi').descriptionPending);
  assert.ok(find('ptzoptics-superjoy-g1', 'superjoy.lcd'));
  assert.equal(find('blackmagic-atem-camera-control-panel', 'ccu4.path.atem'), undefined);
  assert.equal(find('birddog-p240', 'p240.mount'), undefined);
  const openFacts = sheets['blackmagic-atem-camera-control-panel'].sections.find((section) => section.id === 'open-facts').rows.map((row) => row[0]);
  assert.ok(openFacts.includes('CH1 · ND filter'));
});

test('a catalog source without an evidence kind stops the build', () => {
  const config = EQUIPMENT.find((item) => item.catalog === 'p240');
  const catalog = structuredClone(catalogs.p240);
  catalog.sources.push({ source_id: 'new-source', label: 'New', locator: 'x', scope: 'y' });
  assert.throws(() => buildSheet(config, catalog), /new-source has no evidence kind/);
});
