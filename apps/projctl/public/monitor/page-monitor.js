import { diagnosticsHTML, preserveDiagnostics } from '../panasonic-diagnostics.js';
// Monitor page: the house multiview, command log, today's calls, the selected projector and heat.
import { startMonitor, onLive, laneModels, patch, esc, $, live, todayISO, easternTime, laneOfSlot, shortTime, relayUnavailableText } from './monitor.js';
import { ALERTS, CHECKLIST, HUB, isSide } from './monitor-data.js';
import { eventKind } from '../workspace/calendar.js';

let selected = 'A', schedule = null, logPage = 0, logRows = 5, checklistIndex = 0;
const KIND = { 'power-on': 'Power on', hourly: 'Hourly', 'power-off': 'Power off', 'relay-stop': 'Relay stop', manual: 'Manual' };
const word = v => `<span class="fm-word"><span class="avd-dot avd-dot--${v.st}" aria-hidden="true"></span>${esc(v.word)}</span>`;
const model = v => v.liveModel || v.model;
// The lamp note is a dated record and keeps its date. Faults the relay reports now (PJLink alarm
// status) are shown beside it, never instead of it, and their absence is not shown as "OK".
const lampRecord = v => `Recorded: ${v.light}`;
const fault = v => v.fault ? `<span class="fm-fault fm-fault-count" data-level="${v.fault.level}" title="${esc(v.fault.text)}">${v.fault.items.length} ${v.fault.items.length === 1 ? 'alert' : 'alerts'}</span>` : '';
const faultRow = v => v.fault ? v.fault.text : v.alarmsReported ? 'None reported' : 'Not reported';
const address = v => v.ip || (live.connected ? 'No address saved' : 'Address from the relay');
const slotLabel = slot => !slot || slot === '*' || slot === 'all' ? 'All' : laneOfSlot(slot) ? `${slot} · ${laneOfSlot(slot)}` : slot;

function feed(v) {
  return `<button type="button" class="fm-feed fm-pick" data-lane="${v.lane}" data-pick="${v.lane}" data-key="feed-${v.lane}" aria-pressed="${v.lane === selected}" aria-label="Projector ${v.lane}, ${esc(v.surface)}, ${esc(v.power)}, shutter ${esc(v.shutter)}${v.fault ? ', ' + esc(v.fault.text) : ''}"><span class="fm-feed__head"><span class="fm-laneidx">${v.lane}</span><span class="fm-lanename">${esc(v.surface)}</span></span><span class="fm-art ${v.lane === 'C' ? 'fm-art-peaks' : 'fm-art-aurora'}"><strong class="fm-feed-power">${esc(v.power)}</strong><span class="fm-feed-shutter">Shutter ${esc(v.shutter)}</span></span><span class="fm-feed__foot">${v.fault ? fault(v) : word(v)}<span class="fm-small">Reply ${esc(v.reply)}</span></span></button>`;
}

const row = cells => `<div role="row" class="fm-tr">${cells}</div>`;
const empty = text => `<div role="row" class="fm-tr fm-tr--empty"><span role="cell" class="fm-td">${esc(text)}</span></div>`;
const kv = (k, v) => `<div class="fm-kv"><span class="avd-eyebrow">${esc(k)}</span><span class="fm-kv__v">${esc(v)}</span></div>`;

