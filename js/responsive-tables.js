/* Mobile table reflow helper for the AV data tools.
   Copies each table's <thead> header text onto the matching body cells as
   data-label, so the CSS card layout (css/responsive-tables.css, <=680px) can
   show "Label: value" pairs. Re-applies after the tools re-render their rows.
   Pure DOM read/write, no network, no eval. */
(function () {
  function labelTable(table) {
    var head = table.tHead && table.tHead.rows.length ? table.tHead.rows[0] : null;
    if (!head) return;
    var labels = [];
    for (var i = 0; i < head.cells.length; i++) {
      labels.push((head.cells[i].textContent || '').replace(/\s+/g, ' ').trim());
    }
    for (var b = 0; b < table.tBodies.length; b++) {
      var rows = table.tBodies[b].rows;
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].cells;
        for (var c = 0; c < cells.length; c++) {
          var lab = labels[c] || '';
          if (cells[c].getAttribute('data-label') !== lab) cells[c].setAttribute('data-label', lab);
        }
      }
    }
  }
  function run() {
    var tables = document.querySelectorAll('.table-wrap table');
    for (var i = 0; i < tables.length; i++) labelTable(tables[i]);
  }
  function init() {
    run();
    if (!window.MutationObserver) return;
    var wraps = document.querySelectorAll('.table-wrap');
    // childList/subtree only (not attributes) so our own setAttribute can't loop.
    for (var i = 0; i < wraps.length; i++) {
      new MutationObserver(run).observe(wraps[i], { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
