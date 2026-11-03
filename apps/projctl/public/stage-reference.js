// Drawing registration. Metric metadata supplies scale and enclosure envelopes,
// but never upgrades missing survey coordinates into measured positions.
export function stageReference(plot) {
  const front = plot.views.front, plan = plot.views.plan;
  const bounds = (points) => ({
    minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])),
    minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])),
  });
  const fail = () => { throw new Error('This plot needs triangular plan coverage for 3D. Front and Plan remain available.'); };
  const edge = (lane) => {
    const item = plan.lanes[lane];
    if (item.coverage.length !== 3) return fail();
    const origin = item.coverage.findIndex(p => Math.hypot(p[0] - item.projector[0], p[1] - item.projector[1]) < 1);
    if (origin < 0) return fail();
    return item.coverage.filter((_, i) => i !== origin).sort((a, b) => a[0] - b[0]);
  };
  const cFront = bounds(front.lanes.C.coverage), cEdge = edge('C');
  const frontWidth = cFront.maxX - cFront.minX, planWidth = cEdge[1][0] - cEdge[0][0];
  if (frontWidth < 1 || planWidth < 1 || cFront.maxY - cFront.minY < 1) return fail();
  const measurements = plot.measurements;
  const width = measurements?.referenceWidth || 10;
  const fs = width / frontWidth, ps = width / planWidth;
  const fy = measurements ? measurements.referenceHeight / (cFront.maxY - cFront.minY) : fs;
  const frontCenter = (cFront.minX + cFront.maxX) / 2;
  const planCenter = (cEdge[0][0] + cEdge[1][0]) / 2;
  const targetDepth = (cEdge[0][1] + cEdge[1][1]) / 2;
  const allFront = Object.values(front.lanes).flatMap(lane => lane.coverage);
  const ground = bounds(allFront).maxY;
  const height = (ground - bounds(allFront).minY) * fy;
  const frontPoint = ([x, y]) => [(x - frontCenter) * fs, (ground - y) * fy, 0];
  const planPoint = ([x, z], y = 0) => [(x - planCenter) * ps, y, (z - targetDepth) * ps];
  const lanes = {};
  for (const lane of ['A', 'B', 'C', 'D']) {
    const ends = edge(lane), b = bounds(front.lanes[lane].coverage);
    if (b.maxX - b.minX < 1 || b.maxY - b.minY < 1) return fail();
    const coverage = front.lanes[lane].coverage.map(([x, y]) => {
      const t = (x - b.minX) / (b.maxX - b.minX);
      return planPoint([ends[0][0] + t * (ends[1][0] - ends[0][0]), ends[0][1] + t * (ends[1][1] - ends[0][1])], (ground - y) * fy);
    });
    const p = measurements?.projectors[lane];
    const projector = planPoint(plan.lanes[lane].projector, p ? (p.y ?? 0) : height * .65);
    if (p) { projector[0] = p.x; projector[2] = p.z ?? projector[2]; }
    const body = p ? (p.portrait ? [p.body[1], p.body[0], p.body[2]] : [...p.body])
      : lane === 'A' || lane === 'D' ? [.2, .5, .52] : [.5, .2, .54];
    lanes[lane] = { coverage, planEdge: ends.map(p => planPoint(p)), projector, body, heightKnown: !!p && p.y !== null,
      yaw: p?.yaw ?? null, model: p?.model || null, metric: !!p };
  }
  return { height, lanes, metric: !!measurements,
    heightsKnown: !!measurements && Object.values(lanes).every(p => p.heightKnown),
    outline: front.outline.map(points => points.map(frontPoint)),
    planOutline: plan.outline.map(points => points.map(p => planPoint(p))),
  };
}
