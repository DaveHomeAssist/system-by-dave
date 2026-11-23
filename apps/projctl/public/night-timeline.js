// Night timeline for the power page: one row per lane, in the order the relay's off run sends,
// with each unit's expected wait and what the relay reads now. Pure model plus a small renderer.
//
// The waits come from the manufacturers' documents as researched for the rig (the rig's daily
// order of operations, November 19). Researched, not yet tested on this rig.
//
//   const night = createNightTimeline({ root, onStop });
//   night.render({ views, run, now });   // views from laneViews(); run is the shared all-four run state
import { LANES } from './lanes.js';
import { DEEP_STANDBY_TEXT } from './projector-control-model.js';

export const NIGHT_ORDER = Object.freeze(['A', 'D', 'B', 'C']); // the relay's off order: lamp units first
export const NIGHT_TOTAL = 'All off, about 3 min';
export const NIGHT_MAINS = 'Never cut mains while a lamp unit is cooling.';
export const NIGHT_SOURCE = 'Expected waits: researched from the manufacturers’ documents, not yet tested on this rig.';
export const UNIT_WAITS = Object.freeze({
  lamp: Object.freeze({ unit: 'Lamp unit', expect: 'about 170 s of cooling', ms: 170000 }),
  laser: Object.freeze({ unit: 'Laser unit', expect: 'about 5 s', ms: 5000 }),
  barco: Object.freeze({ unit: 'Barco laser', expect: 'about 30 s to READY', ms: 30000 }),
  other: Object.freeze({ unit: 'Projector', expect: 'until it reads OFF', ms: null }),
});

// What kind of unit a lane holds, from its saved model.
export function unitKind(model) {
  const text = String(model || '');
  if (/DW\d{3}/i.test(text)) return 'lamp';
  if (/UD[MX]|barco/i.test(text)) return 'barco';
  if (/^PT-|RZ\d{3}/i.test(text)) return 'laser';
  return 'other';
}

const clock = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const SENT = ['sent', 'reported', 'unreported', 'watching'];

