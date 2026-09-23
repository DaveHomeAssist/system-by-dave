(function () {
  'use strict';

  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const themeColor = document.getElementById('altThemeColor');
  const year = document.getElementById('y');
  const offlineStatus = document.getElementById('offlineStatus');
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('theme');
  let saved = null;
  try { saved = localStorage.getItem('av-theme-mode.v1'); } catch (_) {}
  let mode = requested === 'light' || requested === 'dark'
    ? requested
    : saved === 'dark' ? 'dark' : 'light';

  function paint() {
    root.setAttribute('data-av-theme', mode);
    toggle.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-label', 'Use ' + (mode === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.setAttribute('aria-pressed', String(mode === 'dark'));
    themeColor.setAttribute('content', mode === 'dark' ? '#0c1016' : '#eee8df');
  }

  function save() {
    try { localStorage.setItem('av-theme-mode.v1', mode); } catch (_) {}
  }

  paint();
  toggle.hidden = false;
  toggle.addEventListener('click', function () {
    mode = mode === 'dark' ? 'light' : 'dark';
    if (requested === 'light' || requested === 'dark') {
      const url = new URL(window.location.href);
      url.searchParams.delete('theme');
      history.replaceState(null, '', url);
    }
    paint();
    save();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'av-theme-mode.v1') {
      mode = event.newValue === 'dark' ? 'dark' : 'light';
      paint();
    }
  });
  year.textContent = String(new Date().getFullYear());

  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) {
    offlineStatus.textContent = 'Offline access unavailable in this browser.';
    return;
  }
  navigator.serviceWorker.register('av-suite-worker.js', { scope: './' }).then(function () {
    return navigator.serviceWorker.ready;
  }).then(function () {
    return caches.match(new URL('av-suite-landing2.html', location.href).href);
  }).then(function (cached) {
    offlineStatus.textContent = cached ? 'This landing is saved for offline use.' : 'Offline access is preparing.';
  }).catch(function () {
    offlineStatus.textContent = 'Offline access unavailable. Reconnect and reload.';
  });
})();
