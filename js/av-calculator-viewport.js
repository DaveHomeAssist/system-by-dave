/* Layout only. The calculator model and persisted values remain in av-calculator.js. */
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  'use strict';
  const root = document.documentElement;
  const main = document.getElementById('main-content');
  const cards = [...document.querySelectorAll('.calc-card'), document.querySelector('.summary-panel')];
  const names = ['Audio Delay', 'Projection', 'Record Storage', 'Power Load', 'Voltage Drop', 'SPL Distance', 'Operator Summary'];
  const contextDock = document.querySelector('[data-sbd-suite-dock]');
  contextDock?.querySelector('input')?.setAttribute('aria-label', 'Show readiness note');
  if (contextDock) {
    const card = document.createElement('section'); card.id = 'showContextCard'; card.className = 'calc-card calc-context';
    const heading = document.createElement('h2'); heading.className = 'card-head'; heading.textContent = 'Show context';
    card.append(heading, contextDock); main.append(card); cards.push(card); names.push('Show context');
  }
  const nav = document.querySelector('.calc-jump');
  const tabs = document.createElement('div');
  tabs.className = 'calc-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Calculator');
  const select = document.createElement('select');
  select.id = 'calculatorView';
  select.setAttribute('aria-label', 'Calculator view');
  const pagers = [];
  let active = 0;
  const wide = matchMedia('(min-width:2200px)');
  cards[6].id = 'summaryCard';
  nav.replaceChildren(tabs, select);
  document.querySelector('.hero').remove();
  document.querySelector('.grid').replaceWith(...cards.slice(0, 6));
  cards.forEach((card, index) => {
    const tab = document.createElement('button');
    tab.type = 'button'; tab.id = `${card.id}Tab`; tab.textContent = names[index];
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', card.id);
    tab.addEventListener('click', () => activate(index, true));
    tabs.append(tab);
    select.add(new Option(names[index], String(index)));
    card.setAttribute('role', 'tabpanel'); card.setAttribute('aria-labelledby', tab.id);
    const body = card.querySelector('.card-body');
    const results = card.querySelector('.result-grid');
    const hint = card.querySelector('.hint');
    if (results?.hasAttribute('aria-describedby')) card.setAttribute('aria-describedby', results.getAttribute('aria-describedby'));
    const units = index === 7
      ? [...contextDock.querySelectorAll('a,button,input,span')]
      : index === 6
      ? [document.getElementById('summaryOutput'), ...card.querySelector('.summary-actions').children, ...card.querySelectorAll(':scope > .hint')]
      : [...body.children, ...results.children, hint];
    const items = document.createElement('div'); items.className = 'calc-items';
    if (index === 7) items.append(contextDock); else items.append(...units);
    if (index === 6) card.querySelector('.summary-body').remove();
    else if (index !== 7) { body.remove(); results.remove(); }
    const paging = document.createElement('nav'); paging.className = 'calc-pages';
    paging.setAttribute('aria-label', `${names[index]} pages`);
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next';
    const status = document.createElement('output'); status.setAttribute('aria-live', 'polite');
    paging.append(previous, status, next); card.append(items, paging);
    let page = 0, pages = [];
    function show() {
      page = Math.min(page, Math.max(0, pages.length - 1));
      units.forEach(unit => unit.classList.toggle('calc-page-away', !pages[page]?.includes(unit)));
      previous.disabled = page === 0; next.disabled = page >= pages.length - 1;
      status.textContent = pages.length > 1 ? `${page + 1} / ${pages.length}` : 'Inputs and results';
      card.dataset.pages = String(pages.length); card.dataset.page = String(page + 1);
    }
    function refresh() {
      if (card.hidden) return;
      units.forEach(unit => unit.classList.remove('calc-page-away'));
      const available = items.clientHeight;
      if (index === 6) units[0].style.height = `${Math.min(400, available)}px`;
      const columns = getComputedStyle(items).gridTemplateColumns.split(' ').length;
      const visible = units.filter(unit => !unit.hidden && unit.checkVisibility());
      pages = []; let group = [], height = 0;
      for (let i = 0; i < visible.length; i += columns) {
        const row = visible.slice(i, i + columns);
        const rowHeight = Math.max(...row.map(unit => unit.getBoundingClientRect().height));
        if (group.length && height + rowHeight + 8 > available) { pages.push(group); group = []; height = 0; }
        group.push(...row); height += rowHeight + (height ? 8 : 0);
      }
      if (group.length) pages.push(group);
      const focused = pages.findIndex(group => group.some(unit => unit.contains(document.activeElement)));
      if (focused >= 0) page = focused;
      show();
    }
    previous.addEventListener('click', () => { page--; show(); });
    next.addEventListener('click', () => { page++; show(); });
    pagers[index] = { refresh };
    new ResizeObserver(refresh).observe(items);
    new MutationObserver(refresh).observe(items, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'data-open', 'data-sbd-suite-compact'] });
  });
  function activate(index, push = false) {
    active = index;
    cards.forEach((card, i) => {
      card.hidden = i !== index && !(wide.matches && i === 6);
      const tab = tabs.children[i]; tab.tabIndex = i === index ? 0 : -1;
      tab.setAttribute('aria-selected', String(i === index));
    });
    select.value = String(index);
    if (push) { const url = new URL(location.href); url.hash = cards[index].id; history.pushState(null, '', url); }
    pagers[index]?.refresh();
    if (wide.matches && index !== 6) pagers[6]?.refresh();
    if (index === 6 || wide.matches) summary.scrollTop = summaryScroll;
  }
  function fromLocation() {
    let hash = location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch (_) { /* Unknown hashes use the default view. */ }
    const target = document.getElementById(hash);
    const index = cards.findIndex(card => card === target || card.contains(target));
    activate(index < 0 ? 0 : index);
  }
  select.addEventListener('change', () => activate(Number(select.value), true));
  tabs.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : (active + (event.key === 'ArrowRight' ? 1 : -1) + cards.length) % cards.length;
    activate(next, true); tabs.children[next].focus();
  });
  wide.addEventListener('change', () => activate(active));
  window.addEventListener('popstate', fromLocation); window.addEventListener('hashchange', fromLocation);
  const summary = document.getElementById('summaryOutput');
  summary.dataset.web2Scroll = ''; summary.tabIndex = 0; summary.setAttribute('aria-label', 'Complete operator summary');
  const scrollKey = `av.viewport.scroll:${location.pathname}:summary`;
  let summaryScroll = 0;
  try { summaryScroll = Number(sessionStorage.getItem(scrollKey)) || 0; } catch (_) { /* View preference is optional. */ }
  summary.addEventListener('scroll', () => { if (!summary.checkVisibility()) return; summaryScroll = summary.scrollTop; try { sessionStorage.setItem(scrollKey, String(summary.scrollTop)); } catch (_) {} });
  root.dataset.calculatorViewport = 'ready';
  main.tabIndex = -1;
  fromLocation();
}, 0));
