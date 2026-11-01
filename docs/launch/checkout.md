# Field Kit checkout

Status: **closed**. `field-kit/` is a noindex draft that isn't linked from
navigation or the sitemap. It shows the $12 price and a disabled "Checkout not
open yet" button. Paid kit files are **not** in this repository. Only the
blurred preview images in `field-kit/img/` are.

Code: `js/sbd-checkout.js` (validation), `field-kit/field-kit.js` (button),
config in `js/sbd-launch-config.js` (`fieldKit`).

## Safety interlock

Checkout opens only when **all three** of these are true:

1. `fieldKit.checkout` names a provider and an HTTPS link on that provider's own
   hosts. Anything else stays closed: another host, `http:`, a typo or an
   unknown provider.
2. No block on `field-kit/index.html` is marked `data-dave-placeholder`. The
   delivery, statement descriptor, refund and licence text was approved on
   2026-11-01 and the markers removed. Re-adding the attribute to any block
   closes checkout again, and the console says how many are left.
3. `fieldKit.priceLabel` is a real price. `'Price TBD'`, an empty string or a
   `[DAVE: …]` placeholder keeps checkout closed and the page shows "Price TBD".

The demo itself (`demos/frame-sync.html`) doesn't carry a Field Kit block; link the
kit from its `checklistUrl` in `demos/config.js` (set: the absolute avbydave.com/field-kit/ link, because the demos live on systembydave.com).

## Smoke test (after publish)

`node scripts/smoke_field_kit_checkout.mjs [base-url]` (default
`https://avbydave.com`; `npm run smoke:field-kit-checkout`). GET requests only, no
dependencies, never submits a payment. It checks that `/field-kit/` returns 200
and shows $12, that `fieldKit.checkout.url` matches `^https://buy\.stripe\.com/`
and that Payment Link answers 200, and that `/field-kit/thanks/` loads. Exit 0 =
checkout live, 2 = pages fine but the Payment Link is still a placeholder,
1 = a check failed.

## Chosen: Stripe Payment Links (2026-10-19)

The config ships `provider: 'stripe'` with the marked placeholder
`url: '[DAVE: Stripe Payment Link]'` and `priceLabel: '$12'` (Dave, 2026-10-30),
so checkout stays closed until a real `buy.stripe.com` link replaces the placeholder.
**Account:** a separate AV by Dave Stripe account (Dave, 2026-10-23), not the System
by Dave one. Statement descriptor: **AVBYDAVE FIELD KIT** (18 characters; set it
in that account's Stripe settings so the card statement matches the page). The
Payment Link went in on 2026-11-01. Dave's click-steps live outside the repo
(`/workspace/launch/setup-stripe.md`).

## Search indexing

`field-kit/index.html` is committed `noindex,nofollow`. When
`js/sbd-launch-config.js` has a `buy.stripe.com` Payment Link and a real price,
and no `data-dave-placeholder` block remains, the publish step
(`scripts/stage_domain_sites.mjs` via `scripts/field_kit_launch.mjs`) stages the
page as `index,follow` and `scripts/gen_sitemap.py --site avbydave` lists
`/field-kit/` in the avbydave.com sitemap. Put the placeholder back and both
revert. `scripts/field_kit_launch.test.mjs` (in `npm run verify:domain-sites`)
keeps the JavaScript and Python rules in step.

Delivery: Stripe doesn't host files. The Payment Link's "After payment" →
"Don't show confirmation page" → redirect setting sends buyers to the noindex page
`field-kit/thanks/`, with this URL (set **only** in the Stripe Dashboard, never
committed):

```
https://avbydave.com/field-kit/thanks/?dl=<URL-encoded share link to the kit folder>&session_id={CHECKOUT_SESSION_ID}
```

`field-kit/thanks/thanks.js` shows a download button only for an HTTPS link
on a known file host (Google Drive/Docs, Dropbox, OneDrive/SharePoint).
Anything else shows "email me your receipt". The page sends no referrer,
removes the query from the address bar, and keeps the link in that tab's
sessionStorage so a reload still works. `session_id` only shows as a short
order reference for support emails.

What this does and doesn't protect: the file link isn't in this public repo,
and a non-buyer can't find it. A buyer *can* forward it. That's acceptable for
a low-priced kit, and the licence asks them not to. If it leaks, make a new share
link and update the redirect in Stripe. No code change or push is needed.

## Turn it on (Dave)

1. Create the product with the provider, upload the kit files there (not to the
   repo), and set the price, tax and refund settings.
2. Done 2026-11-01: the delivery, statement descriptor, refund and licence
   text is final and the DRAFT markers are gone.
3. Replace the `url` placeholder in `js/sbd-launch-config.js` with the Payment
   Link (or paste another provider's block below), and set `priceLabel` to the
   Stripe price (for example `'$12'`):

| Provider | Paste | Link to copy | Modes |
|---|---|---|---|
| Gumroad | `checkout: { provider: 'gumroad', url: 'https://YOU.gumroad.com/l/PRODUCT', mode: 'link' }` | Product → Share → product URL | `link` opens Gumroad in a new tab. `overlay` loads `https://gumroad.com/js/gumroad.js` and adds `gumroad-button` |
| Lemon Squeezy | `checkout: { provider: 'lemonsqueezy', url: 'https://STORE.lemonsqueezy.com/checkout/buy/VARIANT', mode: 'link' }` | Product → Share → checkout URL | `link` opens hosted checkout. `overlay` loads `https://app.lemonsqueezy.com/js/lemon.js`, adds `lemonsqueezy-button` and `?embed=1` |
| Stripe Payment Links | `checkout: { provider: 'stripe', url: 'https://buy.stripe.com/XXXX', mode: 'link' }` | Payment Links → copy link | `link` only (an `overlay` setting falls back to the link). Payment Links have no overlay; Stripe's Buy Button would need `js.stripe.com`, which isn't wired |

**Link mode works with the current CSP** (it's a plain navigation).

**Overlay mode needs a CSP change** on `field-kit/index.html`. Without it, the
script is blocked and the button still works as a link (checked by the probe).
Replace the CSP `content` with the matching line:

- Gumroad:
  `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' https://gumroad.com; connect-src 'self' https://gumroad.com; frame-src https://gumroad.com https://*.gumroad.com; img-src 'self' data: https://*.gumroad.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'`
- Lemon Squeezy:
  `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' https://app.lemonsqueezy.com; frame-src https://*.lemonsqueezy.com; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'`

Verify the overlay in a real browser after changing the CSP. Providers
occasionally change the hosts their overlay needs.

4. Decide whether the page stays `noindex`. At launch, remove `noindex,nofollow`,
   add `field-kit/` to `STATIC_PAGES` in `scripts/gen_sitemap.py`, regenerate the
   sitemaps, and lower the `unlisted` count in `scripts/verify_indexing_policy.js`
   by one.
5. Test: `npm run probe:field-kit` (mock checks), then one real test purchase
   (Stripe test mode) from a phone. Confirm the redirect lands on
   `field-kit/thanks/` with a working download button, the receipt email
   arrives, the statement descriptor is right, and the refund path works.
6. CHANGELOG entry.

## Events

`kit_click` with `placement` (`field-kit`) and `provider`, sent to the
no-op dispatcher (analytics OFF).
