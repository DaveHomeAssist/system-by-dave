// Orthogonal visibility routing shared by the interactive canvas and SVG handoff.
export type Point = { x: number; y: number };
export type Obstacle = Point & { width: number; height: number };
export function crosses(a: Point, b: Point, r: Obstacle): boolean {
  return a.y === b.y
    ? a.y > r.y && a.y < r.y + r.height && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.width
    : a.x > r.x && a.x < r.x + r.width && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.height;
}
type RoutedPath = { path: string; points: Point[]; label: (Point & { width: number }) | undefined; blocked: boolean };
export function orthogonalPath(start: Point, end: Point, boxes: Obstacle[], padding = 20): RoutedPath {
  const obstacles = boxes.map(r => ({ x: r.x - padding, y: r.y - padding, width: r.width + padding * 2, height: r.height + padding * 2 }));
  const from = { x: start.x + padding + 2, y: start.y }, to = { x: end.x - padding - 2, y: end.y };
  const xs = [...new Set([from.x, to.x, ...obstacles.flatMap(r => [r.x, r.x + r.width])])].sort((a, b) => a - b);
  const ys = [...new Set([from.y, to.y, ...obstacles.flatMap(r => [r.y, r.y + r.height])])].sort((a, b) => a - b);
  const points = ys.flatMap(y => xs.map(x => ({ x, y })));
  const width = xs.length;
  const index = (p: Point) => ys.indexOf(p.y) * width + xs.indexOf(p.x);
  const source = index(from), target = index(to);
  const distance = new Float64Array(points.length).fill(Infinity), previous = new Int32Array(points.length).fill(-1);
  const visited = new Uint8Array(points.length);
  // A* frontier avoids a quadratic scan of the visibility grid on every drag.
  const queue: { at: number; score: number }[] = [];
  const estimate = (at: number) => Math.abs(points[at].x - to.x) + Math.abs(points[at].y - to.y);
  function push(at: number) {
    const entry = { at, score: distance[at] + estimate(at) };
    queue.push(entry);
    let i = queue.length - 1;
    while (i > 0) { const parent = (i - 1) >> 1; if (queue[parent].score <= entry.score) break; queue[i] = queue[parent]; i = parent; }
    queue[i] = entry;
  }
  function pop() {
    const first = queue[0], last = queue.pop()!;
    if (queue.length) {
      let i = 0;
      while (i * 2 + 1 < queue.length) {
        let child = i * 2 + 1;
        if (child + 1 < queue.length && queue[child + 1].score < queue[child].score) child++;
        if (queue[child].score >= last.score) break;
        queue[i] = queue[child]; i = child;
      }
      queue[i] = last;
    }
    return first.at;
  }
  distance[source] = 0; push(source);
  while (queue.length) {
    const current = pop();
    if (visited[current]) continue;
    if (current === target) break;
    visited[current] = 1;
    const candidates = [current - width, current + width];
    if (current % width) candidates.push(current - 1);
    if (current % width < width - 1) candidates.push(current + 1);
    for (const next of candidates) {
      if (next < 0 || next >= points.length || visited[next]) continue;
      const a = points[current], b = points[next];
      if (obstacles.some(r => crosses(a, b, r))) continue;
      const cost = distance[current] + Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (cost < distance[next]) { distance[next] = cost; previous[next] = current; push(next); }
    }
  }
  const route: Point[] = [];
  if (Number.isFinite(distance[target])) {
    for (let at = target; at !== -1; at = previous[at]) route.unshift(points[at]);
  }
  // Overlapping devices can enclose a port. Do not invent a connected path through them.
  if (!route.length && padding > 2) return orthogonalPath(start, end, boxes, 2);
  const blocked = !route.length;
  const full = blocked ? [start, from] : [start, ...route, end];
  const compact = full.filter((p, i) => !i || i === full.length - 1 || !((full[i - 1].x === p.x && p.x === full[i + 1].x) || (full[i - 1].y === p.y && p.y === full[i + 1].y)));
  let label: (Point & { width: number }) | undefined;
  for (let i = 1; i < compact.length; i++) {
    const a = compact[i - 1], b = compact[i], length = Math.abs(a.x - b.x);
    if (a.y === b.y && length > (label?.width || 0) && !boxes.some(r => Math.min(a.x, b.x) < r.x + r.width && Math.max(a.x, b.x) > r.x && a.y - 20 < r.y + r.height && a.y > r.y)) label = { x: (a.x + b.x) / 2, y: a.y, width: length };
  }
  return { path: compact.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" "), points: compact, label, blocked };
}
