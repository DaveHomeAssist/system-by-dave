# Field Kit checkout

Status: **checkout open**. `fieldKit.checkoutOpen` is `true` in `js/sbd-launch-config.js`. That one line is the switch: `false` keeps "Checkout opens soon", does not point the Buy button at the Payment Link, and leaves the published page noindex. `true` shows the $12 price and a Buy button for `https://buy.stripe.com/cNifZg4N98oy776fKgdEs00`. `field-kit/index.html` stays `noindex,nofollow` in this repo; while checkout is open the publish step marks the avbydave.com copy `index,follow` and lists `/field-kit/` (Search indexing, below). `fieldKit.download.sha256` lists the kit folder's hash, so `field-kit/thanks/` shows the download button for that link. Paid kit files are **not** in this repository. The card previews in `field-kit/img/` are the final page-1 renders.

The console's navigation and first-visit box on avbydave.com link to it (open
choice HR-D9 in `docs/next-steps/av-by-dave.json`).

Code: `js/sbd-checkout.js` (validation), `field-kit/field-kit.js` (button),
config in `js/sbd-launch-config.js` (`fieldKit`).

## Safety interlock

Checkout opens only when **all four** of these are true:

1. `fieldKit.checkoutOpen` is `true`. This is the switch. `false` keeps checkout
   closed even when the Payment Link below is already filled in.
2. `fieldKit.checkout` names a provider and an HTTPS link on that provider's own
   hosts. Anything else stays closed: another host, `http:`, a typo or an
   unknown provider.
3. No block on `field-kit/index.html` is marked `data-dave-placeholder`. The
   delivery, statement descriptor, refund and licence text was approved on
   2026-11-01 and the markers removed. Re-adding the attribute to any block
   closes checkout again, and the console says how many are left.
4. `fieldKit.priceLabel` is a real price. `'Price TBD'`, an empty string or a
   `[DAVE: …]` placeholder keeps checkout closed and the page shows "Price TBD".

The demo itself (`demos/frame-sync.html`) doesn't carry a Field Kit block; link the
kit from its `checklistUrl` in `demos/config.js` (set: the absolute avbydave.com/field-kit/ link, because the demos live on systembydave.com).

## Smoke test (after publish)

`node scripts/smoke_field_kit_checkout.mjs [base-url]` (default
`https://avbydave.com`; `npm run smoke:field-kit-checkout`). GET requests only, no
dependencies, never submits a payment. It checks that `/field-kit/` returns 200
and shows $12, that checkout is open only when `checkoutOpen` is `true` and
`fieldKit.checkout.url` matches `^https://buy\.stripe\.com/`, that the Payment
Link answers 200, and that `/field-kit/thanks/` loads with the launch config.
Once checkout is open it also fails while `fieldKit.download.sha256` is empty,
because buyers would get no download button. Exit 0 = checkout live, 2 = pages
fine but the switch is off or the Payment Link is still a placeholder, 1 = a
check failed.

## Chosen: Stripe Payment Links (2026-10-19)

