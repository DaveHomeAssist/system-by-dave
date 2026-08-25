#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const ALLOWED_TYPES = new Set(['specTable', 'table', 'figure', 'figure+table', 'procedure', 'checklist', 'cards', 'accuracyLog']);
const ALLOWED_STATUSES = new Set(['confirmed', 'corrected', 'unverified', 'estimate']);

function fail(message) {
  failures.push(message);
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function readJson(relative) {
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    fail(`${relative} is not valid JSON: ${error.message}`);
    return null;
  }
}

function exists(relative) {
  return fs.existsSync(path.join(ROOT, String(relative || '').replace(/^\.\//, '')));
}

function loadRegistry() {
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(read('js/sbd-registry.js'), context, { filename: 'js/sbd-registry.js' });
  return context.self.SBD_REGISTRY;
}

function verifyRegistry() {
  const registry = loadRegistry();
  const tool = registry.toolById('gear-reference');
  if (!tool) return fail('Gear Reference is missing from the AV registry.');
  if (tool.name !== 'Gear Reference' || tool.href !== 'gear-reference.html' || tool.dept !== 'Logistics') {
    fail('Gear Reference registry identity is incorrect.');
  }
  ['prep', 'loadin'].forEach((phase) => {
    if (!tool.phases.includes(phase)) fail(`Gear Reference is missing phase ${phase}.`);
    if (!(registry.recommended[phase] || []).includes(tool.id)) fail(`Gear Reference is not recommended for ${phase}.`);
  });
  const logistics = registry.navDepartments.find((group) => group.label === 'Logistics');
  if (!logistics || !logistics.toolIds.includes(tool.id)) fail('Gear Reference is missing from Logistics navigation.');
  const offline = registry.offlineAssets();
  [
    './gear-reference.html',
    './data/gear/index.json',
    './data/gear/epson-powerlite-x39.json',
    './data/gear/figures/x39-chassis.svg',
    './data/gear/figures/x39-io.svg'
  ].forEach((asset) => {
    if (!offline.includes(asset)) fail(`Offline manifest is missing ${asset}.`);
  });
  return registry;
}

function verifyEntry(indexEntry) {
  const entry = readJson(indexEntry.file);
  if (!entry) return;
  if (entry.id !== indexEntry.id) fail(`${indexEntry.file} id does not match the index.`);
  if (!Array.isArray(entry.sections) || !entry.sections.length) fail(`${entry.id} has no sections.`);
  if (!Array.isArray(entry.sources) || !entry.sources.length) fail(`${entry.id} has no sources.`);
  if (!Array.isArray(entry.accuracy) || !entry.accuracy.length) fail(`${entry.id} has no accuracy log.`);
  const sourceIds = new Set((entry.sources || []).map((source) => source.id));
  const sectionIds = new Set();
  (entry.sections || []).forEach((section) => {
    if (!section.id || sectionIds.has(section.id)) fail(`${entry.id} has a missing or duplicate section id.`);
    sectionIds.add(section.id);
    if (!ALLOWED_TYPES.has(section.type)) fail(`${entry.id} section ${section.id} uses unsupported type ${section.type}.`);
    if (!Array.isArray(section.sourceRefs) || !section.sourceRefs.length) fail(`${entry.id} section ${section.id} has no sourceRefs.`);
    (section.sourceRefs || []).forEach((ref) => {
      if (!sourceIds.has(ref)) fail(`${entry.id} section ${section.id} references unknown source ${ref}.`);
    });
    if (section.figure) {
      if (!exists(section.figure.src)) fail(`${entry.id} figure is missing: ${section.figure.src}.`);
      else {
        const svg = read(section.figure.src);
        if (/<image\b/i.test(svg)) fail(`${section.figure.src} embeds photography instead of schematic vectors.`);
        if (!/<svg\b/i.test(svg) || !/role="img"/.test(svg)) fail(`${section.figure.src} is missing SVG image semantics.`);
      }
    }
  });
  (entry.accuracy || []).forEach((item) => {
    if (!ALLOWED_STATUSES.has(item.status)) fail(`${entry.id} accuracy item ${item.item} has unsupported status ${item.status}.`);
    if (!Array.isArray(item.sourceRefs) || !item.sourceRefs.length) fail(`${entry.id} accuracy item ${item.item} has no sourceRefs.`);
    (item.sourceRefs || []).forEach((ref) => {
      if (!sourceIds.has(ref)) fail(`${entry.id} accuracy item ${item.item} references unknown source ${ref}.`);
    });
  });
  if (entry.id === 'epson-powerlite-x39') {
    if (entry.sections.length !== 12) fail(`Epson X39 has ${entry.sections.length} sections, expected 12.`);
    ['id', 'chassis', 'optical', 'throw', 'lamp', 'power', 'eco', 'io', 'parts', 'intake', 'notes', 'accuracy'].forEach((id) => {
      if (!sectionIds.has(id)) fail(`Epson X39 is missing section ${id}.`);
    });
  }
}

function verifyData() {
  const index = readJson('data/gear/index.json');
  if (!index || !Array.isArray(index.entries)) return fail('Gear Reference index has no entries array.');
  const ids = new Set();
  index.entries.forEach((entry) => {
    if (!entry.id || ids.has(entry.id)) fail('Gear Reference index has a missing or duplicate id.');
    ids.add(entry.id);
    if (entry.sheetStatus !== 'authored') fail(`${entry.id} is listed without an authored sheet.`);
    if (!exists(entry.file)) fail(`Gear Reference data file is missing: ${entry.file}.`);
    else verifyEntry(entry);
  });
  if (!ids.has('epson-powerlite-x39')) fail('Epson PowerLite X39 is missing from the library index.');
  return index;
}

function verifyRenderer() {
  const page = read('gear-reference.html');
  [
    '<title>Gear Reference</title>',
    'Content-Security-Policy',
    'property="og:title" content="Gear Reference"',
    'name="twitter:title" content="Gear Reference"',
    "history.replaceState",
    "JSON.stringify(section).toLowerCase()",
    "Math.abs(dx)>64",
    "event.key==='Home'",
    "event.key==='End'",
    "transition:none!important",
    "grid-template-columns:minmax(0,1fr)",
    "prefers-reduced-motion:reduce",
    "prefers-color-scheme:light"
  ].forEach((contract) => {
    if (!page.includes(contract)) fail(`Gear Reference renderer is missing contract: ${contract}.`);
  });
  const prep = read('gear-prep.html');
  if (!prep.includes("fetch('data/gear/index.json'")) fail('Gear Prep does not read the authored reference index.');
  if (!prep.includes('id="gearReferenceLink"')) fail('Gear Prep inspector has no Gear Reference link.');
  if (!read('sitemap.xml').includes('https://systembydave.com/gear-reference.html')) fail('Sitemap does not include Gear Reference.');
  if (!/>44<\/div>/.test(read('index.html')) || !/44 operator tools/.test(read('tools.html'))) {
    fail('Public AV tool count was not raised to 44 browser tools.');
  }
}

const registry = verifyRegistry();
const index = verifyData();
verifyRenderer();

if (failures.length) {
  console.error('Gear Reference verification failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Gear Reference verification passed (registryTools=${registry.tools.length}, offlineAssets=${registry.offlineAssets().length}, authoredSheets=${index.entries.length}, epsonPanels=12).`);
