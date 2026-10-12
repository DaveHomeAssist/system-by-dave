/* Authored content remains a normal document without JS. Enhanced readers use
   CSS columns as pages, retaining the original nodes, IDs and link semantics. */
(function () {
  'use strict';
  var panels = Array.from(document.querySelectorAll('[data-public-panel]'));
  if (!panels.length) return;
  var site = document.body.dataset.publicSite;
  var header = document.querySelector('.sbd-site-header, .site-header');
  var shell = document.createElement('div');
  shell.className = 'public-shell';
  var tabs = document.createElement('div');
  tabs.className = 'public-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', site === 'profile' ? 'Profile sections' : 'Page sections');
  var stage = document.createElement('main');
  stage.className = 'public-stage';
  stage.id = 'public-content';
  stage.tabIndex = -1;
  var pager = document.createElement('nav');
  pager.className = 'public-pager';
  pager.setAttribute('aria-label', 'Content pages');
  var previous = document.createElement('button');
  previous.type = 'button'; previous.textContent = '← Previous';
  var status = document.createElement('span');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  var next = document.createElement('button');
  next.type = 'button'; next.textContent = 'Next →';
  pager.append(previous, status, next);
  var active = 0;
  var records = panels.map(function (panel, index) {
    var button = document.createElement('button');
    button.type = 'button'; button.id = 'public-tab-' + index;
    button.textContent = panel.dataset.publicPanel;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    tabs.appendChild(button);
    var frame = document.createElement('div'); frame.className = 'public-frame';
    var pages = document.createElement('div'); pages.className = 'public-pages';
    while (panel.firstChild) pages.appendChild(panel.firstChild);
    frame.appendChild(pages); panel.appendChild(frame);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    stage.appendChild(panel);
    button.addEventListener('click', function () { activate(index, true); });
    button.addEventListener('keydown', function (event) {
      var keys = { ArrowRight: (index + 1) % panels.length, ArrowLeft: (index + panels.length - 1) % panels.length, Home: 0, End: panels.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault(); records[keys[event.key]].button.focus(); activate(keys[event.key], true);
    });
    panel.addEventListener('beforematch', function () { activate(index, true); });
    // Browser find and native focus can scroll a hidden-overflow frame. Convert
    // that movement into the same explicit page state as the paging buttons.
    frame.addEventListener('scroll', function () {
      if (!frame.scrollLeft || index !== active) return;
      var delta = frame.scrollLeft;
      frame.scrollLeft = 0;
      records[index].page += Math.round(delta / frame.clientWidth);
      render();
    });
    return { panel: panel, button: button, frame: frame, pages: pages, page: 0, count: 1 };
  });
  shell.append(header, tabs, stage, pager);
  document.body.appendChild(shell);
  // Empty legacy wrappers must not participate in layout after enhancement.
  Array.from(document.body.children).forEach(function (node) {
    if (node !== shell && !node.matches('script, .skip, .skip-link, .sbd-skip-link')) node.hidden = true;
  });
  document.querySelectorAll('.skip, .skip-link, .sbd-skip-link').forEach(function (link) { link.href = '#public-content'; });
  document.documentElement.classList.add('public-enhanced');
  function writeHistory() {
    var url = new URL(location.href);
    url.hash = records[active].panel.id;
    history.pushState({ publicPanel: active, publicPage: records[active].page }, '', url);
  }
  function render() {
    var record = records[active];
    var width = record.frame.clientWidth;
    if (!width) return;
    record.count = Math.max(1, Math.ceil((record.pages.scrollWidth - 1) / width));
    record.page = Math.min(record.page, record.count - 1);
    record.pages.style.transform = 'translateX(' + (-record.page * width) + 'px)';
    previous.disabled = record.page === 0;
    next.disabled = record.page === record.count - 1;
    status.textContent = record.panel.dataset.publicPanel + ' · ' + (record.page + 1) + ' / ' + record.count;
  }
  function activate(index, push) {
    active = index;
    records.forEach(function (record, i) {
      if (i === active) record.panel.removeAttribute('hidden');
      else record.panel.setAttribute('hidden', 'until-found');
      record.button.setAttribute('aria-selected', String(i === active));
      record.button.tabIndex = i === active ? 0 : -1;
    });
    render();
    if (push) writeHistory();
  }
  function reveal(target) {
    var index = records.findIndex(function (record) { return record.panel.contains(target) || record.panel === target; });
    if (index < 0) return;
    if (index !== active) activate(index, false);
    var record = records[active];
    var rect = target.getClientRects()[0];
    if (!rect || target === record.panel) return;
    var x = rect.left - record.frame.getBoundingClientRect().left + record.page * record.frame.clientWidth;
    record.page = Math.max(0, Math.floor((x + 1) / record.frame.clientWidth));
    render();
  }
  function route() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = id && document.getElementById(id);
    if (!target) { activate(0, false); return; }
    reveal(target);
    if (history.state && Number.isInteger(history.state.publicPage) && history.state.publicPanel === active) {
      records[active].page = Math.max(0, history.state.publicPage); render();
    }
  }
  function turn(delta) {
    records[active].page += delta; render(); writeHistory();
  }
  previous.addEventListener('click', function () { turn(-1); });
  next.addEventListener('click', function () { turn(1); });
  stage.addEventListener('focusin', function (event) { reveal(event.target); });
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    var id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    history.pushState(null, '', url);
    reveal(target);
    if (target === stage) stage.focus();
  });
  document.addEventListener('selectionchange', function () {
    var selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.anchorNode) return;
    var target = selection.anchorNode.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode : selection.anchorNode.parentElement;
    if (target) reveal(target);
  });
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  new ResizeObserver(function () { render(); }).observe(stage);
  document.fonts.ready.then(render);
  window.addEventListener('load', function () { route(); render(); });
  activate(0, false); route();
}());
