/* Field Kit draft page (docs/launch/checkout.md).
   Checkout stays disabled until window.SBD_LAUNCH.fieldKit.checkout names a
   provider and a valid link on that provider's site (js/sbd-checkout.js), AND
   every Dave-approval block (data-dave-placeholder: delivery, statement
   descriptor, refunds, licence) has been approved and its marker
   removed, AND fieldKit.priceLabel is a real price. That interlock keeps the page from selling before the terms exist.
   Events go to the no-op dispatcher (js/sbd-events.js). */
(function () {
  'use strict';
  var cfg = (window.SBD_LAUNCH && window.SBD_LAUNCH.fieldKit) || {};
  var events = window.SBDEvents || { track: function () {} };
  var price = document.getElementById('kit-price');
  var priceSet = typeof cfg.priceLabel === 'string' && cfg.priceLabel.trim() !== '' &&
    cfg.priceLabel !== 'Price TBD' && !/^\s*\[/.test(cfg.priceLabel);
  // The static page shows $12 (Dave, 2026-10-30) so it reads right without
  // JavaScript. A placeholder in the config still shows "Price TBD".
  if (price && priceSet) {
    price.firstChild.nodeValue = cfg.priceLabel;
    var small = price.querySelector('small');
    if (small) small.textContent = small.textContent.replace(/\s*Price not set yet\.?/, '');
  } else if (price) {
    price.firstChild.nodeValue = 'Price TBD';
    var note0 = price.querySelector('small');
    if (note0 && !/not set yet/.test(note0.textContent)) note0.textContent += ' Price not set yet.';
  }
  events.track('page_view', { page: 'field-kit' });

  var checkout = window.SBDCheckout ? window.SBDCheckout.resolve(cfg.checkout) : null;
  var placeholders = document.querySelectorAll('[data-dave-placeholder]').length;
  var buy = document.getElementById('kit-buy');
  var off = document.getElementById('kit-buy-disabled');
  var note = document.getElementById('kit-buy-note');
  if (!checkout || !buy) return;
  if (!priceSet) {
    if (window.console) console.warn('Field Kit checkout is configured but the price is still a placeholder; checkout stays closed.');
    return;
  }
  if (placeholders) {
    if (window.console) console.warn('Field Kit checkout is configured but ' + placeholders + ' [DAVE] placeholder(s) remain; checkout stays closed.');
    return;
  }
  buy.href = checkout.url;
  buy.hidden = false;
  if (off) off.hidden = true;
  if (note) note.textContent = 'Secure checkout by ' + checkout.label + '. Your download link appears right after payment.';
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
