/* Field Kit checkout resolver (docs/launch/checkout.md).
   Turns window.SBD_LAUNCH.fieldKit.checkout into a validated checkout link, or
   null while it isn't configured. Only HTTPS links on the chosen provider's own
   hosts are accepted, so a typo can't send buyers somewhere else. */
(function (global) {
  'use strict';

  var PROVIDERS = {
    gumroad: {
      label: 'Gumroad',
      host: /^([a-z0-9-]+\.)?gumroad\.com$/i,
      overlay: { script: 'https://gumroad.com/js/gumroad.js', className: 'gumroad-button' }
    },
    lemonsqueezy: {
      label: 'Lemon Squeezy',
      host: /^[a-z0-9-]+\.lemonsqueezy\.com$/i,
      overlay: { script: 'https://app.lemonsqueezy.com/js/lemon.js', className: 'lemonsqueezy-button', param: ['embed', '1'] }
    },
    stripe: {
      label: 'Stripe',
      host: /^buy\.stripe\.com$/i,
      overlay: null // Payment Links open Stripe's hosted page; there is no overlay.
    }
  };

  function resolve(checkout) {
    checkout = checkout || {};
    var p = PROVIDERS[checkout.provider];
    if (!p || typeof checkout.url !== 'string') return null;
    var url;
    try { url = new URL(checkout.url.trim()); } catch (error) { return null; }
    if (url.protocol !== 'https:' || !p.host.test(url.hostname) || url.username || url.password) return null;
    var overlay = checkout.mode === 'overlay' && p.overlay ? p.overlay : null;
    if (overlay && overlay.param) url.searchParams.set(overlay.param[0], overlay.param[1]);
    return { provider: checkout.provider, label: p.label, url: url.toString(), overlay: overlay };
  }

  global.SBDCheckout = { resolve: resolve, PROVIDERS: Object.keys(PROVIDERS) };
})(typeof window !== 'undefined' ? window : this);
