#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
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

function canonical(source) {
  const match = source.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function refreshTarget(source) {
  const match = source.match(/<meta\s+http-equiv=["']refresh["']\s+content=["'][^"']*url=([^"']+)["']/i);
  return match ? match[1] : '';
}

function hasNoIndex(source) {
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(source);
}

const sitemap = read('sitemap.xml');
const sitemapRoutes = new Set(
  Array.from(sitemap.matchAll(/<loc>https:\/\/systembydave\.com([^<]*)<\/loc>/g), (match) => match[1] || '/')
);
const files = walk(ROOT);
const unlisted = files.filter((file) => !sitemapRoutes.has(routeFor(file)));
const robots = read('robots.txt');

if (unlisted.length !== 120) fail(`Expected 120 tracked routes outside the sitemap; found ${unlisted.length}.`);

[
  '/apps/av-workbook/',
  '/cross-project-actions.html',
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
  if (canonical(source) !== 'https://systembydave.com/pixelforge/') {
    fail(`${file} does not consolidate canonical signals under /pixelforge/.`);
  }
});

[
  ['av-workbook.html', 'https://systembydave.com/av-workbook/'],
  ['cueforge.html', 'https://systembydave.com/cue-sheet.html'],
  ['plotforge.html', 'https://plotforge-beta.vercel.app/'],
  ['marsscape/index.html', 'https://mixmash.games/mars/'],
  ['command53/index.html', 'https://davehomeassist.github.io/command-center-061eed/private.html']
].forEach(([file, expectedCanonical]) => {
  const source = read(file);
  if (!hasNoIndex(source)) fail(`${file} is missing noindex.`);
  if (canonical(source) !== expectedCanonical) fail(`${file} has the wrong canonical target.`);
});

if (!hasNoIndex(read('cross-project-actions.html'))) fail('cross-project-actions.html is missing noindex.');
if (!hasNoIndex(read('html/sbd-brand.html'))) fail('html/sbd-brand.html is missing noindex.');

if (failures.length) {
  console.error('Indexing policy verification failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Indexing policy verification passed (sitemap=${sitemapRoutes.size}, trackedHtml=${files.length}, unlisted=${unlisted.length}, hatHandoffs=${hatFiles.length}).`);
