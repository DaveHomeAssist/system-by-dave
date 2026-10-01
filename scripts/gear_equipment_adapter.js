'use strict';
// Turns an exported FMP equipment catalog into a Gear Reference sheet. The catalog stays the only
// part list: scripts/build_gear_from_fmp.js writes these sheets and fails a release when they drift.
// Equipment facts and FMP-specific facts are separated by the evidence each catalog item cites.
// See docs/gear-reference-contract.md ("Sheets generated from FMP catalogs").

const SCHEMA = 'system-by-dave.gear-reference-entry.v1';
const GENERATOR = 'scripts/build_gear_from_fmp.js';

// What kind of evidence each catalog source is. Every source a catalog declares must be listed, so a
// new source cannot change what the sheet shows without a decision here.
//   manufacturer   published by the manufacturer (pages, manuals, drawings)
//   product-photo  photographs of the product, not of the FMP unit
//   unit-photo     photographs supplied of the FMP unit
//   user-document  a supplied reference compiled from published material
//   house-record   an FMP record, SOP or task brief about the installed system
//   user-report    an operator's correction or report about the FMP system
const SOURCE_KIND_LABEL = {
  manufacturer: 'Manufacturer',
  'product-photo': 'Product photograph',
  'unit-photo': 'Photograph of the FMP unit',
  'user-document': 'Supplied reference',
  'house-record': 'FMP record',
  'user-report': 'Operator report'
};
const EQUIPMENT_KINDS = new Set(['manufacturer', 'product-photo']);
const HOUSE_KINDS = new Set(['house-record', 'user-report']);

// Catalog-level keys that hold FMP assignments rather than equipment facts. Their values are never
// copied onto a sheet; the sheet only says they exist and where they live.
const VENUE_KEYS = ['venue', 'evidence_policy'];

const EQUIPMENT = [
  {
    id: 'blackmagic-atem-television-studio-hd8-iso',
    catalog: 'atem-hd8-iso',
    displayName: 'Blackmagic ATEM Television Studio HD8 ISO',
    brand: 'Blackmagic Design',
    category: 'Video',
    subcategory: 'Switchers',
    tags: ['ATEM', 'switcher', 'ISO', 'FMP'],
    aka: ['ATEM Television Studio HD8 ISO', 'ATEM HD8 ISO', 'TVS HD8 ISO'],
    sources: {
      'photo-front': 'unit-photo', 'photo-perspective': 'unit-photo', 'photo-rear': 'unit-photo', 'photo-side': 'unit-photo',
      'bmd-spec': 'manufacturer', 'bmd-start': 'manufacturer', 'bmd-product': 'manufacturer', 'bmd-manual': 'manufacturer',
      'fmp-sop': 'house-record', 'field-reference': 'user-document', 'user-tbar-tally-2026-09-20': 'user-report'
    }
  },
  {
    id: 'blackmagic-atem-camera-control-panel',
    catalog: 'ccu4',
    displayName: 'Blackmagic ATEM Camera Control Panel',
    brand: 'Blackmagic Design',
    category: 'Video',
    subcategory: 'Camera control',
    tags: ['ATEM', 'CCU', 'shading', 'FMP'],
    aka: ['ATEM Camera Control Panel', 'SWPANELCCU4', 'CCU panel'],
    sources: {
      'blackmagic-tech': 'manufacturer', 'blackmagic-manual': 'manufacturer', 'blackmagic-physical': 'manufacturer',
      'fmp-ccu': 'house-record', 'fmp-signal': 'house-record'
    }
  },
  {
    id: 'birddog-p240',
    catalog: 'p240',
    displayName: 'BirdDog P240',
    brand: 'BirdDog',
    category: 'Video',
    subcategory: 'PTZ cameras',
    tags: ['PTZ', 'NDI', 'SDI', 'FMP'],
    aka: ['P240', 'BirdDog P240 PTZ'],
    sources: {
      'birddog-techspec': 'manufacturer', 'birddog-guide': 'manufacturer', 'birddog-overview': 'manufacturer',
      'fmp-gear': 'house-record', 'fmp-signal': 'house-record', 'dave-sdi-2026-09-23': 'user-report'
    }
  },
  {
    id: 'ptzoptics-superjoy-g1',
    catalog: 'superjoy',
    displayName: 'PTZOptics SuperJoy G1',
    brand: 'PTZOptics',
    category: 'Video',
    subcategory: 'PTZ controllers',
    tags: ['PTZ', 'joystick', 'VISCA', 'FMP'],
    aka: ['SuperJoy G1', 'PT-SUPERJOY-G1', 'SuperJoy'],
    sources: {
      'ptzoptics-reference': 'user-document', 'product-top': 'product-photo', 'product-front': 'product-photo',
      'product-side': 'product-photo', 'product-perspectives': 'product-photo', 'fmp-photo-powered': 'unit-photo',
      'manufacturer-buttons': 'manufacturer', 'user-correction': 'house-record'
    }
  }
];

