const theme = document.getElementById('theme');
theme.value = document.documentElement.dataset.avTheme || 'system';
theme.addEventListener('change', () => {
  document.documentElement.dataset.avTheme = theme.value;
  try { localStorage.setItem('av-theme-mode.v1', theme.value); } catch { /* Theme still applies in this tab. */ }
});
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-panel]').forEach(item => item.setAttribute('aria-current', String(item === button ? 'page' : 'false')));
  document.querySelectorAll('.portal-panel').forEach(panel => { panel.hidden = panel.id !== button.dataset.panel; });
}));
document.documentElement.dataset.enhanced = 'true';
