import { useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { defaultShowPackage, type SceneFixture } from "../domain/structures";
import { editedEvidence } from "../domain/evidence";
import { EvidenceBadge, NumberField, SelectField } from "./fields";

export function StructureSettings({store,state}: {store: SimulatorStore;state:StoreState}) {
  const [group,setGroup]=useState<"house"|"show">("house"), [selected,setSelected]=useState(""), [error,setError]=useState("");
  const structures=state.project.venue.structures, show=state.project.session.showPackage;
  const items=group==="house"?structures.fixtures:show.fixtures;
  const current=items.find(f=>f.id===selected)??items[0];
  const report=(result:ReturnType<SimulatorStore["updateVenue"]>)=>setError(result.ok?"":result.issues.map(i=>`${i.path}: ${i.message}`).join(" "));
  const edit=(change:(fixture:SceneFixture)=>void)=>{
    if(!current)return;
    if(group==="house") {const next=structuredClone(state.project.venue);change(next.structures.fixtures.find(f=>f.id===current.id)!);report(store.updateVenue(next));}
    else {const next=structuredClone(show);change(next.fixtures.find(f=>f.id===current.id)!);report(store.updateShowPackage(next));}
  };
  const shellLabels = { halfWidth: "Half width", frontUpstage: "Front edge upstage", rearDownstage: "Rear centre downstage", rearCurve: "Rear curve depth", eaveHeight: "Eave height", ridgeHeight: "Ridge height", rearFloor: "Rear concourse height", bayCount: "Rear bay count", openingHeight: "Stage opening height", catwalkSpan: "Catwalk span" };
  return <fieldset className="dimension" data-testid="structure-settings">
    <legend>Pavilion and production <EvidenceBadge status="demo" /></legend>
    <p>Procedural reference geometry in metres. Roof, facade, steel and catwalk dimensions are unmeasured. P002, P064 and P079 establish silhouettes, not a survey. Shell cutaway changes the overview only; the camera still sees physical obstructions.</p>
    {error&&<p role="alert">{error}</p>}
    <details><summary>Pavilion dimensions</summary>
      {(Object.keys(structures.shell) as Array<keyof typeof structures.shell>).map(key=><div key={key}>
        <NumberField label={`Pavilion ${shellLabels[key]}`} value={structures.shell[key].value} unit={key==="bayCount"?undefined:"m"} digits={key==="bayCount"?0:2} onCommit={value=>{
          const next=structuredClone(state.project.venue);next.structures.shell[key]={...editedEvidence(next.structures.shell[key]),value};report(store.updateVenue(next));
        }}/><EvidenceBadge status={structures.shell[key].status}/>
      </div>)}
    </details>
    <p>Show package: <strong>{show.name}</strong>. Replacing it changes show equipment only.</p>
    <div className="button-row">
      <button className="tool-button" type="button" onClick={()=>report(store.updateShowPackage({version:1,name:"Empty stage",fixtures:[]}))}>Clear show package</button>
      <button className="tool-button" type="button" onClick={()=>report(store.updateShowPackage(defaultShowPackage()))}>Load demo concert</button>
    </div>
    <SelectField label="Fixture ownership" value={group} options={[{value:"house",label:"House fixtures"},{value:"show",label:"Show package"}]} onChange={value=>{setGroup(value);setSelected("");}}/>
    {current?<>
      <SelectField label="Fixture" value={current.id} options={items.map(f=>({value:f.id,label:`${f.id} · ${f.kind}`}))} onChange={setSelected}/>
      <label><input type="checkbox" checked={current.enabled.value} onChange={event=>edit(f=>{f.enabled={...editedEvidence(f.enabled),value:event.target.checked};})}/> Fixture enabled</label>
      <NumberField key={current.id} label="Fixture rotation" value={current.yaw.value} unit="°" digits={1} onCommit={value=>edit(f=>{f.yaw={...editedEvidence(f.yaw),value};})}/>
      {current.kind === "foh" && <p>FOH height is clearance above the highest local bowl tread. Seats are removed from its footprint. The footprint remains provisional.</p>}
      {current.display && <div><p>LED pixel space and pitch are independent of physical size. Native wall resolution is not established; colour bars are a demo pattern.</p>
        {(["pixelWidth", "pixelHeight", "pitchMm"] as const).map(key=><div key={`${current.id}-${key}`}><NumberField label={key==="pitchMm"?"LED pitch":key==="pixelWidth"?"Pixel space width":"Pixel space height"} unit={key==="pitchMm"?"mm":"px"} digits={key==="pitchMm"?1:0} value={current.display![key].value} onCommit={value=>edit(f=>{if(f.display)f.display[key]={...editedEvidence(f.display[key]),value};})}/><EvidenceBadge status={current.display![key].status}/></div>)}
      </div>}
      <p>Position confidence: <EvidenceBadge status={current.position.status}/> {current.position.note}</p>
      {(["position","size"] as const).map(field=><div key={field}>
        {(["right","height","upstage"] as const).map(axis=><NumberField key={`${current.id}-${axis}`} label={`${field=== "position"?"Position":"Size"} ${axis}`} value={current[field].value[axis]} unit="m" digits={2} onCommit={value=>edit(f=>{f[field]={...editedEvidence(f[field]),value:{...f[field].value,[axis]:value}};})}/>)}
      </div>)}
    </>:<p>No fixtures in this show package.</p>}
    <p>Obstruction meshes support later visibility checks. Current exercise scoring is unchanged.</p>
  </fieldset>;
}
