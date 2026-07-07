#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const SKIP_FILES = new Set([
  'cross-project-actions.html',
  'html/sbd-brand.html'
]);
const EXPECTED_AV_TOOL_COUNT = 39;

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(path.relative(ROOT, abs));
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function isDocument(source) {
  return /<html[\s>]/i.test(source) && /<head[\s>]/i.test(source) && /<\/head>/i.test(source) && /<body[\s>]/i.test(source) && /<\/body>/i.test(source);
}

function isHomeFile(file) {
  return file === 'index.html';
}

function hasReturnPath(source) {
  return /sbd-public-nav\.js/i.test(source)
    || /sbd-nav\.js/i.test(source)
    || /System by Dave home/i.test(source)
    || /href=["']\/(?:["'#?]|index\.html)/i.test(source)
    || /href=["'](?:\.\.\/)*index\.html/i.test(source)
    || /href=["']https:\/\/systembydave\.com\/(?:["'#?]|index\.html)/i.test(source);
}

function prefixFor(file) {
  const dir = path.dirname(file);
  if (dir === '.') return '';
  return dir.split(path.sep).map(() => '..').join('/') + '/';
}

function verifyPublicHtml() {
  const files = walk(ROOT)
    .filter((file) => !file.startsWith(`apps${path.sep}`))
    .filter((file) => !SKIP_FILES.has(file))
    .sort();
  let pages = 0;
  files.forEach((file) => {
    const source = read(file);
    if (!isDocument(source)) return;
    pages += 1;
    if (!isHomeFile(file) && !hasReturnPath(source)) fail(`${file} has no verified return path.`);
    if (/sbd-public-nav\.js/i.test(source)) {
      const prefix = prefixFor(file);
      if (!source.includes(`href="${prefix}css/sbd-public-nav.css"`)) fail(`${file} loads public nav JS without matching CSS path.`);
      if (!source.includes(`src="${prefix}js/sbd-public-nav.js"`)) fail(`${file} has an unexpected public nav JS path.`);
    }
  });
  notes.push(`publicPages=${pages}`);
}

function loadRegistry() {
  const code = read('js/sbd-registry.js');
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'js/sbd-registry.js' });
  return context.self.SBD_REGISTRY;
}

function verifyAvWorkbookRegistry() {
  const registry = loadRegistry();
  if (!registry || !Array.isArray(registry.tools)) {
    fail('SBD_REGISTRY.tools did not load.');
    return;
  }
  if (registry.tools.length !== EXPECTED_AV_TOOL_COUNT) {
    fail(`Registry tool count is ${registry.tools.length}, expected ${EXPECTED_AV_TOOL_COUNT}.`);
  }
  const workbook = registry.toolById && registry.toolById('av-workbook');
  if (!workbook) fail('AV Workbook is not a registry tool.');
  else if (workbook.href !== 'av-workbook/') fail(`AV Workbook href is ${workbook.href}, expected av-workbook/.`);
  Object.keys(registry.recommended || {}).forEach((phase) => {
    if ((registry.recommended[phase] || [])[0] !== 'av-workbook') fail(`${phase} recommendations do not start with AV Workbook.`);
  });
  const navHasWorkbook = (registry.navDepartments || []).some((group) => (group.toolIds || []).includes('av-workbook'));
  if (!navHasWorkbook) fail('AV Workbook is not present in universal nav departments.');
  notes.push(`registry=${registry.version}`);
  notes.push(`avTools=${registry.tools.length}`);
}

verifyPublicHtml();
verifyAvWorkbookRegistry();

if (failures.length) {
  console.error('Public navigation verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Public navigation verification passed (${notes.join(', ')}).`);