const UPDATED = '2026-10-01';

function isUrl(value) {
  return /^https:\/\/[^\s]+$/.test(String(value || ''));
}

// One sheet source per catalog source, labelled with its evidence kind.
function sheetSource(source, kind) {
  const label = source.label || [SOURCE_KIND_LABEL[kind], isUrl(source.locator) ? source.scope : source.locator].filter(Boolean).join(' · ');
  const out = { id: source.source_id, label, kind };
  if (isUrl(source.locator)) out.url = source.locator;
  else out.reference = source.locator;
  if (source.scope) out.scope = source.scope;
  return out;
}

function unique(values) {
  return [...new Set(values)];
}

function buildSheet(config, catalog) {
  const kindOf = id => {
    const kind = config.sources[id];
    if (!kind) throw new Error(`${config.id}: catalog source ${id} has no evidence kind in scripts/gear_equipment_adapter.js`);
    return kind;
  };
  for (const source of catalog.sources) kindOf(source.source_id);
  for (const id of Object.keys(config.sources)) {
    if (!catalog.sources.some(source => source.source_id === id)) throw new Error(`${config.id}: classified source ${id} is not in the catalog`);
  }

  const workspaceText = /\bFMP\b|housevideo|Freedom Mortgage|\bDave(?:'s)?\b|\bhouse\b|\bFOH\b|\bcatwalk\b|\bpit center\b|\bpit stage/i;
  const listed = [];
  for (const component of catalog.components) {
    const originalRefs = Array.from(component.source_ids || []);
    const refs = originalRefs.filter(id => EQUIPMENT_KINDS.has(kindOf(id)));
    // A shared part identity is useful, but a mixed venue description is not a product fact.
    // Fail closed until the source catalog supplies a separately evidenced equipment description.
    if (!refs.length || component.geometry_status === 'virtual_route' ||
        workspaceText.test([component.label, component.category].join(' '))) continue;
    const pending = originalRefs.some(id => HOUSE_KINDS.has(kindOf(id))) ||
      workspaceText.test(String(component.purpose || ''));
    listed.push({ component, refs, kinds: refs.map(kindOf), pending });
  }

  // Parts keep catalog order inside each category; categories keep first-appearance order.
  const groups = [];
  const groupIndex = new Map();
  for (const { component, refs, pending } of listed) {
    if (!groupIndex.has(component.category)) {
      groupIndex.set(component.category, groups.length);
      groups.push({ category: component.category, parts: [] });
    }
    const part = {
      id: component.component_id,
      label: component.label,
      kind: component.kind || '',
      description: pending ? 'Equipment description awaiting source review.' : String(component.purpose || '').trim(),
      evidence: pending ? 'Unknown' : component.confidence,
      sourceRefs: refs
    };
    if (pending) part.descriptionPending = true;
    groups[groupIndex.get(component.category)].parts.push(part);
  }

  const manufacturerRefs = catalog.sources.map(s => s.source_id).filter(id => kindOf(id) === 'manufacturer');
  const equipmentRefs = unique(listed.flatMap(item => item.refs.filter(ref => EQUIPMENT_KINDS.has(kindOf(ref)))));
  const withManufacturer = listed.filter(item => item.kinds.includes('manufacturer'));
  const withoutManufacturer = listed.filter(item => !item.kinds.includes('manufacturer'));
  const unknown = listed.filter(item => item.pending || item.component.confidence === 'Unknown');
  const conflicting = listed.filter(item => !item.pending && item.component.confidence === 'Contradicted');
  if (!manufacturerRefs.length) throw new Error(`${config.id}: catalog has no manufacturer source`);

  const total = listed.length;
  const identification = [
    ['Manufacturer', config.brand],
    ['Model (catalog)', catalog.model]
  ];
  if (catalog.part_number) identification.push(['Part number', catalog.part_number]);
  identification.push(['Parts on this sheet', String(total)]);

  const sections = [
    { id: 'id', title: 'Identification', type: 'specTable', rows: identification, sourceRefs: manufacturerRefs },
    {
      id: 'parts',
      title: 'Parts',
      type: 'parts',
      lede: 'Equipment parts and their supporting sources. Descriptions awaiting equipment-only review are marked Unknown.',
      parts: { total, groups },
      sourceRefs: equipmentRefs.length ? equipmentRefs : manufacturerRefs
    }
  ];

  const gaps = [];
  unknown.forEach(item => gaps.push([item.component.label, 'Not established', item.pending ? 'Equipment description awaiting source review.' : (item.component.purpose || 'The catalog marks this part Unknown.')]));
  conflicting.forEach(item => gaps.push([item.component.label, 'Sources disagree', item.pending ? 'Equipment description awaiting source review.' : (item.component.purpose || 'The catalog marks this part Contradicted.')]));
  gaps.push(['Connector specifications', 'Descriptive text only',
    'The catalog records connectors as parts with descriptions. It has no structured connector fields (signal standard, format, pinout), so this sheet does not tabulate them.']);
  const gapRefs = unique([...unknown, ...conflicting].flatMap(item => item.refs));
  sections.push({ id: 'open-facts', title: 'Open facts', type: 'table', columns: ['Item', 'Gap', 'Detail'], rows: gaps, sourceRefs: gapRefs.length ? gapRefs : manufacturerRefs });
  sections.push({ id: 'accuracy', title: 'Accuracy log', type: 'accuracyLog', sourceRefs: manufacturerRefs });

  const accuracy = [
    { item: 'Model identity', status: 'confirmed', detail: `The catalog names the model ${catalog.model}${catalog.part_number ? ` (part ${catalog.part_number})` : ''}, and a manufacturer source names the product.`, sourceRefs: manufacturerRefs.slice(0, 1) },
    { item: 'Parts with a manufacturer source', status: 'confirmed', detail: `${withManufacturer.length} of ${listed.length} listed parts cite a manufacturer source.`, sourceRefs: manufacturerRefs }
  ];
  if (withoutManufacturer.length) {
    const refs = unique(withoutManufacturer.flatMap(item => item.refs));
    accuracy.push({ item: 'Parts identified from photographs or supplied references', status: 'unverified', detail: `${withoutManufacturer.length} listed parts cite no manufacturer source. Their identity comes from photographs or a supplied reference.`, sourceRefs: refs });
  }
  if (unknown.length || conflicting.length) {
    accuracy.push({ item: 'Parts the catalog has not established', status: 'unverified', detail: `${unknown.length + conflicting.length} parts are listed under Open facts.`, sourceRefs: gapRefs });
  }

  return {
    schema: SCHEMA,
    id: config.id,
    displayName: config.displayName,
    aka: config.aka,
    brand: config.brand,
    category: config.category,
    subcategory: config.subcategory,
    status: 'catalog-derived',
    updated: UPDATED,
    generated: { by: GENERATOR, revision: catalog.revision },
    summary: `Equipment reference for ${config.displayName}. Product details and source confidence.`,
    tags: config.tags.filter(tag => tag !== 'FMP'),
    sources: catalog.sources.filter(source => EQUIPMENT_KINDS.has(kindOf(source.source_id))).map(source => sheetSource(source, kindOf(source.source_id))),
    accuracy,
    sections
  };
}

module.exports = { EQUIPMENT, SOURCE_KIND_LABEL, EQUIPMENT_KINDS, HOUSE_KINDS, VENUE_KEYS, buildSheet };
