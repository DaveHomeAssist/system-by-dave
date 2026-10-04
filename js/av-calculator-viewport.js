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
  const pagers = [];
  const wide = matchMedia('(min-width:2200px)');
  cards[6].id = 'summaryCard';
  document.querySelector('.hero').remove();
  document.querySelector('.grid').replaceWith(...cards.slice(0, 6));
  cards.forEach((card, index) => {
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
    pagers[index] = AVViewport.paginate(card, items, {
      units, label: names[index], hiddenClass: 'calc-page-away', navClass: 'calc-pages', singlePageLabel: 'Inputs and results',
      beforeMeasure: available => { if (index === 6) units[0].style.height = `${Math.min(400, available)}px`; }
    });
  });
  const summary = document.getElementById('summaryOutput');
  summary.dataset.web2Scroll = ''; summary.tabIndex = 0; summary.setAttribute('aria-label', 'Complete operator summary');
  const scrollKey = `av.viewport.scroll:${location.pathname}:summary`;
  let summaryScroll = 0;
  try { summaryScroll = Number(sessionStorage.getItem(scrollKey)) || 0; } catch (_) { /* View preference is optional. */ }
  summary.addEventListener('scroll', () => { if (!summary.checkVisibility()) return; summaryScroll = summary.scrollTop; try { sessionStorage.setItem(scrollKey, String(summary.scrollTop)); } catch (_) {} });
  root.dataset.calculatorViewport = 'ready';
  main.tabIndex = -1;
  const navigation = AVViewport.tabs(nav, cards.map((node, i) => ({ node, name: names[i] })), {
    label: 'Calculator', selectId: 'calculatorView', className: 'calc-tabs', hash: true,
    additionalVisible: i => wide.matches && i === 6,
    onChange: index => {
      pagers[index]?.refresh();
      if (wide.matches && index !== 6) pagers[6]?.refresh();
      if (index === 6 || wide.matches) summary.scrollTop = summaryScroll;
    }
  });
  wide.addEventListener('change', navigation.refresh);
  navigation.fromLocation();
}, 0));
