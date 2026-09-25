#!/usr/bin/env node
// Builds the ATEM HD8 ISO interactive guide at switcher/guide/ from the exported model page
// (fmp/models/atem-hd8-iso.html, whose source is fmp-suite models/). The guide and the model page
// are the same explorer, so the guide is generated rather than kept as a second copy:
//
//   switcher/guide/index.html                     thin public page; loads the shared /fmp/models/ assets
//   switcher/guide/atem-photos.js                 the reference photo list with root-absolute paths
//   switcher/guide/atem-hd8-iso-guide-offline.html one self-contained file (scripts, styles, photos
//                                                  inlined) for saving and opening without a connection
//
// Usage: node scripts/build_switcher_guide.mjs          (write)
//        node scripts/build_switcher_guide.mjs --check  (fail if the committed files are stale)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'fmp/models/atem-hd8-iso.html';
const OUT = 'switcher/guide';
const OFFLINE = 'atem-hd8-iso-guide-offline.html';
const ORIGIN = 'https://housevideo.app';
const TITLE = 'ATEM HD8 ISO Interactive Guide | FMP Video Operations';
const DESCRIPTION = 'Interactive ATEM Television Studio HD8 ISO study model with 227 sourced components and local switching practice.';
const read = (file, encoding = 'utf8') => readFileSync(join(ROOT, file), encoding);
const model = read(MODEL);

// Every asset the model page loads, in order, as root-absolute URLs.
function modelAssets() {
  const toRoot = href => href.startsWith('/') ? href : new URL(href, `${ORIGIN}/fmp/models/`).pathname + (href.includes('?') ? '?' + href.split('?')[1] : '');
  const styles = [...model.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(match => toRoot(match[1]));
  const scripts = [...model.matchAll(/<script src="([^"]+)"( defer)?><\/script>/g)].map(match => ({ src: toRoot(match[1]), defer: Boolean(match[2]) }));
  if (!styles.length || scripts.length < 5) throw new Error(`${MODEL}: asset list changed shape`);
  return { styles, scripts };
}

// The explorer markup, with the model page's own skip link and site nav replaced by the guide's shell.
function explorerBody() {
  const start = model.indexOf('<body>');
  const end = model.lastIndexOf('</body>');
  if (start < 0 || end < start) throw new Error(`${MODEL}: <body> not found`);
  let body = model.slice(start + '<body>'.length, end);
  body = body.replace(/<a class="skip model-skip" href="#model-content">[^<]*<\/a>/, '');
  body = body.replace(/<nav class="model-site-nav"[\s\S]*?<\/nav>/, '');
  if (!body.includes('<div id="atem-explorer">')) throw new Error(`${MODEL}: #atem-explorer not found`);
  body = body.replace('<div id="atem-explorer">', '<div id="atem-explorer" role="main" tabindex="-1">');
  return body;
}

function themeSelect() {
  const match = model.match(/<label>Theme <select data-model-theme[\s\S]*?<\/select><\/label>/);
  if (!match) throw new Error(`${MODEL}: theme select not found`);
  return match[0];
}

function icon() {
  const match = model.match(/<link rel="icon" href="data:[^"]+" type="image\/svg\+xml">/);
  if (!match) throw new Error(`${MODEL}: icon not found`);
  return match[0];
}

function head({ csp, extra, robots, canonical }) {
  return `<!doctype html>
<html lang="en" data-av-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="robots" content="${robots}">
<meta name="color-scheme" content="light dark">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FMP Video Operations">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:url" content="${ORIGIN}/switcher/guide/">
<meta property="og:image" content="${ORIGIN}/fmp/fmp-social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="${ORIGIN}/fmp/fmp-social-card.png">
<meta name="theme-color" content="#f1eee7">
${icon()}
${extra}
</head>`;
}

function shell(prefix, offlineLink) {
  return `<a class="sbd-skip-link" href="#atem-explorer">Skip to the ATEM HD8 ISO interactive guide</a>
<nav class="sbd-site-return" aria-label="Site navigation"><a href="${prefix}/fmp/">FMP Video Operations</a><span>/</span><a href="${prefix}/switcher/">ATEM HD8 ISO</a><span>/</span><span aria-current="page">Interactive Guide</span><a href="https://avbydave.com/av-suite.html?entry=toolbox">AV Toolbox →</a></nav>
<div class="model-site-nav switcher-guide-tools">${offlineLink}${themeSelect()}</div>`;
}

const PAGE_STYLE = '.switcher-guide-tools{justify-content:flex-end}';

function webPage() {
  const { styles, scripts } = modelAssets();
  const links = ['/css/sbd-public-nav.css', ...styles].map(href => `<link rel="stylesheet" href="${href}">`).join('\n');
  const headScripts = scripts.filter(script => script.src.startsWith('/fmp/theme.js') || script.defer)
    .map(script => `<script src="${script.src}"${script.defer ? ' defer' : ''}></script>`).join('\n');
  const bodyScripts = scripts.filter(script => !script.src.startsWith('/fmp/theme.js') && !script.defer)
    .map(script => /atem-hd8-iso-0\.js/.test(script.src) ? `<script src="atem-photos.js?v=${photosHash()}"></script>` : `<script src="${script.src}"></script>`).join('\n');
  const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const download = `<a href="${OFFLINE}" download>Download for offline use</a>`;
  return `${head({ csp, robots: 'index, follow', canonical: `${ORIGIN}/switcher/guide/`, extra: `${links}\n<style>${PAGE_STYLE}</style>\n${headScripts}` })}
<body>
${shell('', download)}
${explorerBody().replace(/<script src="[^"]+"( defer)?><\/script>\s*/g, '')}
${bodyScripts}
</body>
</html>
`;
}

// The model page's photo list uses paths relative to /fmp/models/; the guide needs them from its own URL.
function photoPaths() {
  const source = read('fmp/models/assets/atem-hd8-iso-0.js');
  const match = source.match(/window\.ATEM_PHOTOS=(\[[^\]]+\]);/);
  if (!match) throw new Error('atem-hd8-iso-0.js: ATEM_PHOTOS not found');
  return JSON.parse(match[1]);
}
function photosScript() {
  const absolute = photoPaths().map(photo => `/fmp/models/${photo}`);
  return `// Generated by scripts/build_switcher_guide.mjs from fmp/models/assets/atem-hd8-iso-0.js.\n// Reference photographs of the installed HD8 ISO; files, so they load only when shown.\nwindow.ATEM_PHOTOS=${JSON.stringify(absolute)};\n`;
}
function photosHash() {
  return createHash('sha256').update(photosScript()).digest('hex').slice(0, 16);
}

