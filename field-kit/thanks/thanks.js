/* Field Kit download page (docs/launch/checkout.md).
   Stripe's after-payment redirect brings the buyer here with
     ?dl=<URL-encoded link to the kit files>&session_id={CHECKOUT_SESSION_ID}
   The file link lives only in Stripe's Payment Link settings, never in this
   public repository. This page knows only its SHA-256
   (fieldKit.download.sha256 in js/sbd-launch-config.js), so a made-up address
   cannot borrow the page: the download button and the "payment went through"
   line appear only for the link Dave registered. Any other link, and every
   link while no hash is registered, falls back to "email me". Nothing is
   stored or sent anywhere. */
(function () {
  'use strict';
  var HOSTS = /^(drive\.google\.com|docs\.google\.com|www\.dropbox\.com|dropbox\.com|dl\.dropboxusercontent\.com|onedrive\.live\.com|1drv\.ms|[a-z0-9-]+\.sharepoint\.com)$/i;
  var params = new URLSearchParams(location.search);
  var kit = (window.SBD_LAUNCH && window.SBD_LAUNCH.fieldKit) || {};
  var HASHES = [].concat((kit.download && kit.download.sha256) || []).map(function (hash) {
    return typeof hash === 'string' ? hash.trim().toLowerCase() : '';
  }).filter(function (hash) { return /^[0-9a-f]{64}$/.test(hash); });

  // An HTTPS link on a known file host, normalised; otherwise null.
  function fileLink(raw) {
    try {
      var url = new URL(String(raw || ''));
      if (url.protocol === 'https:' && HOSTS.test(url.hostname) && !url.username && !url.password) return url.toString();
    } catch (error) {}
    return null;
  }

  // Resolves true only when the link's SHA-256 is one Dave registered
  // (scripts/launch/field_kit_link_hash.mjs prints it).
  function registered(link) {
    if (!link || !HASHES.length || !window.crypto || !window.crypto.subtle || typeof TextEncoder !== 'function') return Promise.resolve(false);
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(link)).then(function (buffer) {
      var hex = Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
        return (byte < 16 ? '0' : '') + byte.toString(16);
      }).join('');
      return HASHES.indexOf(hex) >= 0;
    }, function () { return false; });
  }

  // The link is kept for this tab only, so a reload after the address bar is
  // cleaned (below) still shows the button. Cleared when the tab closes.
  var KEY = 'sbd-field-kit-dl';
  var PAID = 'sbd-field-kit-paid';
  var fromQuery = fileLink(params.get('dl'));
  var kept = null;
  var paidBefore = false;
  try {
    kept = fileLink(sessionStorage.getItem(KEY));
    paidBefore = sessionStorage.getItem(PAID) === '1';
  } catch (error) {}

  var ref = params.get('session_id') || '';
  var validRef = /^cs_(test_|live_)?[A-Za-z0-9]{8,}$/.test(ref);
  if (validRef) {
    var shortRef = ref.slice(-10);
    document.getElementById('ty-ref').textContent = '…' + shortRef;
    document.getElementById('ty-ref-line').hidden = false;
    var mail = document.getElementById('ty-mail');
    mail.href = 'mailto:avbydave@gmail.com?subject=' + encodeURIComponent('Field Kit download (order …' + shortRef + ')');
  }

  // Drop the query from the address bar so the link isn't copied, bookmarked
  // or screenshotted by accident. The button keeps working in this tab.
  if (window.history && history.replaceState && location.search) {
    try { history.replaceState(null, '', location.pathname); } catch (error) {}
  }

  // A link in the address is tried first; an unregistered one never hides a
  // registered link this tab already holds.
  registered(fromQuery).then(function (ok) {
    if (ok) return fromQuery;
    return registered(kept).then(function (stillOk) { return stillOk ? kept : null; });
  }).then(function (link) {
    if (!link) {
      try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(PAID); } catch (error) {}
      document.documentElement.setAttribute('data-kit-link', 'unregistered');
      return;
    }
    // Only say the payment went through when Stripe's redirect brought the
    // registered link together with a checkout session id (remembered for this
    // tab so a reload after the query is dropped still shows it). A direct
    // visit gets the neutral heading and the "email me" card.
    var paid = validRef || paidBefore;
    try {
      sessionStorage.setItem(KEY, link);
      if (paid) sessionStorage.setItem(PAID, '1');
    } catch (error) {}
    document.getElementById('ty-download').href = link;
    document.getElementById('ty-ready').hidden = false;
    document.getElementById('ty-missing').hidden = true;
    if (paid) {
      document.getElementById('ty-title').textContent = 'Thanks. Your Field Kit is ready.';
      document.getElementById('ty-paid').hidden = false;
    }
    document.documentElement.setAttribute('data-kit-link', 'registered');
  });
})();
