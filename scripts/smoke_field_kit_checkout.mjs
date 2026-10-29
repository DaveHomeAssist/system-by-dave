#!/usr/bin/env node
// Field Kit checkout smoke test (docs/launch/checkout.md). No dependencies.
// GET requests only; it never submits a payment or touches Stripe's API.
//   node scripts/smoke_field_kit_checkout.mjs [base-url]   (default https://avbydave.com)
// Checks:
//   1. /field-kit/ returns 200, is noindex, shows the $19 label and loads the
//      launch config and checkout scripts.
//   2. The checkout url in /js/sbd-launch-config.js matches ^https://buy\.stripe\.com/
//      and that Payment Link answers 200 (redirects followed).
//   3. /field-kit/thanks/ returns 200, is noindex and loads thanks.js.
// Exit codes: 0 all pass (checkout live), 2 pages fine but checkout not
// configured yet (Payment Link still a placeholder), 1 a check failed.
const BASE = (process.argv[2] || 'https://avbydave.com').replace(/\/+$/, '');
const PRICE = '$19';
const STRIPE = /^https:\/\/buy\.stripe\.com\//;
const failures = [];
const notes = [];
let notConfigured = false;
const fail = (m) => failures.push(m);
const ok = (m) => notes.push(`ok   ${m}`);

async function get(url) {
  const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'sbd-field-kit-smoke/1 (+avbydave@gmail.com)' } });
  return { status: res.status, url: res.url, text: await res.text() };
}
const noindex = (html) => /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);

try {
  const kit = await get(`${BASE}/field-kit/`);
  if (kit.status !== 200) fail(`/field-kit/ returned HTTP ${kit.status}`);
  else ok('/field-kit/ HTTP 200');
  const priceMatch = kit.text.match(/id=["']kit-price["'][^>]*>([^<]*)/);
  const shown = priceMatch ? priceMatch[1].trim() : '';
  if (shown !== PRICE) fail(`price label is ${JSON.stringify(shown)}, expected ${PRICE}`);
  else ok(`price label ${PRICE}`);
  if (/Price TBD/.test(kit.text.replace(/<script[\s\S]*?<\/script>/g, ''))) fail('page HTML still contains "Price TBD"');
  for (const s of ['sbd-launch-config.js', 'sbd-checkout.js', 'field-kit.js']) {
    if (!new RegExp(`<script[^>]+src=["'][^"']*${s.replace('.', '\\.')}["']`).test(kit.text)) fail(`page does not load ${s}`);
  }
  if (kit.status === 200 && noindex(kit.text)) notes.push('note /field-kit/ is noindex (expected while it is a draft)');

  const cfg = await get(`${BASE}/js/sbd-launch-config.js`);
  if (cfg.status !== 200) fail(`/js/sbd-launch-config.js returned HTTP ${cfg.status}`);
  const block = cfg.text.match(/checkout\s*:\s*\{[^}]*\}/);
  const urlMatch = block && block[0].match(/url\s*:\s*(['"])(.*?)\1/);
  const priceCfg = cfg.text.match(/priceLabel\s*:\s*(['"])(.*?)\1/);
  if (!priceCfg || priceCfg[2] !== PRICE) fail(`config priceLabel is ${priceCfg ? JSON.stringify(priceCfg[2]) : 'missing'}, expected ${PRICE}`);
  else ok(`config priceLabel ${PRICE}`);
  const checkoutUrl = urlMatch ? urlMatch[2].trim() : '';
  if (!STRIPE.test(checkoutUrl)) {
    notConfigured = true;
    notes.push(`WAIT checkout not configured: fieldKit.checkout.url is ${JSON.stringify(checkoutUrl)} (needs ^https://buy.stripe.com/)`);
  } else {
    ok(`checkout url is a Stripe Payment Link (${new URL(checkoutUrl).pathname.length - 1} char id)`);
    const pay = await get(checkoutUrl);
    if (pay.status !== 200) fail(`Payment Link returned HTTP ${pay.status} (final ${new URL(pay.url).host})`);
    else ok(`Payment Link HTTP 200 (final host ${new URL(pay.url).host})`);
    const remaining = (kit.text.match(/data-dave-placeholder/g) || []).length;
    if (remaining) fail(`${remaining} [DAVE] DRAFT block(s) still marked data-dave-placeholder: the button stays closed until they are approved`);
  }

  const ty = await get(`${BASE}/field-kit/thanks/`);
  if (ty.status !== 200) fail(`/field-kit/thanks/ returned HTTP ${ty.status}`);
  else ok('/field-kit/thanks/ HTTP 200');
  if (!noindex(ty.text)) fail('/field-kit/thanks/ is not noindex');
  if (!/<script[^>]+src=["'][^"']*thanks\.js["']/.test(ty.text)) fail('/field-kit/thanks/ does not load thanks.js');
  const tyJs = await get(new URL('thanks.js', `${BASE}/field-kit/thanks/`).toString());
  if (tyJs.status !== 200) fail(`/field-kit/thanks/thanks.js returned HTTP ${tyJs.status}`);
  else ok('/field-kit/thanks/thanks.js HTTP 200');
} catch (error) {
  fail(`request failed: ${error.message}`);
}

console.log(`Field Kit checkout smoke: ${BASE}`);
for (const n of notes) console.log(`- ${n}`);
for (const f of failures) console.log(`- FAIL ${f}`);
if (failures.length) { console.log('Result: FAIL'); process.exit(1); }
if (notConfigured) { console.log('Result: pages OK, checkout NOT CONFIGURED yet'); process.exit(2); }
console.log('Result: PASS (checkout live)');
