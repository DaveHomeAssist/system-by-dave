#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { originFor } = require('./domain_sites_lib');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '_hat-in-ring-src']);
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
  'switcher/index.html',
  'switcher/guide/index.html',
  'shader/index.html',
  'ursa-broadcast-g2/index.html',
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
  ['switcher/index.html', 'reference-main'],
  ['switcher/guide/index.html', 'atem-explorer'],
  ['shader/index.html', 'reference-main'],
  ['ursa-broadcast-g2/index.html', 'reference-main'],
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
  // AV by Dave pages are also published on avbydave.com, so their System by Dave
  // home link is absolute (scripts/domain-sites.json).
  ['av-tool-suite/index-v2/index.html', ['href="https://systembydave.com/"', 'href="/av-suite.html"', 'System by Dave / AV Tool Suite']],
  ['ProjectorThrow/index.html', ['href="https://systembydave.com/"', 'href="../av-suite.html"', 'id="throwline-workspace"']],
  ['ProjectorThrow/Stage3D.html', ['href="https://systembydave.com/"', 'href="index.html?workspace=planner"', 'href="../av-suite.html"', 'id="stage-workspace"']]
]);
const SITE_ORIGIN = 'https://systembydave.com';
// FMP video operations shell. fmp/ and fmpwalk/ are managed exports from
// DaveHomeAssist/fmp-suite, so every page is listed explicitly and checked for a
// home link, a /fmp/ hub link (except the hub), and a first-focus skip link whose
// target is on the same document after <base> resolution.
const FMP_HUB = 'fmp/index.html';
const FMP_MANAGED_DIRS = ['fmp', 'fmpwalk'];
const FMP_SHELL_PAGES = [
  FMP_HUB,
  'fmp/camera/index.html',
  'fmp/camera/catwalk/index.html',
  'fmp/camera/front-of-house/index.html',
  'fmp/camera/pit-center/index.html',
  'fmp/camera/pit-stage-left/index.html',
  'fmp/house/index.html',
  'fmp/guide/index.html',
  'fmp/gear/index.html',
  'fmp/build/index.html',
  'fmp/ptz/index.html',
  'fmp/rig/index.html',
  'fmp/models/atem-hd8-iso.html',
  'fmp/models/p240.html',
  'fmp/models/ccu4.html',
  'fmp/ptz/SuperJoy-G1-Interactive-Guide.html',
  'fmpwalk/index.html'
];
// Known FMP shell gaps, each to be fixed in DaveHomeAssist/fmp-suite. The export
// that fixes a gap removes its entry in the same commit: an entry that no longer
// fails is itself a failure, and any gap not listed here fails immediately.
// Hygiene Batch B (fmpwalk dac4906) fixed the baseline H2 camera skip links and
// the H5 guide and walk home links, so the list is empty.
const FMP_KNOWN_SHELL_GAPS = new Map([]);

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

function routeFor(file) {
  const posix = file.split(path.sep).join('/');
  if (posix === 'index.html') return '/';
  if (posix.endsWith('/index.html')) return `/${posix.slice(0, -10)}`;
  return `/${posix}`;
}

function bodyMarkup(source) {
  const body = source.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || '';
  return body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '');
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((value) => value !== undefined);
}

