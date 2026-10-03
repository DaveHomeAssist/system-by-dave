import { expect, it } from "vitest";
import { emptyDocument, parseDocument, sampleDocument } from "./model";
import { addDevice, buildGraph, connectDevices, deviceId, diagramSvg, renameDevice } from "./graph";

it("shows a shared switcher with incoming feeds and branching outputs", () => {
  const graph = buildGraph(sampleDocument());
  const switchers = graph.devices.filter(d => d.label === "Production switcher");
  expect(switchers).toHaveLength(1);
  expect(switchers[0]).toMatchObject({ kind: "processor", inputs: 2, outputs: 4 });
  expect(switchers[0].routes).toHaveLength(4);
});
it("keeps switcher input names off the output side and preserves explicit output names", () => {
  const { wires } = buildGraph(sampleDocument());
  expect(wires.filter(w => w.target === deviceId("Production switcher")).map(w => w.targetPort)).toEqual(["Switcher input 1", "Switcher input 3"]);
  expect(wires.find(w => w.target === deviceId("IMAG screens"))?.targetPort).toBe("SDI 1");
  expect(wires.find(w => w.target === deviceId("Program recorder"))?.sourcePort).toBe("Program out 2");
});
it("renames a device across every view, keeps layout, and rejects accidental merging", () => {
  const doc = sampleDocument(); doc.graphPositions[deviceId("Production switcher")] = { x: 80, y: 100 };
  const next = renameDevice(doc, "Production switcher", "Main switcher");
  expect(next.routes.slice(0, 2).every(r => r.processor === "Main switcher")).toBe(true);
  expect(next.routes.slice(2).every(r => r.source === "Main switcher")).toBe(true);
  expect(next.graphPositions[deviceId("Main switcher")]).toEqual({ x: 80, y: 100 });
  expect(() => renameDevice(doc, "Production switcher", "Camera 1")).toThrow("another device");
});
it("creates a real route by connecting devices and rejects self or reversed connections", () => {
  const doc = addDevice(addDevice(emptyDocument(), "Camera", "source"), "Monitor", "destination");
  const [source, target] = buildGraph(doc).devices;
  const result = connectDevices(doc, source, target);
  expect(result.doc.routes[0]).toMatchObject({ source: "Camera", destination: "Monitor", status: "planned", format: "", input: "" });
  expect(buildGraph(result.doc).wires).toHaveLength(1);
  expect(() => connectDevices(doc, source, source)).toThrow("different");
  expect(() => connectDevices(doc, target, source)).toThrow("output");
});
it("hides converter and port detail when the optional patch module is off without data loss", () => {
  const doc = sampleDocument(); doc.modules.patch = false;
  const graph = buildGraph(doc);
  expect(graph.devices.some(d => d.kind === "converter")).toBe(false);
  expect(graph.wires.every(w => w.targetPort === "" && w.sourcePort === "")).toBe(true);
  expect(doc.routes[1].converter).toBe("HDMI to SDI");
});
it("loads earlier AV Video plans with empty graph defaults and preserves full backups", () => {
  const doc = sampleDocument();
  const old = JSON.parse(JSON.stringify(doc)); delete old.graphDevices; delete old.graphPositions;
  old.routes.forEach((r: Record<string, unknown>) => { delete r.output; });
  const restored = parseDocument(JSON.stringify(old));
  expect(restored.graphDevices).toEqual([]); expect(restored.graphPositions).toEqual({});
  expect(restored.routes[0].output).toBe("");
  const withDevice = addDevice(doc, "Spare camera", "source");
  expect(parseDocument(JSON.stringify(withDevice))).toEqual(withDevice);
});
it("places new devices clear of equipment in an existing saved layout", () => {
  const doc = sampleDocument();
  doc.graphPositions = Object.fromEntries(buildGraph(doc).devices.map(d => [d.id, d.position]));
  const graph = buildGraph(addDevice(doc, "Preview monitor", "destination"));
  const added = graph.devices.find(d => d.label === "Preview monitor")!;
  const existing = graph.devices.filter(d => d.kind === "destination" && d.id !== added.id);
  expect(added.position.y).toBeGreaterThan(Math.max(...existing.map(d => d.position.y)) + 102);
});
it("exports a standalone diagram with escaped operator labels", () => {
  const doc = addDevice(emptyDocument(), '<script>alert("x")</script>', "source");
  doc.title = "Video & audio";
  const svg = diagramSvg(doc);
  expect(svg).toContain("Video &amp; audio"); expect(svg).not.toContain("<script>");
  expect(svg).toContain("&lt;script&gt;"); expect(svg).toContain("viewBox=");
});
it("exports named ports and keeps tall devices inside the SVG bounds", () => {
  const doc = sampleDocument();
  doc.graphPositions[deviceId("Production switcher")] = { x: 600, y: 1000 };
  for (let i = 0; i < 12; i++) doc.routes.push({ ...doc.routes[2], id: `extra-${i}`, destination: `Monitor ${i}`, output: `Aux ${i}` });
  const svg = diagramSvg(doc);
  expect(svg).toContain("Program out 2"); expect(svg).toContain("Switcher input 1");
  const [, , top, , height] = /viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/.exec(svg)!;
  expect(Number(top) + Number(height)).toBeGreaterThan(1000 + 76 + 16 * 26);
});

it("keeps converter output signals explicit and never labels them with the upstream connector", () => {
  const doc = sampleDocument();
  let graph = buildGraph(doc);
  const output = () => graph.wires.find(w => w.source === deviceId("HDMI to SDI"))!;
  expect(output().connector).toBe("3G SDI");
  expect(graph.wires.find(w => w.target === deviceId("HDMI to SDI"))!.connector).toBe("HDMI");
  doc.routes[1].converterConnector = ""; doc.routes[1].converterFormat = "";
  graph = buildGraph(doc);
  expect(output().label).toBe("Connector unknown · Format unknown");
  expect(graph.devices.every(d => !d.issue)).toBe(true);
  expect(graph.wires.filter(w => w.issue)).toHaveLength(3);
});
it("restores old backups without guessing the output signal and round trips explicit hop details", () => {
  const old = JSON.parse(JSON.stringify(sampleDocument()));
  for (const r of old.routes) for (const key of ["converterOutput", "converterConnector", "converterFormat", "processorOutput", "processorConnector", "processorFormat", "destinationInput"]) delete r[key];
  const restored = parseDocument(JSON.stringify(old));
  expect(restored.routes[1].connector).toBe("HDMI");
  expect(restored.routes[1].converterConnector).toBe("");
  const sample = sampleDocument();
  expect(parseDocument(JSON.stringify(sample))).toEqual(sample);
});
