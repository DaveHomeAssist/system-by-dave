# Field Kit checkout

Status: **closed**. `field-kit/` is a noindex draft that isn't linked from
navigation or the sitemap. It shows "Price TBD" and a disabled "Checkout not
open yet" button. Paid kit files are **not** in this repository. Only the
blurred preview images in `field-kit/img/` are.

Code: `js/sbd-checkout.js` (validation), `field-kit/field-kit.js` (button),
config in `js/sbd-launch-config.js` (`fieldKit`).

## Safety interlock

Checkout opens only when **all three** of these are true:

1. `fieldKit.checkout` names a provider and an HTTPS link on that provider's own
   hosts. Anything else stays closed: another host, `http:`, a typo or an
   unknown provider.
2. Every Dave-approval block on `field-kit/index.html` (delivery, statement
   descriptor, refunds, licence; marked `data-dave-placeholder`) has been
   approved or replaced. Delete the `data-dave-placeholder` attribute with each
   one. While any remain, the button stays disabled and the console says how
   many are left.
3. `fieldKit.priceLabel` is a real price. `'Price TBD'`, an empty string or a
   `[DAVE: …]` placeholder keeps checkout closed and the page shows "Price TBD".

The demo itself (`demos/frame-sync.html`) doesn't carry a Field Kit block; link the
kit from its optional `checklistUrl` in `demos/config.js` once checkout is live.

## Chosen: Stripe Payment Links (2026-10-19)

The config ships `provider: 'stripe'` with marked placeholders,
`url: '[DAVE: Stripe Payment Link]'` and `priceLabel: '[DAVE: price, e.g. $19]'`,
so checkout stays closed. The four blocks on the page carry **DRAFT** wording for
Dave to approve, including `[STATEMENT DESCRIPTOR]`. Dave's click-steps live
outside the repo (`/workspace/launch/setup-stripe.md`).

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
2. Approve or edit the four DRAFT blocks (delivery, statement descriptor,
   refunds, licence), fill in `[STATEMENT DESCRIPTOR]`, and remove the
   `DRAFT, Dave …:` labels, the `kit-dave` class and the `data-dave-placeholder`
   attribute.
3. Replace the `url` placeholder in `js/sbd-launch-config.js` with the Payment
   Link (or paste another provider's block below), and set `priceLabel` to the
   Stripe price (for example `'$19'`):

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
