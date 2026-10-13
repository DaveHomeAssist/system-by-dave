import { describe, it, expect, vi } from "vitest";
import { apply, blank, INPUT_STATUSES, LEGACY, LINE_CHECK_STATUSES, load, newRow, PATCH_STATUSES, preview, save, STORE } from "./model";
const raw = JSON.stringify({ schema:"input-list.v1", rows:[{id:"one",ch:7,source:"Vocal",patch:"SB-A/7",stand:"Downstage",owner:"A2",notes:"Keep"}] });
describe("Audio plan",()=>{
  it("maps input identity while keeping complete source bytes",async()=>{ const result=await preview(raw,"inputs.json",LEGACY[0]); const doc=apply(blank(),result); expect(doc.channels[0]).toMatchObject({channel:"7",source:"Vocal",input:"SB-A/7",location:"Downstage",tech:"A2"}); expect(doc.imports[0].raw).toBe(raw); expect(doc.channels[0].legacy).toMatchObject({notes:"Keep"}); expect(()=>apply(doc,result)).toThrow(/already/); });
  it("rejects failed imports without mutating the plan",async()=>{ const doc=blank(); await expect(preview('{bad','bad.json',LEGACY[0])).rejects.toThrow(); expect(doc.channels).toHaveLength(0); await expect(preview(JSON.stringify({items:[]}),"wrong.json",LEGACY[0])).rejects.toThrow(/Expected/); });
  it("saves with readback and protects concurrent changes",()=>{ const data=new Map<string,string>(); const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}}; const original='legacy byte string'; data.set("input-list.v1",original); const doc=blank(); doc.title="Test"; const saved=save(storage,doc,null); expect(load(storage).doc.title).toBe("Test"); expect(data.get("input-list.v1")).toBe(original); expect(()=>save(storage,doc,null)).toThrow(/another tab/); expect(saved).toBe(data.get(STORE)); });
});

describe("Input List connection parity",()=>{
  const source = (conn?: string) => JSON.stringify({ rows:[{id:"input-1",ch:7,source:"Vocal",...(conn === undefined ? {} : {conn})}] });
  it.each(["XLR", "", undefined])("imports the explicit connection %s without inference",async conn=>{
    const raw=source(conn);
    const doc=apply(blank(),await preview(raw,"input.json",LEGACY[0]));
    expect(doc.channels[0].conn).toBe(conn ?? "");
    expect(doc.channels[0].legacy).toEqual(JSON.parse(raw).rows[0]);
    expect(doc.imports[0].raw).toBe(raw);
    expect(newRow().conn).toBe("");
  });
  it("roundtrips an edited connection without rewriting original source bytes",async()=>{
    const raw=source("XLR");
    const imported=await preview(raw,"input.json",LEGACY[0]);
    const doc=apply(blank(),imported);
    doc.channels[0].conn="TRS / operator patch";
    const data=new Map<string,string>([["input-list.v1",raw]]);
    const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
    save(storage,doc,null);
    const reopened=load(storage).doc;
    const restored=apply(blank(),await preview(JSON.stringify(reopened),"backup.json"));
    expect(restored).toEqual(doc);
    expect(restored.channels[0]).toMatchObject({conn:"TRS / operator patch",legacy:{conn:"XLR"}});
    expect(restored.imports[0].raw).toBe(raw);
    expect(data.get("input-list.v1")).toBe(raw);
    expect(()=>apply(restored,imported)).toThrow(/already/);
  });
  it("fills a blank connection on changed-source import but keeps a working edit",async()=>{
    const empty=apply(blank(),await preview(source(""),"empty.json",LEGACY[0]));
    const filled=apply(empty,await preview(source("XLR"),"xlr.json",LEGACY[0]));
    expect(filled.channels).toHaveLength(1);
    expect(filled.channels[0].conn).toBe("XLR");
    filled.channels[0].conn="Working connection";
    const merged=apply(filled,await preview(source("TRS"),"trs.json",LEGACY[0]));
    expect(merged.channels).toHaveLength(1);
    expect(merged.channels[0].conn).toBe("Working connection");
    expect(merged.channels[0].legacy.sources).toEqual([{id:"input-1",ch:7,source:"Vocal",conn:""},{id:"input-1",ch:7,source:"Vocal",conn:"XLR"},{id:"input-1",ch:7,source:"Vocal",conn:"TRS"}]);
  });
  it("opens and restores a pre-connection backup without migration or writes",async()=>{
    const doc=blank(); const row=newRow(); delete row.conn; row.legacy={conn:"Original-only value"}; doc.channels=[row];
    const raw=JSON.stringify(doc);
    const loaded=load({getItem:()=>raw});
    expect(loaded.error).toBe(""); expect(loaded.raw).toBe(raw);
    expect(loaded.doc).toEqual(doc); expect(loaded.doc.channels[0].conn).toBeUndefined();
    expect(apply(blank(),await preview(raw,"old-backup.json"))).toEqual(doc);
  });
});

