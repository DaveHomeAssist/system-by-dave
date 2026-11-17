import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { iconReferences, missingServed } from './review-favicons.mjs';

const workerPath = new URL('../worker/index.js', import.meta.url);

function maps(source) {
  const assetsStart = source.indexOf('const ASSETS = ') + 'const ASSETS = '.length;
  const assetsEnd = source.indexOf(';\nconst BINARY = ', assetsStart);
  const binaryStart = assetsEnd + ';\nconst BINARY = '.length;
  const binaryEnd = source.indexOf(';\nconst rates', binaryStart);
  return {
    assets: JSON.parse(source.slice(assetsStart, assetsEnd)),
    binary: JSON.parse(source.slice(binaryStart, binaryEnd)),
  };
}

test('an integrated review page that names an unpublished icon is rejected', () => {
  const html = '<link rel="icon" href="favicons/favicon-01-classic.svg"><link rel="icon" href="favicons/favicon-99-missing.svg">';
  const served = { '/run-review/favicons/favicon-01-classic.svg': '<svg' };
  assert.deepEqual(missingServed(html, served, {}), ['favicons/favicon-99-missing.svg']);
  assert.deepEqual(iconReferences('<script src="frozen-favicon.js?v=1"></script>'), ['frozen-favicon.js']);
});

test('the worker serves every icon path the run-review page references', () => {
  const source = fs.readFileSync(workerPath, 'utf8');
  const { assets, binary } = maps(source);
  const html = assets['/run-review/'];
  assert.equal(assets['/run-review/index.html'], html);
  assert.equal(assets['/run-review'], undefined, 'no-slash URL must not serve the page');
  const missing = missingServed(html, assets, binary);
  assert.deepEqual(missing, [], missing.join(', '));
  for (const name of ['favicon-01-classic.svg', 'favicon-09-ice.svg']) {
    const review = assets['/run-review/favicons/' + name];
    const shell = assets['/favicons/' + name];
    assert.equal(review, shell, name + ' should reuse the shell bytes');
  }
  assert.notEqual(binary['/run-review/favicons/favicon-01-classic.png'], binary['/favicons/favicon-01-classic.png']);
  assert.match(assets['/run-review/frozen-favicon.js'], /frozenFavicon/);
  assert.equal(source.includes("path==='/run-review'"), true);
});
