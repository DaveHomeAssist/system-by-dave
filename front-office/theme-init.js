/* Keep the shared AV theme identity in markup while making a fresh visit light. */
(function () {
  var choice = 'light';
  try {
    var stored = localStorage.getItem('av-theme-mode.v1');
    if (stored === 'light' || stored === 'dark' || stored === 'system') choice = stored;
  } catch (error) { /* Light remains usable when storage is unavailable. */ }
  document.documentElement.setAttribute('data-av-theme', choice);
}());
