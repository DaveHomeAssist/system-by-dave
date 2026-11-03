// Drawing identity is display metadata. Commands always retain the rig slot ID.
export const LANES = Object.freeze({
  A: { target: 'SL Portal', orientation: 'Portrait', role: 'Stage left portal' },
  B: { target: 'Top Portal', orientation: 'Landscape', role: 'Portal header' },
  C: { target: 'Stage', orientation: 'Landscape', role: 'Main stage' },
  D: { target: 'SR Portal', orientation: 'Portrait', role: 'Stage right portal' },
});
export const laneOf = (p) => typeof p.lane === 'string' && Object.hasOwn(LANES, p.lane) ? LANES[p.lane] : null;
export const projectorName = (p) => laneOf(p) ? `Projector ${p.lane} · ${laneOf(p).target}` : p.label;
export const orderedProjectors = (projectors) => [...projectors].sort((a, b) =>
  (laneOf(a) ? a.lane.charCodeAt(0) : 1000) - (laneOf(b) ? b.lane.charCodeAt(0) : 1000));
