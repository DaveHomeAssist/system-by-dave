// Shared browser preference for the workspace, controller, login and Monitor.
// Loaded before styles so a remembered dark choice does not flash light first.
(() => {
  if (window.FrozenTheme) return;
  const KEY = 'frozen.theme.v1';
  const modes = ['light', 'dark', 'system'];
  const valid = value => modes.includes(value);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'light', persisted = true, inherited = false;
  function read() {
    try {
      const saved = localStorage.getItem(KEY);
      if (valid(saved)) return saved;
      const legacy = [localStorage.getItem('wst.frozen.theme.v1'), localStorage.getItem('projctl.monitor.theme.v1'), localStorage.getItem('theme')];
      try { legacy.unshift(JSON.parse(localStorage.getItem('projctl.ui.v1') || 'null')?.theme); } catch { /* Another preference may still be valid. */ }
      return legacy.find(valid) || (legacy.includes('deep-freeze') ? 'dark' : 'light');
    } catch { persisted = false; return 'light'; }
  }
  const theme = () => mode === 'system' ? media.matches ? 'dark' : 'light' : mode;
  function apply() {
    document.documentElement.dataset.theme = theme();
    document.documentElement.dataset.themePreference = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme() === 'dark' ? '#102438' : '#edf5fa');
    window.dispatchEvent(new CustomEvent('frozen:themechange', { detail: { mode, theme: theme(), persisted } }));
  }
  function set(value, { save = true } = {}) {
    if (!valid(value)) return;
    mode = value; inherited = !save;
    if (save) { try { localStorage.setItem(KEY, mode); persisted = true; } catch { persisted = false; } }
    apply();
  }
  window.FrozenTheme = { get mode() { return mode; }, get theme() { return theme(); }, get persisted() { return persisted; }, set };
  mode = read(); apply();
  media.addEventListener('change', () => { if (mode === 'system') apply(); });
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { inherited = false; mode = read(); apply(); } });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const trigger = document.querySelector('#theme');
    let menu;
    if (trigger) {
      menu = document.createElement('div'); menu.id = 'frozen-theme-menu'; menu.className = 'frozen-theme-menu';
      menu.setAttribute('popover', 'auto'); menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', 'Theme preference');
      const heading = document.createElement('strong'); heading.textContent = 'Appearance'; menu.append(heading);
      for (const choice of modes) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.themeChoice = choice;
        button.textContent = choice === 'system' ? 'System' : choice === 'dark' ? 'Dark' : 'Light'; menu.append(button);
      }
      const note = document.createElement('small'); note.dataset.themeStorage = ''; menu.append(note);
      document.body.append(menu); trigger.setAttribute('popovertarget', menu.id); trigger.setAttribute('aria-expanded', 'false');
      menu.addEventListener('toggle', event => { trigger.setAttribute('aria-expanded', String(event.newState === 'open')); });
    }
    const refresh = () => {
      document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode)));
      if (trigger) { trigger.setAttribute('aria-label', `Appearance: ${mode}. Change theme`); trigger.title = `Appearance: ${mode}`; }
      const note = menu?.querySelector('[data-theme-storage]');
      if (note) note.textContent = inherited ? 'Following the workspace appearance for this view.' : persisted ? 'Remembered in this browser. System follows your device.' : 'For this visit only. Browser storage is unavailable.';
    };
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
      set(button.dataset.themeChoice); if (menu?.matches(':popover-open')) { menu.hidePopover(); trigger.focus(); }
    }));
    window.addEventListener('frozen:themechange', refresh); refresh();
  });
})();
