import { hdmiSource, patternIsOff, supportsPatterns } from './output-recovery.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function quickPatterns(patterns) {
  return [
    ['Bars', /^(?:Colour|Color) bars$/i],
    ['White', /^White$/i],
    ['Grid', /^(?:Crosshatch|Grid|Focus \(white\)|Convergence)$/i],
  ].map(([label, match]) => ({ label, code: Object.keys(patterns || {}).find(code => match.test(patterns[code])) })).filter(item => item.code);
}

export function operatorCard({ projector: p, lane, info, connection, lock, patterns, feedback, pending, act, details, morePatterns }) {
  const card = document.createElement('section');
  card.className = 'avd-panel pj-tile pj-summary-tile operator-card';
  card.dataset.lane = lane;
  card.dataset.slot = p?.slot || '';
  card._controlIdentity = JSON.stringify([p?.slot, p?.driver, p?.ip, p?.mac]);
  card.setAttribute('aria-label', `${lane} ${info.target}`);
  const s = p?.status || {};
  const stale = new Set(s.stale || []);
  const available = !!p && connection.current;
  const blocked = !available || lock || pending || !!p?.busy;
  const disabled = condition => condition ? 'disabled' : '';
  const hasPatterns = supportsPatterns(p);
  const table = hasPatterns ? p?.patterns || patterns : {};
  const quick = quickPatterns(table);
  const alarms = Object.entries(s.errors || {}).filter(([, v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([key,v]) => `${key} ${v===2?'fault':'warning'}`);
  const input = s.input == null ? 'Unknown' : (p?.inputs?.[s.input] || String(s.input)) + (stale.has('input') ? ' (last known)' : '');
  const pattern = !hasPatterns ? 'Not supported' : (patternIsOff(s.pattern) ? 'Off' : table?.[s.pattern] || s.pattern || 'Unknown') + (stale.has('pattern') ? ' (last known)' : '');
  const shutter = stale.has('shutter') ? 'unknown' : s.shutter || 'unknown';
  card.classList.toggle('offline', !available);
  card.innerHTML = `
    <header class="operator-card-head">
      <span class="operator-lane">${lane}</span>
      <div class="pj-summary-heading"><h2>${escape(info.target)}</h2><p>${escape(p?.model || 'No assigned projector')}</p></div>
      <button type="button" class="operator-details" data-open-projector="${lane}" aria-label="Details for ${lane} ${escape(info.target)}">Details</button>
    </header>
    <div class="operator-status ${alarms.length?'has-alarms':''}">
      <span class="operator-connection ${available?'online':''}">${escape(connection.detail || connection.label || 'Unassigned')}</span>
      <strong class="pj-summary-state" title="${escape([connection.detail,...alarms].join(' · '))}">${escape(alarms.join(' · ') || (available ? s.power || 'Unknown power' : connection.detail))}</strong>
    </div>
    <section class="operator-shutter" aria-label="Shutter for ${lane}">
      <div class="operator-label"><span>Shutter</span><strong>${available?escape(shutter):'Unknown'}</strong></div>
      <div class="operator-pair">
        <button class="operator-button shutter-open" type="button" data-action="shutter" data-value="0" aria-pressed="${available&&shutter==='open'}" ${disabled(!available)}>Open</button>
        <button class="operator-button shutter-close" type="button" data-action="shutter" data-value="1" aria-pressed="${available&&shutter==='closed'}" ${disabled(!available)}>Close</button>
      </div>
    </section>
    <section class="operator-power" aria-label="Power for ${lane}">
      <div class="operator-label"><span>Power</span><strong>${available?escape(s.power||'Unknown'):'Unknown'}</strong></div>
      <div class="operator-pair">
        <button class="operator-button" type="button" data-action="power" data-value="1" ${disabled(!available||pending||p?.busy||s.power==='cooling')}>Power on</button>
        <button class="operator-button power-off" type="button" data-action="power" data-value="0" ${disabled(blocked||s.power==='off')}>${feedback?.phase==='confirmation'?'Confirm power off':'Power off'}</button>
      </div>
    </section>
    <section class="operator-patterns" aria-label="Test patterns for ${lane}">
      <div class="operator-label"><span>Test pattern</span><strong>${escape(pattern)}</strong></div>
      <div class="operator-pattern-buttons">${quick.map(item=>`<button class="operator-button pattern-${item.label.toLowerCase()}" type="button" data-action="pattern" data-value="${escape(item.code)}" aria-pressed="${!stale.has('pattern')&&String(s.pattern)===item.code}" ${disabled(blocked)}><i aria-hidden="true"></i>${item.label}</button>`).join('')}<button type="button" class="operator-button pattern-more" data-more-patterns ${disabled(blocked||!hasPatterns)}>More</button></div>
    </section>
    <div class="operator-recovery">
      <button class="operator-button clear-pattern" type="button" data-action="clear" ${disabled(blocked||!hasPatterns)}>Clear pattern</button>
      <button class="operator-button reset-hdmi" type="button" data-action="reset" ${disabled(blocked||!p||hdmiSource(p)==null)}>Reset to HDMI</button>
    </div>
    <div class="operator-readback"><span>Input <strong>${escape(input)}</strong></span><span class="pj-summary-freshness">${escape(connection.lastReply||'No reply')}</span></div>
    <p class="operator-feedback" role="status" aria-live="polite" data-phase="${escape(feedback?.phase||'idle')}">${escape(feedback?.text||(lock?'Show lock is on.':!available?[connection.detail,connection.retry,'Values last known'].filter(Boolean).join(' · '):'Ready'))}</p>`;
  card.querySelector('[data-open-projector]').onclick = () => details(lane);
  card.querySelector('[data-more-patterns]').onclick = () => morePatterns(p.slot);
  for (const button of card.querySelectorAll('[data-action]')) {
    button.dataset.focusKey = `${lane}:operator:${button.dataset.action}:${button.dataset.value || ''}`;
    button.onclick = event => act(p, button.dataset.action, button.dataset.value, event.currentTarget);
  }
  return card;
}
