/* Worksheet layout adapter. Existing app handlers and records remain authoritative. */
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  'use strict';
  const root = document.documentElement;
  const app = document.querySelector('.app');
  const main = app.querySelector('main');
  const oldHeader = app.querySelector('.topbar');
  const title = oldHeader.querySelector('.brand-text strong')?.textContent.trim() || document.title.split('|')[0].trim();
  const handoff = root.dataset.avTool === 'show-handoff';
  const outputs = oldHeader.querySelector('.top-actions');
  const panels = [], pagers = [];
  const hero = main.querySelector('.hero');
  const records = main.querySelector('.main-panel');
  const controls = records?.querySelector('.toolbar');
  const selected = main.querySelector('.side-section');
  const others = [...main.querySelectorAll('.side-section')].slice(1);
  const context = document.querySelector('[data-sbd-suite-dock]');
  const header = document.createElement('header'); header.className = 'av-header';
  const heading = document.createElement('h1'); heading.textContent = title;
  const slot = document.querySelector('[data-sbd-nav-slot]');
  const theme = document.createElement('button'); theme.type = 'button'; theme.id = 'viewportTheme';
  function themeLabel() { theme.textContent = root.dataset.avTheme === 'dark' ? 'Light' : 'Dark'; theme.setAttribute('aria-label', `Switch to ${theme.textContent.toLowerCase()} mode`); }
  theme.addEventListener('click', () => {
    root.dataset.avTheme = root.dataset.avTheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('av-theme-mode.v1', root.dataset.avTheme); } catch (_) { /* Visible choice remains usable without storage. */ }
    themeLabel();
  });
  themeLabel(); header.append(heading, slot, theme);
  const oldHeading = document.querySelector('body > h1'); if (oldHeading) oldHeading.remove();
  const nav = document.createElement('nav'); nav.className = 'av-task-nav'; nav.setAttribute('aria-label', `${title} tasks`);
  function panel(id, name, nodes, long = false) {
    const node = document.createElement('section'); node.id = id; node.className = 'av-view';
    const items = document.createElement('div'); items.className = 'av-items';
    items.append(...nodes.filter(Boolean));
    if (long) node.classList.add('av-records-view');
    node.append(items); panels.push({ node, name }); main.append(node);
    return { node, items };
  }
  const pending = handoff ? [
    panel('metadataView', 'Setup', [main.querySelector('.meta-panel')]),
    panel('notesView', 'Notes', [main.querySelector('.workbench')]),
    panel('actionsView', 'Actions', [main.querySelector('.tables .panel')], true),
    panel('decisionsView', 'Decisions', [main.querySelector('.tables .panel')], true),
    panel('statusView', 'Status', [hero.querySelector('.status-panel')]),
    panel('outputsView', 'Outputs', [outputs, hero.querySelector('.hero-tools'), main.querySelector('.preview-panel')])
  ] : [
    panel('metadataView', 'Setup', [hero.querySelector('.show-panel')]),
    panel('recordsView', root.dataset.worksheetTask || 'Records', [records], true),
    panel('controlsView', 'Find / Add', [controls]),
    panel('selectedView', 'Selected', [selected]),
    panel('statusView', 'Status', [hero.querySelector('.status-panel')]),
    panel('outputsView', 'Outputs', [outputs, ...others])
  ];
  window.AVWorksheetExtraViews?.({ main, panel, pending });
  const domain = main.querySelector('.av-domain-view');
  if (domain) pending.push(panel('operatorView', 'Operator', [domain], true));
  if (context) {
    context.querySelector('input')?.setAttribute('aria-label', 'Show readiness note');
    pending.push(panel('contextView', 'Show context', [context]));
  }
  // Freeform notes and generated documents can contain arbitrarily long text.
  main.querySelectorAll('textarea').forEach(node => { node.dataset.web2Scroll = ''; if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', node.labels?.[0]?.textContent.trim() || 'Notes'); });
  if (handoff) { const note=document.getElementById('actionNote'); note.dataset.web2Scroll=''; note.tabIndex=0; note.setAttribute('role','region'); note.setAttribute('aria-label','Next action summary'); }
  const longPanels = [...main.querySelectorAll('.table-wrap, .av-domain-deck, .av-exception-list')];
  longPanels.forEach((node, i) => {
    node.dataset.web2Scroll = ''; node.tabIndex = 0; node.setAttribute('role', 'region');
    node.setAttribute('aria-label', `${title} records`);
    const key = `av.viewport.scroll:${location.pathname}:records:${i}`;
    let saved = { top: 0, left: 0 }; try { saved = JSON.parse(sessionStorage.getItem(key)) || saved; } catch (_) {}
    node.addEventListener('scroll', () => { if (!node.checkVisibility()) return; saved = { top: node.scrollTop, left: node.scrollLeft }; try { sessionStorage.setItem(key, JSON.stringify(saved)); } catch (_) {} });
    node.restoreViewportScroll = () => { node.scrollTop = saved.top; node.scrollLeft = saved.left; };
  });
  function units(node) {
    if (node.matches('[type=file],.av-print-text')) return [];
    if (node.matches('.table-wrap, .av-domain-deck, .av-exception-list, .field, .metric, .stat, .item-node, .selected-item, .empty-state, h2, h3, p, label, button, a, input, select, textarea, span, .av-shortcut')) return [node];
    if (node.querySelector(':scope > label') && node.querySelector(':scope > input, :scope > select, :scope > textarea')) { node.classList.add('av-field'); return [node]; }
    if (node.matches('dl')) {
      for (const dt of [...node.querySelectorAll(':scope > dt')]) {
        const row = document.createElement('div'); row.className = 'av-shortcut';
        const dd = dt.nextElementSibling; node.insertBefore(row, dt); row.append(dt); if (dd?.tagName === 'DD') row.append(dd);
      }
    }
    if (!node.children.length) return [node];
    node.classList.add('av-flow');
    if (node.hasAttribute('aria-label') && !node.hasAttribute('role') && node.tagName === 'DIV') node.setAttribute('role', 'group');
    return [...node.children].flatMap(units);
  }
  pending.forEach(({ node, items }, index) => {
    pagers[index] = AVViewport.paginate(node, items, {
      label: panels[index].name,
      units: () => [...items.children].flatMap(units),
      beforeMeasure: available => { items.querySelectorAll('.table-wrap, .av-domain-deck, .av-exception-list').forEach(table => {
        const empty = table.matches('.table-wrap') && !table.querySelector('tbody tr');
        if (table.hidden !== empty) table.hidden = empty;
        table.style.height = `${available}px`;
      }); }
    });
  });
  // All task-owned nodes have moved; empty structural wrappers have no state.
  hero.remove(); main.querySelector('.workspace')?.remove(); if (handoff) main.querySelector('.layout')?.remove(); oldHeader.replaceWith(header);
  main.prepend(nav); main.id = 'viewportMain'; main.tabIndex = -1;
  const skip = document.querySelector('.skip-link'); skip.href = '#viewportMain'; skip.dataset.web2Ignore = 'Offscreen skip link becomes visible on keyboard focus';
  const wide = matchMedia('(min-width:2200px)');
  root.dataset.avViewport = 'ready';
  const navigation = AVViewport.tabs(nav, panels, {
    label: title,
    onTarget: (target, index) => { if (index >= 0) pagers[index].reveal(target); },
    additionalVisible: (index, active) => !handoff && wide.matches && active === 1 && index === 3,
    onChange: index => { pagers[index].refresh(); if (!handoff && wide.matches && index === 1) pagers[3].refresh(); longPanels.forEach(node => { if (node.checkVisibility()) node.restoreViewportScroll(); }); }
  });
  domain?.addEventListener('click', event => { if (event.target.closest('.av-domain-card')) navigation.activate(1, true); });
  wide.addEventListener('change', navigation.refresh);
  navigation.fromLocation();
  const feedback = document.getElementById('hint');
  let lastError = '';
  if (feedback) new MutationObserver(() => {
    const message = feedback.classList.contains('error') ? feedback.textContent : '';
    if (!message || message === lastError) { lastError = message; return; }
    lastError = message;
    const index = panels.findIndex(({ node }) => node.contains(feedback));
    if (index >= 0) { navigation.activate(index); pagers[index].reveal(feedback); }
  }).observe(feedback, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class'] });
  // An add command already updates the app model. Reveal the newly created row afterward.
  const revealRecords = () => { if (handoff) return; navigation.activate(1, true); records.querySelector('tr.selected input, tr.selected select')?.focus({ preventScroll: true }); };
  document.querySelector('#addItemBtn, #addRoomBtn, #addCrewBtn')?.addEventListener('click', revealRecords);
  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if (event.key.toLowerCase() === 'n') setTimeout(revealRecords, 0);
  });
  // Keep the record caption's accessible name while documenting its intentional visual hiding.
  for (const caption of document.querySelectorAll('.sr-only')) caption.dataset.web2Ignore = 'Accessible table caption is intentionally visually hidden';
  const phone = matchMedia('(max-width:680px)');
  function tableHeaders() {
    document.querySelectorAll('.table-wrap thead, .table-wrap thead *').forEach(node => {
      if (phone.matches) node.dataset.web2Ignore = 'Responsive table header is visually hidden; each record cell displays its corresponding label';
      else delete node.dataset.web2Ignore;
    });
  }
  const measuring = document.createElement('canvas').getContext('2d');
  function fitRecordInputs(target) {
    const inputs = target?.matches('.table-wrap input:not([type=checkbox])') ? [target] : main.querySelectorAll('.table-wrap input:not([type=checkbox])');
    inputs.forEach(input => {
      const style = getComputedStyle(input); measuring.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const text = input.value || input.placeholder || '';
      const width = measuring.measureText(text).width + (parseFloat(style.letterSpacing) || 0) * text.length + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 36;
      input.style.setProperty('min-width', `${Math.ceil(width)}px`, 'important');
    });
  }
  main.addEventListener('input', event => { if (event.target.matches('.table-wrap input:not([type=checkbox])')) fitRecordInputs(event.target); });
  function nameRecordFields() {
    fitRecordInputs();
    main.querySelectorAll('textarea').forEach(node => { node.dataset.web2Scroll = ''; if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', node.labels?.[0]?.textContent.trim() || node.getAttribute('data-field') || 'Record notes'); });
    main.querySelectorAll('.sr-only').forEach(node => node.dataset.web2Ignore = 'Accessible label is intentionally visually hidden');
    main.querySelectorAll('table').forEach(table => {
      const names = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      table.querySelectorAll('tbody tr').forEach((row, index) => [...row.cells].forEach((cell, column) => cell.querySelectorAll('input,select,textarea').forEach(input => { if (!input.hasAttribute('aria-label')) input.setAttribute('aria-label', `${names[column] || 'Value'} for record ${index + 1}`); })));
    });
  }
  nameRecordFields();document.fonts.ready.then(nameRecordFields);
  main.querySelectorAll('.table-wrap').forEach(table => new MutationObserver(nameRecordFields).observe(table,{childList:true,subtree:true}));
  phone.addEventListener('change', tableHeaders); tableHeaders();
}, 0));
