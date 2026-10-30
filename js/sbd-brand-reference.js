/* Navigation preferences never modify the reference content or other app storage. */
(() => {
  const root = document.documentElement;
  const main = document.getElementById('brand-main');
  const nav = document.querySelector('.brand-tabs');
  const tabs = [...nav.querySelectorAll('a')];
  const sections = [...main.querySelectorAll(':scope > section')];
  const themeButton = document.getElementById('brand-theme');
  const key = 'sbd.brand-reference.v1';
  let prefs = {};
  try { prefs = JSON.parse(sessionStorage.getItem(key)) || {}; } catch {}
  if (typeof prefs !== 'object' || Array.isArray(prefs)) prefs = {};
  if (!prefs.scroll || typeof prefs.scroll !== 'object' || Array.isArray(prefs.scroll)) prefs.scroll = {};
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(prefs)); } catch {} };
  const theme = value => {
    prefs.theme = value === 'dark' ? 'dark' : 'light';
    root.dataset.theme = prefs.theme;
    themeButton.textContent = prefs.theme === 'dark' ? 'Light theme' : 'Dark theme';
    document.querySelector('meta[name="theme-color"]').content = prefs.theme === 'dark' ? '#1c1917' : '#f2ede6';
    save();
  };
  theme(prefs.theme);
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => theme(prefs.theme === 'dark' ? 'light' : 'dark'));
  nav.setAttribute('role', 'tablist');
  let active;
  const select = id => {
    if (!tabs.some(tab => tab.hash === `#${id}`)) id = 'logo';
    if (active) prefs.scroll[active] = main.scrollTop;
    active = id;
    for (const tab of tabs) {
      const selected = tab.hash === `#${id}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'brand-main');
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    main.setAttribute('role', 'tabpanel');
    main.setAttribute('aria-labelledby', `tab-${id}`);
    for (const section of sections) {
      if (id === 'all' || section.id === id) section.removeAttribute('hidden');
      else section.setAttribute('hidden', '');
    }
    main.scrollTop = Number.isFinite(prefs.scroll[id]) ? prefs.scroll[id] : 0;
    save();
  };
  const navigate = id => {
    history.pushState(null, '', `#${id}`);
    select(id);
  };
  for (const tab of tabs) {
    tab.addEventListener('click', event => { event.preventDefault(); navigate(tab.hash.slice(1)); });
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      navigate(tabs[next].hash.slice(1));
    });
  }
  addEventListener('hashchange', () => select(location.hash.slice(1)));
  addEventListener('pagehide', () => { prefs.scroll[active] = main.scrollTop; save(); });
  select(location.hash.slice(1));
})();