describe("Input List status parity",()=>{
  const input = (status?:string) => JSON.stringify({rows:[{id:"i1",ch:7,source:"Vocal",...(status===undefined?{}:{status})}]});
  it.each([...INPUT_STATUSES,"","Custom input state",undefined])("preserves imported input status %s",async status=>{
    const raw=input(status), doc=apply(blank(),await preview(raw,"input.json",LEGACY[0]));
    expect(doc.channels[0].inputStatus).toBe(status??"");
    expect(doc.channels[0].legacy).toEqual(JSON.parse(raw).rows[0]);
    expect(doc.imports[0].raw).toBe(raw); expect(newRow().inputStatus).toBe("");
  });
  it("roundtrips an Input edit independently and keeps it on changed-source import",async()=>{
    const raw=input("open"), imported=await preview(raw,"input.json",LEGACY[0]);
    const doc=apply(blank(),imported);
    Object.assign(doc.channels[0],{inputStatus:"checked",patchStatus:"ready",lineCheckStatus:"issue",status:"issue",conn:"TRS"});
    const data=new Map<string,string>([["input-list.v1",raw]]);
    const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
    save(storage,doc,null);
    const restored=apply(blank(),await preview(JSON.stringify(load(storage).doc),"backup.json"));
    expect(restored).toEqual(doc); expect(data.get("input-list.v1")).toBe(raw);
    expect(()=>apply(restored,imported)).toThrow(/already/);
    const changed=apply(restored,await preview(input("problem"),"changed.json",LEGACY[0]));
    expect(changed.channels).toHaveLength(1);
    expect(changed.channels[0]).toMatchObject({inputStatus:"checked",patchStatus:"ready",lineCheckStatus:"issue",status:"issue",conn:"TRS"});
    expect(changed.channels[0].legacy.sources).toEqual([JSON.parse(raw).rows[0],JSON.parse(input("problem")).rows[0]]);
  });
  it("fills blank input status without changing other workflow stages",async()=>{
    const doc=apply(blank(),await preview(input(""),"blank.json",LEGACY[0]));
    Object.assign(doc.channels[0],{patchStatus:"gained",lineCheckStatus:"issue",status:"issue",conn:"XLR"});
    const merged=apply(doc,await preview(input("patched"),"patched.json",LEGACY[0]));
    expect(merged.channels[0]).toMatchObject({inputStatus:"patched",patchStatus:"gained",lineCheckStatus:"issue",status:"issue",conn:"XLR"});
  });
  it("opens and restores absent input status without inference or migration",async()=>{
    const doc=blank(), channel=newRow(); delete channel.inputStatus;
    Object.assign(channel,{status:"issue",legacy:{status:"open"}}); doc.channels=[channel];
    const raw=JSON.stringify(doc), loaded=load({getItem:()=>raw});
    expect(loaded.error).toBe(""); expect(loaded.raw).toBe(raw);
    expect(loaded.doc).toEqual(doc); expect(loaded.doc.channels[0].inputStatus).toBeUndefined();
    expect(apply(blank(),await preview(raw,"old.json"))).toEqual(doc);
  });
});

