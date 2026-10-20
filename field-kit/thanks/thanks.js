/* Field Kit download page (docs/launch/checkout.md).
   Stripe's after-payment redirect brings the buyer here with
     ?dl=<URL-encoded link to the kit files>&session_id={CHECKOUT_SESSION_ID}
   The file link lives only in Stripe's Payment Link settings, never in this
   public repository. Only HTTPS links on known file hosts are shown; anything
   else falls back to "email me". Nothing is stored or sent anywhere. */
(function () {
  'use strict';
  var HOSTS = /^(drive\.google\.com|docs\.google\.com|www\.dropbox\.com|dropbox\.com|dl\.dropboxusercontent\.com|onedrive\.live\.com|1drv\.ms|[a-z0-9-]+\.sharepoint\.com)$/i;
  var params = new URLSearchParams(location.search);
  var dl = null;
  try {
    var raw = params.get('dl');
    if (raw) {
      var url = new URL(raw);
      if (url.protocol === 'https:' && HOSTS.test(url.hostname) && !url.username && !url.password) dl = url.toString();
    }
  } catch (error) { dl = null; }

  // Keep the link for this tab only, so a reload after the address bar is
  // cleaned (below) still shows the button. Cleared when the tab closes.
  var KEY = 'sbd-field-kit-dl';
  try {
    if (dl) sessionStorage.setItem(KEY, dl);
    else {
      var kept = sessionStorage.getItem(KEY);
      if (kept) { var k = new URL(kept); if (k.protocol === 'https:' && HOSTS.test(k.hostname)) dl = k.toString(); }
    }
  } catch (error) {}

  var ready = document.getElementById('ty-ready');
  var missing = document.getElementById('ty-missing');
  if (dl) {
    document.getElementById('ty-download').href = dl;
    ready.hidden = false;
    missing.hidden = true;
  }

  var ref = params.get('session_id') || '';
  if (/^cs_(test_|live_)?[A-Za-z0-9]{8,}$/.test(ref)) {
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
})();
