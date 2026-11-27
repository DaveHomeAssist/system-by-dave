/* Launch configuration for the AV by Dave Sync & Signal Field Kit
   (docs/launch/README.md). Analytics stays off. Field Kit checkout is the
   checkoutOpen switch in the fieldKit block. Leaving a value empty keeps that
   feature in its safe fallback. Each feature turns on by changing only its
   block here; the page CSPs already allow the listed providers' form/checkout
   addresses. Before turning anything on, read docs/launch/email.md or
   docs/launch/checkout.md (privacy policy, CHANGELOG, test steps). */
window.SBD_LAUNCH = {
  // Analytics stays OFF (Dave's decision, 2026-10-18). null keeps
  // js/sbd-events.js a no-op; see docs/launch/analytics.md.
  analytics: { provider: null },

  // The demo's email ask lives in demos/config.js (emailFormAction); see
  // docs/launch/email.md.

  // Sync & Signal Field Kit checkout (docs/launch/checkout.md).
  // provider: null | 'gumroad' | 'lemonsqueezy' | 'stripe'
  // url: the product/checkout link from that provider (HTTPS, provider host).
  // mode: 'link' (opens checkout; works with the current CSP) or 'overlay'
  //       (Gumroad / Lemon Squeezy pop-up; needs the CSP line in checkout.md,
  //       and falls back to the link if the script is blocked).
  // Checkout stays closed until checkoutOpen is true AND provider and url
  // are both valid. checkoutOpen is the one line that opens checkout.
  fieldKit: {
    // Chosen: Stripe Payment Links (2026-10-19), on a SEPARATE AV by Dave Stripe
    // account (Dave, 2026-10-23), not the System by Dave one. The page names
    // the statement descriptor AVBYDAVE FIELD KIT. The Payment Link below is
    // the live $12 link. checkoutOpen is the switch (docs/launch/checkout.md):
    // true opens that link and lets publish index /field-kit/; false keeps
    // "Checkout opens soon", does not point the Buy button at the link, and
    // leaves the page noindex.
    checkoutOpen: true,
    checkout: { provider: 'stripe', url: 'https://buy.stripe.com/cNifZg4N98oy776fKgdEs00', mode: 'link' },
    // Price buyers see (Dave, 2026-10-30); the Stripe price must match it.
    // A [DAVE: …] placeholder, 'Price TBD' or '' shows "Price TBD" and keeps
    // checkout closed. A real price alone does not open checkout.
    priceLabel: '$12',
    // After-payment download page (field-kit/thanks/, docs/launch/checkout.md).
    // The share link to the kit files stays in Stripe's Payment Link settings;
    // only its SHA-256 goes here, printed by
    //   npm run hash:field-kit-link -- '<share link>'
    // The page shows the download button and the "payment went through" line
    // only for a link whose hash is listed. Empty keeps both off, so buyers
    // see "email me". List the old and new hash while replacing a link.
    download: { sha256: ['59c3aecec4eddf9db42a7287e199115558ccfcaea6c958436eb7986a069b2704'] }
  }
};
