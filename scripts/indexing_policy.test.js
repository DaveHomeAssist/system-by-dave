'use strict';

// The indexing policy every route outside the sitemap must carry (scripts/indexing_policy.js).
const assert = require('node:assert/strict');
const test = require('node:test');
const { cutoverSites, SOURCE_ORIGIN } = require('./domain_sites_lib');
const { indexingPolicy, otherDomainOrigins } = require('./indexing_policy');

const robots = 'User-agent: *\nAllow: /\nDisallow: /apps/\n';
const page = (head) => `<!doctype html><html><head>${head}</head><body></body></html>`;
const canonicalTo = (href) => page(`<link rel="canonical" href="${href}">`);
const otherDomain = `https://${cutoverSites()[0].domain}`;

test('the other published origins come from scripts/domain-sites.json', () => {
  const origins = otherDomainOrigins();
  assert.ok(origins.size > 0);
  assert.ok(origins.has(otherDomain));
  assert.ok(!origins.has(SOURCE_ORIGIN));
});

test('a noindex meta tag is a policy', () => {
  assert.equal(indexingPolicy('/draft.html', page('<meta name="robots" content="noindex,follow">'), robots), 'noindex');
});

test('a robots.txt Disallow is a policy', () => {
  assert.equal(indexingPolicy('/apps/tool/', page(''), robots), 'robots-disallow');
});

test('a canonical URL on another published domain is a policy', () => {
  assert.equal(indexingPolicy('/moved/', canonicalTo(`${otherDomain}/moved/`), robots), 'canonical-other-domain');
});

test('an unlisted page with none of them has no policy', () => {
  assert.equal(indexingPolicy('/orphan.html', page('<title>Orphan</title>'), robots), '');
  assert.equal(indexingPolicy('/orphan.html', canonicalTo(`${SOURCE_ORIGIN}/orphan.html`), robots), '');
  assert.equal(indexingPolicy('/orphan.html', canonicalTo('https://example.com/orphan.html'), robots), '');
  assert.equal(indexingPolicy('/orphan.html', canonicalTo(`${otherDomain}.example.com/orphan.html`), robots), '');
  assert.equal(indexingPolicy('/orphan.html', canonicalTo('/orphan.html'), robots), '');
});

// Exercise the real CLI with one additional virtual route. The fixture changes no
// repository files and leaves all real sitemap and special-route checks intact.
function verifyWithExtraRoute(source) {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const script = `
    const fs = require('node:fs');
    const path = require('node:path');
    const root = ${JSON.stringify(root)};
    const fixture = path.join(root, 'indexing-regression-fixture.html');
    const originalRead = fs.readFileSync;
    const originalList = fs.readdirSync;
    fs.readFileSync = function(file, ...args) {
      if (path.resolve(String(file)) === fixture) return ${JSON.stringify(source)};
      return originalRead.call(this, file, ...args);
    };
    fs.readdirSync = function(dir, ...args) {
      const entries = originalList.call(this, dir, ...args);
      if (path.resolve(String(dir)) === root) entries.push({
        name: 'indexing-regression-fixture.html',
        isDirectory: () => false,
        isFile: () => true
      });
      return entries;
    };
    require(path.join(root, 'scripts/verify_indexing_policy.js'));
  `;
  return spawnSync(process.execPath, ['-e', script], {
    cwd: root, encoding: 'utf8', timeout: 30000
  });
}

test('the CLI accepts a new explicitly excluded route without a count update', () => {
  const result = verifyWithExtraRoute(page('<meta name="robots" content="noindex,follow">'));
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /Indexing policy verification passed/);
});

test('the CLI still rejects a new route without an exclusion policy', () => {
  const result = verifyWithExtraRoute(page('<title>Unexplained omission</title>'));
  assert.equal(result.status, 1, result.stderr || result.error?.message);
  assert.match(result.stderr, /indexing-regression-fixture\.html is outside the sitemap but has no noindex/);
});
