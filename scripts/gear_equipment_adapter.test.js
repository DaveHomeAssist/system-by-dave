'use strict';
// Keeps Gear Reference equipment sheets consistent with the exported FMP catalogs they come from.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadEquipmentCatalogs } = require('./fmp_model_contract');
const { EQUIPMENT, HOUSE_KINDS, VENUE_KEYS, buildSheet } = require('./gear_equipment_adapter');

const catalogs = loadEquipmentCatalogs(path.resolve(__dirname, '..'));
const sheets = Object.fromEntries(EQUIPMENT.map((config) => [config.id, buildSheet(config, catalogs[config.catalog])]));
const partsOf = (sheet) => sheet.sections.find((section) => section.type === 'parts').parts.groups.flatMap((group) => group.parts.map((part) => ({ ...part, category: group.category })));
const keptOf = (sheet) => (sheet.sections.find((section) => section.id === 'kept-with-fmp') || { cards: [] }).cards;

test('every catalog component is listed once or kept with FMP, never both and never dropped', () => {
  for (const config of EQUIPMENT) {
    const catalog = catalogs[config.catalog];
    const listed = partsOf(sheets[config.id]).map((part) => part.id);
    const kept = keptOf(sheets[config.id]).map((card) => (card.text.match(/^Catalog id (\S+)\./) || [])[1]).filter(Boolean);
    assert.equal(new Set(listed).size, listed.length, `${config.id} lists a part twice`);
    // Catalogs read from a vm sandbox carry that realm's arrays; copy before a strict comparison.
    assert.deepEqual([...listed, ...kept].sort(), Array.from(catalog.components, (c) => c.component_id).sort(), `${config.id} does not account for every catalog component`);
  }
});

test('listed parts carry the catalog text unchanged and no signal routes', () => {
  for (const config of EQUIPMENT) {
    const byId = new Map(catalogs[config.catalog].components.map((c) => [c.component_id, c]));
    for (const part of partsOf(sheets[config.id])) {
      const source = byId.get(part.id);
      assert.equal(part.label, source.label);
      assert.equal(part.description, String(source.purpose || '').trim());
      assert.equal(part.evidence, source.confidence);
      assert.equal(part.category, source.category);
      assert.deepEqual(part.sourceRefs, Array.from(source.source_ids || []));
      assert.notEqual(source.geometry_status, 'virtual_route', `${part.id} is a signal route`);
    }
  }
});

test('parts that rest only on FMP records stay with FMP; mixed evidence is flagged', () => {
  for (const config of EQUIPMENT) {
    const kindOf = (id) => config.sources[id];
    for (const part of partsOf(sheets[config.id])) {
      const kinds = part.sourceRefs.map(kindOf);
      assert.ok(!(kinds.length && kinds.every((kind) => HOUSE_KINDS.has(kind))), `${part.id} rests only on FMP records`);
      assert.equal(Boolean(part.fmpEvidence), kinds.some((kind) => HOUSE_KINDS.has(kind)), `${part.id} FMP evidence flag`);
    }
  }
});

test('FMP venue values never reach an equipment sheet', () => {
  for (const config of EQUIPMENT) {
    const catalog = catalogs[config.catalog];
    const text = JSON.stringify(sheets[config.id]);
    for (const key of VENUE_KEYS) {
      for (const value of Object.values(catalog[key] || {})) {
        if (typeof value === 'string' && value.length > 12) assert.ok(!text.includes(value), `${config.id} copies ${key} value: ${value}`);
      }
    }
    assert.ok(!/notion\.so|notion\.site/i.test(text), `${config.id} links Notion`);
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
  assert.ok(find('birddog-p240', 'p240.io.sdi').fmpEvidence);
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
