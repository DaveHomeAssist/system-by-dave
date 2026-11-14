// Drops a trailing "index.html" from the address so the home page has one
// canonical URL. Loaded synchronously in <head> (it used to be an inline
// script) so the meta CSP can disallow inline scripts.
(function () {
  if (window.location.pathname.endsWith('/index.html')) {
    var p = window.location.pathname.replace(/index\.html$/, '');
    window.location.replace(window.location.origin + p + window.location.search + window.location.hash);
  }
})();
