'use strict';

// Which domain serves a page in this repository, per scripts/domain-sites.json.
// Release gates use it so the canonical URLs and sitemap entries they expect
// follow each site's cutover instead of naming systembydave.com.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ORIGIN = 'https://systembydave.com';
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'domain-sites.json'), 'utf8'));

let registryPageEntries = null;

// Registry tools plus the registry's offline pages move with a registry site,
// matching scripts/stage_domain_sites.mjs.
function registryPages() {
  if (registryPageEntries) return registryPageEntries;
  const context = {};
  context.window = context;
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'sbd-registry.js'), 'utf8'), context);
  const registry = context.SBD_REGISTRY;
  const offline = typeof registry.offlineAssets === 'function' ? registry.offlineAssets() : registry.baseAssets;
  registryPageEntries = registry.tools.map((tool) => tool.href)
    .concat(offline.filter((asset) => /(?:\.html?|\/)$/i.test(asset)))
    .map((entry) => entry.replace(/^\.\//, ''));
  return registryPageEntries;
}

function siteFor(file) {
  const rel = String(file).replace(/^\/+/, '');
  for (const site of config.sites) {
    const entries = (site.pages || []).concat(site.registry ? registryPages() : []);
    const owns = entries.some((entry) => rel === entry
      || (entry.endsWith('/') && (rel.startsWith(entry) || `${rel}/` === entry)));
    if (owns) return site;
  }
  return null;
}

// The origin a page's canonical URL uses: its site's domain once that site has
// cut over, systembydave.com until then.
function originFor(file) {
  const site = siteFor(file);
  return site && site.cutover ? `https://${site.domain}` : SOURCE_ORIGIN;
}

// The paths that count as a page's own site home. On systembydave.com that is the
// origin root; on a cut-over site it is also that site's declared home, because the
// reader is inside that site, not the publisher's. Gates read this instead of
// hard-coding a domain or assuming every site's home is /.
function homePathsFor(file) {
  const site = siteFor(file);
  const paths = ['/', '/index.html'];
  if (site && site.cutover && site.home) {
    paths.push(site.home);
    if (site.home.endsWith('/')) paths.push(`${site.home}index.html`);
  }
  return paths;
}

const sitemaps = new Map();

function siteSitemap(siteId) {
  if (!sitemaps.has(siteId)) {
    if (!siteId) {
      sitemaps.set(siteId, fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'));
    } else {
      const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'domain-sitemap-')), 'sitemap.xml');
      execFileSync('python3', [path.join(ROOT, 'scripts', 'gen_sitemap.py'), '--site', siteId, '--out', out], { cwd: ROOT, stdio: 'ignore' });
      sitemaps.set(siteId, fs.readFileSync(out, 'utf8'));
    }
  }
  return sitemaps.get(siteId);
}

// The sitemap that should list `file`: systembydave.com's committed sitemap,
// or the one generated for the site it moved to.
function sitemapFor(file) {
  const site = siteFor(file);
  return siteSitemap(site && site.cutover ? site.id : '');
}

function cutoverSites() {
  return config.sites.filter((site) => site.cutover);
}

module.exports = { SOURCE_ORIGIN, siteFor, originFor, homePathsFor, sitemapFor, siteSitemap, cutoverSites };
