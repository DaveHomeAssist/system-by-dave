#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { originFor, siteSitemap, cutoverSites } = require('./domain_sites_lib');
const { hasNoIndex, canonical, indexingPolicy, otherDomainOrigins } = require('./indexing_policy');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_hat-in-ring-src') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(path.relative(ROOT, absolute).split(path.sep).join('/'));
    }
  }
  return out;
}

function routeFor(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -10)}`;
  return `/${file}`;
}

function refreshTarget(source) {
  const match = source.match(/<meta\s+http-equiv=["']refresh["']\s+content=["'][^"']*url=([^"']+)["']/i);
  return match ? match[1] : '';
}

const sitemap = read('sitemap.xml');
const sitemapRoutes = new Set(
  Array.from(sitemap.matchAll(/<loc>https:\/\/systembydave\.com([^<]*)<\/loc>/g), (match) => match[1] || '/')
);
// Pages that moved to another domain are listed in that site's generated sitemap.
for (const site of cutoverSites()) {
  const origin = `https://${site.domain}`.replace(/\./g, '\\.');
  for (const match of siteSitemap(site.id).matchAll(new RegExp(`<loc>${origin}([^<]*)</loc>`, 'g'))) sitemapRoutes.add(match[1] || '/');
}
const files = walk(ROOT);
const unlisted = files.filter((file) => !sitemapRoutes.has(routeFor(file)));
const robots = read('robots.txt');

// 148 includes the AV by Dave landing source and noindex alternative, Shader Practice relocation redirect, the /fmp-walk/ and /fmp-index/ redirects, the managed /fmp/house/ reference, and the
// /fmp/gear/, /fmp/build/ and /fmp/ptz/ pages that replaced Notion links on 2026-09-18,
// plus the four additional equipment explorers published on 2026-09-20, and the noindex
// FMP Camera Simulator (its page, standalone offline copy and app source) from 2026-09-23,
// the noindex offline copy of the ATEM HD8 ISO interactive guide from 2026-09-25, and the noindex
// /fmp/walk/ redirect to the walk's own origin from 2026-10-01, and the five noindex pages of the
// managed /cheesesteaks/ static export (map, rankings, neighborhoods, methodology, about) from 2026-10-01.
// AV Video adds its source page and AV-origin generated application on 2026-10-02.
if (unlisted.length !== 145) fail(`Expected 145 tracked routes outside the sitemap; found ${unlisted.length}.`);

// The count above only detects new unlisted routes; this enforces the documented policy itself
// (scripts/indexing_policy.js) for every one of them.
const otherOrigins = otherDomainOrigins();
const policies = {};
unlisted.forEach((file) => {
  const policy = indexingPolicy(routeFor(file), read(file), robots, otherOrigins);
  if (!policy) fail(`${file} is outside the sitemap but has no noindex meta tag, robots.txt Disallow, or canonical URL on another published domain (${[...otherOrigins].join(', ')}).`);
  else policies[policy] = (policies[policy] || 0) + 1;
});

[
  '/apps/av-workbook/',
  '/apps/av-video/',
  '/apps/fmp-camera-sim/',
  '/camera-sim/',
  '/fmp-index/',
  '/fmp/',
  '/fmp-walk/',
  '/fmpwalk/',
  '/html/sbd-brand.html'
].forEach((route) => {
  if (!robots.includes(`Disallow: ${route}`)) fail(`robots.txt does not exclude internal/source route ${route}.`);
});

const hatFiles = files.filter((file) => file.startsWith('hat-in-ring/'));
if (hatFiles.length !== 82) fail(`Expected 82 Hat-in-Ring handoff routes; found ${hatFiles.length}.`);
hatFiles.forEach((file) => {
  const source = read(file);
  const target = refreshTarget(source);
  if (!hasNoIndex(source)) fail(`${file} is missing noindex.`);
  if (!target.startsWith('https://hatinring.com/')) fail(`${file} has an unexpected handoff target ${target || '(missing)'}.`);
  if (canonical(source) !== target) fail(`${file} canonical does not match its handoff target.`);
  if (sitemap.includes(`systembydave.com/${file.replace(/index\.html$/, '')}`)) fail(`${file} appears in the sitemap.`);
});

