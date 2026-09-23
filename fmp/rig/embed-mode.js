// Keep the shared rig readable inside Gear Reference without changing FMP's saved theme.
(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('embed') !== 'gear-reference') return;
  const root = document.documentElement;
  const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  const apply = () => { root.dataset.embed = 'gear-reference'; root.dataset.theme = theme; root.dataset.avTheme = theme; };
  document.addEventListener('fmp-theme', apply);
  apply();
})();
