// Saved frames only. Device replies, routing and physical acceptance stay separate.
export function evaluateShutterEvidence(input) {
  const { profile: p, baseline, openFrames, closedFrames } = input ?? {};
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  if (input?.schema !== 'projctl.shutter-input.v1' || !['A', 'B', 'C', 'D'].includes(input.lane) ||
      !p || typeof p.revision !== 'string' || !p.revision || !Number.isInteger(p.width) || !Number.isInteger(p.height) ||
      p.width < 1 || p.height < 1 || p.width * p.height > 1000000 ||
      !Array.isArray(openFrames) || !Array.isArray(closedFrames) || openFrames.length > 30 || closedFrames.length > 30) throw new Error('Invalid shutter evidence');
  for (const key of ['minimumDelta', 'maximumControlDelta', 'maximumResidualDelta', 'maximumSpanMs']) {
    if (!finite(p[key]) || p[key] < 0) throw new Error('Invalid optical profile threshold');
  }
  if (p.minimumDelta <= 0 || p.maximumSpanMs <= 0) throw new Error('Optical thresholds must be qualified');
  const masks = new Set();
  for (const key of ['targetMask', 'controlMask']) {
    if (!Array.isArray(p[key]) || !p[key].length) throw new Error('Empty optical mask');
    for (const i of p[key]) {
      if (!Number.isInteger(i) || i < 0 || i >= p.width * p.height || masks.has(i)) throw new Error('Invalid or overlapping optical masks');
      masks.add(i);
    }
  }
  const out = { schema: 'projctl.shutter-report.v1', offline: true, lane: input.lane, profileRevision: p.revision,
    result: 'unable to verify', reasons: [], evidence: [], deviceResponse: 'not verified', routing: 'not verified', restoration: 'not verified', showReady: false };
  if (openFrames.length < 3 || closedFrames.length < 3) return { ...out, reasons: ['Three open and three closed frames required'] };
  const ids = new Set(); let previous = -Infinity;
  for (const f of [baseline, ...openFrames, ...closedFrames]) {
    if (!f || typeof f.id !== 'string' || !f.id || ids.has(f.id) || !finite(f.capturedAtMs) || f.capturedAtMs <= previous) return { ...out, reasons: ['Missing, repeated or out-of-order frame'] };
    ids.add(f.id); previous = f.capturedAtMs;
    if (typeof p.viewRevision !== 'string' || !p.viewRevision || typeof p.exposureRevision !== 'string' || !p.exposureRevision ||
      f.viewRevision !== p.viewRevision || f.exposureRevision !== p.exposureRevision || f.unobscured !== true || f.exposureStable !== true) return { ...out, reasons: ['Unqualified camera view, exposure or visibility'] };
    if (!Array.isArray(f.rgb) || f.rgb.length !== p.width * p.height * 3 || f.rgb.some(v => !Number.isInteger(v) || v < 0 || v > 255)) return { ...out, reasons: ['Invalid decoded RGB frame'] };
  }
  if (previous - baseline.capturedAtMs > p.maximumSpanMs) return { ...out, reasons: ['Evidence exceeds qualified time span'] };
  const brightness = (f, mask) => mask.reduce((sum, i) => sum + (f.rgb[3 * i] + f.rgb[3 * i + 1] + f.rgb[3 * i + 2]) / 3, 0) / mask.length;
  const baseTarget = brightness(baseline, p.targetMask), baseControl = brightness(baseline, p.controlMask);
  for (const [phase, frames] of [['open', openFrames], ['closed', closedFrames]]) {
    for (const f of frames) {
      const controlDelta = brightness(f, p.controlMask) - baseControl;
      if (Math.abs(controlDelta) > p.maximumControlDelta) return { ...out, reasons: ['Control region changed; optical response is ambiguous'] };
      const delta = brightness(f, p.targetMask) - baseTarget - controlDelta;
      out.evidence.push({ id: f.id, capturedAtMs: f.capturedAtMs, phase, delta,
        matched: phase === 'open' ? delta >= p.minimumDelta : Math.abs(delta) <= p.maximumResidualDelta });
    }
  }
  out.baselineId = baseline.id;
  out.result = out.evidence.every(e => e.matched) ? 'candidate optical response' : 'candidate mismatch';
  return out;
}
