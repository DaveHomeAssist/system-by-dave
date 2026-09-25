// The page manifest reads the document head for a page's title and keeps static links apart
// from the ones scripts build. See scripts/build_housevideo_manifest.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { headTitle, metaContent, firstHeading, routeOf, pageFor, staticLinks } from './build_housevideo_manifest.mjs';

test('the page title comes from the head, not an inline SVG title', () => {
  const html = `<!doctype html><html><head><title>House Video | FMP Video Operations</title></head>
<body><h1>House video</h1><svg role="img"><title>Six bowl walls around the pavilion</title></svg></body></html>`;
  assert.equal(headTitle(html), 'House Video | FMP Video Operations');
  assert.equal(firstHeading(html), 'House video');
});

test('an SVG title before the head title still loses', () => {
  const html = '<svg><title>Wrong</title></svg><html><head><title>Right</title></head><body></body></html>';
  assert.equal(headTitle(html), 'Right');
});

test('entities decode and head meta is read by name or property', () => {
  const html = '<head><title>Camera Build &amp; Strike | FMP Video Operations</title><meta name="robots" content="noindex, nofollow"><meta property="og:title" content="A &middot; B"></head>';
  assert.equal(headTitle(html), 'Camera Build & Strike | FMP Video Operations');
  assert.equal(metaContent(html, 'robots'), 'noindex, nofollow');
  assert.equal(metaContent(html, 'og:title'), 'A · B');
});

test('routes and page lookups follow directory indexes', () => {
  const pages = new Set(['index.html', 'fmp/index.html', 'fmp/models/ccu4.html']);
  assert.equal(routeOf('index.html'), '/');
  assert.equal(routeOf('fmp/index.html'), '/fmp/');
  assert.equal(routeOf('fmp/models/ccu4.html'), '/fmp/models/ccu4.html');
  assert.equal(pageFor('/fmp/', pages), 'fmp/index.html');
  assert.equal(pageFor('/fmp', pages), 'fmp/index.html');
  assert.equal(pageFor('/fmp/models/ccu4.html', pages), 'fmp/models/ccu4.html');
  assert.equal(pageFor('/missing/', pages), null);
});

test('static links count same-site pages written in the HTML, not script-built ones', () => {
  const pages = new Set(['fmp/index.html', 'fmp/build/index.html', 'fmp/models/ccu4.html', 'shader/index.html']);
  const html = `<a href="build/">Build</a><a href="models/ccu4.html#explore">CCU4</a><a href="/shader/">Shader</a>
<a href="https://housevideo.app/fmp/build/">Build again</a><a href="https://avbydave.com/">Elsewhere</a><a href="#top">Top</a>
<script>document.body.insertAdjacentHTML('beforeend', '<a href="/fmp/models/p240.html">P240</a>')</script>`;
  assert.deepEqual(staticLinks(html, 'fmp/index.html', pages, 'https://housevideo.app'),
    ['fmp/build/index.html', 'fmp/models/ccu4.html', 'shader/index.html']);
});
