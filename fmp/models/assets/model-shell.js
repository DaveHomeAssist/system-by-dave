// Shared suite preference. These pages never connect to physical equipment.
(() => {
  'use strict';
  const select = document.querySelector('[data-model-theme]');
  const sync = () => { if (select) select.value = window.fmpTheme?.preference || 'light'; };
  select?.addEventListener('change', () => { window.fmpTheme?.set(select.value); sync(); });
  const switchPanel = name => {
    document.querySelectorAll('[data-model-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.modelTab === name)));
    document.querySelectorAll('[data-model-panel]').forEach(panel => { panel.hidden = panel.dataset.modelPanel !== name; });
  };
  document.querySelectorAll('[data-model-tab]').forEach(button => button.addEventListener('click', () => switchPanel(button.dataset.modelTab)));
  document.querySelector('#atem-press')?.addEventListener('click', () => switchPanel('practice'));
  sync();
  document.addEventListener('fmp-theme', sync);
})();
