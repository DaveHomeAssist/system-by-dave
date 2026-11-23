/* AV by Dave homepage (av-home/, published as the avbydave.com home page).
   Runs in the head so the saved theme and the opening section are set before
   the first paint. The theme choice is the AV tools' own av-theme-mode.v1, so
   the homepage and the console always agree; this page shows it as Gaffer
   (dark) or Call Sheet (light). Sections are real #addresses: the rail, Back
   and a pasted link all land on the same screen. */
(function () {
  'use strict';

  var THEME_KEY = 'av-theme-mode.v1';
  var TABS = ['overview', 'tools', 'console', 'brief'];
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function savedMode() {
    var value = null;
    try { value = window.localStorage.getItem(THEME_KEY); } catch (_) { /* storage blocked: the choice lasts this visit */ }
    /* The console also offers White and Black; here they read as light and dark. */
    if (value === 'light' || value === 'white') return 'light';
    if (value === 'system') return 'system';
    return 'dark';
  }

  var mode = savedMode();

  function resolved(value) {
    return value === 'system' ? (media && media.matches ? 'light' : 'dark') : value;
  }

  function applyTheme() {
    var theme = resolved(mode);
    root.setAttribute('data-theme', theme);
    var color = document.getElementById('themeColor');
    if (color) color.setAttribute('content', theme === 'light' ? '#f3f2ec' : '#0f0f0e');
  }

  function tabFromHash() {
    var id = window.location.hash.replace(/^#/, '');
    return TABS.indexOf(id) >= 0 ? id : null;
  }

  applyTheme();
  root.setAttribute('data-hp-tab', tabFromHash() || 'overview');
  root.classList.add('avd-locked');

  document.addEventListener('DOMContentLoaded', function () {
    var main = document.getElementById('main');
    var links = Array.prototype.slice.call(document.querySelectorAll('.hp-tabs .avd-tab'));
    var toggle = document.getElementById('themeToggle');
    var barAction = document.getElementById('barAction');
    var briefSend = document.getElementById('briefSend');

    function showTab(id, moveFocus) {
      root.setAttribute('data-hp-tab', id);
      links.forEach(function (link) {
        if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      /* On the Brief screen the phone action bar sends the brief; elsewhere it opens that screen. */
      if (barAction && briefSend) barAction.setAttribute('href', id === 'brief' ? briefSend.getAttribute('href') : '#brief');
      if (main) main.scrollTop = 0;
      window.scrollTo(0, 0);
      if (moveFocus) {
        var heading = document.getElementById(id + '-title');
        if (heading) heading.focus({ preventScroll: true });
      }
    }

    showTab(root.getAttribute('data-hp-tab') || 'overview', false);

    window.addEventListener('hashchange', function () {
      var id = tabFromHash();
      if (!id) return; /* the skip link and other fragments leave the section alone */
      var active = document.activeElement;
      var fromRail = active && active.classList && active.classList.contains('avd-tab');
      showTab(id, !fromRail);
    });

    if (toggle) {
      var buttons = Array.prototype.slice.call(toggle.querySelectorAll('[data-theme-mode]'));
      var syncToggle = function () {
        buttons.forEach(function (button) {
          button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-mode') === mode));
        });
      };
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          mode = button.getAttribute('data-theme-mode');
          try { window.localStorage.setItem(THEME_KEY, mode); } catch (_) { /* storage blocked */ }
          applyTheme();
          syncToggle();
        });
      });
      syncToggle();
      toggle.hidden = false;
    }

    if (media && media.addEventListener) {
      media.addEventListener('change', function () { if (mode === 'system') applyTheme(); });
    }

    /* Printing always uses Call Sheet. */
    var before = null;
    window.addEventListener('beforeprint', function () {
      before = root.getAttribute('data-theme');
      root.setAttribute('data-theme', 'light');
    });
    window.addEventListener('afterprint', function () {
      if (before) root.setAttribute('data-theme', before);
    });
  });
}());
