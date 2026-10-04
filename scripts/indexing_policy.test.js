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
