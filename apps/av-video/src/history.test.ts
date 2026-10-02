import { expect, it } from "vitest";
import { createHistory, record, redo, undo } from "./history";
import { addDevice, buildGraph, deviceId } from "./graph";
import { sampleDocument } from "./model";

it("undoes a whole typing session and discards redo after a different edit", () => {
  let h = createHistory("Camera");
  h = record(h, "Camera 1", "name"); h = record(h, "Camera 12", "name");
  expect(h.past).toEqual(["Camera"]);
  h = undo(h); expect(h.present).toBe("Camera");
  expect(redo(h).present).toBe("Camera 12");
  h = record(h, "Slides", "name"); expect(h.future).toEqual([]);
});
it("restores device moves, connections, removed routes and hidden modules without touching saved snapshots", () => {
  const original = sampleDocument(); const saved = JSON.stringify(original);
  let h = createHistory(original);
  h = record(h, { ...h.present, graphPositions: { [deviceId("Camera 1")]: { x: 500, y: 800 } } });
  h = record(h, { ...h.present, routes: h.present.routes.slice(1), modules: { ...h.present.modules, patch: false } });
  h = record(h, addDevice(h.present, "Preview", "destination"));
  h = undo(h); expect(buildGraph(h.present).devices.some(d => d.label === "Preview")).toBe(false);
  h = undo(h); expect(h.present.routes).toHaveLength(4); expect(h.present.modules.patch).toBe(true);
  h = undo(h); expect(JSON.stringify(h.present)).toBe(saved);
  expect(JSON.stringify(original)).toBe(saved);
  expect(redo(h).present.graphPositions[deviceId("Camera 1")]).toEqual({ x: 500, y: 800 });
});
it("bounds session history and ignores unchanged updates", () => {
  let h = createHistory(0);
  expect(record(h, 0)).toBe(h);
  for (let i = 1; i <= 100; i++) h = record(h, i);
  expect(h.past).toHaveLength(80);
  expect(h.past[0]).toBe(20);
});
