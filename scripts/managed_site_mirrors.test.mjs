import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyManagedSiteMirrors, MANAGED_MIRRORS } from './managed_site_mirrors.mjs';

test('only staged WST entries redirect; managed source and adjacent files stay exact', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-mirrors-'));
  try {
    const source = path.join(temp, 'source'), staged = path.join(temp, 'staged');
    fs.mkdirSync(path.join(source, 'wst/stage'), { recursive: true });
    const original = '<script type="importmap">{"imports":{"three":"/ProjectorThrow/vendor/three/three.module.min.js"}}</script>';
    for (const entry of ['wst/index.html', 'wst/stage/index.html', 'wst/stage/stage-3d.js']) fs.writeFileSync(path.join(source, entry), original);
    fs.cpSync(source, staged, { recursive: true });
    assert.deepEqual(applyManagedSiteMirrors(staged), ['wst/index.html', 'wst/stage/index.html']);
    for (const [entry, target] of [['wst/index.html','https://wst.housevideo.app/'], ['wst/stage/index.html','https://wst.housevideo.app/stage/index.html']]) {
      assert.equal(fs.readFileSync(path.join(source, entry), 'utf8'), original);
      const html = fs.readFileSync(path.join(staged, entry), 'utf8');
      assert.ok(html.includes(`content="0;url=${target}"`));
      assert.ok(html.includes(`<link rel="canonical" href="${target}">`));
      assert.ok(html.includes(`<a href="${target}">`));
      assert.ok(!html.includes('/ProjectorThrow/'));
      for (const field of ['name="description"','name="theme-color"','property="og:title"','property="og:description"','property="og:url"','name="twitter:card"','name="twitter:title"','name="twitter:description"','http-equiv="Content-Security-Policy"']) assert.ok(html.includes(field), field);
      assert.ok(html.includes("default-src 'none'; base-uri 'none'; form-action 'none'"));
    }
    assert.equal(fs.readFileSync(path.join(staged, 'wst/stage/stage-3d.js'), 'utf8'), original);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('closeout: staged Frozen app pages and the WST handoff copy redirect; their assets and source stay exact', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-mirrors-apps-'));
  try {
    const source = path.join(temp, 'source'), staged = path.join(temp, 'staged');
    const pages = Object.keys(MANAGED_MIRRORS).filter((entry) => entry !== 'wst/index.html' && entry !== 'wst/stage/index.html');
    const assets = ['apps/projctl/public/frozen-theme.js', 'apps/projctl/public/monitor/monitor.css', 'apps/frozen-startup/checks-app/web/app.js'];
    const original = '<main>relay page</main>';
    for (const entry of [...pages, ...assets]) {
      fs.mkdirSync(path.dirname(path.join(source, entry)), { recursive: true });
      fs.writeFileSync(path.join(source, entry), original);
    }
    fs.cpSync(source, staged, { recursive: true });
    assert.deepEqual(applyManagedSiteMirrors(staged).sort(), [...pages].sort());
    assert.equal(pages.length, 14);
    for (const entry of pages) {
      const target = MANAGED_MIRRORS[entry];
      assert.ok(target.startsWith('https://wst.housevideo.app/'), entry);
      assert.equal(fs.readFileSync(path.join(source, entry), 'utf8'), original, `${entry} source changed`);
      const html = fs.readFileSync(path.join(staged, entry), 'utf8');
      assert.ok(html.includes(`content="0;url=${target}"`), entry);
      assert.ok(html.includes('name="robots" content="noindex,follow"'), entry);
      assert.ok(!html.includes('relay page'), entry);
    }
    assert.equal(MANAGED_MIRRORS['wst/handoff.html'], 'https://wst.housevideo.app/handoff.html');
    for (const asset of assets) assert.equal(fs.readFileSync(path.join(staged, asset), 'utf8'), original, `${asset} must stay published`);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('absent managed entries do not create a WST tree', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-mirrors-empty-'));
  try { assert.deepEqual(applyManagedSiteMirrors(temp), []); assert.deepEqual(fs.readdirSync(temp), []); }
  finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
