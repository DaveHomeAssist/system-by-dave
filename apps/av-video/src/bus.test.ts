import { describe, expect, it } from "vitest";
import { cut, feedOf, initialBus, multiview, PROGRAM, switchers } from "./bus";
import { sampleDocument } from "./model";

describe("switcher bus", () => {
  const doc = sampleDocument();
  const [sw] = switchers(doc);
  it("derives the switcher, its inputs and outputs from routes only", () => {
    expect(sw.name).toBe("Production switcher");
    expect(sw.inputs.map(i => [i.port, i.source])).toEqual([["Switcher input 1", "Camera 1"], ["Switcher input 3", "Slides laptop"]]);
    expect(sw.outputs.find(o => o.port === "Program out 2")).toMatchObject({ program: true, destinations: ["Program recorder"] });
    expect(sw.outputs.find(o => o.port === "AUX 1")).toMatchObject({ program: false });
  });
  it("cuts preview to program and back", () => {
    const st = initialBus(sw);
    expect(st).toMatchObject({ pgm: "Switcher input 1", pvw: "Switcher input 3" });
    expect(cut(st)).toMatchObject({ pgm: "Switcher input 3", pvw: "Switcher input 1" });
  });
  it("never infers an AUX assignment; program outputs follow program", () => {
    const st = initialBus(sw);
    expect(feedOf(sw, st, "AUX 1")).toEqual({ input: "", via: "unset" });
    expect(feedOf(sw, st, "Program out 3")).toEqual({ input: "Switcher input 1", via: "program" });
    expect(feedOf(sw, { ...st, assign: { "AUX 1": "Switcher input 3" } }, "AUX 1")).toEqual({ input: "Switcher input 3", via: "assigned" });
    expect(feedOf(sw, { ...st, assign: { "AUX 1": PROGRAM } }, "AUX 1").via).toBe("program");
  });
  it("shows every destination with what it carries", () => {
    const st = initialBus(sw);
    const tiles = multiview(doc, [sw], { [sw.name]: st });
    expect(tiles[0]).toMatchObject({ tag: "PGM", showing: "Camera 1" });
    expect(tiles.find(t => t.name === "Stream encoder")).toMatchObject({ state: "live", showing: "Camera 1" });
    const after = multiview(doc, [sw], { [sw.name]: cut(st) });
    expect(after.find(t => t.name === "Stream encoder")).toMatchObject({ showing: "Slides laptop" });
    expect(tiles.some(t => t.name === "Production switcher")).toBe(false);
  });
  it("returns no switchers for a plan without processors", () => {
    expect(switchers({ ...doc, routes: doc.routes.map(r => ({ ...r, processor: "", source: r.source === "Production switcher" ? "Camera 1" : r.source })) })).toEqual([]);
  });
});
