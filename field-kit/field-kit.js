/* Field Kit draft page (docs/launch/checkout.md).
   Checkout stays disabled until window.SBD_LAUNCH.fieldKit.checkout names a
   provider and a valid link on that provider's site (js/sbd-checkout.js), AND
   every "[DAVE: ...]" placeholder (delivery, refunds, licence) has been
   replaced. That interlock keeps the page from selling before the terms exist.
   Events go to the no-op dispatcher (js/sbd-events.js). */
(function () {
  'use strict';
  var cfg = (window.SBD_LAUNCH && window.SBD_LAUNCH.fieldKit) || {};
  var events = window.SBDEvents || { track: function () {} };
  var price = document.getElementById('kit-price');
  if (price && typeof cfg.priceLabel === 'string' && cfg.priceLabel && cfg.priceLabel !== 'Price TBD') {
    price.firstChild.nodeValue = cfg.priceLabel;
  }
  events.track('page_view', { page: 'field-kit' });

  var checkout = window.SBDCheckout ? window.SBDCheckout.resolve(cfg.checkout) : null;
  var placeholders = document.querySelectorAll('[data-dave-placeholder]').length;
  var buy = document.getElementById('kit-buy');
  var off = document.getElementById('kit-buy-disabled');
  var note = document.getElementById('kit-buy-note');
  if (!checkout || !buy) return;
  if (placeholders) {
    if (window.console) console.warn('Field Kit checkout is configured but ' + placeholders + ' [DAVE] placeholder(s) remain; checkout stays closed.');
    return;
  }
  buy.href = checkout.url;
  buy.hidden = false;
  if (off) off.hidden = true;
  if (note) note.textContent = 'Secure checkout by ' + checkout.label + '. You\u2019ll get the download link by email.';
  buy.addEventListener('click', function () { events.track('kit_click', { placement: 'field-kit', provider: checkout.provider }); });

  if (!checkout.overlay) {
    buy.target = '_blank';
    buy.rel = 'noopener noreferrer';
    return;
  }
  // Overlay: load the provider's script. If the CSP blocks it (see checkout.md),
  // the button stays a normal link to the same checkout.
  buy.classList.add(checkout.overlay.className);
  var script = document.createElement('script');
  script.src = checkout.overlay.script;
  script.async = true;
  script.onload = function () { if (typeof window.createLemonSqueezy === 'function') window.createLemonSqueezy(); };
  document.body.appendChild(script);
})();
