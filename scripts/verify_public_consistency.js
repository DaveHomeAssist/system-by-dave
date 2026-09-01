#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3]) : '';
}

function tags(source, name) {
  return [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function meta(source, key, value) {
  return tags(source, 'meta').some((tag) => attribute(tag, key).toLowerCase() === value.toLowerCase());
}

function link(source, rel) {
  return tags(source, 'link').find((tag) => attribute(tag, 'rel').toLowerCase().split(/\s+/).includes(rel)) || '';
}

function routeFile(url) {
  const route = new URL(url).pathname;
  if (route === '/') return 'index.html';
  if (route.endsWith('/')) return `${route.slice(1)}index.html`;
  return route.slice(1);
}

function verifyNavigation() {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'verify_public_navigation.js')], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`minimum shell contract failed:\n${(result.stderr || result.stdout).trim()}`);
  }
}

function sitemapEntries() {
  return [...read('sitemap.xml').matchAll(/<loc>(https:\/\/systembydave\.com[^<]*)<\/loc>/g)].map((match) => ({
    url: match[1],
    file: routeFile(match[1])
  }));
}

function verifyMetadata(entries) {
  const requiredMeta = [
    ['name', 'viewport'],
    ['name', 'description'],
    ['name', 'theme-color'],
    ['http-equiv', 'Content-Security-Policy'],
    ['property', 'og:type'],
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['property', 'og:url'],
    ['property', 'og:image'],
    ['name', 'twitter:card'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description'],
    ['name', 'twitter:image']
  ];

  entries.forEach(({ url, file }) => {
    const absolute = path.join(ROOT, file);
    if (!fs.existsSync(absolute)) {
      fail(`${file} is missing for sitemap URL ${url}.`);
      return;
    }
    const source = read(file);
    if (!/<title>[^<]+<\/title>/i.test(source)) fail(`${file} is missing a nonempty title.`);
    requiredMeta.forEach(([key, value]) => {
      if (!meta(source, key, value)) fail(`${file} is missing ${key}="${value}" metadata.`);
    });
    const canonical = link(source, 'canonical');
    if (!canonical) fail(`${file} is missing a canonical link.`);
    else if (attribute(canonical, 'href') !== url) fail(`${file} canonical does not match ${url}.`);
    const ogUrlTag = tags(source, 'meta').find((tag) => attribute(tag, 'property').toLowerCase() === 'og:url');
    if (ogUrlTag && attribute(ogUrlTag, 'content') !== url) fail(`${file} og:url does not match ${url}.`);
  });
  notes.push(`metadataRoutes=${entries.length}`);
}

function registry() {
  const context = { self: {} };
  vm.createContext(context);
  vm.runInContext(read('js/sbd-registry.js'), context, { filename: 'js/sbd-registry.js' });
  return context.self.SBD_REGISTRY;
}

function verifyCounts() {
  const count = registry()?.tools?.length;
  if (!Number.isInteger(count) || count < 1) {
    fail('canonical AV registry count is unavailable.');
    return;
  }
  const contracts = new Map([
    ['index.html', [`>${count}</div>`, `${count} tools · offline`]],
    ['tools.html', [`bundles ${count} operator tools`, `all ${count} registered AV tools`]],
    ['av-suite.html', [`id="railAllCount">${count}</span> tools`, `placeholder="Search all ${count} tools`]],
    ['README.md', [`contains **${count} browser tools**`]]
  ]);
  contracts.forEach((snippets, file) => {
    const source = read(file);
    snippets.forEach((snippet) => {
      if (!source.includes(snippet)) fail(`${file} is missing canonical AV count marker: ${snippet}.`);
    });
  });
  if (/groups\s+43\s+browser-based AV show tools/i.test(read('tools.html'))) fail('tools.html retains the stale 43-tool card count.');
  notes.push(`avTools=${count}`);
}

function verifyPromptLabClaims() {
  const files = ['index.html', 'prompt-lab.html', 'privacy-policy.html', 'agents.html', 'tools.html'];
  const prohibited = [
    /no sign[ -]?up/i,
    /no subscriptions?/i,
    /nothing (?:is )?proxied/i,
    /does not proxy (?:your )?prompts/i,
    /no account required/i,
    /A\/B Compare[^.]{0,80}\bfree\b/i
  ];
  files.forEach((file) => {
    const source = read(file);
    prohibited.forEach((pattern) => {
      if (pattern.test(source)) fail(`${file} contains prohibited stale Prompt Lab claim ${pattern}.`);
    });
  });
  const promptLab = read('prompt-lab.html');
  [
    'https://promptlab.tools/#pricing',
    'https://promptlab.tools/app',
    'Free editor · Pro $9/month',
    'A/B Compare · Pro',
    'requires sign-in',
    'domain-allowlisted proxy'
  ].forEach((marker) => {
    if (!promptLab.includes(marker)) fail(`prompt-lab.html is missing current product marker: ${marker}.`);
  });
  const publicLabelFiles = ['index.html', 'tools.html', 'prompt-lab.html', 'profile/index.html', 'agents.html', 'notion.html', 'widgets.html', 'privacy-policy.html'];
  publicLabelFiles.forEach((file) => {
    if (/PromptLab/.test(read(file))) fail(`${file} uses noncanonical PromptLab prose.`);
  });
}

function verifyAgentDestinations() {
  const source = read('agents.html');
  const agents = ['promptkeeper', 'daily-prophet', 'formatting-wizard', 'sort-inbox'];
  const destinations = agents.map((id) => `#${id}-details`);
  destinations.forEach((destination) => {
    if (!source.includes(`href="${destination}"`)) fail(`agents.html is missing unique card destination ${destination}.`);
  });
  if (new Set(destinations).size !== agents.length) fail('agent card destinations are not unique.');
  agents.forEach((id) => {
    if (!source.includes(`id="${id}-details" tabindex="-1"`)) fail(`agents.html is missing focusable detail target ${id}-details.`);
  });
  if (/promptlab\.tools\/\?agent=/i.test(source)) fail('agents.html still routes agents through a generic Prompt Lab destination.');
}

function verifyRequiredExternalLinks() {
  const contracts = new Map([
    ['prompt-lab.html', ['https://promptlab.tools/#pricing', 'https://promptlab.tools/app']],
    ['privacy-policy.html', ['https://promptlab.tools/privacy']],
    ['widgets.html', [
      'https://davehomeassist.github.io/NotionWidgets/project-status.html',
      'https://davehomeassist.github.io/NotionWidgets/quest-log.html',
      'https://davehomeassist.github.io/NotionWidgets/client-approval.html',
      'https://davehomeassist.github.io/NotionWidgets/graph-explorer.html'
    ]]
  ]);
  contracts.forEach((urls, file) => {
    const source = read(file);
    urls.forEach((url) => {
      const tag = tags(source, 'a').find((candidate) => attribute(candidate, 'href') === url);
      if (!tag) fail(`${file} is missing required external destination ${url}.`);
      else if (attribute(tag, 'target') !== '_blank' || !attribute(tag, 'rel').split(/\s+/).includes('noopener') || !attribute(tag, 'rel').split(/\s+/).includes('noreferrer')) {
        fail(`${file} external destination ${url} is missing safe new-tab attributes.`);
      }
    });
  });
}

function verifyNamesAndPrivacy(entries) {
  const canonicalDavai = 'Davai — System by Dave Memory Architecture';
  ['tools.html', 'systembydave/index.html'].forEach((file) => {
    if (!read(file).includes(canonicalDavai)) fail(`${file} is missing the canonical Davai display name.`);
  });
  if (!read('systembydave/index.html').includes('Davai is the System by Dave memory architecture')) {
    fail('Davai overview does not explain its relationship to System by Dave.');
  }
  const publicSources = entries.map(({ file }) => read(file));
  if (publicSources.some((source) => /https:\/\/fonts\.(?:googleapis|gstatic)\.com/i.test(source))) {
    fail('a sitemap route still requests Google Fonts.');
  }
  if (/<iframe\b/i.test(read('widgets.html'))) fail('widgets.html unexpectedly embeds an iframe.');
  const privacy = read('privacy-policy.html');
  [
    'typefaces are self-hosted',
    'shows local poster cards',
    'does not embed those demos or load them in iframes'
  ].forEach((marker) => {
    if (!privacy.includes(marker)) fail(`privacy-policy.html is missing verified behavior marker: ${marker}.`);
  });
}

verifyNavigation();
const entries = sitemapEntries();
verifyMetadata(entries);
verifyCounts();
verifyPromptLabClaims();
verifyAgentDestinations();
verifyRequiredExternalLinks();
verifyNamesAndPrivacy(entries);

if (failures.length) {
  console.error('Public consistency verification failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Public consistency verification passed (${notes.join(', ')}).`);
