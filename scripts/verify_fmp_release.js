#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../fmp');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const routes = ['camera/', ...['pit-center', 'front-of-house', 'pit-stage-left', 'catwalk'].map(key => `camera/${key}/`)];
const expected = ['index.html', 'public.css', 'public.js', 'camera.js', 'camera-core.js', 'camera-view.js', 'camera.css', 'photos.js', 'mail.js', 'notion-config.js', ...routes.map(route => `${route}index.html`)];
function walk(directory, prefix = '') {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    assert.ok(!entry.isSymbolicLink(), 'No symlinks in public release');
    return entry.isDirectory() ? walk(path.join(directory, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`];
  });
}
const provenance = JSON.parse(fs.readFileSync(path.join(root, 'source_provenance.json')));
assert.equal(provenance.schema, 'fmp.public.release.v1');
assert.equal(provenance.sourceRepository, 'DaveHomeAssist/fmpwalk');
assert.match(provenance.sourceCommit, /^[0-9a-f]{40}$/);
assert.equal(provenance.mode, 'commissioning');
assert.deepEqual(walk(root).sort(), [...expected, 'source_provenance.json'].sort());
assert.deepEqual(Object.keys(provenance.files).sort(), expected.sort());
const hashes = {};
for (const name of expected.sort()) {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  hashes[name] = hash(source);
  assert.equal(hashes[name], provenance.files[name], `Managed artifact drift: ${name}`);
  assert.doesNotMatch(source, /-----BEGIN .*PRIVATE KEY-----|\b(?:ntn_|secret_)[A-Za-z0-9]{30,}/);
  if (!name.endsWith('.html')) continue;
  for (const marker of ['noindex', 'Content-Security-Policy', 'name="description"', 'rel="canonical"', 'property="og:title"', 'name="twitter:title"', 'class="skip"']) assert.ok(source.includes(marker), `${name}: ${marker}`);
  const route = name.replace(/index\.html$/, '');
  assert.ok(source.includes(`href="https://systembydave.com/fmp/${route}"`));
  assert.ok(!fs.readFileSync(path.join(root, '../sitemap.xml'), 'utf8').includes(`<loc>https://systembydave.com/fmp/${route}</loc>`));
  if (name.startsWith('camera/')) {
    assert.ok(source.includes('data-setup-test-only="true"'));
    assert.ok(source.includes('data-public-release="true"'));
    assert.ok(source.includes(route === 'camera/' ? '<base href="../">' : '<base href="../../">'));
  }
}
assert.equal(hash(JSON.stringify(hashes)), provenance.artifactSha256, 'Combined artifact digest');
assert.ok(fs.readFileSync(path.join(root, '../robots.txt'), 'utf8').includes('Disallow: /fmp/'));
assert.ok(fs.readFileSync(path.join(root, '../fmp-index/index.html'), 'utf8').includes('href="/fmp/"'));
console.log(`FMP release verified: ${expected.length} files; source ${provenance.sourceCommit}; digest ${provenance.artifactSha256}`);
