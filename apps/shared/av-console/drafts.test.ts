import { describe, expect, it } from "vitest";
import { clearDraft, DRAFT_INDEX, draftIndex, readDraft, readLayout, writeDraft, writeLayout } from "./drafts";

function memory(fail = false) {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { if (fail) throw new Error("quota"); map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } };
}
const asDoc = (v: unknown) => { if (!v || typeof v !== "object" || !("title" in v)) throw new Error("bad"); return v as { title: string }; };

describe("console drafts", () => {
  it("writes, reads and clears a draft and keeps the rail index in step", () => {
    const s = memory();
    expect(writeDraft(s, "k", "av-video", { title: "Plan" }, "base", "Plan")).toBe(true);
    expect(readDraft(s, "k", "av-video", asDoc)).toMatchObject({ console: "av-video", baseline: "base", doc: { title: "Plan" } });
    expect(Object.keys(draftIndex(s))).toEqual(["av-video"]);
    clearDraft(s, "k", "av-video");
    expect(readDraft(s, "k", "av-video", asDoc)).toBeNull();
    expect(draftIndex(s)).toEqual({});
  });
  it("ignores drafts from another console, malformed drafts and invalid documents", () => {
    const s = memory();
    writeDraft(s, "k", "audio", { title: "A" }, null, "A");
    expect(readDraft(s, "k", "av-video", asDoc)).toBeNull();
    s.map.set("k", "{not json"); expect(readDraft(s, "k", "av-video", asDoc)).toBeNull();
    s.map.set("k", JSON.stringify({ v: 1, console: "av-video", at: "x", baseline: null, doc: { other: 1 } }));
    expect(readDraft(s, "k", "av-video", asDoc)).toBeNull();
    s.map.set(DRAFT_INDEX, "[]"); expect(draftIndex(s)).toEqual({});
  });
  it("reports storage failure instead of throwing", () => {
    expect(writeDraft(memory(true), "k", "av-video", { title: "P" }, null, "P")).toBe(false);
    expect(writeLayout(memory(true), "l", { viewId: "v", locked: false, live: {} })).toBe(false);
  });
  it("round-trips layout state and rejects malformed layout", () => {
    const s = memory();
    writeLayout(s, "l", { viewId: "show", locked: true, live: { show: [{ id: "p", type: "flow", x: 0, y: 0, w: 4, h: 4 }] } });
    expect(readLayout(s, "l")).toEqual({ viewId: "show", locked: true, live: { show: [{ id: "p", type: "flow", x: 0, y: 0, w: 4, h: 4 }] } });
    s.map.set("l", JSON.stringify({ v: 1, viewId: "x", locked: "no", live: {} })); expect(readLayout(s, "l")).toBeNull();
  });
});
