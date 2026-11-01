/* Static links are the source; JavaScript only filters and restores the directory. */
(function () {
  'use strict';
  var panel = document.getElementById('directoryPanel');
  var cards = Array.from(document.querySelectorAll('#toolsGrid .tool-card'));
  var buttons = Array.from(document.querySelectorAll('.chip-filter'));
  var select = document.getElementById('categorySelect');
  var count = document.getElementById('toolCount');
  var active = 'All';
  var ready = false;
  function key() { return 'sbd.tools.scroll.v1:' + location.pathname + ':' + active; }
  function save() {
    if (!ready) return;
    try { sessionStorage.setItem(key(), String(panel.scrollTop)); } catch (_) {}
  }
  function restore() {
    var value = 0;
    try { value = Number(sessionStorage.getItem(key())); } catch (_) {}
    panel.scrollTop = Number.isFinite(value) && value > 0 ? value : 0;
  }
  function fromHash() {
    return buttons.map(function (b) { return b.dataset.chip; }).find(function (name) {
      return '#' + name.toLowerCase() === location.hash.toLowerCase();
    }) || 'All';
  }
  function apply(next, updateURL) {
    save();
    active = next;
    if (updateURL) history.replaceState(null, '', location.pathname + location.search + (active === 'All' ? '' : '#' + active.toLowerCase()));
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.chip === active)); });
    select.value = active;
    var shown = 0;
    cards.forEach(function (card) {
      card.hidden = active !== 'All' && !card.dataset.chips.split(' ').includes(active);
      if (!card.hidden) shown++;
    });
    count.textContent = shown + ' / ' + cards.length + ' projects';
    document.getElementById('toolsEmpty').hidden = shown > 0;
    restore();
    ready = true;
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.chip, true); }); });
  select.addEventListener('change', function () { apply(select.value, true); });
  window.addEventListener('hashchange', function () {
    // Skip links and other document anchors must not reset a selected category.
    if (location.hash === '#main-content') return;
    apply(fromHash(), false);
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('pageshow', restore);
  document.documentElement.classList.add('tools-js');
  apply(fromHash(), false);
}());
