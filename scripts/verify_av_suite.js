#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith('--base='));
const baseUrl = baseArg ? baseArg.slice('--base='.length).replace(/\/?$/, '/') : '';
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function pageFile(rel) {
  return rel.endsWith('/') ? `${rel}index.html` : rel;
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel.replace(/^\.\//, '')));
}

function loadRegistry() {
  const code = read('js/sbd-registry.js');
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'js/sbd-registry.js' });
  return context.self.SBD_REGISTRY;
}

function assertSourceChecks(registry) {
  if (!registry || !Array.isArray(registry.tools)) {
    fail('SBD_REGISTRY.tools did not load.');
    return;
  }

  if (!registry.tools.length) fail('AV tool registry is empty.');

  const ids = new Set();
  registry.tools.forEach((tool) => {
    if (!tool.id || !tool.name || !tool.href || !tool.dept || !tool.tag) {
      fail(`Tool entry missing required fields: ${JSON.stringify(tool)}`);
    }
    if (ids.has(tool.id)) fail(`Duplicate tool id: ${tool.id}`);
    ids.add(tool.id);
    if (!exists(tool.href)) fail(`Tool href missing on disk: ${tool.href}`);
  });

  Object.keys(registry.recommended || {}).forEach((phase) => {
    (registry.recommended[phase] || []).forEach((id) => {
      if (!ids.has(id)) fail(`Recommended phase ${phase} references missing tool id: ${id}`);
    });
  });

  (registry.navDepartments || []).forEach((group) => {
    (group.toolIds || []).forEach((id) => {
      if (!ids.has(id)) fail(`Nav department ${group.label} references missing tool id: ${id}`);
    });
  });

  const offlineAssets = registry.offlineAssets ? registry.offlineAssets() : [];
  offlineAssets.forEach((asset) => {
    if (!exists(asset)) fail(`Offline asset missing on disk: ${asset}`);
  });
  notes.push(`registry=${registry.version}`);
  notes.push(`tools=${registry.tools.length}`);
  notes.push(`offlineAssets=${offlineAssets.length}`);

  const registeredStorageKeys = registry.tools.flatMap((tool) => (tool.storageKeys || []).map((entry) => entry.key));
  if (registeredStorageKeys.includes('PixelForge.ai.v1')) {
    fail('PixelForge AI credentials must not be registered for saved-data scans or show-package export.');
  }

  const toolboxFeatured = registry.tools.filter((tool) => tool.toolboxFeatured === true).map((tool) => tool.id).sort();
  const expectedFeatured = ['av-calculator', 'gear-reference', 'pixelforge', 'throwline'];
  if (JSON.stringify(toolboxFeatured) !== JSON.stringify(expectedFeatured)) {
    fail(`Toolbox Use anytime registry set is wrong: ${toolboxFeatured.join(', ')}.`);
  }
}

