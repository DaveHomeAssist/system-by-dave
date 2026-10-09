/* AV by Dave landing: apply the saved theme before the stylesheet paints.
   The page ships dark in its HTML; only an explicit ?theme=light or a saved
   "light" choice (av-theme-mode.v1, shared with the AV tools) switches it.
   js/av-landing-alt.js owns the toggle after load. */
(function () {
  'use strict';
  var mode = 'dark';
  try {
    var requested = new URLSearchParams(window.location.search).get('theme');
    var saved = null;
    try { saved = window.localStorage.getItem('av-theme-mode.v1'); } catch (_) {}
    if (requested === 'light' || requested === 'dark') mode = requested;
    else if (saved === 'light') mode = 'light';
  } catch (_) {}
  document.documentElement.setAttribute('data-av-theme', mode);
  var color = document.getElementById('altThemeColor');
  if (color) color.setAttribute('content', mode === 'dark' ? '#0a0d14' : '#f4f6f8');
}());