function render() {
  const L = laneModels(), lanes = ['D', 'B', 'C', 'A'].map(k => L[k]);
  const replying = Object.values(L).filter(v => v.current).length;
  document.querySelectorAll('[data-live-tag]').forEach(tag => { tag.textContent = live.connected ? 'Live' : live.attempted ? 'Relay offline' : 'Connecting'; tag.classList.toggle('fm-tag--live', live.connected); tag.classList.toggle('fm-tag--muted', !live.connected); });
  patch($('#mv-count'), live.connected
    ? `<span class="avd-dot avd-dot--${replying === 4 ? 'done' : replying ? 'waiting' : 'blocked'}" aria-hidden="true"></span><span>${replying} of 4 replying</span>`
    : `<span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span>${relayUnavailableText()}</span>`);
  patch($('#mon-mv'), lanes.map(feed).join(''));

  const allEvents = live.connected ? live.events.slice(-80).reverse() : [];
  logPage = Math.min(logPage, Math.max(0, Math.ceil(allEvents.length / logRows) - 1));
  const events = allEvents.slice(logPage * logRows, (logPage + 1) * logRows);
  $('#mon-log-newer').disabled = logPage === 0;
  $('#mon-log-older').disabled = (logPage + 1) * logRows >= allEvents.length;
  $('#mon-log-page').textContent = allEvents.length ? `${logPage * logRows + 1} to ${logPage * logRows + events.length} of ${allEvents.length}` : 'No entries';
  patch($('#mon-log'), `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Time</span><span role="columnheader" class="avd-eyebrow">Projector</span><span role="columnheader" class="avd-eyebrow">Command</span><span role="columnheader" class="avd-eyebrow">Result</span><span role="columnheader" class="avd-eyebrow">Source</span></div>`
    + (events.length ? events.map(e => row(`<span role="cell" class="fm-td fm-td--mono">${easternTime(e.at)}</span><span role="cell" class="fm-td fm-td--mono">${esc(slotLabel(e.slot))}</span><span role="cell" class="fm-td fm-td--clip">${esc(e.command)}</span><span role="cell" class="fm-td fm-td--clip fm-td--muted">${esc([e.result, e.detail].filter(Boolean).join(' · '))}</span><span role="cell" class="fm-td fm-td--clip fm-td--muted">${esc(e.source || '')}</span>`)).join('')
      : empty(live.connected ? 'No commands recorded on this relay yet.' : 'The command log fills from the relay that serves this page.')));

  const day = schedule?.find(d => d.date === todayISO());
  const calls = (day?.events || []).filter(e => !isSide(e.label));
  patch($('#mon-calls'), schedule == null ? '<span class="fm-ev" data-kind="other">Loading the schedule…</span>'
    : calls.length ? calls.map(e => `<span class="fm-ev" data-kind="${eventKind(e.label)}">${esc(e.label + (e.time ? ' ' + e.time : ''))}</span>`).join('')
      : '<span class="fm-ev" data-kind="other">No calls listed today</span>');

  const v = L[selected], insp = $('#mon-insp');
  $('#mon-details').textContent = `${selected} details`;
  $('#mon-details').setAttribute('aria-label', `Details for projector ${selected}`);
  insp.dataset.lane = selected;
  const restoreDiagnostics = preserveDiagnostics(insp);
  patch(insp, `<div class="avd-panel__head"><h2 id="insp-title" class="avd-panel__title"><span class="avd-panel__index">${v.lane}</span>Projector ${v.lane}</h2><span class="avd-state"><span class="avd-dot avd-dot--${v.st}" aria-hidden="true"></span>${esc(v.word)}</span></div><div class="avd-panel__body"><div class="pj-lane"><h3>${esc(v.surface)}</h3><span class="pj-mono">${esc(v.role)} · ${esc(v.orientation)}</span></div><div class="fm-kvs">${[
    kv('Model', model(v)), kv('Address', address(v)), kv('Labels', `${v.prod} production · ${v.slot || 'unassigned'} controller`), kv('Resolution', v.native),
    kv('Input reported', `${v.input} · ${v.signal}`), kv('Control', v.route), kv('Faults', faultRow(v)), kv('Light', lampRecord(v))].join('')}</div>${diagnosticsHTML(v.projector, v.current)}<a class="avd-btn avd-btn--primary avd-btn--block" href="/" target="_blank" rel="noopener noreferrer">Open in Projctl ↗</a><p class="pj-mono fm-small">Monitor only. Lighting fires the cues and Millumin sends power and shutter.</p></div>`);
  restoreDiagnostics();

  const h = live.health, last = h?.reports?.[0], engine = h?.engine;
  const next = !engine ? '' : engine.state === 'disabled' ? 'reports are off on this relay' : engine.nextHourlyAt ? `next ${shortTime(engine.nextHourlyAt)}` : 'next on the hour while lit';
  $('#mon-health-line').textContent = !live.connected ? 'Connect to the controller to see health readings.'
    : !h ? 'Loading the latest report…' : last ? `Last: ${KIND[last.kind] || last.title || 'Report'} · ${shortTime(last.startedAt)} · ${next}` : `No report yet · ${next}`;
  patch($('#mon-health'), `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Lane</span><span role="columnheader" class="avd-eyebrow">Intake air</span><span role="columnheader" class="avd-eyebrow">Heat</span><span role="columnheader" class="avd-eyebrow">Reply</span></div>`
    + ['A', 'B', 'C', 'D'].map(k => L[k]).map(x => row(`<span role="cell" class="fm-td fm-td--clip">${x.lane} · ${esc(x.surface)}</span><span role="cell" class="fm-td fm-td--mono">${esc(x.intake)}</span><span role="cell" class="fm-td fm-td--clip"><span class="avd-dot avd-dot--${x.heatSt}" aria-hidden="true"></span>${esc(x.heat)}</span><span role="cell" class="fm-td fm-td--mono">${esc(x.reply)}</span>`)).join(''));
}

