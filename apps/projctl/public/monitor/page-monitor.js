// Monitor page: the house multiview, command log, today's calls, the selected projector and heat.
import { startMonitor, onLive, laneModels, patch, esc, $, live, todayISO, easternTime, laneOfSlot, shortTime } from './monitor.js';
import { ALERTS, CHECKLIST, HUB, isSide } from './monitor-data.js';
import { eventKind } from '../workspace/calendar.js';

let selected = 'A', schedule = null;
const KIND = { 'power-on': 'Power on', hourly: 'Hourly', 'power-off': 'Power off', 'relay-stop': 'Relay stop', manual: 'Manual' };
const word = v => `<span class="fm-word"><span class="avd-dot avd-dot--${v.st}" aria-hidden="true"></span>${esc(v.word)}</span>`;
const model = v => v.liveModel || v.model;
const light = v => v.lampNow || v.light.split(' · Nov')[0];
const address = v => v.ip || (live.connected ? 'No address saved' : 'Address from the relay');
const slotLabel = slot => !slot || slot === '*' || slot === 'all' ? 'All' : laneOfSlot(slot) ? `${slot} · ${laneOfSlot(slot)}` : slot;

function feed(v) {
  const portal = v.lane === 'A' || v.lane === 'D';
  const head = portal ? '' : `<span class="pj-mono fm-feed__id">${esc(model(v))} · ${esc(address(v))}</span><span class="fm-feed__state">${word(v)}</span>`;
  const chips = `<span class="fm-chip fm-chip--tl">${esc(v.input)} · ${esc(v.signal)}</span>${portal ? '' : `<span class="fm-chip fm-chip--tr">Intake ${esc(v.intake)}</span>`}<span class="fm-chip fm-chip--bl">Shutter ${esc(v.shutter)}</span>${portal ? '' : `<span class="fm-chip fm-chip--br">Reply ${esc(v.reply)}</span>`}`;
  const foot = portal ? `<span class="fm-feed__foot">${word(v)}<span class="pj-mono fm-small">${esc(light(v))}</span><span class="pj-mono fm-small">Intake ${esc(v.intake)}<br>Reply ${esc(v.reply)}</span></span>` : '';
  return `<button type="button" class="fm-feed fm-pick" data-lane="${v.lane}" data-pick="${v.lane}" data-key="feed-${v.lane}" aria-pressed="${v.lane === selected}" aria-label="Projector ${v.lane}, ${esc(v.surface)}, ${esc(v.word)}"><span class="fm-feed__head"><span class="fm-laneidx">${v.lane}</span><span class="fm-lanename">${esc(v.surface)}</span>${head}</span><span class="fm-art ${v.lane === 'C' ? 'fm-art-peaks' : 'fm-art-aurora'} fm-snow">${chips}</span>${foot}</button>`;
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
    : '<span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span>Relay offline</span>');
  patch($('#mon-mv'), lanes.map(feed).join(''));

  const events = live.connected ? live.events.slice(-80).reverse() : [];
  patch($('#mon-log'), `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Time</span><span role="columnheader" class="avd-eyebrow">Slot</span><span role="columnheader" class="avd-eyebrow">Command</span><span role="columnheader" class="avd-eyebrow">Result</span><span role="columnheader" class="avd-eyebrow">Source</span></div>`
    + (events.length ? events.map(e => row(`<span role="cell" class="fm-td fm-td--mono">${easternTime(e.at)}</span><span role="cell" class="fm-td fm-td--mono">${esc(slotLabel(e.slot))}</span><span role="cell" class="fm-td fm-td--clip">${esc(e.command)}</span><span role="cell" class="fm-td fm-td--clip fm-td--muted">${esc([e.result, e.detail].filter(Boolean).join(' · '))}</span><span role="cell" class="fm-td fm-td--clip fm-td--muted">${esc(e.source || '')}</span>`)).join('')
      : empty(live.connected ? 'No commands recorded on this relay yet.' : 'The command log fills from the relay that serves this page.')));

  const day = schedule?.find(d => d.date === todayISO());
  const calls = (day?.events || []).filter(e => !isSide(e.label));
  patch($('#mon-calls'), schedule == null ? '<span class="fm-ev" data-kind="other">Loading the schedule…</span>'
    : calls.length ? calls.map(e => `<span class="fm-ev" data-kind="${eventKind(e.label)}">${esc(e.label + (e.time ? ' ' + e.time : ''))}</span>`).join('')
      : '<span class="fm-ev" data-kind="other">No calls listed today</span>');

  const v = L[selected], insp = $('#mon-insp');
  insp.dataset.lane = selected;
  patch(insp, `<div class="avd-panel__head"><h2 id="insp-title" class="avd-panel__title"><span class="avd-panel__index">${v.lane}</span>Projector ${v.lane}</h2><span class="avd-state"><span class="avd-dot avd-dot--${v.st}" aria-hidden="true"></span>${esc(v.word)}</span></div><div class="avd-panel__body"><div class="pj-lane"><h3>${esc(v.surface)}</h3><span class="pj-mono">${esc(v.role)} · ${esc(v.orientation)}</span></div><div class="fm-kvs">${[
    kv('Model', model(v)), kv('Address', address(v)), kv('Labels', `${v.prod} production · ${v.slot || '—'} controller`), kv('Native', v.native),
    kv('Receiving', `${v.input} · ${v.signal}`), kv('Control', v.route), kv('Light', light(v))].join('')}</div><a class="avd-btn avd-btn--primary avd-btn--block" href="/" target="_blank" rel="noopener">Open in Projctl ↗</a><p class="pj-mono fm-small">Monitor only. Lighting fires the cues and Millumin sends power and shutter.</p></div>`);

  const h = live.health, last = h?.reports?.[0], engine = h?.engine;
  const next = !engine ? '' : engine.state === 'disabled' ? 'reports are off on this relay' : engine.nextHourlyAt ? `next ${shortTime(engine.nextHourlyAt)}` : 'next on the hour while lit';
  $('#mon-health-line').textContent = !live.connected ? 'Health readings come from the relay that serves this page.'
    : !h ? 'Reading the report summary…' : last ? `Last: ${KIND[last.kind] || last.title || 'Report'} · ${shortTime(last.startedAt)} · ${next}` : `No report written yet · ${next}`;
  patch($('#mon-health'), `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Lane</span><span role="columnheader" class="avd-eyebrow">Intake air</span><span role="columnheader" class="avd-eyebrow">Heat</span><span role="columnheader" class="avd-eyebrow">Reply</span></div>`
    + ['A', 'B', 'C', 'D'].map(k => L[k]).map(x => row(`<span role="cell" class="fm-td fm-td--clip">${x.lane} · ${esc(x.surface)}</span><span role="cell" class="fm-td fm-td--mono">${esc(x.intake)}</span><span role="cell" class="fm-td fm-td--clip"><span class="avd-dot avd-dot--${x.heatSt}" aria-hidden="true"></span>${esc(x.heat)}</span><span role="cell" class="fm-td fm-td--mono">${esc(x.reply)}</span>`)).join(''));
}

$('#mon-alerts').innerHTML = ALERTS.map(a => `<div class="fm-alertcard" data-state="${a.st}"><strong><span class="avd-dot avd-dot--${a.st}" aria-hidden="true"></span>${esc(a.title)}</strong><span>${esc(a.detail)}</span><span class="pj-mono fm-small">${esc(a.when)}</span></div>`).join('');
$('#mon-checklist').innerHTML = CHECKLIST.map(c => `<li><span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span><b>${esc(c.title)}.</b> <span class="fm-dim">${esc(c.text)}</span></span></li>`).join('');
$('#mon-hub').href = HUB;
$('#mon-mv').addEventListener('click', event => { const lane = event.target.closest('[data-pick]')?.dataset.pick; if (lane) { selected = lane; render(); } });
fetch('../workspace/tech-schedule.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).then(d => { schedule = Array.isArray(d) ? d : []; render(); }).catch(() => { schedule = []; render(); });

startMonitor({ health: true });
onLive(render);
