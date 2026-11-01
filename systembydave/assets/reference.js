(() => {
  'use strict';
  const themeKey = 'davai.theme.v1';
  const scrollKey = 'davai.reading.v1:' + location.pathname;
  const main = document.querySelector('main');
  const toggle = document.querySelector('#davai-theme');
  const menu = document.querySelector('.layer-menu');
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  function theme(value) {
    document.documentElement.dataset.davaiTheme = value;
    toggle.textContent = value === 'dark' ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-label', 'Switch to ' + (value === 'dark' ? 'light' : 'dark') + ' mode');
  }
  theme(read(themeKey) === 'dark' ? 'dark' : 'light');
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const value = document.documentElement.dataset.davaiTheme === 'dark' ? 'light' : 'dark';
    theme(value); write(themeKey, value);
  });
  if (!location.hash) main.scrollTop = Math.max(0, Number(read(scrollKey)) || 0);
  addEventListener('pagehide', () => write(scrollKey, String(main.scrollTop)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false; menu.querySelector('summary').focus();
    }
  });
})();
