#!/usr/bin/env node
// Builds the standalone offline FMP Camera Simulator: one HTML file with the bundle, stylesheet
// and theme bootstrap inlined, a hash-locked CSP, and absolute links back to the FMP suite.
// Run after `vite build --config apps/fmp-camera-sim/vite.config.ts` (see `npm run build:camera-sim`).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'camera-sim');
const OFFLINE_FILE = 'fmp-camera-simulator-offline.html';
const SUITE_ORIGIN = 'https://housevideo.app';

function fail(message) {
  console.error(`build_camera_sim_offline: ${message}`);
  process.exit(1);
}

const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

let html = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');

const scriptTag = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
const styleTag = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/);
const bootTag = html.match(/<script src="\.\/theme-boot\.js"><\/script>/);
if (!scriptTag || !styleTag || !bootTag) fail('camera-sim/index.html does not have the expected Vite script, stylesheet and theme-boot tags.');

// Inline scripts end at the first "</script"; the bundle must not contain one unescaped, and an
// HTML comment opener inside script data can swallow the end tag, so refuse rather than guess.
const bundle = readFileSync(join(OUT_DIR, scriptTag[1]), 'utf8').replace(/<\/script/gi, '<\\/script');
if (bundle.includes('<!--')) fail('the bundle contains "<!--", which is unsafe inside an inline script.');
const css = readFileSync(join(OUT_DIR, styleTag[1]), 'utf8');
if (/<\/style/i.test(css)) fail('the stylesheet contains "</style".');
const boot = readFileSync(join(OUT_DIR, 'theme-boot.js'), 'utf8');

const bootBlock = `<script>${boot}</script>`;
const styleBlock = `<style>${css}</style>`;
const scriptBlock = `<script type="module">${bundle}</script>`;

html = html
  .replace(bootTag[0], () => bootBlock)
  .replace(styleTag[0], () => styleBlock)
  .replace(scriptTag[0], () => scriptBlock);

const csp = [
  "default-src 'none'",
  `script-src ${sha256(boot)} ${sha256(bundle)}`,
  `style-src ${sha256(css)}`,
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const cspPattern = /<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>/;
if (!cspPattern.test(html)) fail('camera-sim/index.html has no Content-Security-Policy meta tag to replace.');
html = html
  .replace(cspPattern, () => `<meta http-equiv="Content-Security-Policy" content="${csp}" />`)
  .replace('<html lang="en" data-theme="light">', '<html lang="en" data-theme="light" data-build="offline">')
  .replace('<title>Camera Simulator | FMP Video Operations</title>', '<title>Camera Simulator offline copy | FMP Video Operations</title>')
  // Opened from disk, root paths would point at the file system: name the suite absolutely.
  .replace(/href="\/fmp\//g, `href="${SUITE_ORIGIN}/fmp/`);

if (!html.includes('data-build="offline"')) fail('could not mark the offline build.');
if (/(?:src|href)="\.\/(?:assets|theme-boot)/.test(html)) fail('an asset reference was left un-inlined.');
const remoteLoads = [
  ...html.matchAll(/<script\b[^>]*\bsrc="[^"]*"/gi),
  ...html.matchAll(/<link\b[^>]*\brel="(?:stylesheet|preload|modulepreload|icon|manifest)"[^>]*\bhref="(?!data:)[^"]*"/gi),
].map((match) => match[0]);
if (remoteLoads.length) fail(`the offline page still loads files: ${remoteLoads.join(' ')}`);

writeFileSync(join(OUT_DIR, OFFLINE_FILE), html);
console.log(`camera-sim/${OFFLINE_FILE}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, CSP pinned to ${bundle.length} + ${css.length} + ${boot.length} inline bytes`);