// One row per lane. `run` is the relay's shared run ({ active, run }) or null; only an off run is used.
// `coolingSince` maps a lane to when this page first saw it cooling, for a count when no run gives one.
export function nightRows(views, run, { now = Date.now(), coolingSince = new Map() } = {}) {
  const offRun = run?.run?.direction === 'off' ? run.run : null;
  const rows = NIGHT_ORDER.map(lane => {
    const view = views.find(item => item.lane === lane) || { lane, surface: LANES[lane]?.target || lane, reach: 'connecting', model: '' };
    const kind = unitKind(view.model), wait = UNIT_WAITS[kind], step = offRun?.steps?.find(item => item.lane === lane) || null;
    const sent = !!step && SENT.includes(step.state);
    const base = { lane, surface: view.surface, unit: wait.unit, expect: wait.expect, kind, raw: view.raw ?? null, caution: null };
    if (view.reach !== 'live') {
      if (sent && step.state !== 'reported') return { ...base, state: 'eye', now: 'Sent, not confirmed', detail: 'Check it by eye.' };
      if (view.reach === 'connecting') return { ...base, state: 'wait', now: 'Waiting for the relay', detail: '' };
      return { ...base, state: 'eye', now: 'No reply', detail: kind === 'lamp' ? 'Check by eye: indicator red, fans stopped.' : 'Check by eye: dark.' };
    }
    if (view.power === 'off') {
      if (kind === 'barco' && view.deepStandby) return { ...base, state: 'warn', now: `OFF · ${String(view.raw).toUpperCase()}`, detail: DEEP_STANDBY_TEXT, caution: DEEP_STANDBY_TEXT };
      if (kind === 'barco' && view.raw === 'ready') return { ...base, state: 'ok', now: 'OFF · READY', detail: 'READY is the target.' };
      if (kind === 'barco') return { ...base, state: 'ok', now: 'OFF', detail: 'Raw state not reported, so READY is not confirmed.' };
      return { ...base, state: 'ok', now: 'OFF', detail: '' };
    }
    if (view.power === 'cooling') {
      const from = sent && Number.isFinite(Number(step.sentAt)) ? Number(step.sentAt) : coolingSince.get(lane) ?? null; // the relay's own clock, like now
      const so = Number.isFinite(from) ? ` · ${clock(now - from)} so far` : '';
      return { ...base, state: 'busy', now: `${kind === 'barco' && view.raw ? String(view.raw).toUpperCase() : 'COOLING'}${so}`, detail: kind === 'lamp' ? NIGHT_MAINS : '' };
    }
    if (view.power === 'on' || view.power === 'warming') return { ...base, state: 'lit', now: view.power.toUpperCase(), detail: step?.state === 'unreported' ? 'Sent, not confirmed.' : '' };
    return { ...base, state: 'eye', now: 'Power not reported', detail: 'Check it by eye.' };
  });
  const off = rows.filter(row => ['ok', 'warn'].includes(row.state));
  const allOff = rows.length === 4 && off.length === 4;
  const waiting = rows.filter(row => !['ok', 'warn'].includes(row.state)).map(row => `${row.lane} (${row.now})`);
  const cooling = rows.some(row => row.kind === 'lamp' && row.state === 'busy');
  return { rows, allOff, cooling, verdict: allOff ? 'Safe to leave the building' : `Not safe to leave yet: ${waiting.join(', ')}`,
    cautions: rows.filter(row => row.caution).map(row => `${row.lane}: ${row.caution}`) };
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const mark = (node, name, value) => { if (value == null) node.removeAttribute(name); else if (node.getAttribute(name) !== value) node.setAttribute(name, value); };

export function createNightTimeline({ root, onStop = () => {} }) {
  const parts = { rows: new Map() };
  const head = el('div', { class: 'sb-night__head' });
  parts.total = el('p', { class: 'sb-night__total' }, NIGHT_TOTAL);
  parts.mains = el('p', { class: 'sb-night__mains' }, NIGHT_MAINS);
  head.append(parts.total, parts.mains);
  parts.list = el('ol', { class: 'sb-night__rows sb-scroll', tabindex: '0', 'aria-label': 'Lanes in the order the off run sends' });
  for (const lane of NIGHT_ORDER) {
    const row = el('li', { class: 'sb-night__row', 'data-lane': lane, 'data-state': 'wait' });
    const letter = el('span', { class: 'sb-night__letter', 'aria-hidden': 'true' }, lane);
    const who = el('span', { class: 'sb-night__who' }), name = el('strong'), unit = el('span', { class: 'sb-night__unit' });
    who.append(name, unit);
    const expect = el('span', { class: 'sb-night__expect' }), now = el('span', { class: 'sb-night__now' }), detail = el('span', { class: 'sb-night__detail' });
    row.append(letter, who, expect, now, detail);
    parts.list.append(row);
    parts.rows.set(lane, { row, name, unit, expect, now, detail });
  }
  const foot = el('div', { class: 'sb-night__foot' });
  parts.verdict = el('p', { class: 'sb-night__verdict', role: 'status', 'data-state': 'wait' });
  parts.run = el('p', { class: 'sb-night__run', hidden: '' });
  parts.stop = el('button', { type: 'button', class: 'sb-btn sb-night__stop', hidden: '' }, 'Stop the run');
  parts.stop.addEventListener('click', () => onStop());
  parts.source = el('p', { class: 'sb-night__source' }, NIGHT_SOURCE);
  foot.append(parts.verdict, parts.run, parts.stop, parts.source);
  root.append(head, parts.list, foot);
  const coolingSince = new Map();

  return {
    render({ views = [], run = null, now = Date.now() } = {}) {
      for (const view of views) {
        if (view.reach === 'live' && view.power === 'cooling') { if (!coolingSince.has(view.lane)) coolingSince.set(view.lane, now); }
        else coolingSince.delete(view.lane);
      }
      const model = nightRows(views, run, { now, coolingSince });
      for (const row of model.rows) {
        const nodes = parts.rows.get(row.lane);
        mark(nodes.row, 'data-state', row.state);
        mark(nodes.row, 'data-kind', row.kind);
        put(nodes.name, `${row.lane} · ${row.surface}`);
        put(nodes.unit, row.unit);
        put(nodes.expect, row.expect);
        put(nodes.now, row.now);
        put(nodes.detail, row.detail);
        mark(nodes.row, 'aria-label', `Lane ${row.lane}, ${row.surface}, ${row.unit}. Expected ${row.expect}. Now: ${row.now}.${row.detail ? ` ${row.detail}` : ''}`);
      }
      mark(parts.mains, 'data-hot', model.cooling ? '' : null);
      put(parts.verdict, model.verdict);
      mark(parts.verdict, 'data-state', model.allOff ? (model.cautions.length ? 'warn' : 'ok') : 'wait');
      const active = !!run?.active, offRun = run?.run?.direction === 'off' ? run.run : null;
      parts.run.hidden = !active;
      put(parts.run, active ? (run.run.direction === 'off' ? 'Turning all four off. This page follows the run.' : 'An on run is in progress.') : '');
      parts.stop.hidden = !active;
      return { ...model, offRun };
    },
  };
}
