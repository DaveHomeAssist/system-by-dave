#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const SKIP_FILES = new Set([
  'cross-project-actions.html',
  'html/sbd-brand.html'
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(path.relative(ROOT, abs));
  }
  return out;
}

function htmlDecode(value) {
  return String(value || '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function cspContent(source) {
  const tag = source.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (!tag) return '';
  const content = tag[0].match(/\scontent=(["'])([\s\S]*?)\1/i);
  return content ? htmlDecode(content[2]) : '';
}

function directiveAllowsSelf(csp, name) {
  if (!csp) return true;
  const parts = csp.split(';').map((part) => part.trim()).filter(Boolean);
  const directives = new Map();
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    directives.set(tokens[0], tokens.slice(1));
  }
  const values = directives.get(name) || directives.get('default-src') || [];
  return values.includes("'self'") || values.includes('*');
}

function prefixFor(file) {
  const dir = path.dirname(file);
  if (dir === '.') return '';
  return dir.split(path.sep).map(() => '..').join('/') + '/';
}

function isDocument(source) {
  return /<html[\s>]/i.test(source) && /<head[\s>]/i.test(source) && /<\/head>/i.test(source) && /<body[\s>]/i.test(source) && /<\/body>/i.test(source);
}

function isRedirect(source) {
  return /http-equiv=["']refresh["']|location\.replace\(/i.test(source);
}

function hasSystemHomeLink(source) {
  return /href=["']\/(?:["'#?]|index\.html)|href=["'](?:\.\.\/)*index\.html|System by Dave home/i.test(source);
}

function addRedirectFallback(source) {
  if (!isRedirect(source) || /System by Dave home/i.test(source)) return source;
  const link = ' <br><a href="/" rel="noopener noreferrer">System by Dave home</a>';
  if (/<main>[\s\S]*?<p>[\s\S]*?<\/p>/i.test(source)) {
    return source.replace(/(<main>[\s\S]*?<p>[\s\S]*?)(<\/p>)/i, `$1${link}$2`);
  }
  if (/<body[^>]*>/i.test(source)) {
    return source.replace(/(<body[^>]*>)/i, `$1\n<a href="/" rel="noopener noreferrer">System by Dave home</a>`);
  }
  return source;
}

function installAssets(source, file) {
  const csp = cspContent(source);
  if (!directiveAllowsSelf(csp, 'style-src') || !directiveAllowsSelf(csp, 'script-src')) return source;
  const prefix = prefixFor(file);
  const css = `<link rel="stylesheet" href="${prefix}css/sbd-public-nav.css">`;
  const js = `<script src="${prefix}js/sbd-public-nav.js" defer></script>`;
  let next = source;
  if (!/sbd-public-nav\.css/i.test(next)) {
    next = next.replace(/<\/head>/i, `${css}\n</head>`);
  }
  if (!/sbd-public-nav\.js/i.test(next)) {
    next = next.replace(/<\/body>/i, `${js}\n</body>`);
  }
  return next;
}

let changed = 0;
let scanned = 0;

for (const file of walk(ROOT).sort()) {
  if (SKIP_FILES.has(file) || file.startsWith(`apps${path.sep}`)) continue;
  const abs = path.join(ROOT, file);
  const source = fs.readFileSync(abs, 'utf8');
  if (!isDocument(source)) continue;
  scanned += 1;
  let next = addRedirectFallback(source);
  next = installAssets(next, file);
  if (next !== source) {
    fs.writeFileSync(abs, next);
    changed += 1;
  } else if (!hasSystemHomeLink(source) && !/sbd-public-nav\.js/i.test(source)) {
    console.warn(`no public nav installed: ${file}`);
  }
}

console.log(`Public nav install scanned ${scanned} pages; changed ${changed}.`);