The config ships `checkoutOpen: true`, `provider: 'stripe'`, `priceLabel: '$12'`
(Dave, 2026-10-30) and the Payment Link
`url: 'https://buy.stripe.com/cNifZg4N98oy776fKgdEs00'` (2026-11-01).
Set `checkoutOpen` to `false`, or put the `[DAVE: Stripe Payment Link]`
placeholder back, to close checkout.
**Account:** a separate AV by Dave Stripe account (Dave, 2026-10-23), not the System
by Dave one. Statement descriptor: **AVBYDAVE FIELD KIT** (18 characters; set it
in that account's Stripe settings so the card statement matches the page). The
Payment Link went in on 2026-11-01. Dave's click-steps live outside the repo
(`/workspace/launch/setup-stripe.md`).

## Search indexing

`field-kit/index.html` is committed `noindex,nofollow`. When
`fieldKit.checkoutOpen` is `true`, `js/sbd-launch-config.js` has a
`buy.stripe.com` Payment Link and a real price, and no `data-dave-placeholder`
block remains, the publish step (`scripts/stage_domain_sites.mjs` via
`scripts/field_kit_launch.mjs`) stages the page as `index,follow` and
`scripts/gen_sitemap.py --site avbydave` lists `/field-kit/` in the avbydave.com
sitemap. Set `checkoutOpen` to `false`, or put the placeholder back, and both
revert. `scripts/field_kit_launch.test.mjs` (in `npm run verify:domain-sites`)
keeps the JavaScript and Python rules in step.

Delivery: Stripe doesn't host files. The Payment Link's "After payment" →
"Don't show confirmation page" → redirect setting sends buyers to the noindex page
`field-kit/thanks/`, with this URL (set **only** in the Stripe Dashboard, never
committed):

```
https://avbydave.com/field-kit/thanks/?dl=<URL-encoded share link to the kit folder>&session_id={CHECKOUT_SESSION_ID}
```

`field-kit/thanks/thanks.js` shows the download button, and the "your payment
went through" line, only for the one link Dave registered: an HTTPS link on a
known file host (Google Drive/Docs, Dropbox, OneDrive/SharePoint) whose SHA-256
is listed in `fieldKit.download.sha256` in `js/sbd-launch-config.js`. Any other
link, and every link while that list is empty, shows
"email me your receipt" under the neutral heading. The page sends no referrer,
removes the query from the address bar, and keeps the link in that tab's
sessionStorage so a reload still works. `session_id` only shows as a short
order reference for support emails; on its own it never produces the payment
line.

Why the hash (2026-11-11): the address is public and anyone can write one. With
only the host list, a made-up address carrying someone else's Drive, Dropbox or
SharePoint link and any `cs_…` value produced an AV by Dave page that confirmed
a payment and offered that file. The hash lets the page recognise the real link
without the link being in this repository.

Register the link: `npm run hash:field-kit-link -- '<share link>'` prints the
hash (`pbpaste | npm run --silent hash:field-kit-link` keeps the link out of
shell history). Hash exactly the share link that goes into the Stripe redirect,
before URL-encoding it. Paste the hash into `download: { sha256: ['…'] }`.

What this does and doesn't protect: the file link isn't in this public repo,
a non-buyer can't find it, and the page can't be pointed at another file. A
buyer *can* forward the link. That's acceptable for a low-priced kit, and the
licence asks them not to. If it leaks, make a new share link, update the
redirect in Stripe, and register the new hash (list both hashes until the old
link is switched off, then remove the old one). That last step is a one-line
change and a push.

## Turn it on (Dave)

1. Create the product with the provider, upload the kit files there (not to the
   repo), and set the price, tax and refund settings.
2. Done 2026-11-01: the delivery, statement descriptor, refund and licence
   text is final and the DRAFT markers are gone.
3. Done 2026-11-01: `url` is `https://buy.stripe.com/cNifZg4N98oy776fKgdEs00` and
   `priceLabel` is `'$12'`. Another provider would paste its block below instead:

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

4. Done: the kit folder's hash is in `download.sha256`. The share link itself
   stays in the Stripe redirect (Delivery, above), not in this repo. Replacing
   the link is `npm run hash:field-kit-link` and a one-line hash change. Without
   a matching hash, buyers get "email me" instead of a download button.
5. Done by the indexing gate (Search indexing, above). The source stays
   `noindex,nofollow`; the publish step swaps the avbydave.com copy and lists
   `/field-kit/` only while checkout is live. Do not remove the source tag by hand.
6. Test: `npm run probe:field-kit` (mock checks), then one real test purchase
   (Stripe test mode) from a phone. Confirm the redirect lands on
   `field-kit/thanks/` with a working download button, the receipt email
   arrives, the statement descriptor is right, and the refund path works. Then
   `npm run smoke:field-kit-checkout`.
7. CHANGELOG entry.

## Events

`kit_click` with `placement` (`field-kit`) and `provider`, sent to the
no-op dispatcher (analytics OFF).
