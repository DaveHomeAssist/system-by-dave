// Heat notices decide when a projector's optional thermal reading is shown outside Thermal
// watch. Only a current Watch or Hot reading qualifies; OK, missing and stale readings stay
// in Thermal watch, so the cards and header never alarm on old or absent data.
export const HEAT_WORDS = { ok: 'OK', watch: 'Watch', hot: 'Hot', unknown: 'No reading' };
const RANK = { watch: 1, hot: 2 };
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);

// Same freshness rule as Thermal watch: the unit replies and the sample is no older than
// three sampling intervals.
export function thermalIsCurrent(projector, current, now = Date.now()) {
  const v = projector?.thermal, at = Date.parse(v?.at);
  return !!projector && !!current && Number.isFinite(v?.c) && Number.isFinite(at) && now - at <= Math.max(3 * (v.sampleMs || 60000), 3000);
}

export function heatNotice(projector, current, now = Date.now()) {
  if (!thermalIsCurrent(projector, current, now)) return null;
  const { level, c, headroomC } = projector.thermal;
  if (!RANK[level]) return null;
  return { level, word: HEAT_WORDS[level], c, headroomC, text: `${HEAT_WORDS[level]} · ${f1(c)} °C` };
}

// entries: [{ lane, projector, current }]. Hot outranks Watch; ties go to the least headroom.
export function worstHeat(entries, now = Date.now()) {
  let worst = null;
  for (const { lane, projector, current } of entries) {
    const notice = heatNotice(projector, current, now);
    if (!notice) continue;
    const better = !worst || RANK[notice.level] > RANK[worst.notice.level]
      || (RANK[notice.level] === RANK[worst.notice.level] && (notice.headroomC ?? Infinity) < (worst.notice.headroomC ?? Infinity));
    if (better) worst = { lane, notice };
  }
  return worst;
}

// Details panel model for one projector, including the quiet states.
export function heatDetail(projector, current, now = Date.now()) {
  const v = projector?.thermal;
  if (!projector) return { level: 'unknown', value: 'N/A', word: 'Unassigned', note: 'No projector is assigned to this lane.' };
  if (!Number.isFinite(v?.c)) return { level: 'unknown', value: 'N/A', word: HEAT_WORDS.unknown, note: 'This relay does not report air temperature for this projector.' };
  const live = thermalIsCurrent(projector, current, now), level = HEAT_WORDS[v.level] ? v.level : 'unknown';
  const kind = v.kind === 'ambient' ? 'ambient' : 'intake';
  const limit = Number.isFinite(v.limitC) ? `${f1(v.headroomC ?? v.limitC - v.c)} °C below its ${v.limitC} °C limit` : 'No rated limit known';
  return { level, value: f1(v.c), word: HEAT_WORDS[level] + (live ? '' : ' · last known'), note: `${kind[0].toUpperCase()}${kind.slice(1)} air · ${limit}`, live };
}
