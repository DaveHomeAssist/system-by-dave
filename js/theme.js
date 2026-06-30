/* System by Dave — light/dark theme toggle.
   The pre-paint boot (inline in <head>) sets data-theme before first paint.
   This file injects the sun/moon control into the nav and handles toggling.
   Tokens flip in css/style.css under [data-theme="dark"]. */
(function () {
  var KEY = 'sbd-theme';
  var root = document.documentElement;
  function cur() { return root.getAttribute('data-theme') || 'light'; }
  function set(t) { root.setAttribute('data-theme', t); }
  function icon(t) { return t === 'dark' ? '☀' : '☾'; } // ☀ when dark, ☾ when light
  function label(t) { return t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; }

  function injectButton() {
    var nav = document.querySelector('.nav-links');
    if (!nav || nav.querySelector('.theme-toggle')) return;
    var li = document.createElement('li');
    li.className = 'theme-toggle-item';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.textContent = icon(cur());
    btn.setAttribute('aria-label', label(cur()));
    btn.addEventListener('click', function () {
      var next = cur() === 'dark' ? 'light' : 'dark';
      set(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      btn.textContent = icon(next);
      btn.setAttribute('aria-label', label(next));
    });
    li.appendChild(btn);
    nav.appendChild(li);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();
})();
