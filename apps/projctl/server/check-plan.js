// Offline diagnostic planning only. Deliberately has no relay or driver imports.
export const CHECK_ORDER = Object.freeze(['C', 'B', 'A', 'D']);
export const CHECK_PROFILE = Object.freeze({
  C: Object.freeze({ role: 'floor', quietMs: 0, geometryMs: 1200000, lamp: false }),
  B: Object.freeze({ role: 'top', quietMs: 60000, geometryMs: 60000, lamp: false }),
  A: Object.freeze({ role: 'side left', quietMs: 60000, geometryMs: 60000, lamp: true }),
  D: Object.freeze({ role: 'side right', quietMs: 60000, geometryMs: 60000, lamp: true }),
});
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function buildCheckPlan(input) {
  if (input?.schema !== 'projctl.check-snapshot.v1' || !finite(input.nowMs) || !Array.isArray(input.lanes)) {
    throw new Error('Expected projctl.check-snapshot.v1 with nowMs and lanes');
  }
  if (!['startup', 'picture', 'observe'].includes(input.mode)) throw new Error('Unknown check mode');
  if (input.lanes.length > 4) throw new Error('At most four lanes');
  const byLane = new Map();
  for (const lane of input.lanes) {
    if (!CHECK_ORDER.includes(lane.id) || byLane.has(lane.id)) throw new Error('Unknown or duplicate lane');
    byLane.set(lane.id, lane);
  }
  const blockers = [];
  const active = input.mode !== 'observe';
  if (active && input.windowReleased !== true) blockers.push('Test window has not been released');
  if (active && input.manualTestCard !== true) blockers.push('Operator must enable the existing test card');
  if (active && (!input.finishProfile || !CHECK_ORDER.every(id => ['open', 'closed'].includes(input.finishProfile[id])))) {
    blockers.push('Explicit finish shutter profile required');
  }
  const steps = CHECK_ORDER.map(id => {
    const p = CHECK_PROFILE[id], s = byLane.get(id);
    const result = { id, role: p.role, action: 'hold', reasons: [], waits: [], proposedEvidence: [], retry: false };
    const age = s && input.nowMs - s.observedAtMs;
    if (!s || !finite(s.observedAtMs) || !finite(age) || age < 0 || age > 15000) result.reasons.push('Missing or stale device state');
    if (s && !['on', 'off', 'warming', 'cooling'].includes(s.power)) result.reasons.push('Power state unknown');
    if (s && (s.fault === true || (p.lamp && s.lampError !== 0))) result.reasons.push('Fault or unqualified lamp state; no restrike');
    if (result.reasons.length) return result;
    if (!active) return { ...result, action: 'observe', proposedEvidence: ['saved device state', 'saved camera frames'] };
    if (s.power === 'cooling' || s.power === 'warming') {
      result.reasons.push(`Wait for fresh ${s.power === 'cooling' ? 'off' : 'on'} state; duration is unknown`);
      return result;
    }
    const since = finite(s.stateSinceMs) && s.stateSinceMs <= input.nowMs ? s.stateSinceMs : null;
    if (s.power === 'off') {
      if (input.mode === 'picture') result.reasons.push('Picture check does not start an off projector');
      else if (['standby', 'eco'].includes(s.rawState)) result.reasons.push('Deep standby needs an onsite wake');
      else if (p.lamp && since === null) result.reasons.push('Confirmed off duration is unknown');
      else {
        const relightWait = p.lamp ? Math.max(0, 75000 - (input.nowMs - since)) : 0;
        if (relightWait) result.waits.push({ reason: 'lamp relight exclusion', minimumMs: relightWait });
        result.action = 'propose-start';
        result.waits.push({ reason: 'quiet after acknowledged start', minimumMs: p.quietMs });
        result.waits.push({ reason: 'geometry after confirmed on', minimumMs: p.geometryMs });
      }
    } else {
      result.action = 'keep-on';
      if (since === null) result.reasons.push('On duration unknown; geometry and quiet interval need qualification');
      else {
        result.waits.push({ reason: 'geometry after confirmed on', minimumMs: Math.max(0, p.geometryMs - (input.nowMs - since)) });
      }
      // A command may be newer than the current power state. Never infer quiet time from on duration alone.
      if (!finite(s.lastStartAtMs) || s.lastStartAtMs > input.nowMs) result.reasons.push('Last start time unknown');
      else result.waits.push({ reason: 'quiet after start', minimumMs: Math.max(0, p.quietMs - (input.nowMs - s.lastStartAtMs)) });
    }
    if (!result.reasons.length) result.proposedEvidence = ['isolate surface', 'baseline frames', 'open response frames', 'close response frames', 'restore and verify finish profile'];
    return result;
  });
  return { schema: 'projctl.check-plan.v1', offline: true, executable: false, mode: input.mode,
    sourceRevision: input.sourceRevision ?? null, profileRevision: 'synthetic-provisional-v1',
    blockers, steps, physicalResult: 'not verified', restoration: 'not verified', showReady: false };
}
