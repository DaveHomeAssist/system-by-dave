/* Shared FMP chrome for static Pages.
   - Wire Light/Dark/Auto selects to window.fmpTheme (theme.js)
   - Upgrade legacy theme toggle buttons to a select
   - Ensure av-theme + fonts (+ house-tokens on house-family pages) are linked
   - Point backfocus AV Suite links at /fmp/
*/
(() => {
  const ensureStylesheet = (href) => {
    const bare = href.split('?')[0];
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => {
      const h = l.getAttribute('href') || '';
      return h === href || h === bare || h.includes(bare);
    })) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const path = location.pathname.replace(/\/+/g, '/');
  const inFmp = path === '/fmp' || path.startsWith('/fmp/');
  const inHouseFamily = /\/fmp\/(house|gear|build|ptz)(\/|$)/.test(path);
  const inBackfocus = /\/backfocus(\/|$)/.test(path);

  if (inFmp || inBackfocus) {
    ensureStylesheet('/css/fonts.css');
    ensureStylesheet('/css/av-theme.css');
    ensureStylesheet('/fmp/chrome.css');
  }
  if (inHouseFamily) ensureStylesheet('/fmp/house/house-tokens.css');

  const bindSelect = (el) => {
    if (!el || el.dataset.fmpThemeBound === '1' || !window.fmpTheme) return;
    el.dataset.fmpThemeBound = '1';
    el.value = window.fmpTheme.preference;
    el.addEventListener('change', () => window.fmpTheme.set(el.value));
    document.addEventListener('fmp-theme', () => {
      if (document.activeElement !== el) el.value = window.fmpTheme.preference;
    });
  };

  const upgradeToggle = () => {
    const control = document.querySelector('#theme, [data-theme-toggle], #themeBtn');
    if (!control) return;
    if (control.tagName === 'SELECT') {
      bindSelect(control);
      return;
    }
    const label = document.createElement('label');
    label.className = 'theme-label';
    label.innerHTML = '<span class="sr-only">Theme</span>';
    const select = document.createElement('select');
    select.id = 'theme';
    select.setAttribute('data-fmp-theme', '');
    select.setAttribute('aria-label', 'Theme');
    select.innerHTML = '<option value="light">Light</option><option value="dark">Dark</option><option value="auto">Auto</option>';
    label.appendChild(select);
    control.replaceWith(label);
    bindSelect(select);
  };

  const fixBackfocusNav = () => {
    if (!inBackfocus) return;
    document.querySelectorAll('a[href*="avbydave.com"], a[href*="av-suite"], a[href*="AV"]').forEach(a => {
      const t = (a.textContent || '').trim();
      const h = a.getAttribute('href') || '';
      if (/avbydave\.com|av-suite/i.test(h) || /av suite/i.test(t)) {
        a.href = '/fmp/';
        if (/av suite/i.test(t)) a.textContent = 'FMP Video Operations';
      }
    });
    document.querySelectorAll('.breadcrumb, nav.crumbs, [class*="breadcrumb"]').forEach(nav => {
      nav.innerHTML = nav.innerHTML
        .replace(/AV Suite/gi, 'FMP Video Operations')
        .replace(/avbydave\.com[^"'<\s]*/gi, '/fmp/');
    });
  };

  // Guide: neutralize mismatched @font-face brand names toward fonts.css stacks
  if (/\/fmp\/guide(\/|$)/.test(path)) {
    document.documentElement.dataset.fmpGuideFonts = '1';
  }

  const mount = () => {
    upgradeToggle();
    document.querySelectorAll('select#theme, select[data-fmp-theme]').forEach(bindSelect);
    fixBackfocusNav();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
