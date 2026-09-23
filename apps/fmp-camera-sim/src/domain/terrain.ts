import { sceneDemo, type SceneValue, type StructuresRecord } from "./structures";
import { type Evidence, readProvenance, VENUE_STATUS_OPTIONS, SETTLED_VENUE_STATUSES } from "./evidence";
import { IssueList, readObject, readNumber, readString, readEnum } from "./validate";

export interface TerrainBoundary { depth: number; left: number; right: number }
export interface TerrainSample { at: number; height: number }
export interface TerrainPoint { right: number; upstage: number }
export interface TerrainRecord {
  version: 1;
  boundary: SceneValue<TerrainBoundary[]>;
  frontElevation: SceneValue<number>;
  concourseWidth: SceneValue<number>;
  longitudinal: SceneValue<TerrainSample[]>;
  crossLawn: SceneValue<TerrainSample[]>;
  paths: SceneValue<TerrainPoint[][]>;
  fence: SceneValue<TerrainPoint[]>;
  poles: SceneValue<TerrainPoint[]>;
}
const demo = <T>(value:T) => sceneDemo(value,"P093/P095 establish an irregular lawn, paths and exterior context. All coordinates and elevations are unmeasured procedural assumptions.");
export function defaultTerrain():TerrainRecord {
  return {version:1, boundary:demo([{depth:0,left:-55,right:55},{depth:20,left:-67,right:70},{depth:45,left:-73,right:68},{depth:70,left:-66,right:60}]), frontElevation:demo(13.066),concourseWidth:demo(3),
    longitudinal:demo([{at:0,height:0},{at:0.35,height:2.1},{at:0.7,height:5},{at:1,height:6.4}]),
    crossLawn:demo([{at:0,height:0.4},{at:0.3,height:0},{at:0.65,height:0.25},{at:1,height:0.7}]),
    paths:demo([[{right:-48,upstage:-61},{right:-52,upstage:-83},{right:-55,upstage:-110}], [{right:48,upstage:-61},{right:54,upstage:-85},{right:52,upstage:-113}]]),
    fence:demo([{right:-60,upstage:-117},{right:-30,upstage:-125},{right:0,upstage:-127},{right:30,upstage:-124},{right:54,upstage:-115}]),
    poles:demo([{right:-48,upstage:-76},{right:48,upstage:-77},{right:-47,upstage:-110},{right:46,upstage:-109}])};
}
function evidence(r:Record<string,unknown>,issues:IssueList,path:string):Evidence {
  const status=readEnum(issues,r.status,`${path}.status`,VENUE_STATUS_OPTIONS)??"demo";
  const note=readString(issues,r.note,`${path}.note`)??"";
  const provenance=readProvenance(issues,r.provenance,`${path}.provenance`);
  return {status,note,...(provenance?{provenance}:{})};
}
export function parseTerrain(raw:unknown,issues:IssueList,path="venue.terrain"):TerrainRecord {
  if(raw===undefined)return defaultTerrain();
  const r=readObject(issues,raw,path)??{};
  if(r.version!==1)issues.add(`${path}.version`,"Expected terrain version 1.");
  const wrap=<T>(key:string,parse:(v:unknown,p:string)=>T):SceneValue<T>=>{const p=`${path}.${key}`,o=readObject(issues,r[key],p)??{};return {value:parse(o.value,`${p}.value`),...evidence(o,issues,p)};};
  const num=(v:unknown,p:string,min:number,max:number)=>readNumber(issues,v,p,{min,max})??min;
  const list=<T>(v:unknown,p:string,min:number,max:number,parse:(v:unknown,p:string)=>T):T[]=>{
    if(!Array.isArray(v)||v.length<min||v.length>max){issues.add(p,`Expected ${min}–${max} entries.`);return [];}
    return v.map((x,i)=>parse(x,`${p}[${i}]`));
  };
  const point=(v:unknown,p:string):TerrainPoint=>{const o=readObject(issues,v,p)??{};return {right:num(o.right,`${p}.right`,-200,200),upstage:num(o.upstage,`${p}.upstage`,-350,0)};};
  const samples=(v:unknown,p:string)=>list(v,p,2,12,(v,p)=>{const o=readObject(issues,v,p)??{};return {at:num(o.at,`${p}.at`,0,1),height:num(o.height,`${p}.height`,-10,30)};});
  const result:TerrainRecord={version:1,
    boundary:wrap("boundary",(v,p)=>list(v,p,2,12,(v,p)=>{const o=readObject(issues,v,p)??{};return {depth:num(o.depth,`${p}.depth`,0,200),left:num(o.left,`${p}.left`,-200,-1),right:num(o.right,`${p}.right`,1,200)};})),
    frontElevation:wrap("frontElevation",(v,p)=>num(v,p,-5,40)),concourseWidth:wrap("concourseWidth",(v,p)=>num(v,p,0.5,15)),
    longitudinal:wrap("longitudinal",samples),crossLawn:wrap("crossLawn",samples),
    paths:wrap("paths",(v,p)=>list(v,p,0,8,(v,p)=>list(v,p,2,24,point))),fence:wrap("fence",(v,p)=>list(v,p,0,24,point)),poles:wrap("poles",(v,p)=>list(v,p,0,24,point))};
  const b=result.boundary.value;
  if(b.length&&(b[0].depth!==0||b[b.length-1].depth<5||b.some((v,i)=>i>0&&v.depth<=b[i-1].depth)))issues.add(`${path}.boundary.value`,"Depths must increase from 0 to at least 5 m.");
  for(const key of ["longitudinal","crossLawn"] as const){const s=result[key].value;if(s.length&&(s[0].at!==0||s[s.length-1].at!==1||s.some((v,i)=>i>0&&v.at<=s[i-1].at)))issues.add(`${path}.${key}.value`,"Sample positions must increase from 0 to 1.");}
  if(result.longitudinal.value.length&&result.longitudinal.value[0].height!==0)issues.add(`${path}.longitudinal.value[0].height`,"Front offset must be zero; use front elevation.");
  return result;
}
export const terrainIsSettled=(t:TerrainRecord)=>Object.entries(t).filter(([key])=>key!=="version").every(([,value])=>SETTLED_VENUE_STATUSES.has((value as SceneValue<unknown>).status));
export const rearDownstage=(s:StructuresRecord,right:number)=>s.shell.rearDownstage.value-s.shell.rearCurve.value*(right/s.shell.halfWidth.value)**2;
export function interpolate(samples:TerrainSample[],at:number):number {
  if(at<=samples[0].at)return samples[0].height;
  for(let i=1;i<samples.length;i++)if(at<=samples[i].at){const a=samples[i-1],b=samples[i];return a.height+(b.height-a.height)*(at-a.at)/(b.at-a.at);}
  return samples[samples.length-1].height;
}
export interface TerrainVertex extends TerrainPoint { height:number }
/** The query uses the same triangles as rendering, including the concourse strip. */
export function solveTerrain(t:TerrainRecord,s:StructuresRecord) {
  const vertices:TerrainVertex[]=[],triangles:number[]=[],rows=32,columns=32;
  const boundary=t.boundary.value,maxDepth=boundary[boundary.length-1].depth;
  const widths=(depth:number)=>({left:interpolate(boundary.map(v=>({at:v.depth,height:v.left})),depth),right:interpolate(boundary.map(v=>({at:v.depth,height:v.right})),depth)});
  // First strip bridges the actual facade floor to the lawn front, even when their datums differ.
  for(let j=-1;j<=rows;j++)for(let i=0;i<=columns;i++){
    const v=Math.max(0,j/rows),u=i/columns,w=widths(v*maxDepth);
    const right=j===-1?(-s.shell.halfWidth.value+2*s.shell.halfWidth.value*u):w.left+(w.right-w.left)*u;
    const frontRight=boundary[0].left+(boundary[0].right-boundary[0].left)*u;
    const upstage=-(rearDownstage(s,j===-1?right:frontRight)+(j===-1?0:t.concourseWidth.value)+v*maxDepth);
    const height=j===-1?s.shell.rearFloor.value:t.frontElevation.value+interpolate(t.longitudinal.value,v)+interpolate(t.crossLawn.value,u)*v;
    vertices.push({right,upstage,height});
  }
  for(let j=0;j<=rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;triangles.push(a,b,c,b,d,c);}
  function surfaceHeightAt(right:number,upstage:number):number|null {
    for(let i=0;i<triangles.length;i+=3){const a=vertices[triangles[i]],b=vertices[triangles[i+1]],c=vertices[triangles[i+2]];
      const det=(b.upstage-c.upstage)*(a.right-c.right)+(c.right-b.right)*(a.upstage-c.upstage);
      if(Math.abs(det)<1e-10)continue;
      const u=((b.upstage-c.upstage)*(right-c.right)+(c.right-b.right)*(upstage-c.upstage))/det;
      const v=((c.upstage-a.upstage)*(right-c.right)+(a.right-c.right)*(upstage-c.upstage))/det,w=1-u-v;
      if(u>=-1e-8&&v>=-1e-8&&w>=-1e-8)return u*a.height+v*b.height+w*c.height;
    }
    return null;
  }
  return {vertices,triangles,surfaceHeightAt,columns,rows};
}
