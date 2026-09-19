// One FMP theme preference, stored in the preshow walk's fmpTheme key. A first visit is light (WEB-1),
// and "auto" follows the system. A light or dark choice the rig or guide saved under its old key moves
// into fmpTheme once; the old keys are left in place. Load this in <head> so the first paint is right.
(() => {
  const KEY = 'fmpTheme';
  const LEGACY_KEYS = ['fmpRigTheme', 'fmpcam-theme'];
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  let preference = read(KEY);
  if (!['light', 'dark', 'auto'].includes(preference)) {
    const legacy = LEGACY_KEYS.map(read).find(value => value === 'light' || value === 'dark');
    preference = legacy || 'light';
    if (legacy) try { localStorage.setItem(KEY, legacy); } catch { /* Read again from the old key next visit. */ }
  }
  const resolved = () => preference === 'auto' ? (media?.matches ? 'dark' : 'light') : preference;
  const apply = () => {
    // data-theme drives the guide, rig and index styles; data-av-theme drives the shared AV palette.
    root.dataset.theme = resolved();
    root.dataset.avTheme = preference === 'auto' ? 'system' : preference;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.setAttribute('aria-pressed', String(resolved() === 'dark')));
    document.dispatchEvent(new CustomEvent('fmp-theme', { detail: { preference, theme: resolved() } }));
  };
  window.fmpTheme = {
    get preference() { return preference; },
    get theme() { return resolved(); },
    set(next) {
      preference = ['light', 'dark', 'auto'].includes(next) ? next : 'light';
      try { localStorage.setItem(KEY, preference); } catch { /* The choice still applies on this page. */ }
      apply();
    },
    toggle() { this.set(resolved() === 'dark' ? 'light' : 'dark'); }
  };
  media?.addEventListener?.('change', () => { if (preference === 'auto') apply(); });
  // Delegated, because the camera workspace re-renders its toolbar.
  document.addEventListener('click', event => { if (event.target.closest?.('[data-theme-toggle]')) window.fmpTheme.toggle(); });
  document.addEventListener('DOMContentLoaded', apply);
  apply();
})();

// Keep the published chrome in canonical source. Resolve beside this script so
// the raw source and the managed /fmp/ export use the same implementation.
(() => {
  if (document.querySelector('script[data-fmp-chrome]')) return;
  const script = document.createElement('script');
  script.src = new URL('chrome.js', document.currentScript.src).href;
  script.defer = true;
  script.dataset.fmpChrome = '1';
  document.head.appendChild(script);
})();
