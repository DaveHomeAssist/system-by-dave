/* Frozen icon switcher. Copy this file unchanged into another Frozen surface.
   No dependencies and no network calls. ?favicon= and localStorage frozenFavicon pick 01–09. */
(function () {
  var ICONS = [
    { id: '01', name: 'classic', label: 'Classic' },
    { id: '02', name: 'inverted', label: 'Inverted' },
    { id: '03', name: 'rose', label: 'Rose' },
    { id: '04', name: 'round', label: 'Round' },
    { id: '05', name: 'bold', label: 'Bold' },
    { id: '06', name: 'beads', label: 'Beads' },
    { id: '07', name: 'crystal', label: 'Crystal' },
    { id: '08', name: 'bloom', label: 'Bloom' },
    { id: '09', name: 'ice', label: 'Ice' }
  ];

  function resolve(value) {
    if (value == null) return null;
    var text = String(value).trim().toLowerCase().replace(/^favicon-/, '').replace(/\.svg$/, '');
    if (!text) return null;
    for (var i = 0; i < ICONS.length; i++) {
      var icon = ICONS[i];
      if (text === icon.id || text === icon.name || text === icon.id + '-' + icon.name) return icon;
      if (text === String(Number(icon.id))) return icon;
    }
    return null;
  }

  function filename(icon) {
    return 'favicon-' + icon.id + '-' + icon.name + '.svg';
  }

  function directoryOf(href) {
    var slash = href.lastIndexOf('/');
    return slash >= 0 ? href.slice(0, slash + 1) : '';
  }

  function framed() {
    try { return window.parent !== window; } catch (error) { return true; }
  }

  function readStored() {
    try { return resolve(localStorage.getItem('frozenFavicon')); } catch (error) { return null; }
  }

  function store(icon) {
    try { localStorage.setItem('frozenFavicon', icon.id); } catch (error) { /* Keep the icon for this view. */ }
  }

  function start() {
    var link = document.querySelector('link[data-frozen-favicon]') || document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var dir = directoryOf(href);
    var fromQuery = null;
    try { fromQuery = resolve(new URLSearchParams(location.search).get('favicon')); } catch (error) { fromQuery = null; }
    var icon = fromQuery || readStored() || ICONS[0];
    if (fromQuery) store(icon);
    link = apply(link, dir, icon);
    function picker() {
      if (framed()) return;
      buildPicker(document.querySelector('[data-frozen-favicon-mount]'), link, dir, icon);
    }
    if (document.body) picker();
    else document.addEventListener('DOMContentLoaded', picker);
  }

  function apply(link, dir, icon) {
    link.setAttribute('href', dir + filename(icon));
    var png = document.querySelector('link[data-frozen-favicon-png]');
    if (png) png.disabled = icon.id !== '01';
    // Replacing the node makes the browser fetch the chosen icon for the tab.
    if (link.parentNode) {
      var fresh = link.cloneNode(false);
      link.parentNode.replaceChild(fresh, link);
      return fresh;
    }
    return link;
  }

  function buildPicker(mount, link, dir, icon) {
    var picker = document.createElement('div');
    picker.className = 'frozen-favicon-picker' + (mount ? ' frozen-favicon-picker--inline' : '');
    picker.setAttribute('data-frozen-favicon-picker', '');
    var choices = document.createElement('div');
    choices.className = 'frozen-favicon-picker__choices';
    choices.id = 'frozen-favicon-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Frozen icons');
    var buttons = [];
    var toggle = null;
    if (!mount) {
      choices.hidden = true;
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'frozen-favicon-picker__toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', choices.id);
      toggle.setAttribute('aria-label', 'Choose Frozen icon');
      var mark = document.createElement('img');
      mark.alt = '';
      mark.width = 22;
      mark.height = 22;
      toggle.appendChild(mark);
      picker.appendChild(toggle);
      toggle.addEventListener('click', function () {
        var open = choices.hidden;
        choices.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
    function paint(next) {
      link = apply(link, dir, next);
      store(next);
      for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-pressed', String(buttons[i] === next.button));
      if (toggle) toggle.querySelector('img').setAttribute('src', dir + filename(next));
    }
    for (var i = 0; i < ICONS.length; i++) {
      (function (choice) {
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', choice.label);
        button.setAttribute('aria-pressed', 'false');
        var image = document.createElement('img');
        image.alt = '';
        image.width = 32;
        image.height = 32;
        image.src = dir + filename(choice);
        button.appendChild(image);
        button.addEventListener('click', function () { paint(choice); });
        choice.button = button;
        buttons.push(button);
        choices.appendChild(button);
      })(ICONS[i]);
    }
    picker.appendChild(choices);
    paint(icon);
    if (mount) mount.appendChild(picker);
    else document.body.appendChild(picker);
    document.addEventListener('click', function (event) {
      if (!toggle || choices.hidden || picker.contains(event.target)) return;
      choices.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !toggle || choices.hidden) return;
      if (!picker.contains(document.activeElement)) return;
      choices.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    });
  }

  var api = { icons: ICONS, resolve: resolve, filename: filename, start: start };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') start();
})();
