#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { originFor } = require('./domain_sites_lib');

const site = path.resolve(__dirname, '..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const cameraRoutes = ['camera/', ...['pit-center', 'front-of-house', 'pit-stage-left', 'catwalk'].map(key => `camera/${key}/`)];
const rigPhotos = ['rig-camera', 'rig-front', 'rig-grip', 'rig-lens', 'rig-panel', 'rig-rear', 'rig-rings', 'rig-underside', 'v2-fiber-operator', 'v2-fiber-rear', 'v2-fiber-side', 'v2-fiber', 'v2-lcd-closed', 'v2-studio-front', 'v2-vf-back', 'v2-vf-front', 'body-controls'];
const releases = [
  {
    directory: 'fmp',
    mode: 'commissioning',
    expected: [
      'index.html', 'public.css', 'public.js', 'theme.js', 'camera.js', 'camera-core.js', 'camera-view.js', 'camera.css', 'photos.js', 'mail.js', 'notion-config.js',
      ...cameraRoutes.map(route => `${route}index.html`),
      'house/index.html', 'house/house.css', 'house/house.js', 'house/house-data.js', 'house/site-plan.png', 'house/display-estate.csv',
      'guide/index.html', 'rig/index.html', 'rig/rig-model.js', 'rig/fmp-guide-data.js',
      ...rigPhotos.map(name => `rig/assets/${name}.webp`),
      'rig/vendor/three/three.module.js', 'rig/vendor/three/three.core.js', 'rig/vendor/three/addons/controls/OrbitControls.js'
    ]
  },
  { directory: 'fmpwalk', mode: 'local-first', expected: ['index.html', 'email.js', 'mail.js', 'photos.js', 'notion.js', 'notion-config.js'] }
];
// The report sender is the only address the public FMP releases may carry.
const ALLOWED_EMAILS = ['avbydave@gmail.com'];
const PHONE = /(?:\btel:|\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Counts only: a failure names the file, never the matched value.
function contactDetails(text) {
  const emails = (text.match(EMAIL) || []).filter(email => !ALLOWED_EMAILS.includes(email.toLowerCase()) && !/\.(?:png|webp|jpe?g|svg|js|css)$/i.test(email));
  return { emails: new Set(emails.map(email => email.toLowerCase())).size, phones: new Set(text.match(PHONE) || []).size };
}
const TOKEN_REFERENCE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\b(?:src|href)=)["']((?:\.{1,2}\/)*[\w-][\w./-]*\.(?:js|css))\?v=([^"']*)["']/g;
const COUNT_CLAIM = /\b(\d{2,4})[- ](?:part|component)s?\b/g;

function walk(directory, prefix = '') {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    assert.ok(!entry.isSymbolicLink(), `No symlinks in ${path.relative(site, directory)} release`);
    return entry.isDirectory() ? walk(path.join(directory, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`];
  });
}

const sitemap = fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8');
for (const release of releases) {
  const root = path.join(site, release.directory);
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'source_provenance.json')));
  assert.equal(provenance.schema, 'fmp.public.release.v2');
  assert.equal(provenance.sourceRepository, 'DaveHomeAssist/fmpwalk');
  assert.match(provenance.sourceCommit, /^[0-9a-f]{40}$/);
  assert.equal(provenance.mode, release.mode);
  assert.deepEqual(walk(root).sort(), [...release.expected, 'source_provenance.json'].sort());
  assert.deepEqual(Object.keys(provenance.files).sort(), [...release.expected].sort());

  const hashes = {};
  for (const name of [...release.expected].sort()) {
    const data = fs.readFileSync(path.join(root, name));
    hashes[name] = hash(data);
    assert.equal(hashes[name], provenance.files[name], `Managed artifact drift: ${release.directory}/${name}`);
    if (/\.(?:webp|png)$/.test(name)) continue;
    const source = data.toString('utf8');
    assert.doesNotMatch(source, /-----BEGIN .*PRIVATE KEY-----|\b(?:ntn_|secret_)[A-Za-z0-9]{30,}/);
    const exposed = contactDetails(source);
    assert.ok(!exposed.emails && !exposed.phones, `${release.directory}/${name}: ${exposed.emails} email address(es) and ${exposed.phones} phone number(s) published; keep contacts in Notion`);
    for (const [, target, token] of source.matchAll(TOKEN_REFERENCE)) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), target));
      assert.ok(release.expected.includes(resolved), `${release.directory}/${name}: ${target} is not in the release`);
      assert.equal(token, hash(fs.readFileSync(path.join(root, resolved))).slice(0, 16), `${release.directory}/${name}: ${target}?v= must be the content hash`);
    }
    if (!name.endsWith('.html')) continue;
    for (const marker of ['noindex', 'Content-Security-Policy', 'name="description"', 'rel="canonical"', 'property="og:title"', 'name="twitter:']) assert.ok(source.includes(marker), `${release.directory}/${name}: ${marker}`);
    assert.match(source, /class="skip(?:-link)?"/);
    // A <base> element resolves #fragment links against another document, so skip links leave the page.
    assert.doesNotMatch(source, /<base\b/i, `${release.directory}/${name}: <base> breaks in-page skip links`);
    for (const [, target] of source.matchAll(/href="#([^"]+)"/g)) assert.ok(source.includes(`id="${target}"`), `${release.directory}/${name}: missing skip target #${target}`);
    const route = name.replace(/index\.html$/, '');
    const canonical = `${originFor(`${release.directory}/`)}/${release.directory}/${route}`;
    assert.ok(source.includes(`href="${canonical}"`), `${release.directory}/${name}: ${canonical}`);
    assert.ok(!sitemap.includes(`<loc>${canonical}</loc>`));
    if (release.directory === 'fmp') {
      // WEB-1: every FMP page takes the light-first fmpTheme preference before first paint, never the AV Suite key.
      assert.match(source.slice(0, source.indexOf('</head>')), /<script src="(?:\.\.\/)*theme\.js\?v=[a-f0-9]{16}"><\/script>/, `${release.directory}/${name}: load theme.js in <head>`);
      assert.doesNotMatch(source, /av-theme-mode/, `${release.directory}/${name}: FMP pages must not read or write av-theme-mode.v1`);
    }
    if (release.directory === 'fmp' && name.startsWith('camera/')) {
      assert.ok(source.includes('data-setup-test-only="true"'));
      assert.ok(source.includes('data-public-release="true"'));
      assert.ok(source.includes("style-src-elem 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; style-src-attr 'none';"));
      assert.match(source, /data-rig-components="\d+"/);
    }
  }
  assert.equal(hash(JSON.stringify(hashes)), provenance.artifactSha256, `${release.directory} combined artifact digest`);
  release.provenance = provenance;
}

const entry = fs.readFileSync(path.join(site, 'fmp/index.html'), 'utf8');
assert.match(entry, /class="startup-guidance"/);
assert.match(entry, /Recover drafts on the previous Site/);
assert.match(entry, /href="\/fmpwalk\/"/);
assert.equal(releases[0].provenance.sourceCommit, releases[1].provenance.sourceCommit, 'fmp and fmpwalk must ship from one export');
const cameraView = fs.readFileSync(path.join(site, 'fmp/camera-view.js'), 'utf8');
assert.match(cameraView, /href="#screenTitle"/);
assert.match(cameraView, /id="screenTitle"/);
const walkEntry = fs.readFileSync(path.join(site, 'fmpwalk/index.html'), 'utf8');
// One suite theme preference: theme.js and the walk share fmpTheme, a first visit is light, and the index uses it too.
const theme = fs.readFileSync(path.join(site, 'fmp/theme.js'), 'utf8');
assert.match(theme, /const KEY = 'fmpTheme';/);
assert.match(theme, /preference = legacy \|\| 'light';/);
assert.match(walkEntry, /var THEME_KEY = "fmpTheme";/);
const workingIndex = fs.readFileSync(path.join(site, 'fmp-index/index.html'), 'utf8');
assert.match(workingIndex, /<html lang="en" data-av-theme="light">/);
assert.match(workingIndex.slice(0, workingIndex.indexOf('</head>')), /<script src="\/fmp\/theme\.js"><\/script>/, 'fmp-index/index.html: load /fmp/theme.js in <head>');
assert.match(workingIndex, /data-theme-toggle/, 'fmp-index/index.html: visible theme toggle');
assert.match(walkEntry, /No silent writes/);
// /fmpwalk/camera/ does not exist; the walk's camera link and legacy redirect must use /fmp/camera/.
assert.match(walkEntry, /id="cameraLaunch" href="\/fmp\/camera\/"/);
assert.match(walkEntry, /var cameraRoot = "\/fmp\/camera\/";/);
assert.doesNotMatch(walkEntry, /["']\.{1,2}\/camera\//);
assert.match(walkEntry, /href="https:\/\/systembydave\.com\/"/);
assert.equal((walkEntry.match(/<h1\b/g) || []).length, 1);
assert.ok(walkEntry.includes(`href="${originFor('fmp/')}/fmp/"`), 'The walk must link its operations hub at the suite\'s canonical origin.');
assert.doesNotMatch(walkEntry, /davehomeassist\.github\.io/);
const rigEntry = fs.readFileSync(path.join(site, 'fmp/rig/index.html'), 'utf8');
assert.doesNotMatch(rigEntry, /unpkg|https:\/\/cdn/i);
assert.match(rigEntry, /\.\/vendor\/three\/three\.module\.js/);
const guideEntry = fs.readFileSync(path.join(site, 'fmp/guide/index.html'), 'utf8');
assert.match(guideEntry, /Tonight's director, stage plot, restrictions, and verified assignments control/);
// The guide is also served from housevideo.app, so its System by Dave link is absolute.
assert.match(guideEntry, /href="https:\/\/systembydave\.com\/"/);
const robots = fs.readFileSync(path.join(site, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Disallow: /fmp/'));
assert.ok(robots.includes('Disallow: /fmpwalk/'));
const index = fs.readFileSync(path.join(site, 'fmp-index/index.html'), 'utf8');
assert.ok(index.includes('href="/fmp/"'));
assert.ok(index.includes('href="/fmpwalk/"'));
// Every rig count claim, including the one the camera card renders, must match the catalog.
// The data module holds only object literals; evaluate it in an empty context rather than importing ESM from CommonJS.
const guideData = fs.readFileSync(path.join(site, 'fmp/rig/fmp-guide-data.js'), 'utf8');
const components = Object.keys(vm.runInNewContext(`${guideData.replace(/^export const /gm, 'var ')}\n;catalog`, {}, { timeout: 1000 })).length;
for (const release of releases) {
  for (const name of release.expected.filter(file => /\.(?:html|js)$/.test(file) && !file.includes('/vendor/'))) {
    const source = fs.readFileSync(path.join(site, release.directory, name), 'utf8');
    for (const [claim, number] of source.matchAll(COUNT_CLAIM)) assert.equal(Number(number), components, `${release.directory}/${name}: "${claim}" disagrees with ${components} catalog components`);
    for (const [, stamped] of source.matchAll(/data-rig-components="(\d+)"/g)) assert.equal(Number(stamped), components, `${release.directory}/${name}: data-rig-components`);
  }
}
console.log(`FMP suite verified: ${releases.map(release => `${release.directory} ${release.expected.length} files`).join('; ')}; ${components} rig components; source ${releases[0].provenance.sourceCommit}`);