function assertPageContracts(registry) {
  const publicPages = ['index.html', 'tools.html', 'av-suite.html', 'av-workbook.html', 'av-workbook/index.html'];
  const toolPages = registry.tools.map((tool) => tool.href);
  const aliasPages = Object.values(registry.aliases || {});
  const pages = Array.from(new Set(publicPages.concat(toolPages, aliasPages)));

  pages.forEach((rel) => {
    const html = read(pageFile(rel));
    if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${rel} missing <title>.`);
    if (!/Content-Security-Policy/i.test(html)) fail(`${rel} missing CSP meta.`);
    if (!/property="og:title"/i.test(html)) fail(`${rel} missing Open Graph title.`);
    if (!/name="twitter:title"/i.test(html)) fail(`${rel} missing Twitter title.`);
  });

  const index = read('index.html');
  const tools = read('tools.html');
  if (/(^|[^0-9])40\+/.test(index + tools) || /~40/.test(index + tools)) {
    fail('Public AV Suite copy still contains stale 40+ or ~40 count.');
  }

  const avSuite = read('av-suite.html');
  if (!/data-av-theme="system" data-av-tool="av-suite"/.test(avSuite) || !/href="css\/av-theme\.css"/.test(avSuite) || !/prefers-color-scheme: dark/.test(avSuite)) {
    fail('AV Suite does not declare the shared system-adaptive theme contract.');
  }
  if (/oklch\(0\.68 0\.13 158|#30B27B|--bg:#0A0D14/.test(avSuite)) {
    fail('AV Suite still contains the retired green-led dark palette.');
  }
  if (!/SENSITIVE_PACKAGE_KEYS=\{'PixelForge\.ai\.v1':true\}/.test(avSuite)) {
    fail('AV Suite is missing the defense-in-depth show-package secret denylist.');
  }
  if (!/!SENSITIVE_PACKAGE_KEYS\[key\]/.test(avSuite)) {
    fail('AV Suite imports do not reject sensitive package keys.');
  }
  if (!/id="settingsDrawer"[^>]*\binert\b/i.test(avSuite)) {
    fail('Settings drawer is not inert in its closed HTML state.');
  }
  if (!/removeAttribute\('inert'\)/.test(avSuite) || !/setAttribute\('inert',''\)/.test(avSuite)) {
    fail('Settings drawer inert state is not toggled by the drawer controller.');
  }
  if (!/id="clearFiltersBtn"/.test(avSuite) || !/function clearToolFilters\(/.test(avSuite)) {
    fail('AV Suite filtered empty state does not provide a recovery action.');
  }
  if (!avSuite.includes("<h3>'+d+'</h3>")) {
    fail('AV Suite tool groups do not preserve the page heading hierarchy.');
  }
  if (!/href="https:\/\/systembydave\.com\/av-suite\.html"/.test(avSuite) || /rel="canonical"[^>]+\?entry=/.test(avSuite)) {
    fail('AV Suite canonical must remain the query-free /av-suite.html URL.');
  }
  if (!/id="entryChooser"[\s\S]*data-entry-choice="show"[\s\S]*data-entry-choice="toolbox"/.test(avSuite) || !/id="doorwayBtn"/.test(avSuite)) {
    fail('AV Suite is missing the keyboard-addressable two-door chooser or its reopen control.');
  }
  if (!/SHOW_CONTEXT_PARAMS=\['sbdShow','sbdVenue','sbdDate','sbdOperator','sbdPhase'\]/.test(avSuite) || !/if\(hasShowContext\(params\)\) return 'show'/.test(avSuite)) {
    fail('Explicit sbd* context does not source-authoritatively force Show Console.');
  }
  if (!/function toolHref\(tool\)[\s\S]*entryState\.mode==='toolbox'[\s\S]*url\.searchParams\.delete\(name\)/.test(avSuite)) {
    fail('Toolbox toolHref does not strip every show-context parameter.');
  }
  ['toolboxPinned', 'toolboxRecent', 'toolboxSearch', 'toolboxFilter', 'toolboxFamily', 'preferredEntry'].forEach((field) => {
    if (!avSuite.includes(field)) fail(`AV Suite UI preferences are missing ${field}.`);
  });
  if (!/TOOLBOX_FEATURED=TOOLS\.filter\(function\(tool\)\{return tool\.toolboxFeatured===true;\}\)/.test(avSuite)) {
    fail('AV Toolbox Use anytime inventory is not derived from registry.toolboxFeatured.');
  }
  if (!/src="js\/vendor\/gsap\.min\.js"/.test(avSuite) || !/gsap\.killTweensOf\(regions\)/.test(avSuite) || !/prefers-reduced-motion: reduce/.test(avSuite)) {
    fail('AV Suite doorway motion is missing local GSAP, tween cleanup, or reduced-motion bypass.');
  }

  const manifest = JSON.parse(read('manifest.json'));
  const shortcutUrls = (manifest.shortcuts || []).map((shortcut) => shortcut.url);
  ['./av-suite.html?entry=show', './av-suite.html?entry=toolbox'].forEach((url) => {
    if (!shortcutUrls.includes(url)) fail(`PWA manifest is missing shortcut ${url}.`);
  });
  if (!index.includes('href="av-suite.html?entry=toolbox"') || !index.includes('Browse AV tools')) {
    fail('Homepage is missing the addressable AV Toolbox doorway.');
  }
  if (!tools.includes("url: 'av-suite.html?entry=toolbox'") || !tools.includes('AV Toolbox')) {
    fail('Tools directory is missing the addressable AV Toolbox entry.');
  }

  const calculator = read('av-calculator.html');
  if (!/id="powerMethod"[\s\S]*value="amps"[\s\S]*value="watts"/.test(calculator)) {
    fail('AV Calculator power load does not offer nameplate-amps and watts-plus-PF methods.');
  }
  if (!/totalWatts \/ \(voltage \* powerFactor\)/.test(calculator)) {
    fail('AV Calculator watts mode does not calculate single-phase current with power factor.');
  }
  if (!/calculator will not silently assume PF 1/.test(calculator)) {
    fail('AV Calculator does not require an explicit manufacturer power factor in watts mode.');
  }
  if (!/hasOwnProperty\.call\(parsed, 'powerMethod'\)[\s\S]*powerMethod: 'watts', powerFactor: 0/.test(calculator)) {
    fail('AV Calculator does not migrate saved watt inputs without assuming a power factor.');
  }

  const autoSeedPatterns = [
    /:\s*sampleCues\.map\(cloneCue\)/,
    /:\s*sampleItems\.map\(cloneItem\)/,
    /if\(!next\.items\.length\)\s*next\.items\s*=\s*sampleItems\.map\(cloneItem\)/
  ];
  registry.tools.forEach((tool) => {
    const source = read(pageFile(tool.href));
    if (autoSeedPatterns.some((pattern) => pattern.test(source))) {
      fail(`${tool.href} automatically seeds sample operations instead of starting empty.`);
    }
  });
  const workbookStore = read('apps/av-workbook/src/store.ts');
  if (/createSampleWorkbook/.test(workbookStore)) {
    fail('AV Workbook store still seeds the sample workbook on first launch.');
  }
  const workbookApp = read('apps/av-workbook/src/App.tsx');
  const packageManifest = JSON.parse(read('package.json'));
  if (!/useGSAP/.test(workbookApp) || !/ScrollTrigger/.test(workbookApp) || !/prefers-reduced-motion: reduce/.test(workbookApp)) {
    fail('AV Workbook flagship motion is missing scoped GSAP, ScrollTrigger, or reduced-motion handling.');
  }
  if (!packageManifest.dependencies?.gsap || !packageManifest.dependencies?.['@gsap/react']) {
    fail('AV Workbook GSAP dependencies are not declared as production dependencies.');
  }

  const ontrack = read('ontrack.html');
  if (!/<h1 class="logo">/.test(ontrack)) fail('OnTrack is missing its page-level heading.');
  if (!/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="dTitle"/.test(ontrack)) {
    fail('OnTrack detail drawer is missing dialog semantics.');
  }
  if (!/function closeDrawer\(/.test(ontrack) || !/drawerReturnFocus/.test(ontrack)) {
    fail('OnTrack drawer does not implement focus return and keyboard close behavior.');
  }
  if (!/id="drawer"[^>]*\binert\b/.test(ontrack) || !/removeAttribute\("inert"\)/.test(ontrack)) {
    fail('OnTrack detail drawer remains focusable while closed.');
  }
  if (!/aria-label="Search tracks"/.test(ontrack)) fail('OnTrack search control is unnamed.');

  const responsiveTables = read('js/responsive-tables.js');
  if (!/createElement\('caption'\)/.test(responsiveTables) || !/setAttribute\('scope',\s*'col'\)/.test(responsiveTables)) {
    fail('Responsive tables helper does not provide captions and column-header scope.');
  }

  const showTimer = read('show-timer.html');
  if (!/lastAnnouncedTimerState/.test(showTimer) || !/Timer overrun\./.test(showTimer)) {
    fail('Show Timer does not announce meaningful timer state transitions.');
  }

  const cueforgeBoundary = read('cueforge.html');
  if (!/<meta name="robots" content="noindex,follow">/.test(cueforgeBoundary)) {
    fail('CueForge product-boundary route is indexable.');
  }
  if (!/<link rel="canonical" href="https:\/\/systembydave\.com\/cueforge\.html">/.test(cueforgeBoundary)) {
    fail('CueForge product-boundary route is not self-canonical.');
  }
  if (/window\.location\.replace|destination=['"]cue-sheet\.html/.test(cueforgeBoundary)) {
    fail('CueForge product-boundary route still redirects to Cue Sheet.');
  }
  if (!/separate Electron desktop application/.test(cueforgeBoundary) || !/Open Cue Sheet/.test(cueforgeBoundary)) {
    fail('CueForge product-boundary route does not explain the product distinction.');
  }

  const stagePlotter = registry.toolById && registry.toolById('stageplotter');
  if (!stagePlotter || stagePlotter.name !== 'StagePlotter' || stagePlotter.href !== 'stage-plot.html') {
    fail('StagePlotter is not registered at its canonical stage-plot.html route.');
  }
  if ((registry.aliases || {})['plotforge.html']) {
    fail('PlotForge route still normalizes to StagePlotter.');
  }
  const stagePlotterPage = read('stage-plot.html');
  if (!/data-av-tool="stageplotter"/.test(stagePlotterPage) || !/<h1 id="pageTitle">StagePlotter<\/h1>/.test(stagePlotterPage)) {
    fail('StagePlotter page identity is incomplete.');
  }
  ['stage', 'screen', 'camera', 'speaker', 'mic', 'table', 'power', 'cable', 'person'].forEach((type) => {
    if (!new RegExp(`\\b${type}:"<svg class='item-symbol`).test(stagePlotterPage)) fail(`StagePlotter is missing the ${type} SVG symbol.`);
  });
  if (!/src="js\/vendor\/gsap\.min\.js"/.test(stagePlotterPage) || !/gsap\.matchMedia\(\)/.test(stagePlotterPage) || !/prefers-reduced-motion: reduce/.test(stagePlotterPage)) {
    fail('StagePlotter motion is missing local GSAP or its reduced-motion bypass.');
  }
  if (!/var STORE = "stage-plot\.v1"/.test(stagePlotterPage) || !/var EXPORT_SCHEMA = "system-by-dave\.plotforge\.v1"/.test(stagePlotterPage)) {
    fail('StagePlotter does not preserve its existing storage and export contracts.');
  }
  const plotForgeBoundary = read('plotforge.html');
  if (!/<link rel="canonical" href="https:\/\/plotforge-beta\.vercel\.app\/">/.test(plotForgeBoundary) || !/window\.location\.replace\(target\.href\)/.test(plotForgeBoundary)) {
    fail('PlotForge handoff no longer points to the full deployed application.');
  }

  const sitemap = read('sitemap.xml');
  ['av-workbook.html', 'plotforge.html'].forEach((alias) => {
    if (sitemap.includes(alias)) fail(`Sitemap includes compatibility alias ${alias}.`);
  });
  if (sitemap.includes('cueforge.html')) fail('Sitemap includes the noindex CueForge product-boundary route.');
}

async function assertRemoteChecks(registry) {
  if (!baseUrl) return;
  const targets = Array.from(new Set(
    ['av-suite.html', 'tools.html', 'index.html']
      .concat(registry.tools.map((tool) => tool.href))
      .concat(registry.offlineAssets ? registry.offlineAssets().map((asset) => asset.replace(/^\.\//, '')) : [])
  ));
  let ok = 0;
  for (const target of targets) {
    const url = new URL(target, baseUrl).href;
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status !== 200) fail(`Remote ${target} returned HTTP ${response.status}.`);
      else ok += 1;
    } catch (error) {
      fail(`Remote ${target} failed: ${error.message}`);
    }
  }
  notes.push(`remoteBase=${baseUrl}`);
  notes.push(`remote200=${ok}/${targets.length}`);
}

(async function main() {
  const registry = loadRegistry();
  assertSourceChecks(registry);
  assertPageContracts(registry);
  await assertRemoteChecks(registry);

  if (failures.length) {
    console.error('AV Suite verification failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`AV Suite verification passed (${notes.join(', ')}).`);
}()).catch((error) => {
  console.error(error);
  process.exit(1);
});
