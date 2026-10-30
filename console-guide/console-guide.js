/* Console Spec Guide: client-side search and filters over consoles.json.
   No storage, no tracking. Filters live in the query string so a view can be shared. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('cg-form'), q = $('cg-q'), brand = $('cg-brand'), size = $('cg-size'), sort = $('cg-sort');
  var legacy = $('cg-legacy'), wings = $('cg-wings'), body = $('cg-body'), table = $('cg-table');
  var status = $('cg-status'), empty = $('cg-empty'), results = $('cg-results');
  var rows = [];
  var NP = 'Not published';
  var TYPE = { console: 'Console', wing: 'Wing', rack: 'Rack unit', panel: 'Touch panel', software: 'Software' };

  function sizeOf(r) {
    if (r.widthMm == null) return 'x';
    return r.widthMm < 600 ? 's' : (r.widthMm < 1000 ? 'm' : 'l');
  }
  function text(r) {
    return [r.brand, r.model, r.type, TYPE[r.type], r.status, r.width, r.depth, r.height, r.weight, r.caseWeight, r.capacity, r.dmxPorts, r.notes]
      .filter(Boolean).join(' ').toLowerCase();
  }
  function el(tag, cls, content) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content != null) n.textContent = content;
    return n;
  }
  function cell(label, value, cls) {
    var td = el('td', cls);
    td.setAttribute('data-label', label);
    if (value == null || value === '') td.appendChild(el('span', 'cg-np', NP));
    else td.appendChild(document.createTextNode(value));
    return td;
  }
  function safeUrl(u) {
    try { var x = new URL(u); return x.protocol === 'https:' ? x.toString() : null; } catch (e) { return null; }
  }
  function render() {
    var terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var list = rows.filter(function (r) {
      if (brand.value && r.brand !== brand.value) return false;
      if (size.value && sizeOf(r) !== size.value) return false;
      if (!legacy.checked && r.status !== 'current') return false;
      if (!wings.checked && r.type !== 'console') return false;
      return terms.every(function (t) { return r._text.indexOf(t) !== -1; });
    });
    var key = sort.value;
    list.sort(function (a, b) {
      if (key === 'w' || key === 'kg') {
        var f = key === 'w' ? 'widthMm' : 'weightKg';
        var av = a[f] == null ? Infinity : a[f], bv = b[f] == null ? Infinity : b[f];
        if (av !== bv) return av - bv;
      }
      return a._order - b._order;
    });
    body.textContent = '';
    list.forEach(function (r) {
      var tr = el('tr');
      var head = el('td', 'cg-head');
      head.setAttribute('data-label', 'Console');
      head.appendChild(el('span', 'cg-meta', r.brand));
      head.appendChild(el('span', 'cg-model', r.model));
      var tags = el('span');
      tags.appendChild(el('span', 'cg-tag', TYPE[r.type] || r.type));
      if (r.status !== 'current') tags.appendChild(el('span', 'cg-tag', r.status));
      head.appendChild(el('br'));
      head.appendChild(tags);
      if (r.notes) head.appendChild(el('span', 'cg-note', r.notes));
      tr.appendChild(head);
      tr.appendChild(cell('Width', r.width));
      tr.appendChild(cell('Depth', r.depth));
      tr.appendChild(cell('Height', r.height));
      tr.appendChild(cell('Weight', r.weight));
      tr.appendChild(cell('In case', r.caseWeight));
      tr.appendChild(cell('Universes', r.capacity));
      tr.appendChild(cell('DMX ports', r.dmxPorts));
      var linkCell = el('td', 'cg-links');
      linkCell.setAttribute('data-label', 'Links');
      var links = el('span', 'cg-linkset');
      linkCell.appendChild(links);
      var prod = safeUrl(r.productUrl), src = safeUrl(r.source);
      if (prod) {
        var a = el('a', null, 'Photos and specs ↗');
        a.href = prod; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', 'Photos and specs for ' + r.brand + ' ' + r.model + ' on the manufacturer site (opens in a new tab)');
        links.appendChild(a);
      }
      if (src && src !== prod) {
        var s = el('a', null, 'Spec source ↗');
        s.href = src; s.target = '_blank'; s.rel = 'noopener noreferrer';
        s.setAttribute('aria-label', 'Spec source for ' + r.model + ' (opens in a new tab)');
        links.appendChild(s);
      }
      var extra = Object.keys(r.fieldSources || {});
      if (extra.length) {
        var fs = safeUrl(r.fieldSources[extra[0]]);
        if (fs) {
          var f = el('a', null, 'More sources ↗');
          f.href = fs; f.target = '_blank'; f.rel = 'noopener noreferrer';
          f.title = 'Also confirms: ' + extra.join(', ');
          f.setAttribute('aria-label', 'Second source for ' + r.model + ' ' + extra.join(', ') + ' (opens in a new tab)');
          links.appendChild(f);
        }
      }
      tr.appendChild(linkCell);
      body.appendChild(tr);
    });
    table.hidden = list.length === 0;
    empty.hidden = list.length !== 0;
    status.textContent = 'Showing ' + list.length + ' of ' + rows.length + ' consoles.';
    var params = new URLSearchParams();
    if (q.value.trim()) params.set('q', q.value.trim());
    if (brand.value) params.set('brand', brand.value);
    if (size.value) params.set('size', size.value);
    if (sort.value) params.set('sort', sort.value);
    if (!legacy.checked) params.set('legacy', '0');
    if (!wings.checked) params.set('wings', '0');
    var qs = params.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }
  function restore() {
    var p = new URLSearchParams(location.search);
    q.value = p.get('q') || '';
    if (p.get('brand')) brand.value = p.get('brand');
    if (/^[smlx]$/.test(p.get('size') || '')) size.value = p.get('size');
    if (/^(w|kg)$/.test(p.get('sort') || '')) sort.value = p.get('sort');
    legacy.checked = p.get('legacy') !== '0';
    wings.checked = p.get('wings') !== '0';
  }
  function reset() { setTimeout(function () { legacy.checked = true; wings.checked = true; render(); }, 0); }

  fetch('consoles.json', { credentials: 'same-origin' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (data) {
      rows = (data.consoles || []).map(function (r, i) { r._order = i; r._text = text(r); return r; });
      var brands = [];
      rows.forEach(function (r) { if (brands.indexOf(r.brand) === -1) brands.push(r.brand); });
      brands.forEach(function (b) { var o = el('option', null, b); o.value = b; brand.appendChild(o); });
      restore();
      render();
      results.classList.remove('cg-loading');
      ['input', 'change'].forEach(function (ev) { form.addEventListener(ev, render); });
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      form.addEventListener('reset', reset);
      $('cg-empty-reset').addEventListener('click', function () { form.reset(); });
    })
    .catch(function () {
      results.classList.remove('cg-loading');
      status.textContent = 'The console list could not load. Try again, or open consoles.json directly.';
    });
})();
