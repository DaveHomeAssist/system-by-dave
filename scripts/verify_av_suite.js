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
  if (!/<meta name="theme-color" content="#EEE8DF">/.test(avSuite) || !/color-scheme:light/.test(avSuite) || !/--accent:#9E432B/.test(avSuite)) {
    fail('AV Suite does not declare the warm light theme as its default.');
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

  const cueforge = read('cueforge.html');
  if (!/<meta name="robots" content="noindex,follow">/.test(cueforge)) {
    fail('CueForge compatibility route is indexable.');
  }
  if (!/<link rel="canonical" href="https:\/\/systembydave\.com\/cue-sheet\.html">/.test(cueforge)) {
    fail('CueForge compatibility route canonical does not point to Cue Sheet.');
  }

  const sitemap = read('sitemap.xml');
  ['av-workbook.html', 'cueforge.html', 'plotforge.html'].forEach((alias) => {
    if (sitemap.includes(alias)) fail(`Sitemap includes compatibility alias ${alias}.`);
  });
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
