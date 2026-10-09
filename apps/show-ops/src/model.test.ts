import { describe, expect, it } from "vitest";
import { empty, addRecord, copyRoomCheck, previewRoomCheck, KEY } from "../../../show-ops/model.mjs";
import { DEFAULT_VIEWS, loadDocument, parseDocument, preserveWorkspace, saveDocument } from "./model";

const memory = (initial: string | null = null) => {
  let raw = initial;
  return { getItem: (_key: string) => raw, setItem: (_key: string, value: string) => { raw = value; } };
};
describe("Show Ops console document boundary", () => {
  it("opens old documents without inventing or saving views", () => {
    const raw = JSON.stringify(empty()), storage = memory(raw);
    expect(loadDocument(storage).doc).toEqual(empty());
    expect(storage.getItem(KEY)).toBe(raw);
    expect(parseDocument(empty()).workspace).toBeUndefined();
  });
  it("round trips stored views without altering records or legacy shape", () => {
    const doc = { ...addRecord(empty(), "rooms", "Ballroom", "Check lectern"), workspace: { version: 1 as const, views: DEFAULT_VIEWS } };
    const storage = memory();
    const raw = saveDocument(storage, doc, null);
    expect(parseDocument(JSON.parse(raw))).toEqual(doc);
    expect(loadDocument(storage).doc).toEqual(doc);
  });
  it("fails closed on future and malformed workspaces and retains original bytes", () => {
    for (const workspace of [{ version: 2, views: [] }, { version: 1, views: [{ id: "bad" }] }]) {
      const raw = JSON.stringify({ ...empty(), workspace }), storage = memory(raw);
      expect(loadDocument(storage).error).toMatch(/could not be read/);
      expect(storage.getItem(KEY)).toBe(raw);
      expect(() => parseDocument(JSON.parse(raw))).toThrow();
    }
  });
  it("never rewrites stored geometry during validation", () => {
    const view = { id: "damaged", name: "Keep evidence", panels: [{ id: "outside", type: "rooms", x: 11, y: 7, w: 8, h: 8 }] };
    const doc = { ...empty(), workspace: { version: 1 as const, views: [view] } };
    expect(parseDocument(doc).workspace).toEqual(doc.workspace);
  });
  it("rejects another tab's saved bytes and failed write readback", () => {
    const storage = memory("other-tab");
    expect(() => saveDocument(storage, empty(), null)).toThrow(/Another tab/);
    expect(storage.getItem(KEY)).toBe("other-tab");
    expect(() => saveDocument({ getItem: () => null, setItem: () => {} }, empty(), null)).toThrow(/readback/);
  });
  it("composes existing source copies with views and exact source retention", () => {
    const raw = JSON.stringify({ schema: "system-by-dave.room-check.v1", meta: { showName: "Gala", showDate: "2026-10-09", venue: "Hall", room: "Main" }, items: [{ id: "one", area: "room", check: "Sightlines", owner: "Lead", due: "08:00", priority: "normal", status: "ready", blocker: "", notes: "Preserve this", extra: "Keep unknown source field" }] });
    const doc = { ...empty(), workspace: { version: 1 as const, views: DEFAULT_VIEWS } };
    const result = preserveWorkspace(doc, copyRoomCheck(doc, previewRoomCheck(doc, raw), ["one"], "file", "2026-10-09T08:00:00Z"));
    expect(result.workspace).toEqual(doc.workspace);
    expect(result.roomCheckSources[0].raw).toBe(raw);
    expect(result.rooms[0].status).toBe("Needs check");
    expect(parseDocument(result)).toEqual(result);
  });
});
