/* Shared System marketing preference; AV retains its own approved theme owner. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mode = 'light';
  try { if (localStorage.getItem('sbd-theme') === 'dark') mode = 'dark'; } catch (_) {}
  function apply(value) {
    root.dataset.theme = value;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = value === 'dark' ? '#0a0d14' : '#f4f6f8';
  }
  apply(mode);
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.sbd-site-header__inner');
    if (!nav) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'public-theme-toggle';
    function sync() {
      var dark = root.dataset.theme === 'dark';
      button.textContent = dark ? 'Light mode' : 'Dark mode';
      button.setAttribute('aria-label', 'Use ' + (dark ? 'light' : 'dark') + ' mode');
    }
    button.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('sbd-theme', next); } catch (_) {}
      sync();
    });
    sync();
    nav.appendChild(button);
  });
}());
