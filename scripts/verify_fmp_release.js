#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const site = path.resolve(__dirname, '..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const cameraRoutes = ['camera/', ...['pit-center', 'front-of-house', 'pit-stage-left', 'catwalk'].map(key => `camera/${key}/`)];
const rigPhotos = ['fmp-camera', 'fmp-lens', 'fmp-panel', 'rig-camera', 'rig-front', 'rig-grip', 'rig-lens', 'rig-panel', 'rig-rear', 'rig-rings', 'rig-underside', 'v2-fiber-operator', 'v2-fiber-rear', 'v2-fiber-side', 'v2-fiber', 'v2-lcd-closed', 'v2-studio-front', 'v2-vf-back', 'v2-vf-front', 'body-controls'];
const releases = [
  {
    directory: 'fmp',
    mode: 'commissioning',
    expected: [
      'index.html', 'public.css', 'public.js', 'camera.js', 'camera-core.js', 'camera-view.js', 'camera.css', 'photos.js', 'mail.js', 'notion-config.js',
      ...cameraRoutes.map(route => `${route}index.html`),
      'guide/index.html', 'rig/index.html', 'rig/rig-model.js', 'rig/fmp-guide-data.js',
      ...rigPhotos.map(name => `rig/assets/${name}.webp`),
      'rig/vendor/three/three.module.js', 'rig/vendor/three/three.core.js', 'rig/vendor/three/addons/controls/OrbitControls.js'
    ]
  },
  { directory: 'fmpwalk', mode: 'local-first', expected: ['index.html', 'email.js', 'mail.js', 'photos.js', 'notion.js', 'notion-config.js'] }
];

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
    if (name.endsWith('.webp')) continue;
    const source = data.toString('utf8');
    assert.doesNotMatch(source, /-----BEGIN .*PRIVATE KEY-----|\b(?:ntn_|secret_)[A-Za-z0-9]{30,}/);
    if (!name.endsWith('.html')) continue;
    for (const marker of ['noindex', 'Content-Security-Policy', 'name="description"', 'rel="canonical"', 'property="og:title"', 'name="twitter:']) assert.ok(source.includes(marker), `${release.directory}/${name}: ${marker}`);
    assert.match(source, /class="skip(?:-link)?"/);
    const route = name.replace(/index\.html$/, '');
    const canonical = `https://systembydave.com/${release.directory}/${route}`;
    assert.ok(source.includes(`href="${canonical}"`), `${release.directory}/${name}: ${canonical}`);
    assert.ok(!sitemap.includes(`<loc>${canonical}</loc>`));
    if (release.directory === 'fmp' && name.startsWith('camera/')) {
      assert.ok(source.includes('data-setup-test-only="true"'));
      assert.ok(source.includes('data-public-release="true"'));
      assert.ok(source.includes("style-src-elem 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; style-src-attr 'none';"));
      assert.ok(source.includes(route === 'camera/' ? '<base href="../">' : '<base href="../../">'));
    }
  }
  assert.equal(hash(JSON.stringify(hashes)), provenance.artifactSha256, `${release.directory} combined artifact digest`);
  release.provenance = provenance;
}

const entry = fs.readFileSync(path.join(site, 'fmp/index.html'), 'utf8');
assert.match(entry, /class="startup-guidance"/);
assert.match(entry, /Recover drafts on the previous Site/);
assert.match(entry, /href="\/fmpwalk\/"/);
const walkEntry = fs.readFileSync(path.join(site, 'fmpwalk/index.html'), 'utf8');
assert.match(walkEntry, /No silent writes/);
assert.match(walkEntry, /href="https:\/\/systembydave\.com\/fmp\/"/);
assert.doesNotMatch(walkEntry, /davehomeassist\.github\.io/);
const rigEntry = fs.readFileSync(path.join(site, 'fmp/rig/index.html'), 'utf8');
assert.doesNotMatch(rigEntry, /unpkg|https:\/\/cdn/i);
assert.match(rigEntry, /\.\/vendor\/three\/three\.module\.js/);
const guideEntry = fs.readFileSync(path.join(site, 'fmp/guide/index.html'), 'utf8');
assert.match(guideEntry, /Tonight's director, stage plot, restrictions, and verified assignments control/);
const robots = fs.readFileSync(path.join(site, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Disallow: /fmp/'));
assert.ok(robots.includes('Disallow: /fmpwalk/'));
const index = fs.readFileSync(path.join(site, 'fmp-index/index.html'), 'utf8');
assert.ok(index.includes('href="/fmp/"'));
assert.ok(index.includes('href="/fmpwalk/"'));
console.log(`FMP suite verified: ${releases.map(release => `${release.directory} ${release.expected.length} files`).join('; ')}; source ${releases[0].provenance.sourceCommit}`);
