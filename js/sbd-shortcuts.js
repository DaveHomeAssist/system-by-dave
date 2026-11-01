/* System by Dave / AV by Dave shared keyboard shortcuts.
   - "?" opens a help overlay listing the shortcuts for the current page.
   - "/" focuses the page's search box when the page has one and has not
     already handled "/" itself.
   - Esc closes the overlay and returns focus to where it was.
   Never fires while typing in an input, textarea, select or contenteditable,
   never fires with Ctrl, Cmd (Meta) or Alt held (those belong to the browser
   and OS), and skips any key the page already handled (defaultPrevented).
   Pages can add rows with window.SBDShortcuts.register([{keys:['N'], label:'Add'}]);
   elements carrying aria-keyshortcuts are listed automatically.
   Loaded with defer; no inline script, so it works under script-src 'self'. */
(function () {
  'use strict';
  if (window.SBDShortcuts) return;

  var isMac = /Mac|iPhone|iPad/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
  var MOD = isMac ? '\u2318' : 'Ctrl';

  // Shortcuts that already exist in each page's own code, documented here so
  // the overlay is accurate. Keys are matched against the end of the path, so
  // the same entry works on systembydave.com and avbydave.com.
  var PAGES = {
    'show-timer.html': [
      [['Space'], 'Start / pause'], [['R'], 'Reset'], [['F'], 'Stage view'],
      [['Esc'], 'Leave stage view'], [['\u2191'], 'Add 30 seconds'], [['\u2193'], 'Remove 30 seconds'],
      [['1'], 'Countdown'], [['2'], 'Count up'], [['3'], 'Clock']
    ],
    'cue-sheet.html': [
      [['N'], 'Add cue'], [['J'], 'Next cue'], [['K'], 'Previous cue'], [['G'], 'Take next cue'],
      [['L'], 'Go selected cue live'], [['D'], 'Mark selected done'], [['F'], 'Expand / collapse timeline'],
      [['Esc'], 'Collapse timeline'], [['Delete'], 'Delete selected cue']
    ],
    'stage-plot.html': [
      [['N'], 'Add item'], [['Delete'], 'Delete selected'], [['\u2190', '\u2191', '\u2192', '\u2193'], 'Nudge selected'],
      [[MOD, 'S'], 'Export JSON']
    ],
    'gear-reference.html': [
      [['/'], 'Search sections'], [['\u2190'], 'Previous section'], [['\u2192'], 'Next section'],
      [['Page Up'], 'Previous section'], [['Page Down'], 'Next section'], [['Home'], 'First section'], [['End'], 'Last section']
    ],
    'prompts/': [
      [['/'], 'Search'], [['J'], 'Next prompt'], [['K'], 'Previous prompt'], [['Enter'], 'Copy prompt'],
      [['C'], 'Copy prompt'], [['I'], 'Toggle image'], [['O'], 'More'], [['Shift', 'G'], 'Last prompt'],
      [[MOD, 'K'], 'Command palette']
    ],
    'prompt-browser.html': [[['/'], 'Search'], [['Esc'], 'Clear search (in the search box)']],
    'career-market.html': [
      [['/'], 'Search'], [['N'], 'New listing'], [['P'], 'Print'], [['1\u20136'], 'Switch section'], [['Esc'], 'Close drawer']
    ],
    'ontrack.html': [[['1\u20134'], 'Library / Sets / Debrief / Data']],
    'scorecard/': [[[MOD, 'Z'], 'Undo last play']],
    'fifa-pitch-crew/': [
      [['\u2190'], 'Lane left (or A)'], [['\u2192'], 'Lane right (or D)'], [['\u2191', '\u2193'], 'Move (or W / S)'],
      [['Esc'], 'Pause'], [['Space'], 'Skip show']
    ]
  };
  // Pages whose own help dialog already lists their shortcuts: "?" opens it.
  var NATIVE_HELP = { 'teleprompter.html': '#helpBtn' };

  var extra = [];
  var host, root, dialog, list, closeBtn, lastFocus = null;

  function pageKey(table) {
    var path = location.pathname.replace(/index\.html$/, '');
    var best = null;
    Object.keys(table).forEach(function (k) {
      if (path.slice(-k.length) === k && (!best || k.length > best.length)) best = k;
    });
    return best;
  }

  function typingTarget(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    var tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') return !/^(button|checkbox|radio|range|color|file|image|reset|submit)$/i.test(el.type || '');
    return false;
  }

  function deepActive() {
    var a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }

  function findSearch() {
    var sel = '[data-sbd-search], input[type="search"], [role="search"] input:not([type="hidden"])';
    var all = document.querySelectorAll(sel);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!el.disabled && el.getClientRects().length) return el;
    }
    return null;
  }

  function labelFor(el) {
    var t = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '';
    return t.replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  var CSS = [
    ':host{all:initial}',
    '.backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,8,12,.62);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.backdrop[hidden]{display:none}',
    '.card{width:min(560px,100%);max-height:min(80vh,720px);display:flex;flex-direction:column;background:#11151d;color:#eef1f6;border:1px solid #2b3342;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.5)}',
    'header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #232a37}',
    'h2{margin:0;font-size:16px;font-weight:650}',
    'button{font:inherit;color:inherit;background:#1c2330;border:1px solid #3a4456;border-radius:8px;padding:6px 12px;cursor:pointer}',
    'button:focus-visible,.body:focus-visible{outline:3px solid #f0a33b;outline-offset:2px}',
    '.body{overflow:auto;padding:6px 18px 16px}',
    'h3{margin:14px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#9aa6b8}',
    'dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;align-items:center}',
    'dt{white-space:nowrap}dd{margin:0;color:#d7dce5}',
    'kbd{display:inline-block;min-width:1.6em;padding:1px 6px;margin-right:3px;text-align:center;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;background:#1c2330;border:1px solid #3a4456;border-bottom-width:2px;border-radius:5px;color:#fff}',
    'p.note{margin:12px 0 0;color:#9aa6b8;font-size:12px}',
    '@media (prefers-color-scheme:light){.card{background:#fff;color:#141821;border-color:#d4d9e2}header{border-color:#e3e7ee}dd{color:#2b3240}h3,p.note{color:#5b6577}button,kbd{background:#f3f5f8;border-color:#c5ccd8;color:#141821}}',
    '@media (prefers-reduced-motion:no-preference){.card{animation:in .12s ease-out}@keyframes in{from{opacity:0;transform:translateY(6px)}}}'
  ].join('\n');

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    host = el('div', { id: 'sbd-shortcuts-host' });
    root = host.attachShadow({ mode: 'open' });
    var sheetDone = false;
    try {
      if ('adoptedStyleSheets' in root && typeof CSSStyleSheet === 'function') {
        var sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); root.adoptedStyleSheets = [sheet]; sheetDone = true;
      }
    } catch (e) { sheetDone = false; }
    if (!sheetDone) root.appendChild(el('style', null, CSS));
    dialog = el('div', { class: 'backdrop', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sbd-k-title' });
    dialog.hidden = true;
    var card = el('div', { class: 'card' });
    var head = el('header');
    head.appendChild(el('h2', { id: 'sbd-k-title' }, 'Keyboard shortcuts'));
    closeBtn = el('button', { type: 'button', 'aria-label': 'Close keyboard shortcuts' }, 'Close');
    head.appendChild(closeBtn);
    list = el('div', { class: 'body', tabindex: '0', role: 'region', 'aria-label': 'Shortcut list' });
    card.appendChild(head); card.appendChild(list); dialog.appendChild(card); root.appendChild(dialog);
    closeBtn.addEventListener('click', close);
    dialog.addEventListener('mousedown', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('keydown', onDialogKey);
    document.body.appendChild(host);
  }

  function section(title, rows) {
    if (!rows.length) return;
    list.appendChild(el('h3', null, title));
    var dl = el('dl');
    rows.forEach(function (r) {
      var dt = el('dt');
      r[0].forEach(function (k) { dt.appendChild(el('kbd', null, k)); });
      dl.appendChild(dt); dl.appendChild(el('dd', null, r[1]));
    });
    list.appendChild(dl);
  }

  function render() {
    list.textContent = '';
    var key = pageKey(PAGES);
    var rows = (key ? PAGES[key] : []).slice();
    extra.forEach(function (r) { rows.push([r.keys, r.label]); });
    var seen = {};
    rows.forEach(function (r) { seen[r[0].join('+').toLowerCase()] = true; });
    Array.prototype.forEach.call(document.querySelectorAll('[aria-keyshortcuts]'), function (n) {
      if (host.contains(n)) return;
      var ks = (n.getAttribute('aria-keyshortcuts') || '').split(/\s+/)[0];
      var label = labelFor(n);
      if (!ks || !label || seen[ks.toLowerCase()]) return;
      seen[ks.toLowerCase()] = true;
      rows.push([ks.replace(/Control/g, 'Ctrl').replace(/Meta/g, MOD).split('+'), label]);
    });
    section('This page', rows);
    var global = [[['?'], 'Show this list'], [['Esc'], 'Close this list']];
    if (findSearch()) global.splice(1, 0, [['/'], 'Jump to search']);
    section('Everywhere', global);
    list.appendChild(el('p', { class: 'note' }, 'Shortcuts are off while you type in a field. Ctrl, \u2318 and Alt combinations are left to your browser.'));
  }

  function open() {
    if (!host) build();
    render();
    lastFocus = deepActive();
    dialog.hidden = false;
    closeBtn.focus();
  }

  function close() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    var back = lastFocus; lastFocus = null;
    if (back && back.isConnected && typeof back.focus === 'function') back.focus();
  }

  function isOpen() { return !!dialog && !dialog.hidden; }

  function onDialogKey(e) {
    // Keep page shortcuts from firing behind the open overlay.
    e.stopPropagation();
    if (e.key === 'Escape' || (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey)) { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var items = [closeBtn, list];
      var i = items.indexOf(root.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  }

  function onKey(e) {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isOpen()) return;
    if (typingTarget(deepActive())) return;
    if (e.key === '?') {
      var nativeKey = pageKey(NATIVE_HELP);
      var nativeBtn = nativeKey && document.querySelector(NATIVE_HELP[nativeKey]);
      e.preventDefault();
      if (nativeBtn) nativeBtn.click(); else open();
    } else if (e.key === '/') {
      var s = findSearch();
      if (!s) return;
      e.preventDefault();
      s.focus();
      if (typeof s.select === 'function') s.select();
    }
  }

  // Window-level bubble listener runs after the page's own document handlers,
  // so a page that handles a key itself (and calls preventDefault) wins.
  window.addEventListener('keydown', onKey);

  window.SBDShortcuts = {
    open: open,
    close: close,
    isOpen: isOpen,
    register: function (rows) {
      (rows || []).forEach(function (r) { if (r && r.keys && r.label) extra.push({ keys: [].concat(r.keys), label: String(r.label) }); });
    }
  };
})();
