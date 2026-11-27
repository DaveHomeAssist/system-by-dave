import { describe, expect, it } from "vitest";
import { COLS, deleteView, findSpace, firstFree, fits, nudge, Panel, ROWS, sameLayout, sanitizeView, split, storeAsNew, suggest, trim, updateView, workspaceSchema } from "./layout";

const P = (id: string, x: number, y: number, w: number, h: number, type = id): Panel => ({ id, type, x, y, w, h });
const routing = [P("flow", 0, 0, 8, 5), P("patch", 0, 5, 8, 3), P("inspector", 8, 0, 4, 8)];

describe("console grid", () => {
  it("never lets panels overlap or leave the grid", () => {
    expect(fits({ x: 8, y: 0, w: 4, h: 8 }, routing, "inspector")).toBe(true);
    expect(fits({ x: 7, y: 0, w: 2, h: 2 }, routing)).toBe(false);
    expect(fits({ x: COLS - 1, y: 0, w: 2, h: 1 }, [])).toBe(false);
    expect(fits({ x: 0, y: ROWS, w: 1, h: 1 }, [])).toBe(false);
  });
  it("suggests the space at the tapped cell, then the nearest free rectangle", () => {
    expect(suggest(0, 0, [])).toEqual({ x: 0, y: 0, w: 6, h: 8 });
    expect(suggest(3, 3, routing)).toBeNull();
    const two = [P("a", 0, 0, 6, 8)];
    const r = suggest(2, 2, two)!;
    expect(fits(r, two)).toBe(true);
    expect(r.x).toBeGreaterThanOrEqual(6);
  });
  it("finds free space for keyboard Add panel and reports a full grid", () => {
    expect(firstFree(routing)).toBeNull();
    expect(firstFree([P("a", 0, 0, 6, 8)])).toMatchObject({ x: 6, y: 0 });
  });
  it("trims a drawn rectangle at the first occupied cell", () => {
    const ps = [P("a", 4, 0, 2, 8)];
    expect(trim({ x: 0, y: 0, w: 8, h: 3 }, { x: 0, y: 0 }, ps)).toEqual({ x: 0, y: 0, w: 4, h: 3 });
  });
  it("nudges within limits and minimum size", () => {
    const ps = [P("a", 0, 0, 4, 4)];
    expect(nudge(ps[0], ps, { x: 1 }, { w: 3, h: 2 })).toEqual({ x: 1, y: 0, w: 4, h: 4 });
    expect(nudge(ps[0], ps, { x: -1 }, { w: 3, h: 2 })).toBeNull();
    expect(nudge(ps[0], ps, { w: -3 }, { w: 3, h: 2 })).toEqual({ x: 0, y: 0, w: 3, h: 4 });
  });
  it("splits a panel and returns the freed half", () => {
    expect(split(P("a", 0, 0, 8, 6), "h")).toEqual({ keep: { x: 0, y: 0, w: 4, h: 6 }, rest: { x: 4, y: 0, w: 4, h: 6 } });
    expect(split(P("a", 0, 0, 1, 1), "v")).toBeNull();
  });
});

describe("stored views", () => {
  it("drops overlapping panels from a damaged view instead of covering another panel", () => {
    const v = sanitizeView({ id: "v", name: "V", panels: [P("a", 0, 0, 6, 6), P("b", 2, 2, 4, 4), P("c", 6, 0, 6, 8)] });
    expect(v.panels.map(p => p.id)).toEqual(["a", "c"]);
  });
  it("stores, updates and deletes arrangements without touching other views", () => {
    const base = [{ id: "routing", name: "Routing", panels: routing }];
    const added = storeAsNew(base, [P("x", 0, 0, 12, 8)], "Wide", "wide");
    expect(added).toHaveLength(2);
    const updated = updateView(added, "routing", [P("flow", 0, 0, 12, 8)]);
    expect(updated[0].panels).toHaveLength(1);
    expect(updated[1]).toEqual(added[1]);
    expect(deleteView(updated, "wide")).toHaveLength(1);
    expect(deleteView(deleteView(updated, "wide"), "routing")).toHaveLength(1);
    expect(sameLayout(routing, [...routing].reverse())).toBe(true);
  });
  it("validates the persisted shape and rejects unknown versions", () => {
    expect(workspaceSchema.parse({ version: 1, views: [{ id: "v", name: "V", panels: routing }] }).views[0].panels).toHaveLength(3);
    expect(() => workspaceSchema.parse({ version: 2, views: [] })).toThrow();
    expect(() => workspaceSchema.parse({ version: 1, views: [{ id: "v", name: "V", panels: [{ ...P("a", -1, 0, 1, 1) }] }] })).toThrow();
  });
  it("places, splits and stores panels on half cells", () => {
    expect(workspaceSchema.parse({ version: 1, views: [{ id: "v", name: "V", panels: [P("a", 0.5, 0, 4.5, 3.5)] }] }).views[0].panels[0].w).toBe(4.5);
    expect(() => workspaceSchema.parse({ version: 1, views: [{ id: "v", name: "V", panels: [P("a", 0.25, 0, 4, 4)] }] })).toThrow();
    expect(fits({ x: 4.5, y: 0, w: 1, h: 1 }, [P("a", 0, 0, 4.5, 8)])).toBe(true);
    expect(fits({ x: 4, y: 0, w: 1, h: 1 }, [P("a", 0, 0, 4.5, 8)])).toBe(false);
    expect(split(P("a", 0, 0, 5, 4), "h")).toEqual({ keep: { x: 0, y: 0, w: 2.5, h: 4 }, rest: { x: 2.5, y: 0, w: 2.5, h: 4 } });
    expect(firstFree([P("a", 0, 0, 8.5, 8)])).toEqual({ x: 8.5, y: 0, w: 3.5, h: 8 });
  });
  it("keeps a split panel at its minimum and refuses when nothing is left to free", () => {
    expect(split(P("a", 0, 0, 6, 8), "h", { w: 4, h: 3 })).toEqual({ keep: { x: 0, y: 0, w: 4, h: 8 }, rest: { x: 4, y: 0, w: 2, h: 8 } });
    expect(split(P("a", 0, 0, 4.5, 8), "h", { w: 4, h: 3 })).toBeNull();
    expect(split(P("a", 0, 0, 6, 3.5), "v", { w: 4, h: 3 })).toBeNull();
    expect(split(P("a", 0, 0, 6, 8), "v", { w: 4, h: 3 })).toEqual({ keep: { x: 0, y: 0, w: 6, h: 4 }, rest: { x: 0, y: 4, w: 6, h: 4 } });
  });
  it("finds the first free spot for a fixed size, so six 4x4 panels share the grid", () => {
    const placed: ReturnType<typeof P>[] = [];
    for (let i = 0; i < 6; i++) { const r = findSpace(placed, { w: 4, h: 4 }); expect(r).not.toBeNull(); placed.push(P(`p${i}`, r!.x, r!.y, r!.w, r!.h)); }
    expect(placed.map(p => [p.x, p.y])).toEqual([[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]]);
    expect(findSpace(placed, { w: 4, h: 4 })).toBeNull();
    expect(findSpace([P("a", 0, 0, 4.5, 8)], { w: 4, h: 4 })).toEqual({ x: 4.5, y: 0, w: 4, h: 4 });
  });
});
