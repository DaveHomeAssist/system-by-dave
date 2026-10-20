import { describe, expect, it } from "vitest";
import { createDraftSession, draftSnapshot, clearDraft, DRAFT_CHANGE_EVENT, DRAFT_INDEX, draftIndex, readDraft, readLayout, writeDraft, writeLayout } from "./drafts";

function memory(fail = false) {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { if (fail) throw new Error("quota"); map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } };
}
const asDoc = (v: unknown) => { if (!v || typeof v !== "object" || !("title" in v)) throw new Error("bad"); return v as { title: string }; };

describe("console drafts", () => {
  it("writes, reads and clears a draft and keeps the rail index in step", () => {
    const s = memory();
    expect(writeDraft(s, "k", "av-video", { title: "Plan" }, "base", "Plan")).toMatchObject({ ok: true });
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
    expect(writeDraft(memory(true), "k", "av-video", { title: "P" }, null, "P")).toMatchObject({ ok: false });
    expect(writeLayout(memory(true), "l", { viewId: "v", locked: false, live: {} })).toBe(false);
  });
  it("round-trips layout state and rejects malformed layout", () => {
    const s = memory();
    writeLayout(s, "l", { viewId: "show", locked: true, live: { show: [{ id: "p", type: "flow", x: 0, y: 0, w: 4, h: 4 }] } });
    expect(readLayout(s, "l")).toEqual({ viewId: "show", locked: true, live: { show: [{ id: "p", type: "flow", x: 0, y: 0, w: 4, h: 4 }] } });
    s.map.set("l", JSON.stringify({ v: 1, viewId: "x", locked: "no", live: {} })); expect(readLayout(s, "l")).toBeNull();
  });
});


describe("draft ownership", () => {
  const lock = async (action: () => { ok: boolean }) => action();
  const session = (s: ReturnType<typeof memory>) => createDraftSession(s, "k", "av-video", draftSnapshot(s, "k", "av-video", asDoc), lock);
  it("does not clear or index-write on a clean visit", async () => {
    const s = memory(), a = session(s), b = session(s);
    await a.sync({title:"A"}, null, true, "A"); const raw = s.getItem("k");
    expect(await b.sync({title:"B"}, null, false, "B")).toMatchObject({ok:true});
    expect(s.getItem("k")).toBe(raw);
  });
  it("rejects a competing editor and keeps that session blocked", async () => {
    const s = memory(), a = session(s), b = session(s);
    await a.sync({title:"A"}, null, true, "A"); const raw = s.getItem("k");
    expect(await b.sync({title:"B"}, null, true, "B")).toMatchObject({ok:false, error:expect.stringContaining("changed in another tab")});
    expect(s.getItem("k")).toBe(raw);
    await a.sync({title:"A"}, null, false, "A");
    expect((await b.sync({title:"B"}, null, true, "B")).ok).toBe(false);
    expect(s.getItem("k")).toBeNull();
  });
  it("restores only the offered bytes and rejects stale discard", async () => {
    const s = memory(); writeDraft(s, "k", "av-video", {title:"old"}, null, "old");
    const a=session(s), b=session(s);
    expect((await a.restore()).ok).toBe(true);
    await a.sync({title:"new"}, null, true, "new"); const raw=s.getItem("k");
    expect((await b.discard()).ok).toBe(false); expect(s.getItem("k")).toBe(raw);
    expect((await b.restore()).ok).toBe(false);
  });
  it("keeps the index when removal fails and reports index failures separately", () => {
    const s=memory(); writeDraft(s,"k","av-video",{title:"A"},null,"A");
    const index=s.getItem(DRAFT_INDEX);
    expect(clearDraft({...s,removeItem:()=>{throw new Error("blocked");}},"k","av-video").ok).toBe(false);
    expect(s.getItem(DRAFT_INDEX)).toBe(index);
    const failIndex={...s,setItem:(k:string,v:string)=>{if(k===DRAFT_INDEX)throw new Error("quota");s.setItem(k,v);}};
    expect(writeDraft(failIndex,"k","av-video",{title:"B"},null,"B")).toMatchObject({ok:true,indexError:expect.any(String)});
    expect(readDraft(s,"k","av-video",asDoc)?.doc.title).toBe("B");
  });
  it("does not report an index repair for an ownership-free cleanup", async () => {
    const s=memory(), a=session(s);
    const result=await a.sync({title:"unchanged"},null,false,"A");
    expect(result.ok).toBe(true); expect(result.indexChecked).toBeUndefined();
    expect(s.getItem(DRAFT_INDEX)).toBeNull();
  });
  it("preserves malformed recovery and refuses unsafe writes without a lock", async () => {
    const s=memory(); s.setItem("k","broken");
    expect((await session(s).sync({title:"A"},null,true,"A")).ok).toBe(false);
    expect(s.getItem("k")).toBe("broken");
    const empty=memory(), noLock=createDraftSession(empty,"k","av-video",draftSnapshot(empty,"k","av-video",asDoc));
    expect((await noLock.sync({title:"A"},null,true,"A")).ok).toBe(false); expect(empty.getItem("k")).toBeNull();
  });
  it("cancels an obsolete edit queued behind a lock when returning to saved", async () => {
    const s=memory(); let release:(() => void) | undefined;
    const deferred=(action:()=>{ok:boolean})=>new Promise<{ok:boolean}>(resolve=>{release=()=>resolve(action());});
    const a=createDraftSession(s,"k","av-video",draftSnapshot(s,"k","av-video",asDoc),deferred);
    const pending=a.sync({title:"edit"},null,true,"A");
    await a.sync({title:"saved"},null,false,"A"); release!(); await pending;
    expect(s.getItem("k")).toBeNull();
  });
  it("invalidates the rail after each attempted draft write or clear", async () => {
    const s=memory(), changes:string[]=[];
    const a=createDraftSession(s,"k","av-video",draftSnapshot(s,"k","av-video",asDoc),lock,detail=>changes.push(`${DRAFT_CHANGE_EVENT}:${detail.consoleId}`));
    await a.sync({title:"edit"},null,true,"A");
    await a.sync({title:"saved"},null,false,"A");
    expect(changes).toEqual([
      "sbd:console-draft-change:av-video",
      "sbd:console-draft-change:av-video"
    ]);

    const blocked=memory(true), failed:string[]=[];
    const b=createDraftSession(blocked,"k","av-video",draftSnapshot(blocked,"k","av-video",asDoc),lock,detail=>failed.push(detail.consoleId));
    expect((await b.sync({title:"edit"},null,true,"A")).ok).toBe(false);
    expect(failed).toEqual(["av-video"]);
  });
});
