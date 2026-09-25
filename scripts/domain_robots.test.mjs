// Robots matching and the crawl policy for routes that robotsAllow reopens.
// See the comment above robotsRules() in stage_domain_sites.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { robots, robotsRules, robotsAllows, declaresNoindex, previewImagePaths, crawlPolicyProblems } from './stage_domain_sites.mjs';

const site = {
  domain: 'example.test',
  robotsDisallow: ['/404.html', '/fmp/', '/camera-sim/'],
  robotsAllow: ['/fmp/$', '/fmp/*/$', '/fmp/*.html$', '/camera-sim/$', '/camera-sim/*.html$']
};
const NOINDEX = '<meta name="robots" content="noindex,nofollow">';

function stage(files, imageAllows = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-robots-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  fs.writeFileSync(path.join(dir, 'robots.txt'), robots(site, 'https://example.test', true, false, imageAllows));
  return dir;
}

test('matching follows Google: longest pattern wins, Allow wins a tie, * and $ are honoured', () => {
  const rules = robotsRules(robots(site, 'https://example.test', true, false));
  for (const allowed of ['/', '/fmp/', '/fmp/build/', '/fmp/camera/catwalk/', '/fmp/index.html',
    '/fmp/models/atem-hd8-iso.html', '/camera-sim/', '/camera-sim/fmp-camera-simulator-offline.html', '/shader/']) {
    assert.equal(robotsAllows(rules, allowed), true, allowed);
  }
  for (const blocked of ['/404.html', '/fmp/house/display-estate.csv', '/fmp/models/assets/catalog.json',
    '/fmp/rig/photo.webp', '/fmp/camera.js', '/camera-sim/og.png', '/fmp/html', '/fmp/x.html.js']) {
    assert.equal(robotsAllows(rules, blocked), false, blocked);
  }
  assert.equal(robotsAllows(robotsRules('Disallow: /a\nAllow: /a\n'), '/a'), true);
  assert.equal(robotsAllows(robotsRules('Disallow: /a/b\nAllow: /a\n'), '/a/b/c'), false);
});

test('before cutover every path stays blocked', () => {
  assert.equal(robots(site, 'https://example.test', false, false, ['/fmp/card.png']), 'User-agent: *\nDisallow: /\n');
});

test('noindex is read from any attribute order', () => {
  assert.equal(declaresNoindex(NOINDEX), true);
  assert.equal(declaresNoindex('<meta content="noindex" name="robots">'), true);
  assert.equal(declaresNoindex('<meta name="robots" content="index,follow">'), false);
  assert.equal(declaresNoindex('<title>noindex</title>'), false);
});

test('preview images resolve to paths on the site only', () => {
  const dir = stage({
    'fmp/index.html': `${NOINDEX}<meta property="og:image" content="https://example.test/fmp/card.png"><meta name="twitter:image" content="card2.png">`,
    'shader/index.html': '<meta property="og:image" content="https://elsewhere.test/card.png">'
  });
  assert.deepEqual(previewImagePaths(site, dir, ['fmp/index.html', 'shader/index.html']), ['/fmp/card.png', '/fmp/card2.png']);
});

test('a reopened tree passes when pages carry noindex and only preview images are also open', () => {
  const dir = stage({
    'fmp/index.html': `${NOINDEX}<meta property="og:image" content="https://example.test/fmp/card.png">`,
    'fmp/build/index.html': NOINDEX,
    'fmp/models/ccu4.html': NOINDEX,
    'fmp/card.png': 'png',
    'fmp/house/display-estate.csv': 'a,b',
    'camera-sim/index.html': NOINDEX
  }, ['/fmp/card.png']);
  assert.deepEqual(crawlPolicyProblems(site, dir), []);
});

test('a crawlable page without noindex fails', () => {
  const dir = stage({ 'fmp/index.html': NOINDEX, 'fmp/new-page.html': '<title>New</title>' });
  const problems = crawlPolicyProblems(site, dir);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /\/fmp\/new-page\.html .*no noindex/);
});

test('a blocked preview image and an open data file both fail', () => {
  const dir = stage({
    'fmp/index.html': `${NOINDEX}<meta property="og:image" content="/fmp/card.png">`,
    'fmp/card.png': 'png'
  });
  assert.match(crawlPolicyProblems(site, dir).join('\n'), /\/fmp\/card\.png is a link-preview image, but robots.txt blocks it/);
  const open = { ...site, robotsAllow: [...site.robotsAllow, '/fmp/*.csv$'] };
  const dir2 = stage({ 'fmp/index.html': NOINDEX, 'fmp/data.csv': 'a' });
  fs.writeFileSync(path.join(dir2, 'robots.txt'), robots(open, 'https://example.test', true, false));
  assert.match(crawlPolicyProblems(open, dir2).join('\n'), /\/fmp\/data\.csv is neither a page nor a link-preview image/);
});
