(function () {
  'use strict';

  var root = document.documentElement;
  var preference = window.matchMedia('(prefers-color-scheme: dark)');

  function syncPixelForge(dark) {
    if (root.getAttribute('data-av-tool') !== 'pixelforge') return;
    try {
      var key = 'PixelForge.prefs.v1';
      var raw = window.localStorage.getItem(key);
      var prefs = raw ? JSON.parse(raw) : {};
      prefs.uiPrefs = prefs.uiPrefs && typeof prefs.uiPrefs === 'object' ? prefs.uiPrefs : {};
      prefs.uiPrefs.darkMode = Boolean(dark);
      window.localStorage.setItem(key, JSON.stringify(prefs));
    } catch (error) {
      // The editor still uses its built-in light default when storage is unavailable.
    }
  }

  function apply(dark) {
    root.setAttribute('data-av-system-theme', dark ? 'dark' : 'light');
    syncPixelForge(dark);
  }

  apply(preference.matches);
  preference.addEventListener('change', function (event) {
    apply(event.matches);
    if (root.getAttribute('data-av-tool') === 'pixelforge') window.location.reload();
  });
}());
