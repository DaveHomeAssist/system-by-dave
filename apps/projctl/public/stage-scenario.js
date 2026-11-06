// Feet at the operator boundary, metres in the existing stage renderer.
// Optical size and shift calculations belong to canonical ThrowlineSceneState.
export const FT = 0.3048;
export const DLE150_SOURCE = 'https://eu.connect.panasonic.com/sites/default/files/media/document/2024-04/et-dle150_spec_en_2.pdf';
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const sub = (a, b) => a.map((v, i) => v - b[i]);
export function scenarioBaseline(reference) {
  if (!reference.metric) throw new Error('What-if planning needs a dimensioned plot. The current drawing has no verified unit scale.');
  return Object.fromEntries(Object.entries(reference.lanes).map(([lane, item]) => {
    const edge = sub(item.planEdge[1], item.planEdge[0]);
    const span = Math.hypot(edge[0], edge[2]);
    const right = [edge[0] / span, 0, edge[2] / span];
    const origin = item.planEdge[0].map((v, i) => (v + item.planEdge[1][i]) / 2);
    let normal = [-right[2], 0, right[0]];
    if (dot(sub(item.projector, origin), normal) < 0) normal = normal.map(v => -v);
    const center = item.coverage.reduce((sum, p) => sum.map((v, i) => v + p[i] / item.coverage.length), [0, 0, 0]);
    const lateral = item.coverage.map(p => dot(sub(p, origin), right));
    const width = Math.max(...lateral) - Math.min(...lateral);
    const height = Math.max(...item.coverage.map(p => p[1])) - Math.min(...item.coverage.map(p => p[1]));
    const portrait = lane === 'A' || lane === 'D';
    const raster = (portrait ? height : width) / FT;
    const distance = Math.abs(dot(sub(item.projector, origin), normal)) / FT;
    const ratio = distance / raster;
    return [lane, { lane, origin, right, normal, body: [...item.body], heightKnown: item.heightKnown,
      lens: 'recorded', min: ratio, max: ratio, distance, raster, aspect: portrait ? height / width : width / height,
      portrait, lensHeight: item.heightKnown ? item.projector[1] / FT : null,
      lensOffset: dot(sub(item.projector, origin), right) / FT,
      centerHeight: center[1] / FT, centerOffset: dot(sub(center, origin), right) / FT,
      contentHeight: height / FT, contentAlign: 'center' }];
  }));
}
export function calculateScenario(engine, input) {
  for (const key of ['min', 'max', 'distance', 'raster', 'aspect', 'lensHeight', 'lensOffset', 'centerHeight', 'centerOffset', 'contentHeight']) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) throw new Error(key === 'lensHeight' ? 'Enter a proposed lens height; the recorded height is unknown.' : 'Enter a finite number for every planning field.');
  }
  if (input.min < .05 || input.max > 20 || input.max < input.min || input.distance < 1 || input.distance > 250 || input.raster < 2 || input.raster > 100 || input.aspect < .2 || input.aspect > 10 || input.lensHeight < 0 || input.lensHeight > 80 || input.centerHeight < 0 || input.centerHeight > 80 || Math.abs(input.lensOffset) > 40 || Math.abs(input.centerOffset) > 40 || input.contentHeight <= 0) throw new Error('Check the planning limits and lens range. Values are in feet.');
  if (['dle150', 'current'].includes(input.lens) && input.aspect !== 1.6) throw new Error('The documented DW830 lens ranges require its native 16:10 raster. Use Custom for another optical profile.');
  const physicalHeight = input.portrait ? input.raster : input.raster / input.aspect;
  const nativeHeight = input.raster / input.aspect;
  if (nativeHeight > 90) throw new Error('Native raster height must be at most 90 ft.');
  const dx = input.lensOffset - input.centerOffset, dy = input.lensHeight - input.centerHeight;
  const nativeX = input.portrait ? dy : dx;
  const nativeY = input.portrait ? -dx : dy;
  // Translate the local optical origin to 50 ft so Throwline's nonnegative
  // screen/lens height fields retain exactly the same relative shift geometry.
  if (Math.abs(nativeY) > 49) throw new Error('The proposed lens offset exceeds the optical planning range.');
  const scene = engine.normalizeSceneState({ screen: { width: input.raster, aspect: input.aspect, bottom: 50 - nativeHeight / 2 }, tolerance: 0,
    projectors: [{ id: input.lane, allowed: true, position: { x: nativeX, targetX: 0, distance: input.distance, lensHeight: 50 + nativeY },
      optical: { min: input.min, max: input.max, basisWidth: input.raster, rasterAspect: input.aspect, ...(['current', 'dle150'].includes(input.lens) ? { shift: { left: 10, right: 10, up: 60, down: 0 } } : {}) },
      provenance: { mode: input.lens === 'dle150' ? 'verified_image_width' : 'manual', reason: input.lens === 'dle150' ? 'ET-DLE150 WXGA 16:10 manufacturer range; compatibility still requires the selected projector.' : 'Proposed or drawing-derived lens range; installed lens is not verified.' } }] });
  const geometry = engine.calculateProjectorGeometry(scene, input.lane);
  const width = input.portrait ? geometry.image.height : geometry.image.width;
  const height = input.portrait ? geometry.image.width : geometry.image.height;
  const point = (x, y, depth = 0) => input.origin.map((v, i) => v + input.right[i] * x * FT + input.normal[i] * depth * FT + (i === 1 ? y * FT : 0));
  const center = point(input.centerOffset, input.centerHeight);
  const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => point(input.centerOffset + x * width / 2, input.centerHeight + y * height / 2));
  const contentHeight = Math.min(input.contentHeight, height);
  const contentWidth = Math.min(contentHeight * (input.portrait ? 1 / input.aspect : input.aspect), width);
  const contentCenterY = input.centerHeight + (input.contentAlign === 'top' ? (height - contentHeight) / 2 : 0);
  const content = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => point(input.centerOffset + x * contentWidth / 2, contentCenterY + y * contentHeight / 2));
  return { lane: input.lane, geometry, center, corners, content, body: input.body,
    projector: point(input.lensOffset, input.lensHeight, input.distance), normal: input.normal, width, height,
    top: input.centerHeight + height / 2, bottom: input.centerHeight - height / 2,
    requestedHeight: physicalHeight, contentFraction: contentHeight / height };
}

// Percentages are relative to the achievable footprint, not an unattainable
// requested raster. Keep the requested target unchanged when moving its centre.
export function scenarioUpwardShift(engine, input) {
  return (input.centerHeight - input.lensHeight) / calculateScenario(engine, input).height * 100;
}
export function withScenarioUpwardShift(engine, input, percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) throw new Error('Enter a finite upward shift percentage.');
  const height = calculateScenario(engine, input).height;
  const center = input.lensHeight + height * percent / 100;
  // Bias by machine precision toward the lens so a boundary such as 10%
  // cannot round upward into Throwline's strict greater-than limit check.
  const roundingGuard = Math.sign(percent) * Number.EPSILON * Math.max(1, Math.abs(center)) * 8;
  return { ...input, centerHeight: center - roundingGuard };
}
