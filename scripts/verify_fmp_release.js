#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { modelFiles, modelContract } = require('./fmp_model_contract');
const { originFor } = require('./domain_sites_lib');

const site = path.resolve(__dirname, '..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const cameraRoutes = ['camera/', ...['pit-center', 'front-of-house', 'pit-stage-left', 'catwalk'].map(key => `camera/${key}/`)];
const rigPhotos = ['rig-camera', 'rig-front', 'rig-grip', 'rig-lens', 'rig-panel', 'rig-rear', 'rig-rings', 'rig-underside', 'v2-fiber-operator', 'v2-fiber-rear', 'v2-fiber-side', 'v2-fiber', 'v2-lcd-closed', 'v2-studio-front', 'v2-vf-back', 'v2-vf-front', 'body-controls'];
// One export writes both releases: the operations suite under fmp/ and the preshow walk under
// fmpwalk/, which is published on its own origin. The walk was dropped from the export on
// 2026-09-22 while an overwritten landing page was repaired, and restored on 2026-09-25 (Dave).
const releases = [
  {
    directory: 'fmp',
    mode: 'commissioning',
    expected: [
      'index.html', 'public.css', 'public.js', 'theme.js', 'chrome.js', 'chrome.css', 'camera.js', 'camera-core.js', 'camera-view.js', 'camera.css', 'photos.js', 'mail.js', 'notion-config.js',
      ...cameraRoutes.map(route => `${route}index.html`),
      'house/index.html', 'house/house.css', 'house/house.js', 'house/house-data.js', 'house/house-tokens.css', 'house/site-plan.png', 'house/display-estate.csv',
      ...modelFiles,
      'guide/index.html', 'gear/index.html', 'build/index.html', 'ptz/index.html', 'ref.css', 'ref.js',
      // Link-preview card for every FMP page; a reviewed raster, like the house site plan.
      'fmp-social-card.png',
      'rig/index.html', 'rig/embed-mode.js', 'rig/rig-model.js', 'rig/fmp-guide-data.js',
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
// No FMP page links a Notion page: crews have no Notion account, so what they need is its own HTML page.
// The walk's explicit Save to Notion receipt (fmpwalk/notion.js) opens the walker's own record and is exempt.
const NOTION_URL = /https?:\/\/(?:[\w-]+\.)*notion\.(?:so|site|com)\b/i;
const NOTION_RECEIPT = 'fmpwalk/notion.js';
// No FMP page links an old version of the suite: the retired private ChatGPT Site, the fmpwalk GitHub
// Pages copy, or a pre-cutover systembydave.com FMP address (Dave, 2026-09-18). Only URLs count.
const OLD_VERSION_URL = /https?:\/\/(?:(?:[\w-]+\.)*chatgpt\.site\b|davehomeassist\.github\.io\b|(?:www\.)?systembydave\.com\/(?:fmp|fmpwalk|fmp-index|fmp-walk)(?=[\/?#"'\s]|$))/i;
// No FMP page names a private network address: controller addresses belong to a control-room check, not
// the visual walk (Dave, 2026-09-18). Failures name the file and a count, never the address.
const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const PRIVATE_IPV4 = new RegExp(`(?<![\\d.])(?:10\\.${OCTET}|172\\.(?:1[6-9]|2\\d|3[01])|192\\.168|169\\.254)\\.${OCTET}\\.${OCTET}(?!\\.?\\d)`, 'g');
const privateAddresses = text => new Set(text.match(PRIVATE_IPV4) || []).size;

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
  assert.equal(provenance.sourceRepository, 'DaveHomeAssist/fmp-suite');
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
    if (`${release.directory}/${name}` !== NOTION_RECEIPT) assert.doesNotMatch(source, NOTION_URL, `${release.directory}/${name}: links a Notion page; link the suite's HTML reference instead`);
    assert.doesNotMatch(source, OLD_VERSION_URL, `${release.directory}/${name}: links an old version of the suite`);
    assert.equal(privateAddresses(source), 0, `${release.directory}/${name}: ${privateAddresses(source)} private network address(es) published; keep controller addresses with the control-room records`);
    const exposed = contactDetails(source);
    assert.ok(!exposed.emails && !exposed.phones, `${release.directory}/${name}: ${exposed.emails} email address(es) and ${exposed.phones} phone number(s) published; keep contacts in Notion`);
    for (const [, target, token] of source.matchAll(TOKEN_REFERENCE)) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), target));
      assert.ok(release.expected.includes(resolved), `${release.directory}/${name}: ${target} is not in the release`);
      assert.equal(token, hash(fs.readFileSync(path.join(root, resolved))).slice(0, 16), `${release.directory}/${name}: ${target}?v= must be the content hash`);
    }
    if (!name.endsWith('.html')) continue;
    for (const marker of ['noindex', 'Content-Security-Policy', 'name="description"', 'rel="canonical"', 'property="og:title"', 'name="twitter:']) assert.ok(source.includes(marker), `${release.directory}/${name}: ${marker}`);
    assert.match(source, /class="(?:[^"\n]*\s)?skip(?:-link)?(?:\s[^"\n]*)?"/);
    // A <base> element resolves #fragment links against another document, so skip links leave the page.
    assert.doesNotMatch(source, /<base\b/i, `${release.directory}/${name}: <base> breaks in-page skip links`);
    for (const [, target] of source.matchAll(/href="#([^"]+)"/g)) assert.ok(source.includes(`id="${target}"`), `${release.directory}/${name}: missing skip target #${target}`);
    const route = name.replace(/index\.html$/, '');
    const canonical = `${originFor(`${release.directory}/`)}/${release.directory}/${route}`;
    assert.ok(source.includes(`href="${canonical}"`), `${release.directory}/${name}: ${canonical}`);
    assert.ok(!sitemap.includes(`<loc>${canonical}</loc>`));
    if (release.directory === 'fmp') {
      // WEB-1: every FMP page takes the light-first fmpTheme preference before first paint, never the AV Suite key.
      const head = source.slice(0, source.indexOf('</head>'));
      if (name === 'ptz/SuperJoy-G1-Interactive-Guide.html') {
        // The portable one-file guide embeds the exact shared preference before paint.
        const theme = fs.readFileSync(path.join(root, 'theme.js'), 'utf8').split('// Keep the published chrome')[0];
        assert.ok(head.includes(`<script>${theme}</script>`), `${name}: embed the exact shared theme in <head>`);
      } else {
        assert.match(head, /<script src="(?:\.\.\/)*theme\.js\?v=[a-f0-9]{16}"><\/script>/, `${release.directory}/${name}: load theme.js in <head>`);
      }
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
// The walk is an operator task on its own origin: the hub's Operators panel launches it by its
// absolute address. The camera workspace, house board and bowl guide do not link it.
const walkRoot = `${originFor('fmpwalk/')}/fmpwalk/`;
assert.ok(entry.includes(`href="${walkRoot}"`), 'fmp/index.html: Operators must launch the walk on its own origin');
assert.doesNotMatch(entry, /href=["']\/fmpwalk\//, 'fmp/index.html: links the walk at a same-origin path');
for (const name of ['camera.js', 'house/index.html', 'guide/index.html']) {
  assert.doesNotMatch(fs.readFileSync(path.join(site, 'fmp', name), 'utf8'), /(?:href=["'](?:https:\/\/walk\.housevideo\.app)?\/fmpwalk\/|['"]https:\/\/walk\.housevideo\.app\/fmpwalk\/['"])/, `${name}: walk launch remains in the operator/reference site`);
}
for (const target of ['https://housevideo.app/camera-sim/', '/shader/practice.html', 'rig/', 'models/atem-hd8-iso.html', 'ptz/SuperJoy-G1-Interactive-Guide.html', 'models/p240.html', 'models/ccu4.html']) {
  assert.ok(entry.includes(`<a class="model-card" href="${target}"`), `The Practice tab must reach ${target}`);
}
assert.match(entry, /<span>Practice<\/span>/, 'fmp/index.html: the models panel is labelled Practice');
assert.match(entry, /id="models"/);
const cameraView = fs.readFileSync(path.join(site, 'fmp/camera-view.js'), 'utf8');
assert.match(cameraView, /href="#screenTitle"/);
assert.match(cameraView, /id="screenTitle"/);
// One suite theme preference: theme.js and the walk share fmpTheme, a first visit is light, and the index uses it too.
const theme = fs.readFileSync(path.join(site, 'fmp/theme.js'), 'utf8');
assert.match(theme, /const KEY = 'fmpTheme';/);
assert.match(theme, /preference = legacy \|\| 'light';/);
assert.equal(releases[0].provenance.sourceCommit, releases[1].provenance.sourceCommit, 'fmp and fmpwalk must ship from one export');
const walkEntry = fs.readFileSync(path.join(site, 'fmpwalk/index.html'), 'utf8');
assert.match(walkEntry, /var THEME_KEY = "fmpTheme";/);
assert.match(walkEntry, /No silent writes/);
// /fmpwalk/camera/ does not exist, and the walk is its own origin, so its camera link and
// legacy ?camera=N / ?position= redirect name the operations hub absolutely. A same-origin
// /fmp/camera/ would resolve against the walk's domain, where nothing serves it.
const walkCameraRoot = `${originFor('fmp/camera/')}/fmp/camera/`;
assert.ok(walkEntry.includes(`id="cameraLaunch" href="${walkCameraRoot}"`), 'walk camera launch is absolute');
assert.ok(walkEntry.includes(`var cameraRoot = "${walkCameraRoot}";`), 'walk legacy camera redirect is absolute');
assert.doesNotMatch(walkEntry, /["']\.{1,2}\/camera\//);
assert.equal((walkEntry.match(/<h1\b/g) || []).length, 1);
assert.ok(walkEntry.includes(`href="${originFor('fmp/')}/fmp/"`), 'The walk must link its operations hub at the suite\'s canonical origin.');
assert.doesNotMatch(walkEntry, /davehomeassist\.github\.io/);
const rigEntry = fs.readFileSync(path.join(site, 'fmp/rig/index.html'), 'utf8');
assert.doesNotMatch(rigEntry, /unpkg|https:\/\/cdn/i);
assert.match(rigEntry, /\.\/vendor\/three\/three\.module\.js/);
const guideEntry = fs.readFileSync(path.join(site, 'fmp/guide/index.html'), 'utf8');
assert.match(guideEntry, /Tonight's director, stage plot, restrictions, and verified assignments control/);
// The guide links the operations hub. Publisher branding was struck from the FMP pages.
assert.match(guideEntry, /href="\/fmp\/"/);
// These pages are the venue's operational site: the publisher's name, home link and logo
// belong on systembydave.com, not in FMP titles, link previews, navigation or tab icons.
const assertUnbranded = (payload, name) => {
  assert.doesNotMatch(payload, /System by Dave/i, `${name} names the publisher`);
  assert.doesNotMatch(payload, /systembydave\.com/i, `${name} links the publisher`);
  assert.doesNotMatch(payload, /system_by_dave/i, `${name} uses the publisher logo`);
};
for (const release of releases) {
  for (const name of release.expected) {
    if (!/\.(?:html|js|css)$/.test(name)) continue;
    assertUnbranded(fs.readFileSync(path.join(site, release.directory, name), 'utf8'), `${release.directory}/${name}`);
  }
}
const robots = fs.readFileSync(path.join(site, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Disallow: /fmp/'));
assert.ok(robots.includes('Disallow: /fmpwalk/'));
// /fmp-index/ is retired: the /fmp/ hub is the one directory, so the old index redirects there like /fmp-walk/.
const index = fs.readFileSync(path.join(site, 'fmp-index/index.html'), 'utf8');
assert.match(index, /<meta http-equiv="refresh" content="0; url=\/fmp\/">/, 'fmp-index/index.html: redirect to /fmp/');
assert.ok(index.includes('location.replace("/fmp/" + location.search + location.hash)'), 'fmp-index/index.html: keep query and hash');
assert.ok(index.includes(`<link rel="canonical" href="${originFor('fmp/')}/fmp/">`), 'fmp-index/index.html: canonical is the hub');
assert.match(index, /<meta name="robots" content="noindex,follow">/);
assert.doesNotMatch(entry, /href="\/fmp-index\/"/, 'fmp/index.html: the hub must not link the retired index');
// The hand-maintained pages published beside the suite follow the same rules, branding included:
// they are FMP references on the venue's domain, so the publisher belongs in neither (Dave, 2026-09-22).
for (const name of ['fmp-index/index.html', 'fmp-walk/index.html', 'switcher/index.html', 'switcher/guide/index.html', 'shader/index.html', 'backfocus/index.html', 'ursa-broadcast-g2/index.html']) {
  const page = fs.readFileSync(path.join(site, name), 'utf8');
  assert.doesNotMatch(page, NOTION_URL, `${name}: links a Notion page`);
  assert.doesNotMatch(page, OLD_VERSION_URL, `${name}: links an old version of the suite`);
  assert.equal(privateAddresses(page), 0, `${name}: publishes a private network address`);
  assertUnbranded(page, name);
}
// Validate every claim against the catalog belonging to that model.
const { counts: modelCounts, componentsFor } = modelContract(site);
const components = modelCounts.rig;
for (const release of releases) {
  for (const name of release.expected.filter(file => /\.(?:html|js)$/.test(file) && !file.includes('/vendor/'))) {
    const source = fs.readFileSync(path.join(site, release.directory, name), 'utf8');
    for (const [claim, number] of source.matchAll(COUNT_CLAIM)) assert.equal(Number(number), componentsFor(name), `${release.directory}/${name}: "${claim}" disagrees with its owning model catalog`);
    for (const [, stamped] of source.matchAll(/data-rig-components="(\d+)"/g)) assert.equal(Number(stamped), components, `${release.directory}/${name}: data-rig-components`);
  }
}
console.log(`FMP suite verified: ${releases.map(release => `${release.directory} ${release.expected.length} files`).join('; ')}; ${components} rig components; source ${releases[0].provenance.sourceCommit}`);
