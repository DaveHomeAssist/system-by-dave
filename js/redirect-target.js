/* Legacy aliases retain replacement navigation without permitting inline scripts. */
(function () {
  'use strict';
  var link = document.querySelector('[data-redirect-target]');
  if (!link) return;
  var target = new URL(link.getAttribute('href'), window.location.href);
  // This helper only owns local aliases, never external or scripted destinations.
  if (target.origin === window.location.origin && /^(https?:|file:)$/.test(target.protocol)) {
    window.location.replace(target.href);
  }
}());
