// node --test scripts/domain_keep_previous_assets.test.mjs
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { appsForSite, keepPreviousAssets, referencedAssets } from './domain_keep_previous_assets.mjs';

function site(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

function withTemp(fn) {
  const root = mkdtempSync(join(tmpdir(), 'keep-previous-'));
  try { fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('follows references from the page through scripts and styles', () => withTemp((root) => {
  site(root, {
    'assets/app-A.js': 'import("./app-chunk-B.js")',
    'assets/app-chunk-B.js': 'x',
    'assets/app-C.css': 'src:url(./app-D.woff2)',
    'assets/app-D.woff2': 'font',
    'assets/app-OLD.js': 'unused',
  });
  const html = '<script src="./assets/app-A.js"></script><link href="./assets/app-C.css">';
  assert.deepEqual(referencedAssets(html, join(root, 'assets')),
    ['app-A.js', 'app-C.css', 'app-D.woff2', 'app-chunk-B.js']);
}));

test('restores only the previous release and never overwrites the new one', () => withTemp((root) => {
  const previous = site(join(root, 'prev'), {
    'camera-sim/index.html': '<script src="./assets/camera-sim-v1.js"></script><link href="./assets/camera-sim-v1.css">',
    'camera-sim/assets/camera-sim-v1.js': 'v1',
    'camera-sim/assets/camera-sim-v1.css': 'url(./camera-sim-font.woff2)',
    'camera-sim/assets/camera-sim-font.woff2': 'old font',
    'camera-sim/assets/camera-sim-v0.js': 'kept from the release before',
  });
  const next = site(join(root, 'next'), {
    'camera-sim/index.html': '<script src="./assets/camera-sim-v2.js"></script>',
    'camera-sim/assets/camera-sim-v2.js': 'v2',
    'camera-sim/assets/camera-sim-font.woff2': 'new font',
  });
  assert.deepEqual(keepPreviousAssets(previous, next, 'camera-sim'), ['camera-sim-v1.css', 'camera-sim-v1.js']);
  assert.ok(existsSync(join(next, 'camera-sim/assets/camera-sim-v1.js')));
  assert.ok(!existsSync(join(next, 'camera-sim/assets/camera-sim-v0.js')), 'two releases back is dropped');
}));

test('does nothing on a first publish or for an app that is gone', () => withTemp((root) => {
  const next = site(join(root, 'next'), { 'camera-sim/assets/camera-sim-v2.js': 'v2' });
  assert.deepEqual(keepPreviousAssets(join(root, 'missing'), next, 'camera-sim'), []);
  const previous = site(join(root, 'prev'), { 'camera-sim/index.html': '<script src="./assets/camera-sim-v1.js">', 'camera-sim/assets/camera-sim-v1.js': 'v1' });
  assert.deepEqual(keepPreviousAssets(previous, join(root, 'empty'), 'camera-sim'), []);
}));

test('housevideo.app keeps the previous camera-sim build', () => {
  assert.deepEqual(appsForSite('housevideo'), ['camera-sim']);
  assert.deepEqual(appsForSite('housevideo-walk'), []);
});