function fmpShellGaps(file, source) {
  // Resolve links from the page's own origin: housevideo.app once that site has
  // cut over (scripts/domain-sites.json). Home may be that site's / or System by Dave.
  const origin = originFor(file.split(path.sep).join('/'));
  const pageUrl = new URL(routeFor(file), origin);
  const baseTag = source.match(/<base\s[^>]*>/i)?.[0];
  const baseUrl = baseTag && attribute(baseTag, 'href') !== undefined ? new URL(attribute(baseTag, 'href'), pageUrl) : pageUrl;
  const body = bodyMarkup(source);
  const links = Array.from(body.matchAll(/<a\s[^>]*>/gi), (match) => attribute(match[0], 'href'))
    .filter((href) => href !== undefined)
    .map((href) => new URL(href, baseUrl));
  const isPath = (url, paths, origins = [origin]) => origins.includes(url.origin) && paths.includes(url.pathname);
  const gaps = [];
  // The FMP pages are the venue's own operational site and /fmp/ is their home: publisher
  // branding was struck from them, so they no longer carry a systembydave.com home link.
  const isFmpManaged = FMP_MANAGED_DIRS.some((dir) => file === `${dir}/index.html` || file.startsWith(`${dir}/`));
  if (!isFmpManaged && !links.some((url) => isPath(url, ['/', '/index.html'], [origin, SITE_ORIGIN]))) gaps.push('no home link');
  if (file !== FMP_HUB && !links.some((url) => isPath(url, ['/fmp/', '/fmp/index.html'], [origin, originFor(FMP_HUB)]))) gaps.push('no /fmp/ parent link');

  const firstFocusable = body.match(/<(?:a\s[^>]*\bhref=[^>]*|button\b[^>]*|select\b[^>]*|textarea\b[^>]*|summary\b[^>]*|input\b(?![^>]*\btype=["']?hidden)[^>]*|[a-z][a-z0-9-]*\s[^>]*\btabindex=["']?(?:0|[1-9])[^>]*)>/i)?.[0] || '';
  const skipHref = /^<a\s/i.test(firstFocusable) ? attribute(firstFocusable, 'href') : undefined;
  if (!skipHref || !skipHref.includes('#')) {
    gaps.push('first focusable element is not a skip link');
    return gaps;
  }
  const skipUrl = new URL(skipHref, baseUrl);
  const target = decodeURIComponent(skipUrl.hash.slice(1));
  const skipDocument = new URL(skipUrl.href);
  skipDocument.hash = '';
  if (skipDocument.href !== pageUrl.href) {
    gaps.push(`skip link #${target} leaves the document for ${skipDocument.pathname}`);
    return gaps;
  }
  const targetTag = focusTargetTag(source, target);
  if (!targetTag) gaps.push(`skip target #${target} is missing`);
  // tabindex="0" is also focusable: the rig's scrollable tabpanel uses it so keyboard users can reach and scroll it.
  else if (!/\btabindex=(?:["'](?:-1|0)["']|-1|0)(?:\s|>)/i.test(targetTag) && !/^<(?:a|button|input|select|textarea)\b/i.test(targetTag)) {
    gaps.push(`skip target #${target} is not programmatically focusable`);
  }
  return gaps;
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
    const fmpShell = FMP_SHELL_PAGES.includes(file.split(path.sep).join('/'));
    if (!isHomeFile(file) && !fmpShell && !hasReturnPath(source)) fail(`${file} has no verified return path.`);
    if (!isNoIndex(source) && hasPublicCommand53Exposure(source)) fail(`${file} exposes private Command53 routing on a public page.`);
    if (/sbd-public-nav\.js/i.test(source)) {
      const prefix = prefixFor(file);
      if (!source.includes(`href="${prefix}css/sbd-public-nav.css"`) && !source.includes('href="/css/sbd-public-nav.css"')) fail(`${file} loads public nav JS without matching CSS path.`);
      if (!source.includes(`src="${prefix}js/sbd-public-nav.js"`) && !source.includes('src="/js/sbd-public-nav.js"')) fail(`${file} has an unexpected public nav JS path.`);
    }
  });
  notes.push(`publicPages=${pages}`);
}

function verifyNavigationContract() {
  CORE_HEADERS.forEach((active, file) => {
    const source = read(file);
    if (!/class="sbd-site-header"/.test(source)) fail(`${file} is missing the shared global header.`);
    // Pages also published on another domain (scripts/domain-sites.json) name
    // their systembydave.com destinations absolutely.
    ['/tools.html', '/av-suite.html', '/notion.html', '/prompt-lab.html', '/profile/'].forEach((href) => {
      if (!source.includes(`href="${href}"`) && !source.includes(`href="${SITE_ORIGIN}${href}"`)) fail(`${file} is missing global destination ${href}.`);
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

// 404.html is served at whatever path was missing, so every same-origin reference
// must be root-absolute to keep its recovery links and styles working below the root.
function verifyNotFoundPage() {
  const source = read('404.html');
  Array.from(source.matchAll(/\s(?:href|src)=["']([^"']*)["']/gi), (match) => match[1]).forEach((value) => {
    if (!/^(?:\/|#|https:\/\/|mailto:)/i.test(value)) fail(`404.html reference ${value} is not root-absolute.`);
  });
  ['href="/"', 'href="/tools.html"'].forEach((snippet) => {
    if (!source.includes(snippet)) fail(`404.html is missing recovery link ${snippet}.`);
  });
}

function verifyFmpShells() {
  const listed = new Set(FMP_SHELL_PAGES);
  FMP_MANAGED_DIRS.forEach((dir) => {
    walk(path.join(ROOT, dir)).forEach((rel) => {
      const file = rel.split(path.sep).join('/');
      if (isDocument(read(file)) && !listed.has(file)) fail(`${file} is an FMP page without an explicit FMP shell entry.`);
    });
  });
  FMP_KNOWN_SHELL_GAPS.forEach((_, file) => {
    if (!listed.has(file)) fail(`FMP_KNOWN_SHELL_GAPS lists ${file}, which is not an FMP shell page.`);
  });
  let known = 0;
  FMP_SHELL_PAGES.forEach((file) => {
    const gaps = fmpShellGaps(file, read(file));
    const allowed = FMP_KNOWN_SHELL_GAPS.get(file) || [];
    gaps.forEach((gap) => {
      if (allowed.includes(gap)) {
        known += 1;
        console.warn(`Known FMP shell gap (fix in DaveHomeAssist/fmp-suite): ${file}: ${gap}`);
      } else {
        fail(`${file}: ${gap}.`);
      }
    });
    allowed.filter((gap) => !gaps.includes(gap)).forEach((gap) => {
      fail(`${file} no longer has known FMP shell gap "${gap}"; remove it from FMP_KNOWN_SHELL_GAPS.`);
    });
  });
  notes.push(`fmpShells=${FMP_SHELL_PAGES.length}`);
  notes.push(`fmpKnownGaps=${known}`);
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
  const cueSheet = registry.toolById && registry.toolById('cue-sheet');
  if (!cueSheet || cueSheet.name !== 'Cue Sheet' || cueSheet.href !== 'cue-sheet.html') fail('Cue Sheet is not registered at canonical cue-sheet.html.');
  const legacyCueForgeId = registry.toolById && registry.toolById('cueforge');
  if (!legacyCueForgeId || legacyCueForgeId.id !== 'cue-sheet') fail('Legacy cueforge suite state does not normalize to Cue Sheet.');
  const plot = registry.toolById && registry.toolById('stageplotter');
  if (!plot || plot.name !== 'StagePlotter' || plot.href !== 'stage-plot.html') fail('StagePlotter does not point to canonical stage-plot.html.');
  const legacyPlotForgeId = registry.toolById && registry.toolById('plotforge');
  if (!legacyPlotForgeId || legacyPlotForgeId.id !== 'stageplotter') fail('Legacy plotforge suite state does not normalize to StagePlotter.');
  notes.push(`registry=${registry.version}`);
  notes.push(`avTools=${registry.tools.length}`);
}

verifyPublicHtml();
verifyNavigationContract();
verifyNotFoundPage();
verifyFmpShells();
verifyAvWorkbookRegistry();

if (failures.length) {
  console.error('Public navigation verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Public navigation verification passed (${notes.join(', ')}).`);