function offlinePage() {
  const { styles, scripts } = modelAssets();
  const file = url => url.split('?')[0].replace(/^\//, '');
  const css = ['/css/sbd-public-nav.css', ...styles].map(href => read(file(href))).join('\n');
  const photos = photoPaths().map(photo => `data:image/png;base64,${read(`fmp/models/${photo}`, null).toString('base64')}`);
  // theme.js runs in the head for the first paint; it also loads chrome.js beside itself, which has
  // no meaning in a file opened from disk, so that part is left out. model-shell.js is deferred on
  // the web and runs last here.
  const theme = scripts.find(script => script.src.startsWith('/fmp/theme.js'));
  const headCode = read(file(theme.src)).replace(/\n\/\/ Keep the published chrome[\s\S]*$/, '\n');
  if (headCode.includes('chrome.js')) throw new Error('theme.js: could not leave out the chrome.js loader');
  const bodyCode = [
    ...scripts.filter(script => script !== theme && !script.defer).map(script =>
      /atem-hd8-iso-0\.js/.test(script.src) ? `window.ATEM_PHOTOS=${JSON.stringify(photos)};` : read(file(script.src))),
    ...scripts.filter(script => script.defer).map(script => read(file(script.src)))
  ];
  const hashes = [headCode, ...bodyCode].map(code => `'sha256-${createHash('sha256').update(code).digest('base64')}'`).join(' ');
  const csp = `default-src 'none'; script-src ${hashes}; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  const tag = code => `<script>${code}</script>`;
  const note = `<span class="switcher-guide-offline">Offline copy · <a href="${ORIGIN}/switcher/guide/">Open the live guide</a></span>`;
  return `${head({ csp, robots: 'noindex, nofollow', canonical: `${ORIGIN}/switcher/guide/`, extra: `<style>${css}\n${PAGE_STYLE}</style>\n${tag(headCode)}` })}
<body>
${shell(ORIGIN, note)}
${explorerBody().replace(/<script src="[^"]+"( defer)?><\/script>\s*/g, '')}
${bodyCode.map(tag).join('\n')}
</body>
</html>
`;
}

const outputs = {
  [`${OUT}/index.html`]: webPage(),
  [`${OUT}/atem-photos.js`]: photosScript(),
  [`${OUT}/${OFFLINE}`]: offlinePage()
};

if (process.argv.includes('--check')) {
  const stale = Object.entries(outputs).filter(([name, text]) => {
    try { return read(name) !== text; } catch { return true; }
  }).map(([name]) => name);
  if (stale.length) {
    console.error(`Switcher guide is out of date with ${MODEL}: ${stale.join(', ')}. Run node scripts/build_switcher_guide.mjs.`);
    process.exit(1);
  }
  console.log(`Switcher guide current with ${MODEL}.`);
} else {
  for (const [name, text] of Object.entries(outputs)) writeFileSync(join(ROOT, name), text);
  console.log(Object.entries(outputs).map(([name, text]) => `${name}: ${Buffer.byteLength(text)} bytes`).join('\n'));
}
