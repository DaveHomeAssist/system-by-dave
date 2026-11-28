(function () {
  'use strict';
  const theme = document.getElementById('agents-theme');
  const root = document.documentElement;
  let previousCard;

  function setTheme(value) {
    root.dataset.theme = value === 'dark' ? 'dark' : 'light';
    theme.textContent = root.dataset.theme === 'dark' ? 'Light theme' : 'Dark theme';
    document.querySelector('meta[name="theme-color"]').content =
      root.dataset.theme === 'dark' ? '#17191b' : '#f5f1e8';
  }
  try { setTheme(localStorage.getItem('sbd-theme')); } catch { setTheme('light'); }
  theme.hidden = false;
  theme.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    try { localStorage.setItem('sbd-theme', root.dataset.theme); } catch {}
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'sbd-theme' || event.key === null) setTheme(event.newValue);
  });

  function followHash() {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.classList.contains('agent-detail')) {
      previousCard = document.getElementById(target.id.slice(0, -'-details'.length));
      target.focus();
    } else if (target?.classList.contains('agent-card')) {
      target.focus();
    } else if (!location.hash && previousCard) {
      previousCard.focus();
    }
  }
  window.addEventListener('hashchange', followHash);
  followHash();
})();
