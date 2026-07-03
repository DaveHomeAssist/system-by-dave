#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith('--base='));
const baseUrl = baseArg ? baseArg.slice('--base='.length).replace(/\/?$/, '/') : '';
const expectedToolCount = 38;

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
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

  if (registry.tools.length !== expectedToolCount) {
    fail(`Registry tool count is ${registry.tools.length}, expected ${expectedToolCount}.`);
  }

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
}

function assertPageContracts(registry) {
  const publicPages = ['index.html', 'tools.html', 'av-suite.html'];
  const toolPages = registry.tools.map((tool) => tool.href);
  const aliasPages = Object.values(registry.aliases || {});
  const pages = Array.from(new Set(publicPages.concat(toolPages, aliasPages)));

  pages.forEach((rel) => {
    const html = read(rel);
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
  if (!/id="settingsDrawer"[^>]*\binert\b/i.test(avSuite)) {
    fail('Settings drawer is not inert in its closed HTML state.');
  }
  if (!/removeAttribute\('inert'\)/.test(avSuite) || !/setAttribute\('inert',''\)/.test(avSuite)) {
    fail('Settings drawer inert state is not toggled by the drawer controller.');
  }
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
