// Thermal watch: the in-show air-temperature panel for lanes A-D.
//
// Readings are air at the projector (Panasonic intake, or the Barco's ambient sensor)
// against the model's rated maximum. Cards are keyed by lane, because slot numbers have
// been renumbered between documents and a hot unit must be found by where it hangs.
// Cards are built once and patched in place so keyboard focus survives status updates.
import { LANES, rigLanes } from './lanes.js';

const LEVELS = {
  ok: { dot: 'done', word: 'OK' },
  watch: { dot: 'active', word: 'Watch' },
  hot: { dot: 'blocked', word: 'Hot' },
  unknown: { dot: 'idle', word: 'No reading' },
};
const RANK = { unknown: 0, ok: 1, watch: 2, hot: 3 };
export const WINDOW_MS = 30 * 60 * 1000;
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const toF = (c) => Math.round(c * 1.8 + 32);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ageText(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s} s ago`;
  const m = Math.round(s / 60);
  return m < 90 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
}
const clock = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

export function createThermalWatch(host, { chip = null, live = null, onOpen = () => {}, onClose = () => {} } = {}) {
  const series = new Map(); // slot -> [[epoch ms, c], ...] for the last WINDOW_MS
  let thresholds = { watchHeadroomC: 5, hotHeadroomC: 2 };
  host.classList.add('pj-thermal');
  host.setAttribute('aria-labelledby', 'thermal-title');
  host.innerHTML = `
    <div class="pj-thermal-head">
      <div><span class="avd-eyebrow">In-show monitoring</span><h2 id="thermal-title" tabindex="-1">Thermal watch</h2></div>
      <p class="pj-thermal-summary" role="status" aria-live="polite" data-summary>Waiting for readings…</p>
      <a class="avd-btn avd-btn--quiet avd-btn--sm pj-thermal-csv" href="/api/thermal.csv" download>Download log (CSV)</a>
      <button class="avd-btn avd-btn--sm pj-thermal-close" type="button" data-close>Close</button>
    </div>
    <ul class="pj-thermal-list" aria-label="Air temperature by projector lane"></ul>
    <p class="pj-mono pj-thermal-note">Air at the projector against its rated maximum ambient. Watch is within <span data-watch>${thresholds.watchHeadroomC}</span> °C of the limit, Hot within <span data-hot>${thresholds.hotHeadroomC}</span> °C. Advisory only: not the projector's own alarm. History is kept 8 hours.</p>`;
  const list = host.querySelector('.pj-thermal-list'), summaryEl = host.querySelector('[data-summary]');
  host.querySelector('[data-close]').onclick = () => onClose();
  let announced = '';
  const cards = new Map();
  for (const lane of Object.keys(LANES)) {
    const li = document.createElement('li');
    li.className = 'pj-thermal-card'; li.dataset.thermalLane = lane;
    // The lane header is the one control: it opens that lane's controls in the Rig tab.
    li.innerHTML = `
      <div class="pj-thermal-top"><button class="pj-thermal-lane" type="button" data-open aria-label="Open projector ${lane} controls"><b class="pj-thermal-letter">${lane}</b><strong>${esc(LANES[lane].target)}</strong></button><span class="avd-state"><span class="avd-dot avd-dot--idle" aria-hidden="true" data-dot></span><span data-word>No reading</span></span></div>
      <p class="pj-thermal-reading"><span class="pj-thermal-value" data-value>—</span><span class="pj-thermal-unit">°C</span><span class="pj-thermal-kind pj-mono" data-kind></span><span class="pj-thermal-f pj-mono" data-f></span></p>
      <div class="pj-thermal-meter" role="img" data-meter hidden><span class="pj-thermal-marker"></span></div>
      <dl class="pj-thermal-facts">
        <div><dt>Headroom</dt><dd data-headroom>—</dd></div><div><dt>Limit</dt><dd data-limit>—</dd></div><div><dt>Peak</dt><dd data-peak>—</dd></div><div><dt>vs coolest</dt><dd data-delta>—</dd></div>
      </dl>
      <svg class="pj-thermal-spark" viewBox="0 0 120 40" preserveAspectRatio="none" role="img" data-spark><path class="pj-thermal-zone" data-zone/><line class="pj-thermal-limit" data-limitline x1="0" x2="120"/><line class="pj-thermal-watchline" data-watchline x1="0" x2="120"/><path class="pj-thermal-line" data-line/></svg>
      <p class="pj-mono pj-thermal-foot" data-foot></p>`;
    li.querySelector('[data-open]').onclick = () => onOpen(lane);
    list.append(li); cards.set(lane, li);
  }
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const setAttr = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };

  function sparkPath(points, t0, t1, lo, hi) {
    const x = (t) => clamp(((t - t0) / (t1 - t0)) * 120, 0, 120), y = (c) => clamp(40 - ((c - lo) / (hi - lo)) * 40, 0, 40);
    return points.map(([t, c], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(c).toFixed(1)}`).join('');
  }

  // live: the unit is replying AND this poll returned a temperature. Otherwise any value shown is the last sample.
  function renderCard(li, entry, live, coolest, now) {
    const { projector: p, conflict } = entry, v = p?.thermal, has = Number.isFinite(v?.c);
    const level = has && LEVELS[v.level] ? v.level : 'unknown', info = LEVELS[level], limit = v?.limitC;
    li.classList.toggle('stale', has && !live); li.classList.toggle('empty', !has); li.dataset.level = level;
    setAttr(li.querySelector('[data-dot]'), 'class', `avd-dot avd-dot--${info.dot}`);
    setText(li.querySelector('[data-word]'), has && !live ? `Last known · ${info.word}` : info.word);
    setText(li.querySelector('[data-value]'), has ? f1(v.c) : '—');
    setText(li.querySelector('[data-kind]'), has ? (v.kind === 'ambient' ? 'ambient' : 'intake') : '');
    setText(li.querySelector('[data-f]'), has ? `${toF(v.c)} °F` : '');

    const meter = li.querySelector('[data-meter]'), rated = has && Number.isFinite(limit) && limit > 0;
    meter.hidden = !rated;
    if (rated) {
      meter.style.setProperty('--pos', String(clamp((v.c / limit) * 100, 0, 100)));
      meter.style.setProperty('--watch', String(clamp(((limit - thresholds.watchHeadroomC) / limit) * 100, 0, 100)));
      meter.style.setProperty('--hot', String(clamp(((limit - thresholds.hotHeadroomC) / limit) * 100, 0, 100)));
      setAttr(meter, 'aria-label', `${f1(v.c)} °C within a rated range of 0 to ${limit} °C`);
    }
    setText(li.querySelector('[data-headroom]'), has && v.headroomC != null ? `${f1(v.headroomC)} °C` : has ? 'no limit' : '—');
    setText(li.querySelector('[data-limit]'), has ? (Number.isFinite(limit) ? `${limit} °C` : 'Not rated') : '—');
    const peakEl = li.querySelector('[data-peak]');
    setText(peakEl, has ? `${f1(v.peakC)} °C` : '—'); setAttr(peakEl, 'title', has && v.peakAt ? `Peak in retained history, at ${clock(v.peakAt)}` : '');
    setText(li.querySelector('[data-delta]'), has && live && coolest != null ? (v.c - coolest < 0.05 ? 'coolest' : `+${f1(v.c - coolest)} °C`) : '—');

    const pts = (series.get(p?.slot) || []).filter(([t]) => t >= now - WINDOW_MS), spark = li.querySelector('[data-spark]');
    const lo = rated ? limit - 25 : has ? Math.min(...pts.map(([, c]) => c), v.c) - 2 : 0, hi = rated ? limit + 2 : has ? Math.max(...pts.map(([, c]) => c), v.c) + 2 : 1;
    const y = (c) => clamp(40 - ((c - lo) / (hi - lo)) * 40, 0, 40);
    setAttr(spark.querySelector('[data-line]'), 'd', pts.length > 1 ? sparkPath(pts, now - WINDOW_MS, now, lo, hi) : '');
    for (const [sel, headroom] of [['[data-limitline]', 0], ['[data-watchline]', thresholds.watchHeadroomC]]) {
      const line = spark.querySelector(sel); line.style.display = rated ? '' : 'none';
      if (rated) { const yy = y(limit - headroom).toFixed(1); setAttr(line, 'y1', yy); setAttr(line, 'y2', yy); }
    }
    setAttr(spark.querySelector('[data-zone]'), 'd', rated ? `M0 ${y(limit - thresholds.watchHeadroomC).toFixed(1)}H120V${y(limit).toFixed(1)}H0Z` : '');
    setAttr(spark, 'aria-label', pts.length > 1 ? `Last 30 minutes, from ${f1(pts[0][1])} to ${f1(pts.at(-1)[1])} °C, peak ${f1(Math.max(...pts.map(([, c]) => c)))} °C` : 'No history in the last 30 minutes');

    // The foot carries the reason when there is no reading, otherwise what and where it was read.
    const age = has && v.at ? ageText(now - Date.parse(v.at)) : '';
    const reason = conflict ? 'Assignment conflict: two devices claim this lane.' : !p ? 'No device assigned to this lane.'
      : !p.ip ? 'No address set for this projector.'
      : v?.source == null ? (p.driver === 'pulse' ? 'Set ambientProperty for this Barco in the rig file to read its ambient sensor.' : 'This driver does not report temperature.')
      : p.status?.air?.raw && !Number.isFinite(p.status.air.c) && !has ? `Unreadable reply: ${p.status.air.raw}` : 'No reading yet.';
    setText(li.querySelector('[data-foot]'), has ? [`Slot ${p.slot}`, p.model || p.label, age && `read ${age}`].filter(Boolean).join(' · ') : reason);
    li.querySelector('[data-open]').disabled = !p;
  }

  return {
    // report: the /api/thermal body. Replaces local history after a (re)connect.
    setSeries(report) {
      const t = report?.thresholds;
      if (Number.isFinite(t?.watchHeadroomC) && Number.isFinite(t?.hotHeadroomC)) {
        thresholds = { watchHeadroomC: t.watchHeadroomC, hotHeadroomC: t.hotHeadroomC };
        setText(host.querySelector('[data-watch]'), String(thresholds.watchHeadroomC)); setText(host.querySelector('[data-hot]'), String(thresholds.hotHeadroomC));
      }
      for (const p of report?.projectors || []) if (Array.isArray(p.series)) series.set(p.slot, p.series.filter((pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])));
    },
    // One new status message for a slot: extend the local history without a refetch.
    append(slot, view) {
      const t = Date.parse(view?.at);
      if (!Number.isFinite(view?.c) || !Number.isFinite(t)) return;
      const arr = series.get(slot) || [];
      if (arr.length && arr.at(-1)[0] >= t) return;
      arr.push([t, view.c]);
      const cutoff = t - WINDOW_MS; let drop = 0; while (drop < arr.length && arr[drop][0] < cutoff) drop++;
      series.set(slot, drop ? arr.slice(drop) : arr);
    },
    update({ projectors, connected, connectionOf, now = Date.now() }) {
      const lanes = rigLanes(projectors), isLive = (p) => !!p && connected && connectionOf(p).current && Number.isFinite(p.status?.air?.c);
      const readings = lanes.filter(({ projector: p }) => Number.isFinite(p?.thermal?.c)), liveReadings = readings.filter(({ projector: p }) => isLive(p));
      const coolest = liveReadings.length > 1 ? Math.min(...liveReadings.map(({ projector: p }) => p.thermal.c)) : null;
      for (const entry of lanes) renderCard(cards.get(entry.lane), entry, isLive(entry.projector), coolest, now);

      // Tightest = least headroom among rated readings. Fixed lane order is kept, so a
      // card never jumps under the operator's hand; the tightest one is only marked.
      const rated = readings.filter(({ projector: p }) => p.thermal.headroomC != null);
      const tight = rated.length ? rated.reduce((a, b) => (b.projector.thermal.headroomC < a.projector.thermal.headroomC ? b : a)) : null;
      for (const [lane, li] of cards) li.classList.toggle('tightest', tight?.lane === lane && tight.projector.thermal.level !== 'ok');
      const worst = readings.reduce((w, { projector: p }) => (RANK[p.thermal.level] > RANK[w] ? p.thermal.level : w), 'unknown');
      host.dataset.worst = worst;
      let text, chipText;
      if (!readings.length) {
        text = connected ? 'No temperature readings yet. Panasonic units report intake air; a Barco needs its ambient property set.' : 'Relay disconnected. No temperature data.';
        chipText = connected ? 'Air · no data' : 'Air · relay offline';
      } else if (!tight) {
        text = 'Readings are in, but no unit has a known rated limit to compare against.'; chipText = 'Air · no limits';
      } else {
        const p = tight.projector, v = p.thermal, stale = !isLive(p), where = `${tight.lane} · ${LANES[tight.lane].target}`;
        const n = rated.filter(({ projector: q }) => q.thermal.level === 'watch' || q.thermal.level === 'hot').length;
        text = `Tightest: ${where}, ${f1(v.c)} °C ${v.kind === 'ambient' ? 'ambient' : 'intake'}, ${f1(v.headroomC)} °C below its ${v.limitC} °C limit${stale ? ' (last known)' : ''}.${n > 1 ? ` ${n} units need attention.` : ''}`;
        chipText = v.level === 'ok' ? `Air OK · tightest ${tight.lane} ${f1(v.c)} °C` : `${tight.lane} ${LEVELS[v.level].word} · ${f1(v.c)} °C`;
        if (stale) chipText += ' (last known)';
      }
      setText(summaryEl, text);
      // Screen readers hear a change of level or of the tightest lane, not every degree.
      const key = `${tight?.lane ?? ''}:${tight?.projector.thermal.level ?? ''}:${worst}:${readings.length ? 1 : 0}`;
      if (live && key !== announced) { if (announced) setText(live, `Thermal watch: ${chipText}`); announced = key; }
      if (chip) {
        chip.hidden = false; chip.dataset.level = worst;
        setAttr(chip.querySelector('.avd-dot'), 'class', `avd-dot avd-dot--${LEVELS[worst].dot}`);
        setText(chip.querySelector('[data-chip-text]'), chipText);
      }
    },
  };
}
