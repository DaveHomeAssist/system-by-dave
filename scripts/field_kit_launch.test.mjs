import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fieldKitCheckoutLive, stagedFieldKitPage } from './field_kit_launch.mjs';

const config = fs.readFileSync(new URL('../js/sbd-launch-config.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../field-kit/index.html', import.meta.url), 'utf8');
const withUrl = (url) => config.replace(/(checkout\s*:\s*\{[^}]*url:\s*)'[^']*'/, `$1'${url}'`);
const placeholder = withUrl('[DAVE: Stripe Payment Link]');
const live = withUrl('https://buy.stripe.com/test_abc123');

test('committed page is noindex and a placeholder link keeps it that way', () => {
  assert.match(page, /<meta name="robots" content="noindex,nofollow" \/>/);
  assert.equal(fieldKitCheckoutLive(placeholder, page), false);
  assert.equal(stagedFieldKitPage(placeholder, page), page);
});

test('a buy.stripe.com link makes the staged page indexable', () => {
  assert.equal(fieldKitCheckoutLive(live, page), true);
  const staged = stagedFieldKitPage(live, page);
  assert.match(staged, /<meta name="robots" content="index,follow" \/>/);
  assert.doesNotMatch(staged, /noindex/);
});

test('other hosts, a placeholder price or a leftover DRAFT block keep it noindex', () => {
  assert.equal(fieldKitCheckoutLive(withUrl('https://example.com/buy'), page), false);
  assert.equal(fieldKitCheckoutLive(live.replace("priceLabel: '$12'", "priceLabel: '[DAVE: price]'"), page), false);
  assert.equal(fieldKitCheckoutLive(live, page.replace('<p>Digital download.', '<p data-dave-placeholder>Digital download.')), false);
});

test('gen_sitemap.py applies the same rule', () => {
  const py = (cfg) => execFileSync('python3', ['-c',
    'import sys; sys.path.insert(0, "scripts"); import gen_sitemap as g; print(g.field_kit_checkout_live(sys.stdin.read()))'],
  { input: cfg, encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, cwd: new URL('..', import.meta.url).pathname }).trim();
  assert.equal(py(placeholder), 'False');
  assert.equal(py(live), 'True');
});
