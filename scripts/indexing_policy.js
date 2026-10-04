'use strict';

// The explicit indexing policy AGENTS.md requires of every route kept out of the
// sitemap: a noindex meta tag, a robots.txt Disallow, or a canonical URL on one of
// the other domains this repository publishes (scripts/domain-sites.json). A page
// served here but owned by another domain hands its search signals to that domain;
// a Disallow would hide that canonical from crawlers, so the canonical is the policy.
const { cutoverSites } = require('./domain_sites_lib');

function hasNoIndex(source) {
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(source);
}

function canonical(source) {
  const match = source.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function disallowedPrefixes(robots) {
  return Array.from(robots.matchAll(/^Disallow:\s*(\S+)/gm), (match) => match[1]);
}

// Canonical URLs move to a site's domain at its cutover (domain_sites_lib.originFor).
function otherDomainOrigins() {
  return new Set(cutoverSites().map((site) => `https://${site.domain}`));
}

// The policy `route` carries, or '' when it has none.
function indexingPolicy(route, source, robots, origins = otherDomainOrigins()) {
  if (hasNoIndex(source)) return 'noindex';
  if (disallowedPrefixes(robots).some((prefix) => route.startsWith(prefix))) return 'robots-disallow';
  let origin = '';
  try { origin = new URL(canonical(source)).origin; } catch (error) { origin = ''; }
  return origins.has(origin) ? 'canonical-other-domain' : '';
}

module.exports = { hasNoIndex, canonical, disallowedPrefixes, otherDomainOrigins, indexingPolicy };