$('#mon-alerts').innerHTML = ALERTS.map(a => `<div class="fm-alertcard" data-state="${a.st}"><strong><span class="avd-dot avd-dot--${a.st}" aria-hidden="true"></span>${esc(a.title)}</strong><span>${esc(a.detail)}</span><span class="pj-mono fm-small">${esc(a.when)}</span></div>`).join('');
function renderChecklist() {
  const c = CHECKLIST[checklistIndex];
  $('#mon-checklist').innerHTML = `<li><span><b>${esc(c.title)}.</b> <span class="fm-dim">${esc(c.text)}</span></span></li>`;
  $('#mon-check-page').textContent = `${checklistIndex + 1} of ${CHECKLIST.length}`;
  $('#mon-check-prev').disabled = checklistIndex === 0;
  $('#mon-check-next').disabled = checklistIndex === CHECKLIST.length - 1;
}
renderChecklist();
$('#mon-check-prev').onclick = () => { checklistIndex--; renderChecklist(); };
$('#mon-check-next').onclick = () => { checklistIndex++; renderChecklist(); };
$('#mon-log-newer').onclick = () => { logPage--; render(); };
$('#mon-log-older').onclick = () => { logPage++; render(); };
$('#mon-details').onclick = () => $('#mon-detail-dialog').showModal();
$('#mon-records').onclick = () => $('#mon-records-dialog').showModal();
let software = null, softwarePage = 0;
function renderSoftware() {
  const checks = software?.checks || [], invalid = software?.state === 'invalid';
  const passed = checks.filter(check => check.outcome === 'passed').length;
  $('#mon-software-summary').textContent = invalid ? 'The saved report could not be read. Replace it with the release report.'
    : `${software.release.name}: ${passed} of ${checks.length} checks passed. ${software.state === 'matched' ? 'Matches this installed package.' : software.state === 'different' ? 'Recorded for a different package.' : 'Recorded package results.'}`;
  $('#mon-software-date').textContent = invalid ? '' : `${new Date(software.finishedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · ${software.sourceCommit.slice(0, 8)}`;
  softwarePage = Math.min(softwarePage, Math.max(0, Math.ceil(checks.length / 5) - 1));
  patch($('#mon-software-list'), checks.slice(softwarePage * 5, softwarePage * 5 + 5).map(check => `<li><span>${esc(check.name)}</span><strong>${check.outcome === 'passed' ? 'Passed' : check.outcome === 'timed-out' ? 'Timed out' : 'Needs review'}</strong></li>`).join(''));
  $('#mon-software-prev').disabled = softwarePage === 0;
  $('#mon-software-next').disabled = (softwarePage + 1) * 5 >= checks.length;
  $('#mon-software-page').textContent = checks.length ? `${softwarePage + 1} of ${Math.ceil(checks.length / 5)}` : '';
}
$('#mon-software').onclick = () => { renderSoftware(); $('#mon-software-dialog').showModal(); };
$('#mon-software-prev').onclick = () => { softwarePage--; renderSoftware(); };
$('#mon-software-next').onclick = () => { softwarePage++; renderSoftware(); };
async function loadSoftware() {
  try {
    const response = await fetch('/api/software-checks', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    software = await response.json();
    const button = $('#mon-software');
    button.hidden = software.state === 'absent';
    button.textContent = software.state === 'matched' && software.passed ? 'Checks passed' : software.state === 'invalid' || software.passed === false ? 'Review checks' : 'Recorded checks';
    if ($('#mon-software-dialog').open) renderSoftware();
  } catch { /* The dated report remains separate from live equipment feedback. */ }
}
loadSoftware();
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadSoftware(); });
document.querySelectorAll('[data-close-dialog]').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
const tabs = [...document.querySelectorAll('[data-dashboard-view]')];
function selectDashboard(tab) {
  tabs.forEach(button => {
    const active = button === tab;
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
  });
  sizeLog();
}
function sizeLog() {
  const panel = $('#mon-panel-activity');
  if (panel.hidden) return;
  const rows = Math.max(1, Math.min(12, Math.floor((panel.clientHeight - 164) / 32)));
  if (rows !== logRows) { logRows = rows; logPage = 0; render(); }
}
for (const [i, tab] of tabs.entries()) {
  tab.onclick = () => selectDashboard(tab);
  tab.onkeydown = event => {
    const index = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (index == null) return;
    event.preventDefault(); selectDashboard(tabs[index]); tabs[index].focus();
  };
}
new ResizeObserver(sizeLog).observe($('#fm-main'));
$('#mon-hub').href = HUB;
$('#mon-mv').addEventListener('click', event => { const lane = event.target.closest('[data-pick]')?.dataset.pick; if (lane) { selected = lane; render(); } });
fetch('../workspace/tech-schedule.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).then(d => { schedule = Array.isArray(d) ? d : []; render(); }).catch(() => { schedule = []; render(); });

startMonitor({ health: true });
onLive(render);
