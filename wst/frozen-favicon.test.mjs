import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./frozen-favicon.js', import.meta.url), 'utf8');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(source, sandbox);
const api = sandbox.module.exports;

test('resolves ids, names and filenames and ignores unknown values', () => {
  assert.equal(api.icons.length, 9);
  assert.equal(api.resolve('01').name, 'classic');
  assert.equal(api.resolve('9').name, 'ice');
  assert.equal(api.resolve('bloom').id, '08');
  assert.equal(api.resolve('favicon-05-bold').id, '05');
  assert.equal(api.resolve('05-bold.svg').id, '05');
  assert.equal(api.resolve('nope'), null);
  assert.equal(api.resolve(''), null);
  assert.equal(api.filename(api.resolve('inverted')), 'favicon-02-inverted.svg');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//);
});

test('workspace head points at the classic icon and the switcher', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="favicons\/favicon-01-classic\.svg"/);
  assert.match(html, /href="favicons\/favicon-01-classic\.png"/);
  assert.match(html, /src="frozen-favicon\.js"/);
  for (const icon of api.icons) readFileSync(new URL(`./favicons/${api.filename(icon)}`, import.meta.url));
});