[
  'pixelforge/PixelForge Guide.html',
  'pixelforge/PixelForge Home.html',
  'pixelforge/PixelForge Logo.html',
  'pixelforge/PixelForge Onboarding.html',
  'pixelforge/PixelForge.html',
  'pixelforge/brand.html',
  'pixelforge/editor.html',
  'pixelforge/guide.html',
  'pixelforge/home.html',
  'pixelforge/logo.html',
  'pixelforge/onboarding.html',
  'pixelforge/templates.html'
].forEach((file) => {
  const source = read(file);
  if (!hasNoIndex(source)) fail(`${file} is missing noindex.`);
  if (canonical(source) !== `${originFor('pixelforge/')}/pixelforge/`) {
    fail(`${file} does not consolidate canonical signals under /pixelforge/.`);
  }
});

[
  ['av-workbook.html', 'https://avbydave.com/av-suite.html'],
  ['cueforge.html', 'https://systembydave.com/cueforge.html'],
  ['plotforge.html', 'https://plotforge-beta.vercel.app/'],
  ['marsscape/index.html', 'https://mixmash.games/mars/'],
  ['command53/index.html', 'https://davehomeassist.github.io/command-center-061eed/private.html']
].forEach(([file, expectedCanonical]) => {
  const source = read(file);
  if (!hasNoIndex(source)) fail(`${file} is missing noindex.`);
  if (canonical(source) !== expectedCanonical) fail(`${file} has the wrong canonical target.`);
});

// /fmp-walk/ is the hyphenated address people type for the managed /fmpwalk/ release.
const fmpWalkAlias = read('fmp-walk/index.html');
if (!hasNoIndex(fmpWalkAlias)) fail('fmp-walk/index.html is missing noindex.');
if (refreshTarget(fmpWalkAlias) !== '/fmpwalk/') fail('fmp-walk/index.html does not refresh to /fmpwalk/.');
if (!fmpWalkAlias.includes('location.replace("/fmpwalk/" + location.search + location.hash)')) fail('fmp-walk/index.html does not preserve query and hash when redirecting.');
if (canonical(fmpWalkAlias) !== `${originFor('fmpwalk/')}/fmpwalk/`) fail('fmp-walk/index.html canonical does not match its redirect target.');
if (sitemapRoutes.has('/fmp-walk/')) fail('fmp-walk/index.html appears in the sitemap.');

// /fmp-index/ is retired: the /fmp/ hub is the one FMP directory, so the old index redirects to it.
const fmpIndexAlias = read('fmp-index/index.html');
if (!hasNoIndex(fmpIndexAlias)) fail('fmp-index/index.html is missing noindex.');
if (refreshTarget(fmpIndexAlias) !== '/fmp/') fail('fmp-index/index.html does not refresh to /fmp/.');
if (!fmpIndexAlias.includes('location.replace("/fmp/" + location.search + location.hash)')) fail('fmp-index/index.html does not preserve query and hash when redirecting.');
if (canonical(fmpIndexAlias) !== `${originFor('fmp/')}/fmp/`) fail('fmp-index/index.html canonical does not match its redirect target.');
if (sitemapRoutes.has('/fmp-index/')) fail('fmp-index/index.html appears in the sitemap.');

if (!hasNoIndex(read('html/sbd-brand.html'))) fail('html/sbd-brand.html is missing noindex.');

if (failures.length) {
  console.error('Indexing policy verification failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Indexing policy verification passed (sitemap=${sitemapRoutes.size}, trackedHtml=${files.length}, unlisted=${unlisted.length} ${JSON.stringify(policies)}, hatHandoffs=${hatFiles.length}).`);
