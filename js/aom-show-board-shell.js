/* View navigation and dialog focus for the retained standalone board. */
(() => {
  const shell = document.getElementById('aom-shell');
  const main = document.getElementById('aom-main');
  const sheet = document.getElementById('sheet');
  const nav = document.querySelector('.aom-views');
  const tabs = [...nav.querySelectorAll('[data-view]')];
  let opener = null;
  const positions = new Map();
  let selectedView = null;
  let openerKey = null;
  const keyOf = node => node?.id ? { id: node.id } : node?.dataset.focusKey ? { key: node.dataset.focusKey } : null;
  const resolve = key => key?.id ? document.getElementById(key.id) : key?.key
    ? [...document.querySelectorAll('[data-focus-key]')].find(node => node.dataset.focusKey === key.key) : null;
  nav.setAttribute('role', 'tablist');
  const wide = matchMedia('(min-width:2000px)');
  const orientation = () => nav.setAttribute('aria-orientation', wide.matches ? 'vertical' : 'horizontal');
  wide.addEventListener('change', orientation);
  orientation();
  function select(view, focus = false) {
    if (!tabs.some(tab => tab.dataset.view === view)) view = 'timeline';
    if (selectedView) {
      const current = document.getElementById('view-' + selectedView);
      const scroll = current.querySelector('.scroller') || current;
      positions.set(selectedView, [scroll.scrollLeft, scroll.scrollTop]);
    }
    tabs.forEach(tab => {
      const active = tab.dataset.view === view;
      const panel = document.getElementById('view-' + tab.dataset.view);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = !active;
      if (active && focus) tab.focus();
    });
    selectedView = view;
    const panel = document.getElementById('view-' + view);
    const scroll = panel.querySelector('.scroller') || panel;
    const position = positions.get(view);
    if (position) { scroll.scrollLeft = position[0]; scroll.scrollTop = position[1]; }
  }
  function fromURL() {
    if (location.hash === '#aom-main') return;
    select(location.hash.slice(1));
  }
  function navigate(tab) {
    const hash = '#' + tab.dataset.view;
    if (location.hash !== hash) history.pushState(null, '', hash);
    select(tab.dataset.view, true);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => navigate(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
      if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); navigate(tabs[next]); }
    });
  });
  addEventListener('popstate', fromURL);
  addEventListener('hashchange', fromURL);
  select(location.hash.slice(1));
  document.querySelector('.aom-skip').addEventListener('click', event => {
    event.preventDefault();
    main.focus();
  });
  const focusable = () => [...sheet.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')]
    .filter(node => !node.disabled && node.getClientRects().length);
  window.aomDialogOpened = () => {
    if (!shell.inert) {
      opener = document.activeElement;
      openerKey = keyOf(opener);
    }
    shell.inert = true;
    const title = sheet.querySelector('h2');
    if (title) { title.id = 'aom-dialog-title'; sheet.setAttribute('aria-labelledby', title.id); }
    sheet.querySelectorAll('.field').forEach(field => {
      const label = field.querySelector('label');
      const control = field.querySelector('input,select,textarea');
      if (label && control?.id) label.htmlFor = control.id;
    });
    const labels = { f_paste: 'Sign text', f_gear: 'Gear list, one item per line', f_iss: 'New issue' };
    for (const [id, label] of Object.entries(labels)) document.getElementById(id)?.setAttribute('aria-label', label);
    sheet.scrollTop = 0;
    queueMicrotask(() => { if (sheet.classList.contains('open')) (focusable()[0] || sheet).focus(); });
  };
  window.aomDialogClosed = () => {
    shell.inert = false;
    queueMicrotask(() => {
      if (sheet.classList.contains('open')) return;
      const target = opener?.isConnected ? opener : resolve(openerKey);
      (target || main).focus();
    });
  };
  sheet.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeSheet(); return; }
    if (event.key !== 'Tab') return;
    const controls = focusable();
    if (!controls.length) { event.preventDefault(); sheet.focus(); return; }
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet)) {
      event.preventDefault(); first.focus();
    }
  });
})();
