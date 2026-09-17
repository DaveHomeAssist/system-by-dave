// theme.js owns the FMP preference; the hub offers it as a select.
const theme = document.getElementById('theme');
theme.value = window.fmpTheme.preference;
theme.addEventListener('change', () => window.fmpTheme.set(theme.value));
// Tabs are hash links, so the open panel survives reload, can be shared and follows Back and Forward.
const tabs = [...document.querySelectorAll('.portal-tabs [data-panel]')];
const show = hash => {
  const current = tabs.find(tab => tab.hash === hash) || tabs[0];
  for (const tab of tabs) {
    tab.setAttribute('aria-current', tab === current ? 'page' : 'false');
    document.getElementById(tab.getAttribute('aria-controls')).hidden = tab !== current;
  }
};
// Switch on the click itself rather than waiting for hashchange; modified clicks open a new tab instead.
tabs.forEach(tab => tab.addEventListener('click', event => {
  if (!event.button && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) show(tab.hash);
}));
addEventListener('hashchange', () => show(location.hash));
show(location.hash);
document.documentElement.dataset.enhanced = 'true';
