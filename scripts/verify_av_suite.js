#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { originFor, sitemapFor } = require('./domain_sites_lib');

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
  const expectedFeatured = ['av-calculator', 'av-video', 'gear-reference', 'pixelforge', 'throwline'];
  if (JSON.stringify(toolboxFeatured) !== JSON.stringify(expectedFeatured)) {
    fail(`Toolbox Use anytime registry set is wrong: ${toolboxFeatured.join(', ')}.`);
  }
}

function assertRailRegistryContracts(registry) {
  const expectedConsoles = [
    ['av-video', 'video', 'AV Video', 'available'],
    ['audio', 'audio', 'Audio', 'planned'],
    ['show-control', 'showcontrol', 'Show Control', 'planned'],
    ['show-ops', 'showops', 'Show Ops', 'planned'],
    ['front-office', 'office', 'Front Office', 'planned'],
    ['shop', 'shop', 'The Shop', 'planned'],
    ['infrastructure', 'infra', 'Infrastructure', 'planned'],
    ['lighting', 'lighting', 'Lighting', 'planned'],
    ['av-calculator', 'calc', 'AV Calculator', 'planned']
  ];
  const actualConsoles = (registry.consoles || []).map((console) => [
    console.id,
    console.prototypeId,
    console.label,
    console.availability
  ]);
  if (JSON.stringify(actualConsoles) !== JSON.stringify(expectedConsoles)) {
    fail(`Rail console identities or source order are wrong: ${JSON.stringify(actualConsoles)}.`);
  }

  const consoleIds = (registry.consoles || []).map((console) => console.id);
  const prototypeIds = (registry.consoles || []).map((console) => console.prototypeId);
  if (new Set(consoleIds).size !== consoleIds.length) fail('Rail console IDs are not unique.');
  if (new Set(prototypeIds).size !== prototypeIds.length) fail('Rail prototype IDs are not unique.');
  const expectedIcons = {
    'av-video': ['m16 9 5-3v12l-5-3z', 'M3 6h13v12H3z'],
    audio: ['M4 10v4', 'M8 6v12', 'M12 3v18', 'M16 7v10', 'M20 10v4'],
    'show-control': ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M10 8.5v7l5.5-3.5z'],
    'show-ops': ['M3 5h18v16H3z', 'M3 10h18', 'M8 3v4', 'M16 3v4', 'M7 14h5', 'M10 17h7'],
    'front-office': ['M5 4h14v17H5z', 'M9 4V2h6v2', 'm9 13 2 2 4-4'],
    shop: ['M4 4h16v13H4z', 'M4 9h16', 'M10 12h4', 'M8 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', 'M16 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'],
    infrastructure: ['M13 2 4 14h7l-1 8 9-12h-7z'],
    lighting: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z'],
    'av-calculator': ['M5 3h14v18H5z', 'M8 7h8v3H8z', 'M8 14h2', 'M11 14h2', 'M14 14h2', 'M8 17.5h2', 'M11 17.5h2', 'M14 17.5h2']
  };
  (registry.consoles || []).forEach((console) => {
    if (JSON.stringify(console.icon) !== JSON.stringify(expectedIcons[console.id])) {
      fail(`Rail console ${console.id} does not preserve its v3 source icon.`);
    }
  });

  const expectedPinned = expectedConsoles.map(([id]) => `console:${id}`);
  if (JSON.stringify(registry.rail?.defaultPinned || []) !== JSON.stringify(expectedPinned)) {
    fail(`Rail default pins do not match the RAIL-1B order: ${(registry.rail?.defaultPinned || []).join(', ')}.`);
  }

  const avVideo = (registry.consoles || []).find((console) => console.id === 'av-video');
  if (!avVideo || avVideo.toolId !== 'av-video' || avVideo.draftKey !== 'sbd.avVideo.draft.v1' || avVideo.layoutKey !== 'sbd.avVideo.layout.v1') {
    fail('AV Video rail identity is missing its canonical tool and storage metadata.');
  } else {
    const avVideoToolKeys = (registry.toolById('av-video')?.storageKeys || []).map((entry) => entry.key);
    [avVideo.draftKey, avVideo.layoutKey].forEach((key) => {
      if (!avVideoToolKeys.includes(key)) fail(`AV Video rail storage key is absent from the owning tool: ${key}.`);
    });
  }

  const plannedForbiddenFields = ['toolId', 'href', 'route', 'draftKey', 'layoutKey', 'storageKey', 'storageKeys', 'document', 'doc', 'schema'];
  (registry.consoles || []).filter((console) => console.availability === 'planned').forEach((console) => {
    plannedForbiddenFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(console, field)) fail(`Planned console ${console.id} fabricates ${field} metadata.`);
    });
  });
  const available = (registry.consoles || []).filter((console) => console.availability === 'available').map((console) => console.id);
  if (JSON.stringify(available) !== JSON.stringify(['av-video'])) {
    fail(`Only AV Video may be available in the RAIL-1B registry slice: ${available.join(', ')}.`);
  }

  const expectedExternals = [
    ['cueforge', 'CueForge', 'handoff', 'https://systembydave.com/cueforge.html', 'Desktop app'],
    ['plotforge', 'PlotForge', 'handoff', 'plotforge.html', 'Own app'],
    ['housevideo', 'House Video / FMP', 'handoff', 'https://housevideo.app/', 'Link out'],
    ['arenaops', 'Arena Ops', 'status', undefined, 'API pending'],
    ['deckforge', 'DeckForge + Stream Deck', 'status', undefined, 'Control surface']
  ];
  const actualExternals = (registry.externals || []).map((external) => [
    external.id,
    external.label,
    external.kind,
    external.destination,
    external.badge
  ]);
  if (JSON.stringify(actualExternals) !== JSON.stringify(expectedExternals)) {
    fail(`Rail external records are wrong: ${JSON.stringify(actualExternals)}.`);
  }
  (registry.externals || []).forEach((external) => {
    if (external.kind === 'handoff' && !external.destination) fail(`External handoff ${external.id} has no destination.`);
    if (external.kind === 'status' && Object.prototype.hasOwnProperty.call(external, 'destination')) {
      fail(`Status-only external ${external.id} must not have a destination.`);
    }
  });

  if (typeof registry.externalById !== 'function') {
    fail('SBD_REGISTRY.externalById did not load.');
  } else {
    expectedExternals.forEach(([id, label]) => {
      if (registry.externalById(id)?.label !== label) fail(`externalById does not resolve exact external id ${id}.`);
    });
    ['cue-sheet', 'stageplotter', 'missing'].forEach((id) => {
      if (registry.externalById(id) !== null) fail(`externalById must not alias or fabricate ${id}.`);
    });
  }
  if (registry.toolById('cueforge')?.id !== 'cue-sheet') fail('Legacy cueforge tool ID no longer normalizes to Cue Sheet.');
  if (registry.toolById('plotforge')?.id !== 'stageplotter') fail('Legacy plotforge tool ID no longer normalizes to StagePlotter.');

  const railAssets = [
    './css/sbd-rail.css',
    './css/sbd-rail-dialogs.css',
    './js/sbd-rail.js',
    './js/sbd-rail-dialogs.js',
    './js/sbd-rail-mount.js'
  ];
  railAssets.forEach((asset) => {
    if (!registry.baseAssets.includes(asset)) fail(`Rail asset is missing from baseAssets: ${asset}.`);
    if (!registry.offlineAssets().includes(asset)) fail(`Rail asset is missing from offlineAssets: ${asset}.`);
  });
  if (registry.version !== 'v20261008-show-ops-room-check') fail(`AV cache generation is not current: ${registry.version}.`);
  if (registry.offlineAssets().some((asset) => /^https?:/i.test(asset))) fail('Offline assets include an external host.');

  const storageKeyCount = registry.tools.flatMap((tool) => tool.storageKeys || []).length;
  if (!registry.offlineAssets().includes('./front-office/theme-init.js')) fail('Front Office theme initialization is missing from offline assets.');
  if (registry.tools.length !== 52 || registry.baseAssets.length !== 127 || registry.offlineAssets().length !== 179 || storageKeyCount !== 69) {
    fail(`AV application integration changed an inventory count unexpectedly (tools=${registry.tools.length}, baseAssets=${registry.baseAssets.length}, offlineAssets=${registry.offlineAssets().length}, storageKeys=${storageKeyCount}).`);
  }
  (registry.externals || []).forEach((external) => {
    if (registry.tools.some((tool) => tool.id === external.id)) fail(`External ${external.id} leaked into the normal tool inventory.`);
  });
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
  const avVideo = read('av-video/index.html');
  [
    '../css/sbd-rail.css',
    '../css/sbd-rail-dialogs.css',
    '../js/sbd-rail.js',
    '../js/sbd-rail-dialogs.js',
    '../js/sbd-rail-mount.js'
  ].forEach((asset) => {
    if (!avVideo.includes(asset)) fail(`AV Video production build does not load ${asset}.`);
  });
  if (!/data-sbd-rail-host[^>]*data-current-ref="console:av-video"/.test(avVideo)
      || !/class="av-video-shell__workspace"/.test(avVideo)
      || !/data-sbd-rail-dialogs/.test(avVideo)) {
    fail('AV Video production build does not mount the Rail outside the React root.');
  }
  if (/(^|[^0-9])40\+/.test(index + tools) || /~40/.test(index + tools)) {
    fail('Public AV Suite copy still contains stale 40+ or ~40 count.');
  }

  const avSuite = read('av-suite.html');
  const avSuiteCss = read('css/av-suite.css');
  const avSuiteApp = read('js/av-suite/app.js');
  const avSuiteModal = read('js/av-suite/modal-controller.js');
  const avSuiteRuntime = [avSuite, avSuiteCss, avSuiteApp, avSuiteModal].join('\n');
  if (!/data-av-theme="system" data-av-tool="av-suite"/.test(avSuite) || !/href="css\/av-theme\.css"/.test(avSuite) || !/prefers-color-scheme: dark/.test(avSuite)) {
    fail('AV Suite does not declare the shared system-adaptive theme contract.');
  }
  if (!/href="css\/av-suite\.css"/.test(avSuite) || !/type="module" src="js\/av-suite\/app\.js"/.test(avSuite)) {
    fail('AV Suite does not load its extracted stylesheet and application module.');
  }
  if (/script-src[^;]*'unsafe-inline'/.test(avSuite) || /<script>([\s\S]*?)<\/script>/.test(avSuite)) {
    fail('AV Suite still requires inline JavaScript after the architecture extraction.');
  }
  if (!/import \{ setModalBackgroundInert \} from '\.\/modal-controller\.js';/.test(avSuiteApp)) {
    fail('AV Suite application module does not import the shared modal controller.');
  }
  if (/oklch\(0\.68 0\.13 158|#30B27B|--bg:#0A0D14/.test(avSuiteRuntime)) {
    fail('AV Suite still contains the retired green-led dark palette.');
  }
  if (!/SENSITIVE_PACKAGE_KEYS=\{'PixelForge\.ai\.v1':true\}/.test(avSuiteApp)) {
    fail('AV Suite is missing the defense-in-depth show-package secret denylist.');
  }
  if (!/!SENSITIVE_PACKAGE_KEYS\[key\]/.test(avSuiteApp)) {
    fail('AV Suite imports do not reject sensitive package keys.');
  }
  if (!/id="settingsDrawer"[^>]*\binert\b/i.test(avSuite)) {
    fail('Settings drawer is not inert in its closed HTML state.');
  }
  if (!/removeAttribute\('inert'\)/.test(avSuiteRuntime) || !/setAttribute\('inert',''\)/.test(avSuiteRuntime)) {
    fail('Settings drawer inert state is not toggled by the drawer controller.');
  }
  if (!/id="clearFiltersBtn"/.test(avSuiteRuntime) || !/function clearToolFilters\(/.test(avSuiteApp)) {
    fail('AV Suite filtered empty state does not provide a recovery action.');
  }
  if (!avSuiteApp.includes("<h3>'+d+'</h3>")) {
    fail('AV Suite tool groups do not preserve the page heading hierarchy.');
  }
  // The canonical origin follows the AV by Dave cutover (scripts/domain-sites.json).
  if (!avSuite.includes(`href="${originFor('av-suite.html')}/av-suite.html"`) || /rel="canonical"[^>]+\?entry=/.test(avSuite)) {
    fail('AV Suite canonical must remain the query-free /av-suite.html URL.');
  }
  if (!/id="entryChooser"[\s\S]*data-entry-choice="show"[\s\S]*data-entry-choice="toolbox"/.test(avSuite) || !/id="doorwayBtn"/.test(avSuite)) {
    fail('AV Suite is missing the keyboard-addressable two-door chooser or its reopen control.');
  }
  if (!/SHOW_CONTEXT_PARAMS=\['sbdShow','sbdVenue','sbdDate','sbdOperator','sbdPhase'\]/.test(avSuiteApp) || !/if\(hasShowContext\(params\)\) return 'show'/.test(avSuiteApp)) {
    fail('Explicit sbd* context does not source-authoritatively force Show Console.');
  }
  if (!/function toolHref\(tool\)[\s\S]*entryState\.mode==='toolbox'[\s\S]*url\.searchParams\.delete\(name\)/.test(avSuiteApp)) {
    fail('Toolbox toolHref does not strip every show-context parameter.');
  }
  ['function toolboxFamilyOverrideFromLocation()', 'function effectiveToolboxState()', 'syncToolboxFamilyOverride();'].forEach((contract) => {
    if (!avSuiteApp.includes(contract)) fail(`AV Toolbox family URL handling is missing ${contract}.`);
  });
  if (!/toolboxFamilyOverrideFromLocation\(\)[\s\S]*hasShowContext\(params\)[\s\S]*familyExists\(family\)/.test(avSuiteApp)) {
    fail('AV Toolbox family URL handling does not preserve Show precedence and exact family validation.');
  }
  ['var EXTERNALS=REG.externals||[];', "value.indexOf('external:')===0", 'appendExternalCommands(items', 'data-command-id'].forEach((contract) => {
    if (!avSuiteApp.includes(contract)) fail(`AV Suite external commands are missing ${contract}.`);
  });
  if (!/function navigableExternalById\(id\)[\s\S]*external\.kind==='handoff'[\s\S]*external\.destination/.test(avSuiteApp)) {
    fail('AV Suite command validation does not exclude status-only external products.');
  }
  if (!/function openExternal\(id\)[\s\S]*link\.rel='noopener noreferrer'/.test(avSuiteApp)) {
    fail('AV Suite external command navigation is missing rel protection.');
  }
  ['toolboxPinned', 'toolboxRecent', 'toolboxSearch', 'toolboxFilter', 'toolboxFamily', 'preferredEntry'].forEach((field) => {
    if (!avSuiteApp.includes(field)) fail(`AV Suite UI preferences are missing ${field}.`);
  });
  if (!/TOOLBOX_FEATURED=TOOLS\.filter\(function\(tool\)\{return tool\.toolboxFeatured===true;\}\)/.test(avSuiteApp)) {
    fail('AV Toolbox Use anytime inventory is not derived from registry.toolboxFeatured.');
  }
  if (!/src="js\/vendor\/gsap\.min\.js"/.test(avSuite) || !/gsap\.killTweensOf\(regions\)/.test(avSuiteApp) || !/prefers-reduced-motion:reduce/.test(avSuiteCss)) {
    fail('AV Suite doorway motion is missing local GSAP, tween cleanup, or reduced-motion bypass.');
  }

  const manifest = JSON.parse(read('manifest.json'));
  const shortcutUrls = (manifest.shortcuts || []).map((shortcut) => shortcut.url);
  ['./av-suite.html?entry=show', './av-suite.html?entry=toolbox'].forEach((url) => {
    if (!shortcutUrls.includes(url)) fail(`PWA manifest is missing shortcut ${url}.`);
  });
  if (!index.includes('href="av-suite.html?entry=toolbox"') || !/Browse (the )?AV tools/.test(index)) {
    fail('Homepage is missing the addressable AV Toolbox doorway.');
  }
  if (!/<a class="tool-card"[^>]*\shref="av-suite\.html\?entry=toolbox"[^>]*>[\s\S]*?<h2>AV Toolbox<\/h2>/.test(tools)) {
    fail('Tools directory is missing the addressable AV Toolbox entry.');
  }
  // Tools directory cards for registry tools carry the registry id and its navigation department.
  const toolCards = Array.from(tools.matchAll(/<a class="tool-card[^"]*"([^>]*)>[\s\S]*?<span class="tc-badge">([^<]*)<\/span>/g), (match) => ({
    attrs: match[1],
    href: (match[1].match(/\shref="([^"]*)"/) || [])[1],
    registryId: (match[1].match(/\sdata-registry-id="([^"]*)"/) || [])[1],
    badge: match[2]
  }));
  toolCards.forEach((card) => {
    const tool = registry.tools.find((candidate) => candidate.href === card.href);
    if (!tool) {
      if (card.registryId) fail(`Tools card ${card.href} names registry id ${card.registryId} but is not a registry route.`);
      return;
    }
    const department = (registry.navDepartments || []).find((group) => (group.toolIds || []).includes(tool.id));
    const expected = department ? department.label : tool.dept;
    if (card.registryId !== tool.id) fail(`Tools card ${card.href} must carry data-registry-id="${tool.id}".`);
    if (card.badge !== expected) fail(`Tools card ${tool.id} badge "${card.badge}" must be the registry department "${expected}".`);
  });

  const calculator = read('av-calculator.html');
  const calculatorLogic = read('js/av-calculator.js');
  if (!/id="powerMethod"[\s\S]*value="amps"[\s\S]*value="watts"/.test(calculator)) {
    fail('AV Calculator power load does not offer nameplate-amps and watts-plus-PF methods.');
  }
  if (!/totalWatts \/ \(voltage \* powerFactor\)/.test(calculatorLogic)) {
    fail('AV Calculator watts mode does not calculate single-phase current with power factor.');
  }
  if (!/calculator will not silently assume PF 1/.test(calculatorLogic)) {
    fail('AV Calculator does not require an explicit manufacturer power factor in watts mode.');
  }
  if (!/hasOwnProperty\.call\(parsed, 'powerMethod'\)[\s\S]*powerMethod: 'watts', powerFactor: 0/.test(calculatorLogic)) {
    fail('AV Calculator does not migrate saved watt inputs without assuming a power factor.');
  }

  // Samples load only through Load Sample. These catch a load-time fallback to samples:
  // "list: Array.isArray(x) ? … : sampleRows.map(cloneRow)", "if(!x.length) x = sample…",
  // and a default state built with "rows: sampleRows()".
  const autoSeedPatterns = [
    /:\s*sample[A-Z]\w*\.map\(\s*clone[A-Z]\w*\s*\)/,
    /if\s*\(\s*!\s*[\w.]+\.length\s*\)\s*\{?\s*[\w.]+\s*=\s*sample[A-Z]\w*/,
    /:\s*sample[A-Z]\w*\(\s*\)/
  ];
  registry.tools.forEach((tool) => {
    const source = read(pageFile(tool.href));
    if (autoSeedPatterns.some((pattern) => pattern.test(source))) {
      fail(`${tool.href} automatically seeds sample operations instead of starting empty.`);
    }
  });

  // Video legacy pages (docs/av-suite-consolidation-stage2-video.md, increment 2.0b): single-key
  // shortcuts must leave Cmd/Ctrl/Alt combinations (print, reload, bookmark) to the browser.
  ['signal-flow.html', 'video-patch.html', 'display-plan.html', 'projection-plan.html', 'stream-plan.html',
    'record-log.html', 'camera-shot-list.html', 'playback-check.html'].forEach((rel) => {
    const source = read(rel);
    const handlers = source.match(/document\.addEventListener\(\s*(['"])keydown\1\s*,\s*function\s*\(\s*\w+\s*\)\s*\{[\s\S]{0,160}/g) || [];
    if (!handlers.length) fail(`${rel} has no document keydown handler to check.`);
    handlers.forEach((handler) => {
      const name = handler.match(/function\s*\(\s*(\w+)\s*\)/)[1];
      const guard = new RegExp(`\\{\\s*if\\s*\\(\\s*${name}\\.metaKey\\s*\\|\\|\\s*${name}\\.ctrlKey\\s*\\|\\|\\s*${name}\\.altKey\\s*\\)\\s*return;`);
      if (!guard.test(handler)) fail(`${rel} single-key shortcuts do not return early for Cmd, Ctrl or Alt.`);
    });
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
  if (!/\.plot-zone-left\{right:12px\}/.test(stagePlotterPage) || !/\.plot-zone-right\{left:12px\}/.test(stagePlotterPage)) {
    fail('StagePlotter stage-left and stage-right labels are not positioned from the performer perspective.');
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
  assertRailRegistryContracts(registry);
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
