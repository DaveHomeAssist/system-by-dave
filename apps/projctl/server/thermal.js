// Thermal watch: level classification and a bounded in-memory history of air temperature.
//
// A reading is air at the projector (Panasonic intake, QTM:0, or the Barco's outside-ambient
// sensor), taken by the same read-only driver query as the health reports. Rated limits and
// the watch threshold are the health reports' own (health-reports.js and health-reports.json),
// so the panel and the reports cannot disagree. The levels are advisory display logic for the
// operator: they never send a command and never claim a projector is safe or damaged.

// Headroom is the rated maximum ambient minus the air reading, in degrees C. Watch is the
// health reports' threshold. Hot and the hysteresis margin exist only here and are a proposal,
// not a manufacturer specification.
export const THRESHOLDS = Object.freeze({ watchHeadroomC: 5, hotHeadroomC: 2, hysteresisC: 1 });
export const RETENTION_MS = 8 * 60 * 60 * 1000;
const MAX_SAMPLES = 6000;

// Hot always sits inside the watch band, whatever watch threshold is configured.
export function thermalThresholds(watchHeadroomC = THRESHOLDS.watchHeadroomC) {
  const watch = Number.isFinite(watchHeadroomC) ? watchHeadroomC : THRESHOLDS.watchHeadroomC;
  return Object.freeze({ watchHeadroomC: watch, hotHeadroomC: watch > 0 ? Math.min(THRESHOLDS.hotHeadroomC, watch / 2) : watch - THRESHOLDS.hotHeadroomC, hysteresisC: THRESHOLDS.hysteresisC });
}

// Air readings outside this range are treated as no reading rather than shown or logged.
export const plausibleAirC = (c) => Number.isFinite(c) && c > -20 && c < 120;

const ORDER = ['ok', 'watch', 'hot'];

// Escalate immediately; step down one level only after clearing that level's
// threshold by the hysteresis margin, so a reading on the line does not flap.
export function levelFor(headroomC, previous = 'ok', thresholds = THRESHOLDS) {
  const raw = headroomC <= thresholds.hotHeadroomC ? 'hot' : headroomC <= thresholds.watchHeadroomC ? 'watch' : 'ok';
  let level = ORDER.includes(previous) ? previous : 'ok';
  while (level !== 'ok') {
    const limit = level === 'hot' ? thresholds.hotHeadroomC : thresholds.watchHeadroomC;
    if (headroomC > limit + thresholds.hysteresisC) level = ORDER[ORDER.indexOf(level) - 1]; else break;
  }
  return ORDER.indexOf(raw) > ORDER.indexOf(level) ? raw : level;
}

const round1 = (n) => Math.round(n * 10) / 10;

export function createThermalMonitor({ thresholds = THRESHOLDS, retentionMs = RETENTION_MS, maxSamples = MAX_SAMPLES, now = Date.now } = {}) {
  const slots = new Map(); // slot -> { samples: [{ t, c }], level, kind }
  const entry = (slot) => { let e = slots.get(slot); if (!e) slots.set(slot, e = { samples: [], level: 'ok', kind: null }); return e; };
  const prune = (e) => {
    const cutoff = now() - retentionMs;
    let drop = 0; while (drop < e.samples.length && e.samples[drop].t < cutoff) drop++;
    if (e.samples.length - drop > maxSamples) drop = e.samples.length - maxSamples;
    if (drop) e.samples.splice(0, drop);
  };
  return {
    // Record one reading. Returns { level, previous, changed, headroomC } or null
    // when the reading is not a finite number.
    observe(slot, { at, c, kind = 'intake', limitC = null }) {
      if (!Number.isFinite(c)) return null;
      const e = entry(slot), previous = e.level;
      e.samples.push({ t: Number.isFinite(at) ? at : now(), c }); e.kind = kind; prune(e);
      if (limitC == null) return { level: 'unknown', previous, changed: false, headroomC: null };
      const headroomC = round1(limitC - c);
      e.level = levelFor(headroomC, previous, thresholds);
      return { level: e.level, previous, changed: e.level !== previous, headroomC };
    },
    // A new physical target behind a slot must not inherit the old unit's history.
    reset(slot) { slots.delete(slot); },
    view(slot, limitC = null) {
      const e = slots.get(slot), last = e?.samples.at(-1);
      if (!last) return { level: 'unknown', c: null, kind: null, at: null, limitC, headroomC: null, peakC: null, peakAt: null };
      let peak = last; for (const s of e.samples) if (s.c > peak.c) peak = s;
      return {
        level: limitC == null ? 'unknown' : e.level, c: last.c, kind: e.kind, at: new Date(last.t).toISOString(),
        limitC, headroomC: limitC == null ? null : round1(limitC - last.c), peakC: peak.c, peakAt: new Date(peak.t).toISOString(),
      };
    },
    // For health reports: the latest reading, and the highest reading taken after `since`
    // (epoch ms). Times are epoch ms. Null when the slot has no readings.
    recent(slot, since = -Infinity) {
      const e = slots.get(slot), last = e?.samples.at(-1);
      if (!last) return null;
      let peak = null; for (const s of e.samples) if (s.t > since && (!peak || s.c > peak.c)) peak = s;
      return { c: last.c, at: last.t, kind: e.kind, peakC: peak ? peak.c : null, peakAt: peak ? peak.t : null };
    },
    // [[epoch ms, c], ...] for the window, thinned to at most maxPoints while
    // keeping the highest reading in each bucket so a peak is never smoothed away.
    series(slot, { windowMs = 30 * 60 * 1000, maxPoints = 180 } = {}) {
      const e = slots.get(slot); if (!e) return [];
      const from = now() - windowMs, pts = e.samples.filter((s) => s.t >= from);
      if (pts.length <= maxPoints) return pts.map((s) => [s.t, s.c]);
      const size = Math.ceil(pts.length / maxPoints), out = [];
      for (let i = 0; i < pts.length; i += size) {
        let best = pts[i]; for (let j = i; j < Math.min(i + size, pts.length); j++) if (pts[j].c > best.c) best = pts[j];
        out.push([best.t, best.c]);
      }
      return out;
    },
    rows() {
      return [...slots].flatMap(([slot, e]) => e.samples.map((s) => ({ slot, t: s.t, c: s.c, kind: e.kind }))).sort((a, b) => a.t - b.t || a.slot.localeCompare(b.slot));
    },
  };
}

// Spreadsheet formula characters at the start of a text cell are neutralised.
const textCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function thermalCsv(rows, meta = () => ({})) {
  const lines = ['time_utc,slot,lane,model,air_kind,air_c,rated_max_c'];
  for (const r of rows) {
    const m = meta(r.slot) || {};
    lines.push([new Date(r.t).toISOString(), textCell(r.slot), textCell(m.lane), textCell(m.model), textCell(r.kind), r.c, m.limitC ?? ''].join(','));
  }
  return lines.join('\n') + '\n';
}
