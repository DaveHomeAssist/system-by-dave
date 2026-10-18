import { useRef, useState } from "react";
import { SignalFlow } from "./SignalFlow";
import type { Panel, PanelDef, View } from "../../shared/av-console/layout";
import { download, type Pack, type PackDef, type PackHost } from "../../shared/av-console/pack";
import { apply, blank, fieldsFor, INPUT_STATUSES, LEGACY, LINE_CHECK_STATUSES, load, newRow, PATCH_STATUSES, preview, save, SPEAKER_STATUSES, type AudioDoc } from "./model";

/* Audio panel pack (docs/av-suite-shell.md): inputs, patch, line check,
   speakers and the Audio document with its legacy sheet imports. */

export const LIBRARY: PanelDef[] = [
  { type:"flow", name:"Signal flow", group:"Common", description:"Trace line and speaker level audio with explicit unknowns", minW:4,minH:4 },
  { type:"inputs", name:"Inputs", group:"Common", description:"Source and channel identity", minW:3,minH:3,lit:true },
  { type:"patch", name:"Patch", group:"Common", description:"Stagebox, console input and destination", minW:3,minH:3 },
  { type:"check", name:"Line check", group:"Common", description:"Operator, status and problems", minW:3,minH:3 },
  { type:"speakers", name:"Speakers", group:"Planning", description:"PA zones and processor outputs", minW:4,minH:3 },
  { type:"document", name:"Document", group:"Utilities", description:"Plan title, Save, export, restore and legacy sheet imports", minW:4,minH:3 }
];
export const DEFAULT_VIEWS: View[] = [
  { id:"channels", name:"Channels", panels:[{id:"input",type:"inputs",x:0,y:0,w:4,h:8},{id:"patch",type:"patch",x:4,y:0,w:4,h:8},{id:"check",type:"check",x:8,y:0,w:4,h:8}] },
  { id:"pa", name:"PA", panels:[{id:"speakers",type:"speakers",x:0,y:0,w:8,h:8},{id:"document",type:"document",x:8,y:0,w:4,h:8}] },
  { id:"flow", name:"Signal flow", panels:[{id:"flow",type:"flow",x:0,y:0,w:12,h:8}] }
];
const availableViews = (stored?: View[]) => stored ? [...stored, ...DEFAULT_VIEWS.filter(view => view.id === "flow" && !stored.some(v => v.id === view.id || v.panels.some(p => p.type === "flow")))] : DEFAULT_VIEWS;
const groups: Record<string,string[]> = { inputs:["inputStatus","channel","source","type","conn","location"], patch:["patchStatus","console","stagebox","input","phantom","gain","destination","monitor"], check:["lineCheckStatus","tech","talkback","problem","notes"], speakers:[...fieldsFor(true)] };
function RowStatus({value,choices,onChange}:{value:string,choices:readonly string[],onChange:(value:string)=>void}) {
  return <select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">Not set</option>
    {value && !choices.includes(value) && <option value={value}>{value} (saved value)</option>}
    {choices.map(status=><option key={status} value={status}>{status}</option>)}
  </select>;
}
function SpeakerStatusControls({value,onChange}:{value:string,onChange:(value:string)=>void}) {
  return <><label>Speaker status choices<select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">Not set</option>
    {value && !Object.keys(SPEAKER_STATUSES).includes(value) && <option value={value}>{value} (custom value)</option>}
    {Object.entries(SPEAKER_STATUSES).map(([status,label])=><option key={status} value={status}>{label}</option>)}
  </select></label><label>Speaker status<input value={value} onChange={e=>onChange(e.target.value)}/></label></>;
}
function LineCheckControls({value,onChange}:{value:string,onChange:(value:string)=>void}) {
  return <><label>Line Check choices<RowStatus value={value} choices={LINE_CHECK_STATUSES} onChange={onChange}/></label><label>Line Check Status<input value={value} onChange={e=>onChange(e.target.value)}/></label></>;
}
// Legacy stored views may still name the earlier Project panel.
const panelType = (type: string) => type === "project" ? "document" : type;

