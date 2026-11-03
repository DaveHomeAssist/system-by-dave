// A two-view drawing reconstruction in diagram units, never an optical model.
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
  if (frontWidth < 1 || planWidth < 1) return fail();
  const fs = 10 / frontWidth, ps = 10 / planWidth;
  const frontCenter = (cFront.minX + cFront.maxX) / 2;
  const planCenter = (cEdge[0][0] + cEdge[1][0]) / 2;
  const targetDepth = (cEdge[0][1] + cEdge[1][1]) / 2;
  const allFront = Object.values(front.lanes).flatMap(lane => lane.coverage);
  const ground = bounds(allFront).maxY;
  const height = (ground - bounds(allFront).minY) * fs;
  const frontPoint = ([x, y]) => [(x - frontCenter) * fs, (ground - y) * fs, 0];
  const planPoint = ([x, z], y = 0) => [(x - planCenter) * ps, y, (z - targetDepth) * ps];
  const lanes = {};
  for (const lane of ['A', 'B', 'C', 'D']) {
    const ends = edge(lane), b = bounds(front.lanes[lane].coverage);
    if (b.maxX - b.minX < 1 || b.maxY - b.minY < 1) return fail();
    const coverage = front.lanes[lane].coverage.map(([x, y]) => {
      const t = (x - b.minX) / (b.maxX - b.minX);
      return planPoint([ends[0][0] + t * (ends[1][0] - ends[0][0]), ends[0][1] + t * (ends[1][1] - ends[0][1])], (ground - y) * fs);
    });
    lanes[lane] = { coverage, projector: planPoint(plan.lanes[lane].projector, height * .65) };
  }
  return { height, lanes, outline: front.outline.map(points => points.map(frontPoint)) };
}
