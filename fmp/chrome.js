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

  // A small, keyboard-native workspace menu connects the long-form references.
  // It uses ordinary links so Back, new tabs and no client router all keep working.
  const mountWorkspaceMenu = () => {
    if (!inFmp || document.body.classList.contains('portal') || document.querySelector('.workspace-menu')) return;
    const host = document.querySelector('header.top, .shell > header .header-actions');
    if (!host) return;
    const menu = document.createElement('details');
    menu.className = 'workspace-menu';
    const summary = document.createElement('summary');
    summary.textContent = 'Workspace';
    menu.appendChild(summary);
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'FMP workspace');
    const active = /\/house\//.test(path) ? '#house' : '#learn';
    for (const [hash, label] of [['#cameras', 'Operators'], ['#learn', 'Reference'], ['#models', '3D Models'], ['#house', 'House']]) {
      const link = document.createElement('a');
      link.href = `/fmp/${hash}`;
      link.textContent = label;
      if (hash === active) link.setAttribute('aria-current', 'location');
      nav.appendChild(link);
    }
    menu.appendChild(nav);
    host.appendChild(menu);
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') { menu.open = false; summary.focus(); }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  };

  const mount = () => {
    upgradeToggle();
    document.querySelectorAll('select#theme, select[data-fmp-theme]').forEach(bindSelect);
    fixBackfocusNav();
    mountWorkspaceMenu();
    if (document.documentElement.dataset.fmpGuideFonts) {
      document.querySelectorAll('.tbl-wrap table').forEach(table => {
        const headings = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim());
        if (!headings.length) return;
        table.classList.add('guide-responsive-table');
        // Explicit roles retain table semantics when narrow layouts use block rows.
        table.setAttribute('role', 'table');
        table.querySelectorAll('thead, tbody').forEach(group => group.setAttribute('role', 'rowgroup'));
        table.querySelectorAll('tr').forEach(row => row.setAttribute('role', 'row'));
        table.querySelectorAll('th').forEach(cell => cell.setAttribute('role', 'columnheader'));
        table.querySelectorAll('td').forEach(cell => cell.setAttribute('role', 'cell'));
        table.querySelectorAll('tbody tr').forEach(row => {
          [...row.children].forEach((cell, index) => { cell.dataset.columnLabel = headings[index] || ''; });
        });
      });
    }
    if (document.querySelector('main > .mast + .tabs')) document.documentElement.dataset.fmpReference = '1';
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
