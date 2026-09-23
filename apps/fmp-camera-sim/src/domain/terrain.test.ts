import { describe,it,expect } from "vitest";
import { Mesh, MeshLambertMaterial, PerspectiveCamera } from "three";
import { defaultTerrain,solveTerrain,rearDownstage } from "./terrain";
import { defaultStructures,defaultShowPackage } from "./structures";
import { defaultProject,parseProjectText,serializeProject } from "./project";
import { deriveVenueGeometry } from "./venue";
import { buildTerrain } from "../render/terrainBuilder";
import { buildStructures,setShellCutaway } from "../render/structureBuilder";
const geometry=()=>{const r=deriveVenueGeometry(defaultProject().venue);if(!r.ok)throw Error('invalid');return r.geometry;};
describe('lawn terrain',()=>{
 it('joins the facade and lawn without a seam when their datums differ',()=>{
  const t=defaultTerrain(),s=defaultStructures();t.frontElevation.value=15;
  const solved=solveTerrain(t,s);
  for(let i=0;i<=solved.columns;i++){
   const rear=solved.vertices[i],front=solved.vertices[i+solved.columns+1];
   expect(rear.upstage).toBeCloseTo(-rearDownstage(s,rear.right),8);
   expect(rear.height).toBe(s.shell.rearFloor.value);expect(front.height).toBe(15);
   expect(solved.surfaceHeightAt(rear.right,rear.upstage)).toBeCloseTo(rear.height,8);
   expect(solved.surfaceHeightAt(front.right,front.upstage)).toBeCloseTo(front.height,8);
  }
 });
 it('queries the actual triangles including interior points rather than a different interpolation surface',()=>{
  const t=defaultTerrain(),solved=solveTerrain(t,defaultStructures());
  for(let i=0;i<solved.triangles.length;i+=21){const a=solved.vertices[solved.triangles[i]],b=solved.vertices[solved.triangles[i+1]],c=solved.vertices[solved.triangles[i+2]];
   expect(solved.surfaceHeightAt((a.right+b.right+c.right)/3,(a.upstage+b.upstage+c.upstage)/3)).toBeCloseTo((a.height+b.height+c.height)/3,7);
  }
  expect(solved.surfaceHeightAt(1000,-1000)).toBeNull();
 });
 it('renders the solved heights and grounds every pole on the surface',()=>{
  const g=geometry(),solved=solveTerrain(g.terrain,g.structures),built=buildTerrain(g,false);
  const mesh=built.root.getObjectByName('lawn-surface') as Mesh,positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)expect(positions.getY(i)).toBeCloseTo(solved.vertices[i].height,5);
  let poles=0;built.root.traverse(o=>{if(o.name==='lawn-pole'){poles++;const p=o.userData.ground;expect(o.position.y-4).toBeCloseTo(solved.surfaceHeightAt(p.right,p.upstage)!,8);}});
  expect(poles).toBe(g.terrain.poles.value.length);built.dispose();
 });
 it('preserves v2 dimensions and presets and round trips the new record',()=>{
  const p=JSON.parse(serializeProject(defaultProject()));p.venue.version=2;delete p.venue.terrain;
  const before=JSON.stringify({dimensions:p.venue.dimensions,presets:p.session.presets,pose:p.session.pose});
  const parsed=parseProjectText(JSON.stringify(p));expect(parsed.ok).toBe(true);if(!parsed.ok)throw Error('migration');
  expect(JSON.stringify({dimensions:parsed.project.venue.dimensions,presets:parsed.project.session.presets,pose:parsed.project.session.pose})).toBe(before);
  expect(parsed.project.venue.terrain).toEqual(defaultTerrain());expect(parseProjectText(serializeProject(parsed.project))).toEqual(parsed);
 });
 it('rejects invalid terrain fields by path without accepting unordered samples',()=>{
  const p=defaultProject();p.venue.terrain.longitudinal.value[1].at=0;
  const r=parseProjectText(serializeProject(p));expect(r.ok).toBe(false);if(!r.ok)expect(r.issues.some(i=>i.path==='venue.terrain.longitudinal.value')).toBe(true);
 });
 it('keeps the catwalk and stage opening visible in overview cutaway and LED materials isolated',()=>{
  const built=buildStructures(geometry(),defaultShowPackage(),false),overview=new PerspectiveCamera();setShellCutaway(overview,true);
  let ordinary=0,lit=0;built.fixtures.traverse(o=>{if(o instanceof Mesh&&o.layers.test(overview.layers)){ordinary++;const m=o.material as MeshLambertMaterial;if(m.emissiveIntensity>0)lit++;}});
  const anchors=built.root.getObjectByName('mount-and-stage-opening')!;
  expect(anchors.getObjectByName('catwalk')).toBeDefined();let anchorMeshes=0;anchors.traverse(o=>{if(o instanceof Mesh){anchorMeshes++;expect(o.layers.test(overview.layers)).toBe(true);}});expect(anchorMeshes).toBeGreaterThan(0);expect(ordinary).toBeGreaterThan(lit);expect(lit).toBe(7);
  built.dispose();
 });
});
