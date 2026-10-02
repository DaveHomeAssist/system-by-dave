import { describe, expect, it } from "vitest";
import { applyImport, emptyDocument, loadDocument, newRoute, parseDocument, previewImport, routeGaps, sampleDocument, saveDocument, STORE } from "./model";

function storage(initial: string | null = null) {
  const data = new Map(initial === null ? [] : [[STORE, initial]]);
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
const source = JSON.stringify({ schema: "system-by-dave.signal-flow.v1", meta: { showName: "Gala", audioLead: "Mira" }, routes: [ { id: "old-1", route: "", source: "CAM 1", system: "control", format: "Custom format", connector: "", processor: "DA", destination: "Screen", status: "custom status", backup: "", notes: "\n  Keep  spaces\n".repeat(100), extra: "retained original field" } ] });

describe("AV Video shared plan", () => {
  it("retains original Signal Flow fields and raw source without truncation or invented status", async () => {
    const preview = await previewImport(source, "signal.json");
    const doc = applyImport(emptyDocument(), preview);
    expect(doc.routes[0]).toMatchObject({ system: "control", type: "", format: "Custom format", connector: "", status: "custom status", notes: JSON.parse(source).routes[0].notes });
    expect(doc.meta.audioLead).toBe("Mira");
    expect(doc.imports[0].raw).toBe(source);
    expect(parseDocument(JSON.stringify(doc))).toEqual(doc);
  });
  it("imports patch fields into the same route model and preserves blank strings", async () => {
    const raw = JSON.stringify({ meta: { v1: "Sam" }, items: [{ id: "video-1", source: "Laptop", input: "Input 2", converter: "Scaler", route: "", status: "", notes: "" }] });
    const next = applyImport(emptyDocument(), await previewImport(raw, "saved patch"));
    expect(next.routes[0]).toMatchObject({ source: "Laptop", input: "Input 2", converter: "Scaler", route: "", status: "" });
    expect(next.imports[0].raw).toBe(raw);
  });
  it("rejects repeated imports even after the imported routes have been edited", async () => {
    const preview = await previewImport(source, "first.json");
    const doc = applyImport(emptyDocument(), preview);
    doc.routes[0].source = "Operator edit";
    expect(() => applyImport(doc, preview)).toThrow("already imported");
    expect(doc.routes[0].source).toBe("Operator edit");
  });
  it("does not guess identities when two different sources have similar names", async () => {
    const first = applyImport(emptyDocument(), await previewImport(source, "signal.json"));
    const second = applyImport(first, await previewImport(JSON.stringify({ items: [{ source: "CAM 1", input: "1" }] }), "patch.json"));
    expect(second.routes).toHaveLength(2);
    expect(new Set(second.routes.map(r => r.id)).size).toBe(2);
  });
  it("accepts above-legacy-cap row counts without loss", async () => {
    const rows = Array.from({ length: 300 }, (_, n) => ({ source: String(n), notes: "" }));
    expect((await previewImport(JSON.stringify({ items: rows }), "large.json")).routes).toHaveLength(300);
  });
  it("rejects foreign, malformed, and future documents", async () => {
    await expect(previewImport('{"schema":"foreign","items":[]}', "foreign")).rejects.toThrow();
    await expect(previewImport('{"items":[{"source":3}]}', "bad")).rejects.toThrow();
    expect(() => parseDocument(JSON.stringify({ ...emptyDocument(), schema: "future" }))).toThrow();
  });
  it("module changes retain all hidden data in a restorable backup", async () => {
    const doc = sampleDocument(); doc.modules = { patch: false, checks: false, backups: false };
    const preview = await previewImport(JSON.stringify(doc), "backup.json");
    expect(applyImport(emptyDocument(), preview)).toEqual(doc);
    expect(doc.routes[0].input).toBe("Switcher input 1");
  });
  it("scopes gap checks to enabled modules without declaring physical readiness", () => {
    const route = { ...newRoute(), source: "Cam", destination: "Screen", format: "SDI", connector: "BNC", status: "pending" };
    expect(routeGaps(route, { patch: true, checks: true, backups: true })).toEqual(["Input missing"]);
    expect(routeGaps(route, { patch: false, checks: true, backups: true })).toEqual([]);
    expect(route.status).toBe("pending");
  });
  it("loads without writing, saves, and restores a complete plan", () => {
    const store = storage(); const loaded = loadDocument(store);
    expect(store.getItem(STORE)).toBeNull();
    const doc = sampleDocument(); const raw = saveDocument(store, doc, loaded.baseline);
    expect(loadDocument(store)).toEqual({ doc, baseline: raw, error: "" });
  });
  it("blocks stale writers, including cleared storage, and preserves the newer value", () => {
    const store = storage(); const doc = sampleDocument();
    const raw = saveDocument(store, doc, null);
    expect(() => saveDocument(store, emptyDocument(), null)).toThrow("another tab");
    expect(store.getItem(STORE)).toBe(raw);
    expect(() => saveDocument(storage(), doc, raw)).toThrow("another tab");
  });
  it("keeps unreadable original storage untouched and reports quota failures", () => {
    const store = storage("broken");
    expect(loadDocument(store).error).toContain("blocked"); expect(store.getItem(STORE)).toBe("broken");
    expect(() => saveDocument({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, sampleDocument(), null)).toThrow("quota");
  });
});
