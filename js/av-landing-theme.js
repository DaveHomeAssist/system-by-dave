/* AV by Dave landing: apply the saved theme before the stylesheet paints.
   The page ships dark in its HTML; only an explicit ?theme=light or a saved
   "light" choice (av-theme-mode.v1, shared with the AV tools) switches it.
   This helper also owns the generated not-found page toggle. */
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
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    function sync() {
      var dark = document.documentElement.getAttribute('data-av-theme') === 'dark';
      toggle.textContent = dark ? 'Light mode' : 'Dark mode';
      toggle.setAttribute('aria-label', dark ? 'Use light mode' : 'Use dark mode');
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.hidden = false;
    }
    toggle.addEventListener('click', function () {
      mode = document.documentElement.getAttribute('data-av-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-av-theme', mode);
      try { window.localStorage.setItem('av-theme-mode.v1', mode); } catch (_) {}
      if (color) color.setAttribute('content', mode === 'dark' ? '#0a0d14' : '#f4f6f8');
      sync();
    });
    sync();
  });
}());
