import { useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { type TerrainRecord } from "../domain/terrain";
import { editedEvidence } from "../domain/evidence";
import { NumberField, EvidenceBadge } from "./fields";

export function TerrainSettings({store,state}:{store:SimulatorStore;state:StoreState}) {
  const [error,setError]=useState("");const terrain=state.project.venue.terrain;
  const edit=(key:Exclude<keyof TerrainRecord,"version">,change:(t:TerrainRecord)=>void)=>{
    const next=structuredClone(state.project.venue);change(next.terrain);
    next.terrain[key]={...next.terrain[key],...editedEvidence(next.terrain[key])} as never;
    const result=store.updateVenue(next);setError(result.ok?"":result.issues.map(i=>`${i.path}: ${i.message}`).join(" "));
  };
  return <fieldset className="dimension" data-testid="terrain-settings">
    <legend>Lawn and exterior <EvidenceBadge status="demo"/></legend>
    <p>P093/P095 establish the irregular outline and pavilion relationship, not surveyed elevations. Values below are metres. Longitudinal and cross-lawn sample positions run from 0 to 1. Paths, fence and poles outside the surface are omitted.</p>
    {error&&<p role="alert">{error}</p>}
    <NumberField label="Lawn front elevation" value={terrain.frontElevation.value} unit="m" digits={2} onCommit={v=>edit("frontElevation",t=>{t.frontElevation.value=v;})}/>
    <NumberField label="Lawn concourse width" value={terrain.concourseWidth.value} unit="m" digits={2} onCommit={v=>edit("concourseWidth",t=>{t.concourseWidth.value=v;})}/>
    <p>The concourse joins the pavilion floor to the lawn front. Height samples are offsets from this front datum, not measured FMP grades.</p>
    {(["longitudinal","crossLawn"] as const).map(key=><details key={key}><summary>{key==="longitudinal"?"Longitudinal heights":"Cross-lawn heights"} <EvidenceBadge status={terrain[key].status}/></summary>
      {terrain[key].value.map((sample,i)=><div key={i}><NumberField label={`${key} sample ${i+1} position`} value={sample.at} digits={2} onCommit={v=>edit(key,t=>{t[key].value[i].at=v;})}/><NumberField label={`${key} sample ${i+1} height`} value={sample.height} unit="m" digits={2} onCommit={v=>edit(key,t=>{t[key].value[i].height=v;})}/></div>)}
    </details>)}
    <details><summary>Boundary control points <EvidenceBadge status={terrain.boundary.status}/></summary>
      <p>Each depth station gives performer-left and performer-right edges; depth increases away from the pavilion. Front edges should remain aligned with the pavilion width.</p>
      {terrain.boundary.value.map((point,i)=><div key={i}>{(["depth","left","right"] as const).map(axis=><NumberField key={axis} label={`Boundary ${i+1} ${axis}`} value={point[axis]} unit="m" digits={2} onCommit={v=>edit("boundary",t=>{t.boundary.value[i][axis]=v;})}/>)}</div>)}
    </details>
    <details><summary>Paths, fence and poles</summary><p>Stage coordinates: positive right is performer stage right; negative upstage is toward the lawn.</p>
      {(["fence","poles"] as const).map(key=><div key={key}>{terrain[key].value.map((p,i)=><div key={i}>{(["right","upstage"] as const).map(axis=><NumberField key={axis} label={`${key} ${i+1} ${axis}`} value={p[axis]} unit="m" digits={2} onCommit={v=>edit(key,t=>{t[key].value[i][axis]=v;})}/>)}</div>)}</div>)}
      {terrain.paths.value.map((path,i)=><div key={i}>{path.map((p,j)=><div key={j}>{(["right","upstage"] as const).map(axis=><NumberField key={axis} label={`Path ${i+1} point ${j+1} ${axis}`} value={p[axis]} unit="m" digits={2} onCommit={v=>edit("paths",t=>{t.paths.value[i][j][axis]=v;})}/>)}</div>)}</div>)}
    </details>
  </fieldset>;
}
