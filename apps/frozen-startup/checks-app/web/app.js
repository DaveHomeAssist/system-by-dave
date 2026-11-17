'use strict';
// Live view for the Frozen Startup check stream (frozen-startup.check-stream.v1).
// The host app calls window.frozenStartup.receive(event) for every JSON line.
// This page never fabricates results: every state shown comes from a received event.
(function () {
  const $ = s => document.querySelector(s);
  const LANES = {
    control: ['BenQ', 'Control', '#7894a6'], A: ['A', 'SL Portal', '#d754c8'], B: ['B', 'Top Portal', '#20b8c4'],
    C: ['C', 'Stage', '#c2b700'], D: ['D', 'SR Portal', '#56ad72']
  };
  const state = { run: null, checks: [], results: {}, displays: [], result: null, readiness: null, busy: false, unavailable: null, expiryTimer: null };

  function post(message) {
    try { window.webkit.messageHandlers.frozen.postMessage(message); return true; } catch (e) { return false; }
  }
  const text = (el, value) => { el.textContent = value == null ? '' : String(value); };
  const time = iso => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };
  function remaining(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (!(ms > 0)) return null;
    const total = Math.floor(ms / 1000);
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  }

  function counts() {
    const all = state.checks.map(c => (state.results[c.id] || {}).status);
    return { pass: all.filter(s => s === 'PASS').length, fail: all.filter(s => s === 'FAIL').length, notRun: all.filter(s => s === 'NOT RUN').length };
  }

  function renderSteps() {
    const list = $('#steps');
    list.replaceChildren(...state.checks.map(check => {
      const r = state.results[check.id] || { status: 'WAITING', observed: 'Not started' };
      const li = document.createElement('li');
      li.className = r.status === 'FAIL' ? 'issue' : r.status === 'PASS' ? '' : r.status === 'RUNNING' ? 'running' : 'waiting';
      const cells = [['test-name', check.label], ['test-result', r.status],
        ['test-value expected', r.expected || check.expected, 'Expected'], ['test-value observed', r.observed, 'Observed']];
      cells.forEach(([cls, value, label]) => {
        const span = document.createElement('span'); span.className = cls;
        if (label) { const l = document.createElement('span'); l.className = 'cell-label'; l.textContent = label; span.append(l); }
        span.append(document.createTextNode(value == null ? '' : String(value)));
        li.append(span);
      });
      return li;
    }));
  }

  function renderDisplays() {
    const cards = state.displays;
    text($('#count'), cards.length ? cards.filter(c => c.detected).length + ' of ' + cards.length + ' detected' : 'Not observed yet');
    $('#displays').replaceChildren(...cards.map(card => {
      const [mark, name, color] = LANES[card.lane] || [card.lane, card.lane, '#7894a6'];
      const el = document.createElement('article');
      el.className = 'display' + (card.detected ? '' : ' missing');
      el.style.setProperty('--lane', color);
      const monitor = document.createElement('div'); monitor.className = 'monitor'; monitor.textContent = card.lane === 'control' ? '⌘' : mark;
      const strong = document.createElement('strong'); strong.textContent = (card.lane === 'control' ? 'BenQ' : mark + ' · ' + name);
      const small = document.createElement('small'); small.textContent = card.detected ? card.observed : 'No signal path detected';
      const pill = document.createElement('span'); pill.className = 'pill'; pill.textContent = card.detected ? 'DETECTED' : 'NOT DETECTED';
      el.append(monitor, strong, small, pill);
      return el;
    }));
  }

  function setStatus(kind, icon, title, copy) {
    const status = $('#status');
    status.classList.toggle('warn', kind === 'fail');
    status.classList.toggle('running', kind === 'running');
    text($('#status-icon'), icon); text($('#status-title'), title); text($('#status-copy'), copy);
  }

  function setAction(title, copy, label, enabled, action) {
    text($('#next-title'), title); text($('#next-copy'), copy);
    const button = $('#next'); text(button, label); button.disabled = !enabled; button.dataset.action = action || '';
  }

  function renderBanner() {
    const banner = $('#ready-banner');
    const r = state.readiness;
    if (!r) { banner.hidden = true; document.body.classList.remove('collapsed'); return; }
    banner.hidden = false;
    const left = r.showNightReady && r.expiresAt ? remaining(r.expiresAt) : null;
    const expired = !r.showNightReady || !left;
    banner.classList.toggle('expired', expired);
    text($('.ready-mark'), expired ? '!' : '✓');
    if (r.showNightReady && left) {
      text($('#ready-title'), 'READY');
      text($('#ready-copy'), 'Computer and crew checks passed' + (r.operator ? ' · confirmed by ' + r.operator : '') +
        ' · valid until ' + time(r.expiresAt) + ' (' + left + ' left). A restart or configuration change clears it.');
      $('#ready-rerun').hidden = true;
    } else if (r.showNightReady) {
      text($('#ready-title'), 'EXPIRED');
      text($('#ready-copy'), 'Readiness lapsed at ' + time(r.expiresAt) + '. Run the check again, then repeat the crew check.');
      $('#ready-rerun').hidden = false;
      if (!state.expiredNotified) { state.expiredNotified = true; document.body.classList.remove('collapsed'); post({ action: 'expand' }); }
    } else {
      text($('#ready-title'), 'NOT READY');
      text($('#ready-copy'), r.message || 'Complete a current computer and crew check.');
      $('#ready-rerun').hidden = false;
    }
    text($('#ready-details'), document.body.classList.contains('collapsed') ? 'Show checks' : 'Hide checks');
  }

  function render() {
    renderSteps(); renderDisplays();
    const c = counts();
    const summary = c.pass + ' passed · ' + c.fail + ' failed · ' + c.notRun + ' not run.';
    if (state.unavailable) {
      setStatus('fail', '!', 'FAIL · Startup check unavailable', state.unavailable);
      setAction('Next: correct the setup, then retry', state.unavailable, 'Retry check', !state.busy, 'retry');
    } else if (!state.result) {
      const current = state.checks.find(ch => (state.results[ch.id] || {}).status === 'RUNNING');
      setStatus('running', '…', current ? 'RUNNING · ' + current.label : 'Starting checks', summary);
      setAction('Checks are running', 'No action needed yet. Display, show and output checks run in order.', 'Checking…', false);
    } else if (state.result.computerReady) {
      setStatus('pass', '✓', 'PASS · Computer setup', summary);
      setAction('Next: check the picture in the room', 'Confirm all four surfaces, the show, test cards, opening look and warnings.', 'Open crew check', !state.busy, 'crew');
    } else {
      const failed = state.checks.find(ch => (state.results[ch.id] || {}).status === 'FAIL');
      const r = failed ? state.results[failed.id] : {};
      setStatus('fail', '!', 'FAIL · ' + (failed ? failed.label : 'Computer setup'), summary + ' No automatic repair runs.');
      setAction('Next: ' + (r.next || state.result.message), 'Correct the fault, then retry. The other checks did not run.', 'Retry check', !state.busy, 'retry');
    }
    const r = state.readiness;
    const crew = $('#crew-state');
    if (r && r.showNightReady) { text(crew, 'PASS · Crew confirmed' + (r.operator ? ' by ' + r.operator : '')); crew.style.color = 'var(--good)'; }
    else if (r) { text(crew, 'FAIL · ' + (r.message || 'Crew check not accepted')); crew.style.color = 'var(--bad)'; }
    else { text(crew, 'NOT CHECKED · Crew confirmation required'); crew.style.color = 'var(--muted)'; }
    text($('#footer-run'), state.run ? 'Run ' + state.run.runID.slice(0, 8) + ' · ' + (state.run.mode === 'warm' ? 'warm check' : 'startup') : 'No run yet');
    renderBanner();
  }

  function receive(event) {
    if (!event || typeof event !== 'object') return;
    if (event.type === 'run') {
      Object.assign(state, { run: event, checks: event.checks || [], results: {}, displays: [], result: null, readiness: null, unavailable: null, busy: true, expiredNotified: false });
      text($('#mode-badge'), event.mode === 'warm' ? 'WARM CHECK' : 'STARTUP CHECK');
      document.body.classList.remove('collapsed'); post({ action: 'expand' });
    } else if (event.type === 'check') {
      state.results[event.id] = event;
    } else if (event.type === 'displays') {
      state.displays = event.displays || [];
    } else if (event.type === 'result') {
      state.result = event; state.busy = false;
    } else if (event.type === 'readiness') {
      state.readiness = event; state.busy = false;
      if (event.showNightReady) { document.body.classList.add('collapsed'); post({ action: 'collapse' }); }
    } else if (event.type === 'unavailable') {
      state.unavailable = event.message || 'The startup check could not run.'; state.busy = false;
    } else if (event.type === 'busy') {
      state.busy = !!event.busy;
    }
    render();
  }

  function retry() { state.busy = true; render(); if (!post({ action: 'retry' })) { state.busy = false; receive({ type: 'unavailable', message: 'This page is not connected to the Frozen Startup Checks app.' }); } }

  $('#next').addEventListener('click', () => {
    const action = $('#next').dataset.action;
    if (action === 'crew') { $('#crew-form').reset(); $('#confirm').disabled = true; $('#crew-dialog').showModal(); }
    else if (action === 'retry') retry();
  });
  $('#ready-rerun').addEventListener('click', retry);
  $('#ready-details').addEventListener('click', () => {
    const collapse = !document.body.classList.contains('collapsed');
    document.body.classList.toggle('collapsed', collapse); post({ action: collapse ? 'collapse' : 'expand' }); renderBanner();
  });
  const boxes = [...document.querySelectorAll('[data-crew]')];
  const validate = () => { $('#confirm').disabled = !(boxes.every(b => b.checked) && $('#operator').value.trim()); };
  boxes.forEach(b => b.addEventListener('change', validate)); $('#operator').addEventListener('input', validate);
  $('#crew-dialog').addEventListener('close', () => {
    if ($('#crew-dialog').returnValue !== 'confirm' || !state.result || !state.result.computerReady) return;
    const checks = {}; boxes.forEach(b => { checks[b.dataset.crew] = b.checked; });
    state.busy = true; render();
    if (!post({ action: 'crew', runID: state.run.runID, operator: $('#operator').value.trim(), checks })) {
      state.busy = false; receive({ type: 'unavailable', message: 'This page is not connected to the Frozen Startup Checks app.' });
    }
  });

  function theme(value) { document.documentElement.dataset.theme = value; text($('#theme'), value === 'dark' ? 'Light mode' : 'Dark mode'); }
  let saved = null; try { saved = localStorage.getItem('frozenStartupChecks.theme'); } catch (e) { /* storage unavailable */ }
  theme(saved === 'dark' ? 'dark' : 'light');
  $('#theme').addEventListener('click', () => {
    const v = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; theme(v);
    try { localStorage.setItem('frozenStartupChecks.theme', v); } catch (e) { /* storage unavailable */ }
  });
  state.expiryTimer = setInterval(() => { if (state.readiness) renderBanner(); }, 1000);

  window.frozenStartup = { receive };
  render();
  post({ action: 'ready' });
})();
