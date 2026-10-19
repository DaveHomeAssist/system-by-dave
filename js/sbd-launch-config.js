/* Launch configuration for the AV by Dave frame-sync demo and Field Kit
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

  // "Get the next demo" signup (docs/launch/email.md).
  // provider: null | 'buttondown' | 'kit' | 'mailerlite' | 'beehiiv' | 'custom'
  // id, by provider:
  //   buttondown  your Buttondown username          e.g. 'avbydave'
  //   kit         the Kit form id (digits)           e.g. '1234567'
  //   mailerlite  the form action URL from the HTML embed
  //               (https://assets.mailerlite.com/jsonp/<account>/forms/<form>/subscribe)
  //   beehiiv     your public subscribe page URL      e.g. 'https://avbydave.beehiiv.com/subscribe'
  //   custom      an HTTPS form endpoint that takes a POSTed `email` field
  // While provider is null (or id is invalid) the block shows a mailto link
  // to fallbackMailto and the site collects nothing.
  email: {
    provider: null,
    id: '',
    fallbackMailto: 'avbydave@gmail.com'
  },

  // Sync & Signal Field Kit checkout (docs/launch/checkout.md).
  // provider: null | 'gumroad' | 'lemonsqueezy' | 'stripe'
  // url: the product/checkout link from that provider (HTTPS, provider host).
  // mode: 'link' (opens checkout; works with the current CSP) or 'overlay'
  //       (Gumroad / Lemon Squeezy pop-up; needs the CSP line in checkout.md,
  //       and falls back to the link if the script is blocked).
  // Until provider and url are both valid, checkout stays disabled and the demo
  // page doesn't mention the kit.
  fieldKit: {
    checkout: { provider: null, url: '', mode: 'link' },
    priceLabel: 'Price TBD'
  }
};
