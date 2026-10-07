import { useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import type { PanelDef, View } from "../../shared/av-console/layout";
import { apply, blank, fieldsFor, LEGACY, load, newRow, preview, save, SCHEMA, STORE, type AudioDoc } from "./model";
const library: PanelDef[] = [
  { type:"inputs", name:"Inputs", group:"Common", description:"Source and channel identity", minW:3,minH:3,lit:true },
  { type:"patch", name:"Patch", group:"Common", description:"Stagebox, console input and destination", minW:3,minH:3 },
  { type:"check", name:"Line check", group:"Common", description:"Operator, status and problems", minW:3,minH:3 },
  { type:"speakers", name:"Speakers", group:"Planning", description:"PA zones and processor outputs", minW:4,minH:3 },
  { type:"project", name:"Project", group:"Utilities", description:"Title, import and source history", minW:4,minH:3 }
];
const defaults: View[] = [
  { id:"channels", name:"Channels", panels:[{id:"input",type:"inputs",x:0,y:0,w:4,h:8},{id:"patch",type:"patch",x:4,y:0,w:4,h:8},{id:"check",type:"check",x:8,y:0,w:4,h:8}] },
  { id:"pa", name:"PA", panels:[{id:"speakers",type:"speakers",x:0,y:0,w:8,h:8},{id:"project",type:"project",x:8,y:0,w:4,h:8}] }
];
const groups: Record<string,string[]> = { inputs:["channel","source","type","location"], patch:["console","stagebox","input","phantom","gain","destination","monitor"], check:["status","tech","talkback","problem","notes"], speakers:[...fieldsFor(true)] };
function exportFile(doc: AudioDoc) { const url = URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:"application/json"})); const a=document.createElement("a"); a.href=url; a.download="av-audio.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
export function App() {
  const [initial] = useState(() => { try { return { ...load(localStorage), error:"" }; } catch { return { raw:null, doc:blank(), error:"Saved plan is unreadable. Existing bytes are protected; export new work before leaving." }; } });
  const [doc,setDoc] = useState(initial.doc);
  const [saved,setSaved] = useState(JSON.stringify(initial.doc));
  const baseline = useRef(initial.raw);
  const [message,setMessage] = useState(initial.error || "Ready. Create a channel or import a legacy sheet.");
  const [blocked,setBlocked] = useState(Boolean(initial.error));
  const [selected,setSelected] = useState("");
  const [source,setSource] = useState<typeof LEGACY[number] | undefined>(LEGACY[0]);
  const [pending,setPending] = useState<Awaited<ReturnType<typeof preview>> | null>(null);
  const [views,setViews] = useState<View[]>(initial.doc.workspace?.views || defaults);
  const ws = useConsoleWorkspace(views,library);
  const dirty = JSON.stringify(doc) !== saved;
  function edit(rowId:string, speaker:boolean, key:string, value:string) { setDoc(d=>({ ...d, [speaker?"speakers":"channels"]: d[speaker?"speakers":"channels"].map(r=>r.id===rowId?{...r,[key]:value}:r) })); }
  function add(speaker:boolean) { const row=newRow(speaker); setDoc(d=>({ ...d,[speaker?"speakers":"channels"]:[...d[speaker?"speakers":"channels"],row] })); setSelected(String(row.id)); }
  function store() { try { if(blocked) throw new Error("Saved data is unreadable; export this copy before attempting a save."); const raw=save(localStorage,doc,baseline.current); baseline.current=raw; setSaved(JSON.stringify(doc)); setMessage("Saved and verified in this browser."); } catch(e) { setMessage((e as Error).message); } }
  async function readBrowser() { try { if (!source) return; const raw=localStorage.getItem(source.key); if (!raw) throw new Error(`No saved ${source.name} sheet in this browser.`); const result=await preview(raw,`${source.name} browser sheet`,source); setPending(result); setMessage(`Preview: ${result.channels.length} channels, ${result.speakers.length} speaker zones. Confirm to add; original source stays unchanged.`); } catch(e) { setPending(null); setMessage((e as Error).message); } }
  async function read(file:File) { try { const raw=await file.text(); const result=await preview(raw,file.name,source); setPending(result); setMessage(`Preview: ${result.restore?"restore Audio plan":`${result.channels.length} channels, ${result.speakers.length} speaker zones`} from ${file.name}. Confirm to add; original source stays unchanged.`); } catch(e) { setPending(null); setMessage((e as Error).message); } }
  function importNow() { if(!pending)return; try { const next=apply(doc,pending); setDoc(next); if(pending.restore) setViews(next.workspace?.views||defaults); setPending(null); setMessage("Imported into unsaved plan. Review, then Save or Export."); } catch(e) { setMessage((e as Error).message); } }
  function render(type:string) {
    if(type==="project") return { body:<div className="audio-panel"><label>Plan title<input value={doc.title} onChange={e=>setDoc(d=>({...d,title:e.target.value}))}/></label><h3>Import source</h3><label>Legacy tool<select value={source?.key} onChange={e=>setSource(LEGACY.find(x=>x.key===e.target.value))}>{LEGACY.map(x=><option key={x.key} value={x.key}>{x.name}</option>)}</select></label><button onClick={()=>void readBrowser()}>Preview saved browser sheet</button><label className="file-label">Choose JSON<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0]; if(f) void read(f); e.target.value="";}}/></label>{pending&&<button onClick={importNow}>Confirm import</button>}<h3>Source snapshots</h3><p>{doc.imports.length} sources retained in export.</p><ul>{doc.imports.map(x=><li key={x.id}>{x.name} · {x.count} rows</li>)}</ul><p>Original tool storage is never changed. Export before clearing browser data.</p></div> };
    const speaker=type==="speakers", rows=speaker?doc.speakers:doc.channels;
    return { body:<div className="audio-panel"><div className="audio-panel-actions"><button onClick={()=>add(speaker)}>Add {speaker?"zone":"channel"}</button><span>{rows.length} records</span></div><div className="audio-rows">{rows.length===0&&<p className="empty">No {speaker?"zones":"channels"} yet.</p>}{rows.map((row,i)=><div className="audio-row" key={String(row.id)}><button className="audio-row-title" aria-expanded={selected===row.id} onClick={()=>setSelected(selected===row.id?"":String(row.id))}><strong>{String(row[speaker?"zone":"channel"]||`#${i+1}`)}</strong><span>{String(row[speaker?"speaker":"source"]||"Name needed")}</span><em>{String(row.status||"planned")}</em></button>{selected===row.id&&<div className="audio-fields">{groups[type].map(key=><label key={key}>{key.replace(/([A-Z])/g," $1")}<input value={String(row[key]??"")} onChange={e=>edit(String(row.id),speaker,key,e.target.value)}/></label>)}<button className="delete-row" onClick={()=>{ if(window.confirm("Delete this row from the unsaved plan? Export or Save to keep a backup.")) { setDoc(d=>({...d,[speaker?"speakers":"channels"]:d[speaker?"speakers":"channels"].filter(x=>x.id!==row.id)})); setSelected(""); } }}>Delete row</button>{!speaker&&type==="check"&&<small>{!row.source||!row.input?"Review source and patch before marking ready.":"Source and input recorded. Verify at the actual console."}</small>}</div>}</div>)}</div></div> };
  }
  return <main className="audio-app"><header className="audio-header"><div><small>AV BY DAVE / APPLICATION</small><h1>Audio</h1><p>Inputs → patch → line check</p></div><div className="audio-actions"><span aria-live="polite">{dirty?"Unsaved edits":"Saved state"}</span><button onClick={()=>exportFile(doc)}>Export JSON</button><button className="primary" onClick={store} disabled={!dirty||blocked}>Save</button></div></header><div className="audio-status" role="status">{message}</div><ConsoleWorkspace ws={ws} label="Audio" quick={library.map(x=>({type:x.type,label:x.name}))} render={render} onViewsChange={(next,text)=>{setViews(next);setDoc(d=>({...d,workspace:{version:1,views:next}}));setMessage(text);}} notify={setMessage}/></main>;
}
