/* Field Kit draft page. Shows the configured price label (js/sbd-launch-config.js)
   and reports a page view to the no-op dispatcher (js/sbd-events.js). */
(function () {
  'use strict';
  var cfg = (window.SBD_LAUNCH && window.SBD_LAUNCH.fieldKit) || {};
  var price = document.getElementById('kit-price');
  if (price && cfg.priceLabel && cfg.priceLabel !== 'Price TBD') price.firstChild.nodeValue = cfg.priceLabel;
  if (window.SBDEvents) window.SBDEvents.track('page_view', { page: 'field-kit' });
})();
