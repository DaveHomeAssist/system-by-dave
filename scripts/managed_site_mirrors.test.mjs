import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyManagedSiteMirrors } from './managed_site_mirrors.mjs';

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
    }
    assert.equal(fs.readFileSync(path.join(staged, 'wst/stage/stage-3d.js'), 'utf8'), original);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('absent managed entries do not create a WST tree', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-mirrors-empty-'));
  try { assert.deepEqual(applyManagedSiteMirrors(temp), []); assert.deepEqual(fs.readdirSync(temp), []); }
  finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