describe("Audio Patch status parity",()=>{
  const patch = (status?:string) => JSON.stringify({items:[{id:"p1",channel:"7",source:"Vocal",...(status===undefined?{}:{status})}]});
  it.each([...PATCH_STATUSES,"","Custom operator state",undefined])("preserves imported patch status %s",async status=>{
    const raw=patch(status);
    const doc=apply(blank(),await preview(raw,"patch.json",LEGACY[1]));
    expect(doc.channels[0].patchStatus).toBe(status??"");
    expect(doc.channels[0].legacy).toEqual(JSON.parse(raw).items[0]);
    expect(doc.imports[0].raw).toBe(raw);
  });
  it("roundtrips a working patch edit independently from line check and source bytes",async()=>{
    const raw=patch("patched"), imported=await preview(raw,"patch.json",LEGACY[1]);
    const doc=apply(blank(),imported);
    Object.assign(doc.channels[0],{inputStatus:"open",lineCheckStatus:"issue",status:"issue",conn:"TRS",patchStatus:"ready"});
    const data=new Map<string,string>([["audio-patch.v1",raw]]);
    const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
    save(storage,doc,null);
    const restored=apply(blank(),await preview(JSON.stringify(load(storage).doc),"backup.json"));
    expect(restored).toEqual(doc);
    expect(restored.channels[0]).toMatchObject({inputStatus:"open",lineCheckStatus:"issue",status:"issue",conn:"TRS",patchStatus:"ready",legacy:{status:"patched"}});
    expect(data.get("audio-patch.v1")).toBe(raw);
    expect(()=>apply(restored,imported)).toThrow(/already/);
    const changed=apply(restored,await preview(patch("spare"),"changed.json",LEGACY[1]));
    expect(changed.channels).toHaveLength(1);
    expect(changed.channels[0].patchStatus).toBe("ready");
    expect(changed.channels[0].lineCheckStatus).toBe("issue");
    expect(changed.channels[0].legacy.sources).toEqual([JSON.parse(raw).items[0],JSON.parse(patch("spare")).items[0]]);
  });
  it("fills a blank patch status without changing a line-check result",async()=>{
    const doc=apply(blank(),await preview(patch(""),"blank.json",LEGACY[1]));
    Object.assign(doc.channels[0],{lineCheckStatus:"issue",status:"issue"});
    const merged=apply(doc,await preview(patch("patched"),"patched.json",LEGACY[1]));
    expect(merged.channels[0]).toMatchObject({patchStatus:"patched",lineCheckStatus:"issue",status:"issue"});
  });
  it("opens missing patch status without deriving it from generic status or original",async()=>{
    const doc=blank(), channel=newRow(); delete channel.patchStatus;
    Object.assign(channel,{status:"issue",legacy:{status:"patched"}}); doc.channels=[channel];
    const raw=JSON.stringify(doc), loaded=load({getItem:()=>raw});
    expect(loaded.error).toBe(""); expect(loaded.raw).toBe(raw);
    expect(loaded.doc).toEqual(doc); expect(loaded.doc.channels[0].patchStatus).toBeUndefined();
    expect(apply(blank(),await preview(raw,"old.json"))).toEqual(doc);
  });
});

