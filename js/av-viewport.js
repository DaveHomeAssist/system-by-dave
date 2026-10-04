/* Opt-in viewport mechanics. Product adapters own panels; this module never writes documents. */
(() => {
  'use strict';
  function paginate(card, items, { units: supplied, label, hiddenClass = 'av-page-away', navClass = 'av-pages', beforeMeasure = () => {}, singlePageLabel = 'All controls' }) {
    const paging = document.createElement('nav'); paging.className = navClass;
    paging.setAttribute('aria-label', `${label} pages`);
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next';
    const status = document.createElement('output'); status.setAttribute('aria-live', 'polite');
    paging.append(previous, status, next); card.append(items, paging);
    let page = 0, pages = [], units = [];
    function show() {
      page = Math.max(0, Math.min(page, Math.max(0, pages.length - 1)));
      units.forEach(unit => unit.classList.toggle(hiddenClass, !pages[page]?.includes(unit)));
      previous.disabled = page === 0; next.disabled = page >= pages.length - 1;
      status.textContent = pages.length > 1 ? `${page + 1} / ${pages.length}` : singlePageLabel;
      card.dataset.pages = String(pages.length); card.dataset.page = String(page + 1);
    }
    function refresh() {
      if (matchMedia('print').matches || card.hidden || !card.checkVisibility()) return;
      units = typeof supplied === 'function' ? supplied() : supplied;
      units.forEach(unit => unit.classList.remove(hiddenClass));
      const available = items.clientHeight;
      beforeMeasure(available);
      const style = getComputedStyle(items);
      const gap = parseFloat(style.rowGap) || 0;
      const columns = style.gridTemplateColumns.split(' ').length;
      const visible = units.filter(unit => !unit.hidden && unit.checkVisibility());
      pages = []; let group = [], height = 0;
      for (let i = 0; i < visible.length; i += columns) {
        const row = visible.slice(i, i + columns);
        const rowHeight = Math.max(...row.map(unit => unit.getBoundingClientRect().height));
        if (group.length && height + rowHeight + gap > available) { pages.push(group); group = []; height = 0; }
        group.push(...row); height += rowHeight + (height ? gap : 0);
      }
      if (group.length) pages.push(group);
      const focused = pages.findIndex(group => group.some(unit => unit.contains(document.activeElement)));
      if (focused >= 0) page = focused;
      show();
    }
    previous.addEventListener('click', () => { previous.focus({ preventScroll:true }); page--; show(); });
    next.addEventListener('click', () => { next.focus({ preventScroll:true }); page++; show(); });
    let scheduled = 0;
    function schedule() { if (!scheduled) scheduled = requestAnimationFrame(() => { scheduled = 0; refresh(); }); }
    const resize = new ResizeObserver(schedule); resize.observe(items);
    const mutations = new MutationObserver(schedule); mutations.observe(items, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'data-open', 'data-sbd-suite-compact'] });
    return { refresh, destroy() { resize.disconnect(); mutations.disconnect(); cancelAnimationFrame(scheduled); }, reveal(element) { refresh(); const index = pages.findIndex(group => group.some(unit => unit.contains(element))); if (index >= 0) { page = index; show(); } } };
  }
  function tabs(nav, panels, { label, selectId = 'taskView', className = 'av-tabs', parameter = 'taskView', hash = false, onChange = () => {}, beforeChange = () => {}, onTarget = () => {}, additionalVisible = () => false }) {
    const list = document.createElement('div'); list.className = className;
    list.setAttribute('role', 'tablist'); list.setAttribute('aria-label', label);
    const select = document.createElement('select'); select.id = selectId; select.setAttribute('aria-label', `${label} view`);
    let active = 0;
    panels.forEach(({ node, name }, index) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.id = `${node.id}Tab`; tab.textContent = name;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', node.id);
      tab.addEventListener('click', () => activate(index, true)); list.append(tab);
      select.add(new Option(name, String(index)));
      node.setAttribute('role', 'tabpanel'); node.setAttribute('aria-labelledby', tab.id);
    });
    nav.replaceChildren(list, select);
    function activate(index, push = false) {
      beforeChange();
      active = Math.max(0, Math.min(panels.length - 1, index));
      panels.forEach(({ node }, i) => {
        node.hidden = i !== active && !additionalVisible(i, active);
        list.children[i].tabIndex = i === active ? 0 : -1;
        list.children[i].setAttribute('aria-selected', String(i === active));
      });
      select.value = String(active);
      if (push) {
        const url = new URL(location.href);
        if (hash) url.hash = panels[active].node.id; else url.searchParams.set(parameter, panels[active].node.id);
        history.pushState(null, '', url);
      }
      onChange(active);
    }
    function fromLocation() {
      let id = hash ? location.hash.slice(1) : new URL(location.href).searchParams.get(parameter) || location.hash.slice(1);
      try { id = decodeURIComponent(id || ''); } catch (_) { id = ''; }
      const target = document.getElementById(id);
      const index = panels.findIndex(({ node }) => node === target || node.contains(target));
      activate(index < 0 ? 0 : index);
      if (target) onTarget(target, index);
    }
    select.addEventListener('change', () => activate(Number(select.value), true));
    list.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : (active + (event.key === 'ArrowRight' ? 1 : -1) + panels.length) % panels.length;
      activate(index, true); list.children[index].focus();
    });
    window.addEventListener('popstate', fromLocation); window.addEventListener('hashchange', fromLocation);
    return { activate, fromLocation, refresh: () => activate(active) };
  }
  // Print complete field values, including long notes and table cells.
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.av-print-text').forEach(node => node.remove());
    document.querySelectorAll('textarea,select,input:not([type=file]):not([type=hidden]):not([type=checkbox]):not([type=radio])').forEach(node => {
      const output = document.createElement('pre'); output.className = 'av-print-text'; output.textContent = node.tagName === 'SELECT' ? node.selectedOptions[0]?.textContent || node.value : node.value; node.after(output);
    });
  });
  window.addEventListener('afterprint', () => document.querySelectorAll('.av-print-text').forEach(node => node.remove()));
  window.AVViewport = { paginate, tabs };
})();
