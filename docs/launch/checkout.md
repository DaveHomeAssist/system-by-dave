# Field Kit checkout

Status: **closed**. `field-kit/` is a noindex draft that isn't linked from
navigation or the sitemap. It shows "Price TBD" and a disabled "Checkout not
open yet" button. Paid kit files are **not** in this repository. Only the
blurred preview images in `field-kit/img/` are.

Code: `js/sbd-checkout.js` (validation), `field-kit/field-kit.js` (button),
config in `js/sbd-launch-config.js` (`fieldKit`).

## Safety interlock

Checkout opens only when **both** of these are true:

1. `fieldKit.checkout` names a provider and an HTTPS link on that provider's own
   hosts. Anything else stays closed: another host, `http:`, a typo or an
   unknown provider.
2. Every `[DAVE: …]` placeholder on `field-kit/index.html` (delivery, refunds,
   licence; marked `data-dave-placeholder`) has been replaced. Delete the
   `data-dave-placeholder` attribute with each one. While any remain, the
   button stays disabled and the console says how many are left.

The demo page's Field Kit block (`#fs-kit`) also appears only once checkout is
configured, and links to `/field-kit/`.

## Turn it on (Dave)

1. Create the product with the provider, upload the kit files there (not to the
   repo), and set the price, tax and refund settings.
2. Replace the three `[DAVE: …]` blocks with the real delivery, refund and
   licence text, and remove the `kit-dave` class and `data-dave-placeholder`
   attribute.
3. Paste **one** block into `js/sbd-launch-config.js`, replacing `checkout`, and
   set `priceLabel` (for example `'$19'`):

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
5. Test: `npm run probe:frame-sync` (mock checks), then one real test purchase
   (most providers have a test mode) from a phone. Confirm the download email
   arrives and the refund path works.
6. CHANGELOG entry.

## Events

`kit_click` with `placement` (`field-kit` or `demo`) and `provider`, sent to the
no-op dispatcher (analytics OFF).
