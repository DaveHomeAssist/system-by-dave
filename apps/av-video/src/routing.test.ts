import { expect, it } from "vitest";
import { buildGraph, deviceHeight } from "./graph";
import { sampleDocument } from "./model";
import { crosses, orthogonalPath } from "./routing";

it("routes every sample cable around unrelated equipment, including camera past converter", () => {
  const { devices, wires } = buildGraph(sampleDocument());
  for (const wire of wires) {
    const a = devices.find(d => d.id === wire.source)!, b = devices.find(d => d.id === wire.target)!;
    const route = orthogonalPath({ x: a.position.x + 240, y: a.position.y + 63 + wires.filter(w => w.source === a.id).indexOf(wire) * 26 }, { x: b.position.x - 8, y: b.position.y + 63 + wires.filter(w => w.target === b.id).indexOf(wire) * 26 }, devices.map(d => ({ ...d.position, width: 240, height: deviceHeight(d) })));
    expect(route.blocked).toBe(false);
    for (let i = 1; i < route.points.length; i++) for (const d of devices.filter(d => d.id !== a.id && d.id !== b.id)) expect(crosses(route.points[i - 1], route.points[i], { ...d.position, width: 240, height: deviceHeight(d) })).toBe(false);
  }
});
it("handles reversed directions and reports an enclosed port instead of drawing through a device", () => {
  const boxes = [{ x: 0, y: 0, width: 240, height: 110 }, { x: 400, y: 180, width: 240, height: 110 }];
  const route = orthogonalPath({ x: 640, y: 243 }, { x: -8, y: 63 }, boxes);
  expect(route.blocked).toBe(false);
  for (let i = 1; i < route.points.length; i++) for (const box of boxes) expect(crosses(route.points[i - 1], route.points[i], box)).toBe(false);
  expect(orthogonalPath({ x: 240, y: 63 }, { x: 400, y: 243 }, [...boxes, { x: 230, y: 20, width: 100, height: 100 }]).blocked).toBe(true);
});

it("uses tighter clearance when a moved device is close without being overlapped", () => {
  const boxes = [{ x: 0, y: 140, width: 240, height: 110 }, { x: 100, y: 0, width: 240, height: 110 }, { x: 370, y: 60, width: 240, height: 110 }];
  expect(orthogonalPath({ x: 240, y: 203 }, { x: 362, y: 123 }, boxes).blocked).toBe(false);
});
