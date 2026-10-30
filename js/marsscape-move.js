/* Read-only recovery handoff. Never remove or rewrite the original save. */
(function () {
  'use strict';
  var KEY = 'marsscape_v1';
  var target = 'https://mixmash.games/mars/';
  var tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  var field = document.getElementById('code');
  var copy = document.getElementById('copy');
  var receipt = document.getElementById('copied');
  var status = document.getElementById('save-status');
  var cancel = document.getElementById('cancel-redirect');
  var showSave = document.getElementById('show-save');
  var timer = null;
  var source = null;
  var code = '';
  var revision = 0;
  function selectTab(tab) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach(function (tab, index) {
    tab.disabled = false;
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (event) {
      var next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); selectTab(tabs[next]); tabs[next].focus();
    });
  });
  function stopCountdown() { if (timer !== null) clearInterval(timer); timer = null; cancel.hidden = true; }
  cancel.addEventListener('click', function () { stopCountdown(); status.textContent = 'Automatic navigation stopped. Open the game when ready.'; });
  window.addEventListener('pagehide', stopCountdown);
  showSave.addEventListener('click', function () { selectTab(tabs[1]); field.focus(); });
  function read() {
    try { return { raw: localStorage.getItem(KEY), error: false }; }
    catch (_) { return { raw: null, error: true }; }
  }
  function prepare(value) {
    stopCountdown(); revision += 1;
    if (code && (value.error || !value.raw)) {
      status.textContent = 'Current save unavailable. Previous code kept.';
      receipt.textContent = 'Previous code preserved. Copy it manually.';
      copy.disabled = true;
      return;
    }
    source = value.raw; code = ''; field.value = ''; copy.disabled = true; showSave.hidden = true;
    if (value.error) {
      status.textContent = 'Saved data cannot be read. Allow storage and reload.';
      receipt.textContent = 'Storage is unavailable. No save was changed.';
      return;
    }
    if (source) {
      try { code = btoa(unescape(encodeURIComponent(source))); }
      catch (_) {
        field.value = source; showSave.hidden = false;
        status.textContent = 'Save encoding failed. Original text is in Save code.';
        receipt.textContent = 'Encoding failed. Original text, not import code.';
        return;
      }
      field.value = code; copy.disabled = false; showSave.hidden = false;
      status.textContent = 'A local save was found. Copy it before leaving.';
      receipt.textContent = 'Your original save stays in this browser.';
    } else {
      status.textContent = 'No local save found. Opening the new home in five seconds.';
      receipt.textContent = 'No local save was found in this browser.';
      cancel.hidden = false; cancel.textContent = 'Stay here (5)';
      var remaining = 5;
      timer = setInterval(function () {
        // A save arriving in another tab must cancel an empty-state redirect.
        var latest = read();
        if (latest.error || latest.raw) { prepare(latest); return; }
        remaining -= 1; cancel.textContent = 'Stay here (' + remaining + ')';
        if (remaining <= 0) { stopCountdown(); location.href = target; }
      }, 1000);
    }
  }
  function selectCode() { field.focus(); field.select(); field.setSelectionRange(0, field.value.length); }
  copy.addEventListener('click', async function () {
    var latest = read();
    if (latest.error || latest.raw !== source) {
      prepare(latest); receipt.textContent = latest.error ? 'Storage cannot be read. No copy was attempted.' : 'Save changed. Review and copy the current code.';
      return;
    }
    var copying = code;
    var copyRevision = revision;
    selectCode(); copy.disabled = true;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(copying);
      else if (!document.execCommand('copy')) throw new Error('Copy unavailable');
      receipt.textContent = revision === copyRevision ? 'Copied. Use Import Save at the new home.' : 'Earlier code copied. Review the current save.';
    } catch (_) {
      selectCode(); receipt.textContent = 'Copy failed. Copy selected code manually.';
    } finally { if (revision === copyRevision) copy.disabled = !code; }
  });
  window.addEventListener('storage', function (event) { if (event.key === KEY || event.key === null) prepare(read()); });
  prepare(read());
}());
