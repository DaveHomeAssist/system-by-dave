// Thermal watch: rated limits, level classification and a bounded in-memory history.
//
// A reading is air temperature at the projector: Panasonic intake (QTM:0) or the
// Barco's ambient sensor. The levels are advisory display logic for the operator.
// They never send a command and never claim a projector is safe or damaged.

// Headroom is the rated maximum ambient minus the air reading, in degrees C.
// Proposed defaults, chosen from the 11 Nov health report (P4 intake peaked at
// 37 C against a 40 C limit, 3 C of headroom, which should read as "watch").
export const THRESHOLDS = Object.freeze({ watchHeadroomC: 5, hotHeadroomC: 2, hysteresisC: 1 });
export const RETENTION_MS = 8 * 60 * 60 * 1000;
const MAX_SAMPLES = 6000;

// Rated maximum ambient or intake air, degrees C. Sources are in the 11 Nov
// Frozen Projector Health Report: Barco UDM-4K22 spec sheet (0-40), Panasonic
// PT-RZ970 product page (up to 45), PT-DW830U spec file (0-45, or 0-40 in High
// Altitude mode). The DW830U row uses the lower 40 because the portrait limit
// the report cites could not be confirmed. Override per projector with
// `ambientLimitC` in the rig file.
const RATED = [
  { match: /UDM/i, maxC: 40 },
  { match: /RZ970/i, maxC: 45 },
  { match: /DW830/i, maxC: 40 },
];

export function ratedAmbientMaxC(projector) {
  const override = Number(projector?.ambientLimitC);
  if (Number.isFinite(override) && override >= 20 && override <= 60) return override;
  // The model is authoritative. A label is free text that can be stale after a swap, so it
  // only decides when the model matches nothing.
  const find = (text) => RATED.find((row) => row.match.test(text))?.maxC;
  return find(projector?.model || '') ?? find(projector?.label || '') ?? null;
}

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

export function createThermalMonitor({ retentionMs = RETENTION_MS, maxSamples = MAX_SAMPLES, now = Date.now } = {}) {
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
      e.level = levelFor(headroomC, previous);
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
