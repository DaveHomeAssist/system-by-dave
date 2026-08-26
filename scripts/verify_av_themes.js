#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function registry() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(read('js/sbd-registry.js'), context);
  return context.SBD_REGISTRY;
}

function routeFile(href) {
  return href.endsWith('/') ? path.posix.join(href, 'index.html') : href;
}

const avRegistry = registry();
const SYSTEM_THEME_EXCEPTIONS = new Set(['throwline']);
const routes = [
  { id: 'av-suite', href: 'av-suite.html', file: 'av-suite.html' },
  ...avRegistry.tools
    .filter((tool) => !SYSTEM_THEME_EXCEPTIONS.has(tool.id))
    .map((tool) => ({ ...tool, file: routeFile(tool.href) }))
];

const themeCss = read('css/av-theme.css');
[
  '--av-bg', '--av-surface', '--av-text', '--av-accent', '--av-focus',
  '--av-success', '--av-warning', '--av-danger', 'prefers-color-scheme: dark'
].forEach((token) => {
  if (!themeCss.includes(token)) fail(`css/av-theme.css is missing ${token}.`);
});

routes.forEach((route) => {
  const html = read(route.file);
  const escapedId = route.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`<html[^>]+data-av-theme="system"[^>]+data-av-tool="${escapedId}"`, 'i').test(html)) {
    fail(`${route.file} does not opt into the system AV theme as ${route.id}.`);
  }

  if (route.id === 'throwline') {
    if (!/id="themeColor"/.test(html) || !/prefers-color-scheme: dark/.test(html)) {
      fail(`${route.file} does not initialize Throwline from the system preference.`);
    }
  } else {
    if (!/name="theme-color" content="#EEE8DF" media="\(prefers-color-scheme: light\)"/.test(html)) {
      fail(`${route.file} is missing the Warm Paper browser-chrome color.`);
    }
    if (!/name="theme-color" content="#0C1016" media="\(prefers-color-scheme: dark\)"/.test(html)) {
      fail(`${route.file} is missing the Stage Slate browser-chrome color.`);
    }
  }

  if (route.id === 'av-workbook') {
    const sourceCss = read('apps/av-workbook/src/styles.css');
    if (!/@import "\.\.\/\.\.\/\.\.\/css\/av-theme\.css"/.test(sourceCss)) {
      fail('AV Workbook does not import the shared theme from source.');
    }
    const workbookSource = read('apps/av-workbook/index.html');
    if (!workbookSource.includes('src="../js/av-theme-mode.js"')) {
      fail('AV Workbook does not apply the stored AV theme before its app bundle loads.');
    }
    if (!/data-av-theme-color="light"/.test(workbookSource) || !/data-av-theme-color="dark"/.test(workbookSource)) {
      fail('AV Workbook theme-color metadata is not controllable for explicit operator modes.');
    }
  } else {
    const expectedHref = route.file.includes('/') ? '../css/av-theme.css' : 'css/av-theme.css';
    if (!html.includes(`href="${expectedHref}"`)) fail(`${route.file} does not load ${expectedHref}.`);
    if (html.indexOf(`href="${expectedHref}"`) < html.lastIndexOf('</style>')) {
      fail(`${route.file} loads the shared theme before its page-local styles.`);
    }
  }
});

const showBoard = read('show-board.html');
if (/id="themebtn"/.test(showBoard) || !/matchMedia\("\(prefers-color-scheme: dark\)"\)/.test(showBoard)) {
  fail('Show Board still owns a persistent page-level startup theme.');
}

const pixelForge = read('pixelforge/index.html');
if (!pixelForge.includes('src="../js/av-theme.js"')) {
  fail('PixelForge does not synchronize its compiled editor preference before boot.');
}

const offlineAssets = avRegistry.offlineAssets();
['./css/av-theme.css', './js/av-theme.js', './js/av-theme-mode.js'].forEach((asset) => {
  if (!offlineAssets.includes(asset)) fail(`${asset} is missing from the AV offline cache.`);
});

const audit = read('docs/av-suite-theme-audit-2026-08-12.md');
avRegistry.tools.filter((tool) => !SYSTEM_THEME_EXCEPTIONS.has(tool.id)).forEach((tool) => {
  if (!audit.includes(`| ${tool.name} |`) || !audit.includes(`\`${tool.href.startsWith('/') ? tool.href : `/${tool.href}`}\``)) {
    fail(`Theme audit does not record ${tool.name} (${tool.href}).`);
  }
});

if (failures.length) {
  console.error('AV theme verification failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`AV theme verification passed (${avRegistry.tools.length} tools + hub, registry=${avRegistry.version}).`);
