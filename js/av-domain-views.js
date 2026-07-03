/* Shared AV domain views.
   Progressive enhancement: reads the currently rendered table rows and builds
   operator-first cards without touching each tool's storage format. */
(function () {
  'use strict';

  var CONFIGS = {
    'signal-flow.html': {
      id: 'routeChainView',
      bodySelector: '#routeBody',
      insertBefore: '.workspace',
      eyebrow: 'Route chain',
      title: 'Signal Flow Route Chain',
      summary: 'Source, processor, destination, status, and backup path in one scan.',
      countLabel: 'visible routes',
      fields: ['route', 'system', 'source', 'format', 'connector', 'processor', 'destination', 'status', 'backup', 'notes'],
      empty: 'No visible routes to map. Clear filters or add a signal route.',
      card: signalFlowCard
    }
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function pageName() {
    var path = window.location.pathname.split('/').pop();
    return path || 'index.html';
  }

  function init() {
    var config = CONFIGS[pageName()];
    var body = config && document.querySelector(config.bodySelector);
    if (!config || !body) return;

    var view = ensureView(config);
    var scheduled = false;

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        render(config, body, view);
      });
    }

    render(config, body, view);
    document.addEventListener('input', function (event) {
      if (event.target && event.target.closest(config.bodySelector)) schedule();
    });
    document.addEventListener('change', function (event) {
      if (event.target && event.target.closest(config.bodySelector)) schedule();
    });
    view.addEventListener('click', function (event) {
      var card = event.target.closest('.av-domain-card[data-row-id]');
      var rowId;
      var row;
      if (!card) return;
      rowId = card.getAttribute('data-row-id');
      row = body.querySelector('tr[data-id="' + cssEscape(rowId) + '"]');
      if (!row) return;
      row.click();
      window.requestAnimationFrame(function () {
        var activeRow = body.querySelector('tr[data-id="' + cssEscape(rowId) + '"]');
        var focusTarget = activeRow && activeRow.querySelector('input, select, textarea, button');
        if (!activeRow) return;
        activeRow.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      });
      schedule();
    });

    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(body, { childList: true, subtree: true });
    }
  }

  function ensureView(config) {
    var existing = document.getElementById(config.id);
    var target;
    var view;
    if (existing) return existing;
    target = document.querySelector(config.insertBefore);
    view = document.createElement('section');
    view.id = config.id;
    view.className = 'panel av-domain-view';
    view.setAttribute('aria-label', config.title);
    view.innerHTML = [
      '<div class="av-domain-head">',
        '<div class="av-domain-copy">',
          '<p class="av-domain-eyebrow">' + escapeHtml(config.eyebrow) + '</p>',
          '<h2 class="av-domain-title">' + escapeHtml(config.title) + '</h2>',
          '<p class="av-domain-summary">' + escapeHtml(config.summary) + '</p>',
        '</div>',
        '<div class="av-domain-count" data-domain-count>0 ' + escapeHtml(config.countLabel) + '</div>',
      '</div>',
      '<div class="av-domain-deck" data-domain-deck></div>'
    ].join('');
    if (target && target.parentNode) target.parentNode.insertBefore(view, target);
    else document.querySelector('main').appendChild(view);
    return view;
  }

  function render(config, body, view) {
    var rows = Array.prototype.slice.call(body.querySelectorAll('tr[data-id]'));
    var deck = view.querySelector('[data-domain-deck]');
    var count = view.querySelector('[data-domain-count]');
    var data = rows.map(function (row) {
      return readRow(config, row);
    });

    count.textContent = data.length + ' ' + config.countLabel;
    deck.innerHTML = data.length ? data.map(function (row) {
      return config.card(row);
    }).join('') : '<div class="av-domain-empty">' + escapeHtml(config.empty) + '</div>';
  }

  function readRow(config, row) {
    var data = {
      id: row.getAttribute('data-id') || '',
      selected: row.classList.contains('selected')
    };
    config.fields.forEach(function (field) {
      var control = row.querySelector('[data-field="' + field + '"]');
      data[field] = control ? String(control.value || control.textContent || '').trim() : '';
    });
    return data;
  }

  function signalFlowCard(route) {
    var status = normalizeToken(route.status || 'pending');
    var system = route.system || 'system';
    var format = [route.format, route.connector].filter(Boolean).join(' / ') || 'Format open';
    var backup = route.backup ? 'Backup: ' + route.backup : 'No backup path assigned';
    var notes = route.notes || '';
    return [
      '<button class="av-domain-card is-' + escapeAttr(status) + (route.selected ? ' is-selected' : '') + '" type="button" data-row-id="' + escapeAttr(route.id) + '" aria-label="' + escapeAttr('Open route ' + (route.route || route.source || route.destination || 'row')) + '">',
        '<span class="av-domain-card-top">',
          '<span class="av-domain-kicker">' + escapeHtml(route.route || 'Route') + '</span>',
          '<span class="av-domain-badge">' + escapeHtml(titleCase(system)) + '</span>',
          '<span class="av-domain-status is-' + escapeAttr(status) + '">' + escapeHtml(titleCase(route.status || 'pending')) + '</span>',
        '</span>',
        '<span class="av-domain-chain">',
          chainNode('Source', route.source || 'Unassigned'),
          '<span class="av-domain-chain-hop" aria-hidden="true">to</span>',
          chainNode('Processor', route.processor || 'Direct'),
          '<span class="av-domain-chain-hop" aria-hidden="true">to</span>',
          chainNode('Destination', route.destination || 'Unassigned'),
        '</span>',
        '<span class="av-domain-meta">' + escapeHtml(format + ' | ' + backup) + '</span>',
        notes ? '<span class="av-domain-note">' + escapeHtml(notes) + '</span>' : '',
      '</button>'
    ].join('');
  }

  function chainNode(label, value) {
    return [
      '<span class="av-domain-chain-node">',
        '<span class="av-domain-chain-label">' + escapeHtml(label) + '</span>',
        '<strong>' + escapeHtml(value) + '</strong>',
      '</span>'
    ].join('');
  }

  function titleCase(value) {
    return String(value || '').replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function normalizeToken(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pending';
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value || '').replace(/"/g, '\\"');
  }

  ready(init);
})();
