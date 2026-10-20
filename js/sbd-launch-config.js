/* Launch configuration for the AV by Dave Sync & Signal Field Kit
   (docs/launch/README.md). Every external service is off until Dave picks it
   and creates the account. Leaving a value empty keeps that feature in its safe
   fallback. Each feature turns on by changing only its block here; the page
   CSPs already allow the listed providers' form/checkout addresses.
   Before turning anything on, read docs/launch/email.md or
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
  // Until provider and url are both valid, checkout stays disabled.
  fieldKit: {
    checkout: { provider: null, url: '', mode: 'link' },
    priceLabel: 'Price TBD'
  }
};
