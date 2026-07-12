/* Mobile table reflow helper for the AV data tools.
   Copies each table's <thead> header text onto the matching body cells as
   data-label, so the CSS card layout (css/responsive-tables.css, <=680px) can
   show "Label: value" pairs. Re-applies after the tools re-render their rows.
   Pure DOM read/write, no network, no eval. */
(function () {
  function labelTable(table) {
    var head = table.tHead && table.tHead.rows.length ? table.tHead.rows[0] : null;
    if (!head) return;
    if (!table.querySelector('caption')) {
      var caption = document.createElement('caption');
      var pageHeading = document.querySelector('h1');
      caption.textContent = table.getAttribute('aria-label')
        || table.getAttribute('data-caption')
        || ((pageHeading && pageHeading.textContent.trim()) || document.title.split(/[|—]/)[0].trim()) + ' data table';
      caption.className = 'sr-only';
      caption.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      table.insertBefore(caption, table.firstChild);
    }
    var labels = [];
    for (var i = 0; i < head.cells.length; i++) {
      if (!head.cells[i].hasAttribute('scope')) head.cells[i].setAttribute('scope', 'col');
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
    var tables = document.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) labelTable(tables[i]);
  }
  function init() {
    run();
    if (!window.MutationObserver) return;
    // childList/subtree only (not attributes) so scope/data-label updates cannot loop.
    new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
