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
const failures = [];
const notes = [];
const CORE_HEADERS = new Map([
  ['index.html', 'Home'],
  ['tools.html', 'Tools'],
  ['notion.html', 'Notion'],
  ['skills.html', 'Notion'],
  ['agents.html', 'Notion'],
  ['widgets.html', 'Notion'],
  ['prompt-lab.html', 'Prompt Lab'],
  ['privacy-policy.html', null],
  ['remote-desktop.html', 'Tools'],
  ['av-suite.html', 'AV Suite'],
  ['project-registry.html', 'Tools'],
  ['tailscale-manual.html', 'Tools'],
  ['resume/index.html', 'Dave'],
  ['profile/index.html', 'Dave']
]);
const STANDALONE_RETURNS = [
  'resume/av/index.html',
  'av-workbook/index.html',
  'pixelforge/index.html',
  'world-cup/index.html',
  'fifa-pitch-crew/index.html',
  'scorecard/index.html',
  'prompts/index.html',
  'noteforge/index.html'
];
const REQUIRED_SKIP_LINKS = new Map([
  ['depotops/index.html', 'depotops-workspace'],
  ['av-workbook/index.html', 'root'],
  ['pixelforge/index.html', 'root'],
  ['ProjectorThrow/index.html', 'throwline-workspace'],
  ['ProjectorThrow/Stage3D.html', 'stage-workspace'],
  ['world-cup/index.html', 'root'],
  ['fifa-pitch-crew/index.html', 'scr-menu'],
  ['scorecard/index.html', 'scorecard-workspace'],
  ['noteforge/index.html', 'app'],
  ['prompts/index.html', 'prompt-library'],
  ['teleprompter.html', 'teleprompter-workspace'],
  ['show-board.html', 'setup']
]);
const CUSTOM_SHELLS = new Map([
  ['depotops/index.html', ['href="/"', 'href="/tools.html"', 'aria-current="page">DepotOps']],
  ['av-tool-suite/index-v2/index.html', ['href="/"', 'href="/av-suite.html"', 'System by Dave / AV Tool Suite']],
  ['ProjectorThrow/index.html', ['href="../index.html"', 'href="../av-suite.html"', 'id="throwline-workspace"']],
  ['ProjectorThrow/Stage3D.html', ['href="../index.html"', 'href="index.html"', 'href="../av-suite.html"', 'id="stage-workspace"']]
]);

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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function focusTargetTag(source, target) {
  const escaped = escapeRegex(target);
  return source.match(new RegExp(`<[^>]+\\bid=(?:["']${escaped}["']|${escaped})(?:\\s|>)[^>]*>`, 'i'))?.[0] || '';
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

function isNoIndex(source) {
  return /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(source);
}

function hasPublicCommand53Exposure(source) {
  return /href=["']command53\//i.test(source)
    || /url:\s*["']command53\//i.test(source)
    || /open-command53/i.test(source)
    || /proof:command53/i.test(source)
    || />\s*Command53\s*</i.test(source);
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
    if (!isNoIndex(source) && hasPublicCommand53Exposure(source)) fail(`${file} exposes private Command53 routing on a public page.`);
    if (/sbd-public-nav\.js/i.test(source)) {
      const prefix = prefixFor(file);
      if (!source.includes(`href="${prefix}css/sbd-public-nav.css"`)) fail(`${file} loads public nav JS without matching CSS path.`);
      if (!source.includes(`src="${prefix}js/sbd-public-nav.js"`)) fail(`${file} has an unexpected public nav JS path.`);
    }
  });
  notes.push(`publicPages=${pages}`);
}

function verifyNavigationContract() {
  CORE_HEADERS.forEach((active, file) => {
    const source = read(file);
    if (!/class="sbd-site-header"/.test(source)) fail(`${file} is missing the shared global header.`);
    ['/tools.html', '/av-suite.html', '/notion.html', '/prompt-lab.html', '/profile/'].forEach((href) => {
      if (!source.includes(`href="${href}"`)) fail(`${file} is missing global destination ${href}.`);
    });
    if (active === 'Home') {
      if (!source.includes('<a class="sbd-site-brand" href="/" aria-current="page">')) fail(`${file} does not mark Home current.`);
    } else if (active) {
      if (!source.includes(`aria-current="page">${active}</a>`)) {
        fail(`${file} does not mark ${active} current.`);
      }
    }
  });

  ['notion.html', 'skills.html', 'agents.html', 'widgets.html', 'prompts/index.html'].forEach((file) => {
    const source = read(file);
    if (!/class="sbd-section-nav"/.test(source)) fail(`${file} is missing Notion section navigation.`);
  });
  STANDALONE_RETURNS.forEach((file) => {
    if (!/class="sbd-site-return"/.test(read(file))) fail(`${file} is missing a static site-return breadcrumb.`);
  });
  REQUIRED_SKIP_LINKS.forEach((target, file) => {
    const source = read(file);
    const bodyFirst = new RegExp(`<body[^>]*>\\s*<a class="sbd-skip-link" href="#${escapeRegex(target)}">`, 'i');
    if (!bodyFirst.test(source)) fail(`${file} does not place its skip link first in the body.`);
    const targetTag = focusTargetTag(source, target);
    if (!targetTag) fail(`${file} is missing skip target #${target}.`);
    else if (!/\btabindex=(?:["']-1["']|-1)(?:\s|>)/i.test(targetTag)) fail(`${file} skip target #${target} is not programmatically focusable.`);
  });
  CUSTOM_SHELLS.forEach((snippets, file) => {
    const source = read(file);
    snippets.forEach((snippet) => {
      if (!source.includes(snippet)) fail(`${file} is missing custom shell marker ${snippet}.`);
    });
  });

  const publicNav = read('js/sbd-public-nav.js');
  if (/history\.back/.test(publicNav)) fail('Public navigation still uses history-based Back behavior.');
  if (!/\.sbd-nav/.test(publicNav)) fail('Public navigation does not defer to the AV operator bar.');
  const tools = read('tools.html');
  if (!/https:\/\/hatinring\.com\//.test(tools)) fail('Tools does not link Hat-in-Ring to its production domain.');
  ['NoteForge', 'Ballpark Scorecard', 'Davai — System by Dave Memory Architecture', 'Tailscale Manual'].forEach((name) => {
    if (!tools.includes(name)) fail(`Tools is missing ${name}.`);
  });
  if (!read('sitemap.xml').includes('https://systembydave.com/noteforge/')) fail('Sitemap is missing NoteForge.');
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
  if (!registry.tools.length) fail('AV tool registry is empty.');
  const workbook = registry.toolById && registry.toolById('av-workbook');
  if (!workbook) fail('AV Workbook is not a registry tool.');
  else if (workbook.href !== 'av-workbook/') fail(`AV Workbook href is ${workbook.href}, expected av-workbook/.`);
  Object.keys(registry.recommended || {}).forEach((phase) => {
    if ((registry.recommended[phase] || [])[0] !== 'av-workbook') fail(`${phase} recommendations do not start with AV Workbook.`);
  });
  const navHasWorkbook = (registry.navDepartments || []).some((group) => (group.toolIds || []).includes('av-workbook'));
  if (!navHasWorkbook) fail('AV Workbook is not present in universal nav departments.');
  const cueforge = registry.toolById && registry.toolById('cueforge');
  if (!cueforge || cueforge.href !== 'cue-sheet.html') fail('CueForge does not point to canonical cue-sheet.html.');
  const plot = registry.toolById && registry.toolById('plotforge');
  if (!plot || plot.href !== 'stage-plot.html') fail('Stage Plot does not point to canonical stage-plot.html.');
  notes.push(`registry=${registry.version}`);
  notes.push(`avTools=${registry.tools.length}`);
}

verifyPublicHtml();
verifyNavigationContract();
verifyAvWorkbookRegistry();

if (failures.length) {
  console.error('Public navigation verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Public navigation verification passed (${notes.join(', ')}).`);