describe("Line Check choice parity",()=>{
  const check=(status?:string)=>JSON.stringify({items:[{id:"check-7",channel:"7",source:"Vocal",...(status===undefined?{}:{status}),problem:"Original issue"}]});
  it("retains the original seven Line Check choices",()=>{
    expect([...LINE_CHECK_STATUSES]).toEqual(["pending","patched","checked","passed","issue","muted","spare"]);
  });
  it.each([...LINE_CHECK_STATUSES,"","Custom line result",undefined])("retains imported Line Check value %s and original bytes",async status=>{
    const raw=check(status),doc=apply(blank(),await preview(raw,"check.json",LEGACY[2]));
    expect(doc.channels[0]).toMatchObject({lineCheckStatus:status??"",status:status??"",problem:"Original issue",legacy:JSON.parse(raw).items[0]});
    expect(doc.imports[0].raw).toBe(raw);
  });
  it("roundtrips a custom Line Check result and existing generic alias without changing other stages",async()=>{
    const raw=check("issue"),doc=apply(blank(),await preview(raw,"check.json",LEGACY[2]));
    Object.assign(doc.channels[0],{inputStatus:"checked",patchStatus:"gained",conn:"TRS",lineCheckStatus:"Custom operator result",status:"Custom operator result"});
    const data=new Map<string,string>([["line-check.v1",raw]]);
    const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
    save(storage,doc,null);
    const restored=apply(blank(),await preview(JSON.stringify(load(storage).doc),"backup.json"));
    expect(restored).toEqual(doc); expect(data.get("line-check.v1")).toBe(raw);
    expect(restored.channels[0].legacy).toEqual(JSON.parse(raw).items[0]);
  });
  it("keeps the existing latest nonblank Line Check import rule and exact repeat rejection",async()=>{
    const original=await preview(check("issue"),"original.json",LEGACY[2]);
    const doc=apply(blank(),original);
    Object.assign(doc.channels[0],{inputStatus:"checked",patchStatus:"gained",conn:"TRS",lineCheckStatus:"Custom working result",status:"Custom working result"});
    expect(()=>apply(doc,original)).toThrow(/already/);
    const changed=apply(doc,await preview(check("passed"),"changed.json",LEGACY[2]));
    expect(changed.channels[0]).toMatchObject({inputStatus:"checked",patchStatus:"gained",conn:"TRS",lineCheckStatus:"passed",status:"passed",problem:"Original issue"});
    expect(changed.channels[0].legacy.sources).toEqual([JSON.parse(check("issue")).items[0],JSON.parse(check("passed")).items[0]]);
    expect(changed.imports.map(x=>x.raw)).toEqual([check("issue"),check("passed")]);
  });
  it.each([undefined,null,""])("opens and restores old Line Check value %s without normalization",async value=>{
    const doc=blank(),channel=newRow();
    if(value===undefined)delete channel.lineCheckStatus;else channel.lineCheckStatus=value;
    Object.assign(channel,{status:"Custom generic fallback",inputStatus:"open",patchStatus:"ready"});doc.channels=[channel];
    const raw=JSON.stringify(doc),loaded=load({getItem:()=>raw});
    expect(loaded.error).toBe("");expect(loaded.raw).toBe(raw);expect(loaded.doc).toEqual(doc);
    expect(apply(blank(),await preview(raw,"old.json"))).toEqual(doc);
  });
});

describe("reviewed import boundaries",()=>{
  it("keeps line-check issue separate from input and patch status",async()=>{
    const base=apply(blank(),await preview(JSON.stringify({rows:[{id:"i1",ch:7,source:"Vocal",status:"open"}]}),"input",LEGACY[0]));
    const patched=apply(base,await preview(JSON.stringify({items:[{id:"p1",channel:"7",source:"Vocal",status:"patched"}]}),"patch",LEGACY[1]));
    const checked=apply(patched,await preview(JSON.stringify({items:[{id:"l1",channel:"7",source:"Vocal",status:"issue",problem:"No signal"}]}),"check",LEGACY[2]));
    expect(checked.channels).toHaveLength(1);
    expect(checked.channels[0]).toMatchObject({inputStatus:"open",patchStatus:"patched",lineCheckStatus:"issue",status:"issue",problem:"No signal"});
  });
  it("rejects unchanged speaker exports with different exportedAt and preserves rows",async()=>{
    const rows=[{id:"zone-a",zone:"Main",speaker:"Line array",status:"ready"}];
    const first=await preview(JSON.stringify({schema:"system-by-dave.speaker-plan.v1",exportedAt:"2026-10-01",items:rows}),"speaker-a",LEGACY[3]);
    const again=await preview(JSON.stringify({schema:"system-by-dave.speaker-plan.v1",exportedAt:"2026-10-07",items:rows}),"speaker-b",LEGACY[3]);
    const doc=apply(blank(),first);
    expect(again.id).toBe(first.id);
    expect(()=>apply(doc,again)).toThrow(/already/);
    expect(doc.speakers).toHaveLength(1);
  });
  it("keeps unreadable saved bytes available and blocks overwrite at the UI boundary",()=>{
    const raw='{corrupt';
    const loaded=load({getItem:()=>raw});
    expect(loaded.raw).toBe(raw);
    expect(loaded.error).toMatch(/unreadable/);
    expect(loaded.doc.channels).toHaveLength(0);
  });
});
