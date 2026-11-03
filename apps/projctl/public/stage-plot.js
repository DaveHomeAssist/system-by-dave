import { LANES } from './lanes.js';

// Version 1 uses a 1000 x 600 drawing canvas, not physical coordinates.
export function normalizePlot(input) {
  const fail = () => { throw new Error('Invalid stage plot. Check the version 1 drawing format.'); };
  const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 160 ? value : fail();
  const point = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 0 && p[0] <= 1000 && p[1] >= 0 && p[1] <= 600 ? [...p] : fail();
  const points = (ps, min = 2) => Array.isArray(ps) && ps.length >= min && ps.length <= 40 ? ps.map(point) : fail();
  if (!input || input.version !== 1 || !input.views) fail();
  const result = { version: 1, title: text(input.title), source: text(input.source), views: {} };
  for (const name of ['front', 'plan']) {
    const view = input.views[name];
    if (!view || !view.lanes || !Array.isArray(view.outline) || view.outline.length > 24 || !Array.isArray(view.labels) || view.labels.length > 12) fail();
    result.views[name] = {
      caption: text(view.caption), outline: view.outline.map((ps) => points(ps)),
      labels: view.labels.map((label) => ({ at: point(label.at), text: text(label.text) })), lanes: {},
    };
    for (const lane of Object.keys(LANES)) {
      const item = view.lanes[lane];
      if (!item) fail();
      result.views[name].lanes[lane] = { coverage: points(item.coverage, 3), projector: point(item.projector), control: point(item.control || item.projector), note: text(item.note) };
    }
  }
  return result;
}

// Ambiguous imported rigs must not silently bind to the first matching slot.
export function projectorForLane(projectors, lane) {
  const matches = projectors.filter((p) => p.lane === lane);
  return matches.length === 1 ? matches[0] : null;
}
