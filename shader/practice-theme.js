// Apply the saved Shader Practice theme before first paint. Prep Light is the
// default; storage may be unavailable, in which case the default stands. With no
// practice theme saved yet, the FMP suite's shared choice (fmpTheme: light, dark
// or auto) decides, so the console opens looking like the pages that led here.
(function () {
  'use strict';
  var theme = 'light';
  try {
    var saved = window.localStorage.getItem('shader.practice.theme.v1') || window.localStorage.getItem('throwline.practice.theme.v1');
    if (!saved) {
      var suite = window.localStorage.getItem('fmpTheme');
      if (suite === 'auto' && window.matchMedia) saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      else saved = suite;
    }
    if (saved === 'dark') theme = 'dark';
  } catch (error) {
    theme = 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  // The console only renders when scripts run; without them the page shows
  // its simulation notice and escape links instead of an empty console.
  document.documentElement.setAttribute('data-js', '');
})();
