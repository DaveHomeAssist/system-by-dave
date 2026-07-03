(function () {
  var storageKey = 'sbd.cta.counts.v1';

  function readCounts() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeCounts(counts) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(counts));
    } catch (error) {}
  }

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-track-cta]');
    if (!target) return;
    var id = target.getAttribute('data-track-cta');
    if (!id) return;
    var counts = readCounts();
    counts[id] = (counts[id] || 0) + 1;
    counts.updatedAt = new Date().toISOString();
    writeCounts(counts);
  });

  window.SBD_CTA_METRICS = {
    key: storageKey,
    read: readCounts
  };
}());