export function useAudioPack(host: PackHost): Pack {
  const [initial] = useState(() => { try { return load(localStorage); } catch { return { raw:null, doc:blank(), error:"Browser storage is unavailable. Export new work before leaving." }; } });
  const [doc,setDoc] = useState(initial.doc);
  const [saved,setSaved] = useState(JSON.stringify(initial.doc));
  const baseline = useRef(initial.raw);
  const [message,setMessage] = useState(initial.error || "Ready. Create a channel or import a legacy sheet.");
  const [problem,setProblem] = useState(Boolean(initial.error));
  const blocked = Boolean(initial.error);
  const [selected,setSelected] = useState("");
  const [source,setSource] = useState<typeof LEGACY[number] | undefined>(LEGACY[0]);
  const [pending,setPending] = useState<Awaited<ReturnType<typeof preview>> | null>(null);
  const [views,setViews] = useState<View[]>(() => availableViews(initial.doc.workspace?.views).map(view => ({ ...view, panels: view.panels.map(panel => ({ ...panel, type: panelType(panel.type) })) })));
  const dirty = JSON.stringify(doc) !== saved;
  function notify(text:string, error=false) { setMessage(text); setProblem(error); host.notify(text, error); }
  function edit(rowId:string, speaker:boolean, key:string, value:string) { setDoc(d=>({ ...d, [speaker?"speakers":"channels"]: d[speaker?"speakers":"channels"].map(r=>r.id===rowId?{...r,[key]:value,...(key==="lineCheckStatus"?{status:value}:{})}:r) })); }
  function add(speaker:boolean) { const row=newRow(speaker); setDoc(d=>({ ...d,[speaker?"speakers":"channels"]:[...d[speaker?"speakers":"channels"],row] })); setSelected(String(row.id)); }
  function store() { try { if(blocked) throw new Error("Saved data is unreadable; export this copy before attempting a save."); const raw=save(localStorage,doc,baseline.current); baseline.current=raw; setSaved(JSON.stringify(doc)); notify("Saved and verified in this browser."); } catch(e) { notify((e as Error).message, true); } }
  function exportFile() { download("av-audio.json", JSON.stringify(doc,null,2)); notify("Audio plan exported."); }
  function exportRaw(raw:string) { download("av-audio-unreadable-backup.txt", raw, "application/octet-stream"); }
  async function readBrowser() { try { if (!source) return; const raw=localStorage.getItem(source.key); if (!raw) throw new Error(`No saved ${source.name} sheet in this browser.`); const result=await preview(raw,`${source.name} browser sheet`,source); setPending(result); notify(`Preview: ${result.channels.length} channels, ${result.speakers.length} speaker zones. Confirm to add; original source stays unchanged.`); } catch(e) { setPending(null); notify((e as Error).message, true); } }
  async function read(file:File) { try { const raw=await file.text(); const result=await preview(raw,file.name,source); setPending(result); notify(`Preview: ${result.restore?"restore Audio plan":`${result.channels.length} channels, ${result.speakers.length} speaker zones`} from ${file.name}. Confirm to add; original source stays unchanged.`); } catch(e) { setPending(null); notify((e as Error).message, true); } }
  function importNow() { if(!pending)return; try { const next=apply(doc,pending); setDoc(next); if(pending.restore) { setViews(availableViews(next.workspace?.views).map(view => ({ ...view, panels: view.panels.map(panel => ({ ...panel, type: panelType(panel.type) })) }))); host.resetLayout(); } setPending(null); notify("Imported into unsaved plan. Review, then Save or Export."); } catch(e) { notify((e as Error).message, true); } }
  function render(type:string, _panel: Panel) {
    if(type==="flow") return { context: `${doc.signalFlow?.devices.length || 0} devices · logical audio routing`, body:<SignalFlow value={doc.signalFlow} onChange={signalFlow=>setDoc(d=>({...d,signalFlow}))}/> };
    if(type==="document") return { context: doc.title, body:<div className="audio-panel"><label>Plan title<input value={doc.title} onChange={e=>setDoc(d=>({...d,title:e.target.value}))}/></label><h3>Save and backup</h3><div className="audio-panel-actions"><button id="saveDocBtn" className="primary" onClick={store} disabled={!dirty||blocked}>Save plan</button><button onClick={exportFile}>Export plan</button>{blocked&&initial.raw!==null&&<button onClick={()=>exportRaw(initial.raw!)}>Download original saved bytes</button>}</div><h3>Import</h3><label>Legacy tool<select value={source?.key} onChange={e=>setSource(LEGACY.find(x=>x.key===e.target.value))}>{LEGACY.map(x=><option key={x.key} value={x.key}>{x.name}</option>)}</select></label><button onClick={()=>void readBrowser()}>Preview saved browser sheet</button><label className="file-label">Choose JSON<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0]; if(f) void read(f); e.target.value="";}}/></label>{pending&&<button onClick={importNow}>Confirm import</button>}<h3>Source snapshots</h3><p>{doc.imports.length} sources retained in export.</p><ul>{doc.imports.map(x=><li key={x.id}>{x.name} · {x.count} rows</li>)}</ul><p>Original tool storage is never changed. Export before clearing browser data.</p></div> };
    const speaker=type==="speakers", rows=speaker?doc.speakers:doc.channels;
    return { context: `${rows.length} records`, body:<div className="audio-panel"><div className="audio-panel-actions"><button onClick={()=>add(speaker)}>Add {speaker?"zone":"channel"}</button><span>{rows.length} records</span></div><div className="audio-rows">{rows.length===0&&<p className="empty">No {speaker?"zones":"channels"} yet.</p>}{rows.map((row,i)=><div className="audio-row" key={String(row.id)}><button className="audio-row-title" aria-expanded={selected===row.id} onClick={()=>setSelected(selected===row.id?"":String(row.id))}><strong>{String(row[speaker?"zone":"channel"]||`#${i+1}`)}</strong><span>{String(row[speaker?"speaker":"source"]||"Name needed")}</span><em>{String((!speaker && (row.lineCheckStatus || row.patchStatus || row.inputStatus)) || row.status || "planned")}</em></button>{selected===row.id&&<div className="audio-fields">{groups[type].map(key=>speaker&&key==="status"?<SpeakerStatusControls key={key} value={String(row[key]??"")} onChange={value=>edit(String(row.id),speaker,key,value)}/>:key==="lineCheckStatus"?<LineCheckControls key={key} value={String(row[key]??row.status??"")} onChange={value=>edit(String(row.id),speaker,key,value)}/>:<label key={key}>{key==="conn"?"Connection":key.replace(/([A-Z])/g," $1")}{key==="patchStatus"||key==="inputStatus"?<RowStatus choices={key==="inputStatus"?INPUT_STATUSES:PATCH_STATUSES} value={String(row[key]??"")} onChange={value=>edit(String(row.id),speaker,key,value)}/>:<input value={String(row[key]??(key==="lineCheckStatus"?row.status:"")??"")} onChange={e=>edit(String(row.id),speaker,key,e.target.value)}/>}</label>)}<button className="delete-row" onClick={()=>{ if(window.confirm("Delete this row from the unsaved plan? Export or Save to keep a backup.")) { setDoc(d=>({...d,[speaker?"speakers":"channels"]:d[speaker?"speakers":"channels"].filter(x=>x.id!==row.id)})); setSelected(""); } }}>Delete row</button>{!speaker&&type==="check"&&<small>{!row.source||!row.input?"Review source and patch before marking ready.":"Source and input recorded. Verify at the actual console."}</small>}</div>}</div>)}</div></div> };
  }
  return {
    id:"audio", label:"Audio", title: doc.title, summary:`${doc.channels.length} channels · ${doc.speakers.length} speaker zones`,
    dirty, blocked, save: store, exportDoc: exportFile, status: message, problem, notify,
    recovery: { offer: null, restore: () => undefined, discard: () => undefined, errors: [] },
    render, quick: LIBRARY.map(x=>({type:x.type,label:x.name})), library: LIBRARY, views,
    storeViews: (next: View[], text: string) => { setViews(next); setDoc((d: AudioDoc)=>({...d,workspace:{version:1,views:next}})); notify(text); },
  };
}

export const audioPack: PackDef = { id: "audio", label: "Audio", consoleId: "audio", library: LIBRARY, defaultViews: DEFAULT_VIEWS, use: useAudioPack };
