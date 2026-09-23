import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, Vector3 } from "three";
import { solveTerrain, type TerrainPoint } from "../domain/terrain";
import { type VenueGeometry } from "../domain/venue";
import { makeLabel } from "./labels";

export function buildTerrain(g:VenueGeometry,labels=true){
  const root=new Group();root.name="lawn-terrain";
  const solved=solveTerrain(g.terrain,g.structures),geometries:BufferGeometry[]=[],materials:MeshLambertMaterial[]=[];
  const material=(color:number)=>{const m=new MeshLambertMaterial({color,side:DoubleSide});materials.push(m);return m;};
  const grass=material(0x587347),concrete=material(0x99988c),steel=material(0x525953),trees=material(0x354e3c);
  const mesh=(geometry:BufferGeometry,mat:MeshLambertMaterial | MeshLambertMaterial[],name:string)=>{geometries.push(geometry);const m=new Mesh(geometry,mat);m.name=name;m.userData.occluder=true;root.add(m);return m;};
  const geometry=new BufferGeometry();geometry.setAttribute("position",new Float32BufferAttribute(solved.vertices.flatMap(p=>[-p.right,p.height,-p.upstage]),3));geometry.setIndex(solved.triangles);geometry.computeVertexNormals();
  mesh(geometry,[concrete,grass],"lawn-surface");geometry.addGroup(0,solved.columns*6,0);geometry.addGroup(solved.columns*6,solved.triangles.length-solved.columns*6,1);
  const beam=(a:Vector3,b:Vector3,width:number,name:string)=>{const m=mesh(new BoxGeometry(width,a.distanceTo(b),width),steel,name);m.position.copy(a).add(b).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new Vector3(0,1,0),b.clone().sub(a).normalize());};
  const point=(p:TerrainPoint,offset=0)=>{const y=solved.surfaceHeightAt(p.right,p.upstage);return y===null?null:new Vector3(-p.right,y+offset,-p.upstage);};
  for(const [index,path] of g.terrain.paths.value.entries())for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],distance=Math.hypot(b.right-a.right,b.upstage-a.upstage),n=Math.max(1,Math.ceil(distance/0.5));
    const dx=(b.upstage-a.upstage)/Math.max(distance,0.001)*0.8,dz=-(b.right-a.right)/Math.max(distance,0.001)*0.8;
    for(let j=0;j<n;j++){
      const corners=[j/n,(j+1)/n].flatMap(v=>[-1,1].map(side=>point({right:a.right+(b.right-a.right)*v+side*dx,upstage:a.upstage+(b.upstage-a.upstage)*v+side*dz},0.025)));
      if(corners.some(p=>p===null))continue;
      const geo=new BufferGeometry();geo.setAttribute("position",new Float32BufferAttribute(corners.flatMap(p=>p!.toArray()),3));geo.setIndex([0,2,1,1,2,3]);geo.computeVertexNormals();mesh(geo,concrete,`lawn-path-${index}`);
    }
  }
  const fence=g.terrain.fence.value;
  for(let i=1;i<fence.length;i++){
    const a=fence[i-1],b=fence[i],n=Math.max(1,Math.ceil(Math.hypot(b.right-a.right,b.upstage-a.upstage)/2));let previous:Vector3|null=null;
    for(let j=0;j<=n;j++){
      const p=point({right:a.right+(b.right-a.right)*j/n,upstage:a.upstage+(b.upstage-a.upstage)*j/n});
      if(!p){previous=null;continue;}
      beam(p,p.clone().add(new Vector3(0,1.3,0)),0.06,"lawn-fence-post");
      if(previous)for(const h of [0.45,1.2])beam(previous.clone().add(new Vector3(0,h,0)),p.clone().add(new Vector3(0,h,0)),0.045,"lawn-fence-rail");previous=p;
    }
  }
  for(const p of g.terrain.poles.value){const base=point(p);if(!base)continue;const m=mesh(new CylinderGeometry(0.07,0.1,8,8),steel,"lawn-pole");m.position.copy(base).add(new Vector3(0,4,0));m.userData.ground={...p,height:base.y};}
  // Generic distant context, deliberately separate from surveyed venue geometry.
  const rear=solved.vertices.slice(-(solved.columns+1));
  for(let i=1;i<rear.length;i+=3){const p=rear[i];const m=mesh(new CylinderGeometry(0.3,2.8,7,6),trees,"distant-tree");m.position.set(-p.right,p.height+3.5,-p.upstage+8);}
  for (const mat of [concrete,steel]) {
    const parts:BufferGeometry[]=[],remove:Mesh[]=[];
    root.updateMatrixWorld(true);
    root.traverse(o=>{if(o instanceof Mesh && o.material===mat && (o.name.startsWith("lawn-path")||o.name.startsWith("lawn-fence"))){parts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);}});
    if(parts.length){mesh(mergeGeometries(parts),mat,"lawn-circulation");remove.forEach(o=>o.removeFromParent());parts.forEach(g=>g.dispose());}
  }
  let label:ReturnType<typeof makeLabel>|undefined;
  if(labels){label=makeLabel("Lawn · provisional terrain",{height:1.6});label.layers.set(1);const centre=solved.vertices[Math.floor(solved.vertices.length*0.65)];label.position.set(0,centre.height+2,-centre.upstage);root.add(label);}
  root.userData.terrain={vertices:solved.vertices.length,triangles:solved.triangles.length/3};
  return {root,surfaceHeightAt:solved.surfaceHeightAt,dispose(){label?.material.map?.dispose();label?.material.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
