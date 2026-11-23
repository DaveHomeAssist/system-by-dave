import { hdmiSource, patternIsOff, supportsPatterns } from './output-recovery.js';
import { nextOperatorAction } from './operator-intent.js';
import { fieldFeedback } from './status-feedback.js';
import { commandProgress, samePendingCommand } from './command-progress.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function quickPatterns(patterns) {
  return [
    ['Bars', /^(?:Colour|Color) bars$/i],
    ['White', /^White$/i],
    ['Grid', /^(?:Crosshatch|Grid|Focus \(white\)|Convergence)$/i],
  ].map(([label, match]) => ({ label, code: Object.keys(patterns || {}).find(code => match.test(patterns[code])) })).filter(item => item.code);
}

export function operatorCard({ projector: p, lane, info, connection, lock, patterns, feedback, pending, act, details, morePatterns, preferences, dismissSuggestion, heat = null }) {
  const card = document.createElement('section');
  card.className = 'avd-panel pj-tile pj-summary-tile operator-card';
  card.dataset.lane = lane;
  card.dataset.slot = p?.slot || '';
  card._controlIdentity = JSON.stringify([p?.slot, p?.driver, p?.ip, p?.mac]);
  card.setAttribute('aria-label', `${lane} ${info.target}`);
  const s = p?.status || {};
  const stale = new Set(s.stale || []);
  const available = !!p && connection.current;
  if (!feedback || ['idle', 'sent'].includes(feedback.phase)) feedback = commandProgress(p, connection) || feedback;
  const reported = field => fieldFeedback(p, field, connection);
  card.dataset.connectionState = connection.recovered ? 'recovered' : connection.state;
  const blocked = !available || lock || pending || !!p?.busy;
  const powerOffReason = lock ? 'Power off unavailable: Show Lock is on.' : !available ? 'Power off unavailable: waiting for a fresh projector reply.' : pending || p?.busy ? 'Power off unavailable: another operation is in progress.' : s.power === 'off' ? 'Projector reports power off.' : '';
  const disabled = condition => condition ? 'disabled' : '';
  const hasPatterns = supportsPatterns(p);
  const table = hasPatterns ? p?.patterns || patterns : {};
  const quick = quickPatterns(table);
  const suggestion = preferences?.showSuggestions ? nextOperatorAction(p, connection, lock) : null;
  const hint = suggestion && !preferences.dismissedSuggestions.includes(suggestion.id) && !pending && (!feedback || ['idle', 'sent', 'confirmed'].includes(feedback.phase)) ? suggestion : null;
  const alarms = Object.entries(s.errors || {}).filter(([, v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([key,v]) => `${key} ${v===2?'fault':'warning'}`);
  const alarmSeverity = Object.values(s.errors || {}).some(value => value === 2) ? 'fault' : alarms.length ? 'warning' : '';
  if (alarmSeverity) card.dataset.alarmSeverity = alarmSeverity;
  if (heat) card.dataset.heat = heat.level;
  const input = !reported('input').present ? 'Not reported' : (p?.inputs?.[s.input] || String(s.input)) + (reported('input').lastKnown ? ' (last known)' : '');
  const pattern = !hasPatterns ? 'Not supported' : !reported('pattern').present ? 'Not reported' : (patternIsOff(s.pattern) ? 'Off' : table?.[s.pattern] || s.pattern) + (reported('pattern').lastKnown ? ' (last known)' : '');
  const shutter = stale.has('shutter') ? 'unknown' : s.shutter || 'unknown';
  const power = available && !stale.has('power') ? s.power || 'unknown' : 'unknown';
  card.classList.toggle('offline', !available);
  const moreLabel = hasPatterns && !patternIsOff(s.pattern) && !quick.some(item => item.code === String(s.pattern)) && s.pattern != null ? `${escape(pattern)}<small>More patterns</small>` : 'More';
  card.innerHTML = `
    <header class="operator-card-head">
      <span class="operator-lane">${lane}</span>
      <div class="pj-summary-heading"><h2>${escape(info.target)}</h2><p>${escape(p?.model || 'No assigned projector')}</p></div>
      <button type="button" class="operator-details" data-open-projector="${lane}" aria-label="Details for ${lane} ${escape(info.target)}">Details</button>
    </header>
    <div class="operator-status ${alarms.length?'has-alarms':''} ${heat?'has-heat':''}">
      <span class="operator-connection ${available?'online':''}">${escape(connection.label || 'Unassigned')}${connection.ageLabel ? ` · ${escape(connection.ageLabel)}` : ''}</span>
      ${heat?`<span class="operator-heat" data-heat-level="${escape(heat.level)}" role="status" title="Air temperature ${escape(heat.text)}. Details in Thermal watch"><span class="avd-dot avd-dot--${heat.level==='hot'?'blocked':'waiting'}" aria-hidden="true"></span>Heat ${escape(heat.text)}</span>`:''}
      <strong class="pj-summary-state ${alarms.length?'operator-alert':''}" title="${escape([connection.detail,...alarms].join(' · '))}" ${alarms.length?'role="status"':''}>${alarms.length?`<span class="operator-alert-icon" aria-hidden="true">!</span><span><b>${!reported('errors').current ? 'Last known ' : ''}${alarmSeverity==='fault'?'Fault':'Warning'}</b> ${escape(alarms.join(' · '))}</span>`:escape(!reported('errors').present ? 'Alarms not reported' : reported('errors').current ? 'No reported alarms' : 'Last known: no reported alarms')}</strong>
    </div>
    <section class="operator-shutter" aria-label="Shutter for ${lane}">
      <div class="operator-label"><span>Shutter</span><strong>${available?escape(shutter):'Unknown'}</strong></div>
      <div class="operator-pair">
        <button class="operator-button shutter-open" type="button" data-action="shutter" data-value="0" aria-pressed="${available&&shutter==='open'}" ${disabled(!available||samePendingCommand(p,'shutter','open'))}><span class="operator-shutter-prefix">Shutter</span> Open</button>
        <button class="operator-button shutter-close" type="button" data-action="shutter" data-value="1" aria-pressed="${available&&shutter==='closed'}" ${disabled(!available||samePendingCommand(p,'shutter','closed'))}><span class="operator-shutter-prefix">Shutter</span> Close</button>
      </div>
    </section>
    <section class="operator-power" aria-label="Power for ${lane}">
      <div class="operator-label"><span>Power</span><strong class="operator-power-state" data-power-state="${escape(power)}">${escape(power)}</strong></div>
      <div class="operator-pair">
        <button class="operator-button" type="button" data-action="power" data-value="1" ${disabled(!available||pending||p?.busy||samePendingCommand(p,'power','on')||['on','warming','cooling'].includes(s.power))}>Power on</button>
        <button class="operator-button power-off" type="button" aria-describedby="power-off-reason-${escape(lane)}" data-action="power" data-value="0" ${disabled(blocked||s.power==='off'||samePendingCommand(p,'power','off'))}>${feedback?.phase==='confirmation'?'Confirm power off':'Power off'}</button>
      </div>
      <p id="power-off-reason-${escape(lane)}" class="pj-mono pj-note" style="margin:0" role="status">${escape(powerOffReason)}</p>
    </section>
    <p class="operator-feedback" role="status" aria-live="polite" data-phase="${escape(feedback?.phase||(!available&&connection.retry?'connection':'idle'))}">${escape(feedback?.text||(!available&&connection.retry?connection.retry:lock?'Show lock is on.':'Ready'))}</p>
    <section class="operator-patterns" aria-label="Test patterns for ${lane}">
      <div class="operator-label"><span>Test pattern</span><strong>${escape(pattern)}</strong></div>
      <div class="operator-pattern-buttons">${quick.map(item=>`<button class="operator-button pattern-${item.label.toLowerCase()}" type="button" data-action="pattern" data-value="${escape(item.code)}" aria-pressed="${reported('pattern').current&&String(s.pattern)===item.code}" ${disabled(blocked)}><i aria-hidden="true"></i>${item.label}</button>`).join('')}<button type="button" class="operator-button pattern-more" data-more-patterns ${disabled(blocked||!hasPatterns)}>${moreLabel}</button></div>
    </section>
    <div class="operator-recovery">
      <button class="operator-button clear-pattern" type="button" data-action="clear" ${disabled(blocked||!hasPatterns)}>Clear pattern</button>
      <button class="operator-button reset-hdmi" type="button" data-action="reset" ${disabled(blocked||!p||hdmiSource(p)==null)}>Reset to HDMI</button>
    </div>
    <div class="operator-readback"><span>Input <strong>${escape(input)}</strong></span><span class="pj-summary-freshness" title="${escape(connection.lastReply||'No reply')}">Last reply ${escape(connection.ageLabel || connection.lastReply||'No reply')}</span></div>
    ${!reported('power').current && reported('power').present ? `<p class="operator-last-known">Last reported power: ${escape(s.power)}. Current state unknown.</p>` : ''}
    ${hint?`<div class="operator-hint"><p>${escape(hint.text)}</p><button type="button" data-dismiss-hint aria-label="Dismiss suggestion">×</button></div>`:''}
`;
  if (hint) {
    const suggested = hint.action === 'details' ? card.querySelector('[data-open-projector]') : card.querySelector(`[data-action="${hint.action}"]`);
    suggested?.classList.add('is-suggested');
    card.querySelector('[data-dismiss-hint]').onclick = () => dismissSuggestion(hint.id);
  }
  card.querySelector('[data-open-projector]').onclick = () => details(lane);
  card.querySelector('[data-more-patterns]').onclick = () => morePatterns(p.slot);
  for (const button of card.querySelectorAll('[data-action]')) {
    button.dataset.focusKey = `${lane}:operator:${button.dataset.action}:${button.dataset.value || ''}`;
    button.onclick = event => act(p, button.dataset.action, button.dataset.value, event.currentTarget);
  }
  return card;
}
