// Calendar page: the November tech schedule (the same JSON the Planning calendar reads).
import { startMonitor, patch, esc, $, todayISO, daysBetween } from './monitor.js';
import { MILESTONES, SCHEDULE_PDF, isSide } from './monitor-data.js';
import { eventKind } from '../workspace/calendar.js';

const YEAR = 2026, MONTH = 10; // November, zero-based
const DAYS = new Date(Date.UTC(YEAR, MONTH + 1, 0)).getUTCDate();
const OFFSET = new Date(Date.UTC(YEAR, MONTH, 1)).getUTCDay();
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const iso = n => `${YEAR}-${String(MONTH + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
const label = d => { const t = new Date(d + 'T12:00:00Z'); return `${NAMES[t.getUTCDay()]} · Nov ${t.getUTCDate()}`; };
const entries = n => `${n} ${n === 1 ? 'entry' : 'entries'}`;
let schedule = [], today = todayISO(), selected = today.startsWith(iso(1).slice(0, 7)) ? today : iso(1);

function render() {
  const byDate = new Map(schedule.map(d => [d.date, d]));
  const cells = [];
  for (let i = 0; i < OFFSET; i++) cells.push('<div aria-hidden="true"></div>');
  for (let n = 1; n <= DAYS; n++) {
    const date = iso(n), item = byDate.get(date);
    if (!item) { cells.push(`<div class="fm-day--missing"><span>${n}</span><span class="pj-mono fm-small">Not supplied</span></div>`); continue; }
    const main = item.events.filter(e => !isSide(e.label)), shown = (main.length ? main : item.events).slice(0, 2);
    const text = e => e.label + (/Preview|Performance/.test(e.label) && e.time ? ' ' + e.time : '');
    cells.push(`<button type="button" class="fm-day" data-date="${date}" data-key="day-${date}" aria-pressed="${date === selected}"${date === today ? ' aria-current="date"' : ''} aria-label="${esc(label(date) + '. ' + item.events.map(e => e.label + (e.time ? ' ' + e.time : '')).join('; '))}"><span class="fm-day__num">${n}${date === today ? '<span class="fm-day__today">Today</span>' : ''}</span>${shown.map(e => `<span class="fm-ev" data-kind="${eventKind(e.label)}">${esc(text(e))}</span>`).join('')}<span class="pj-mono">${entries(item.events.length)}</span></button>`);
  }
  while (cells.length % 7) cells.push('<div aria-hidden="true"></div>');
  $('#cal-month').classList.toggle('fm-month--six', cells.length > 35);
  patch($('#cal-month'), cells.join(''));

  const item = byDate.get(selected) || { events: [] };
  $('#day-title').textContent = label(selected) + (selected === today ? ' · today' : '');
  $('#cal-count').textContent = entries(item.events.length);
  patch($('#cal-agenda'), item.events.length ? item.events.map(e => `<li><span class="pj-mono">${esc(e.time || 'No time listed')}</span><span class="fm-ev" data-kind="${eventKind(e.label)}">${esc(e.label)}</span></li>`).join('') : '<li><span class="fm-muted">No entries supplied for this day.</span></li>');
  patch($('#cal-miles'), MILESTONES.map(m => {
    const n = daysBetween(today, m.date);
    return `<li><span class="pj-mono">${esc(label(m.date))}</span><span>${esc(m.label)} <span>${esc(m.time)}</span></span><span class="pj-mono">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? 'Done' : `In ${n} days`}</span></li>`;
  }).join(''));
}

$('#cal-pdf').href = SCHEDULE_PDF;
$('#cal-month').addEventListener('click', event => { const date = event.target.closest('[data-date]')?.dataset.date; if (date) { selected = date; render(); } });
fetch('../workspace/tech-schedule.json', { cache: 'no-store' })
  .then(r => { if (!r.ok) throw new Error('Schedule unavailable'); return r.json(); })
  .then(d => { schedule = Array.isArray(d) ? d.filter(x => x && typeof x.date === 'string' && Array.isArray(x.events)) : []; render(); })
  .catch(() => { $('#day-title').textContent = 'Schedule unavailable'; $('#cal-agenda').innerHTML = '<li><span class="fm-muted">The schedule file did not load. Use the original PDF.</span></li>'; });
setInterval(() => { const now = todayISO(); if (now !== today) { today = now; render(); } }, 60000);

startMonitor();
