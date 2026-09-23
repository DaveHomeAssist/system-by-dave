import { BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, type Camera, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { type StructuresRecord, type SceneFixture, type ShowPackage, fixtureContains } from "../domain/structures";
import { type VenueGeometry } from "../domain/venue";
import { solveBowl } from "../domain/bowl";
import { makeLabel } from "./labels";
import { stageToWorld } from "../sim/framing";

/** Physical shell always exists; only the overview camera may omit this layer. */
export const SHELL_LAYER = 2;
export function setShellCutaway(overview: Camera, cutaway: boolean): void {
  if (cutaway) overview.layers.disable(SHELL_LAYER); else overview.layers.enable(SHELL_LAYER);
}
export function shellRoofHeight(s: StructuresRecord, right: number): number {
  const p = s.shell, fraction = Math.min(1, Math.abs(right) / p.halfWidth.value);
  return p.eaveHeight.value + (p.ridgeHeight.value - p.eaveHeight.value) * (1 - fraction * fraction);
}
export function shellRearDownstage(s: StructuresRecord, right: number): number {
  return s.shell.rearDownstage.value - s.shell.rearCurve.value * (right / s.shell.halfWidth.value) ** 2;
}
/** FOH deck clears the stepped seating rake; the stored height is additional clearance. */
export function fohFloorHeight(g: VenueGeometry, f: SceneFixture): number {
  let height = -g.deckHeight;
  for (const row of solveBowl(g.bowl, g.pitDepth, g.deckHeight).rows) {
    for (let angle = row.fromDeg; angle <= row.toDeg; angle += 0.5) {
      const r = row.outer, radians = angle * Math.PI / 180;
      if (fixtureContains(f, -r * Math.sin(radians), g.bowl.focusUpstage.value - r * Math.cos(radians), 0.4)) height = Math.max(height, row.nextY);
    }
  }
  return height + f.position.value.height;
}
export function buildStructures(g: VenueGeometry, show: ShowPackage, labels = true) {
  const record = g.structures, p = record.shell;
  const root = new Group(), shell = new Group(), fixtures = new Group(), production = new Group();
  root.name = "structures"; shell.name = "venue-shell"; fixtures.name = "house-fixtures"; production.name = "show-package";
  root.add(shell, fixtures, production);
  const labelDisposables: Array<() => void> = [];
  const geometries: BufferGeometry[] = [], materials = new Map<number, MeshLambertMaterial>();
  const mat = (color: number) => { if (!materials.has(color)) materials.set(color, new MeshLambertMaterial({ color, side: DoubleSide })); return materials.get(color)!; };
  const add = (parent: Group, geometry: BufferGeometry, color: number, name = "") => {
    geometries.push(geometry); const mesh = new Mesh(geometry, mat(color)); mesh.name = name; mesh.userData.occluder = true; parent.add(mesh); return mesh;
  };
  const box = (parent: Group, x: number, y: number, z: number, w: number, h: number, d: number, color: number) => {
    const m = add(parent, new BoxGeometry(w, Math.max(0.01, h), d), color); m.position.set(x, y, z); return m;
  };
  const beam = (parent: Group, a: Vector3, b: Vector3, width: number, color: number) => {
    const m = add(parent, new BoxGeometry(width, a.distanceTo(b), width), color);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()); return m;
  };
  const steel = 0x444b50, wall = 0x707775;
  const positions: number[] = [], indices: number[] = [], nx = 24, nz = 8, half = p.halfWidth.value;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -half + 2 * half * i / nx, z = -p.frontUpstage.value + (shellRearDownstage(record, x) + p.frontUpstage.value) * j / nz;
    positions.push(x, shellRoofHeight(record, x), z);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; indices.push(a, c, b, b, c, d);
  }
  const roof = new BufferGeometry(); roof.setAttribute("position", new Float32BufferAttribute(positions, 3)); roof.setIndex(indices); roof.computeVertexNormals();
  add(shell, roof, 0x69716e, "pavilion-roof");
  // Curved rear facade: open bays between piers, with a continuous upper fascia.
  const floor = p.rearFloor.value;
  for (let i = 0; i <= p.bayCount.value; i++) {
    const x = -half + 2 * half * i / p.bayCount.value, z = shellRearDownstage(record, x), top = shellRoofHeight(record, x);
    box(shell, x, (floor + top) / 2, z, 0.75, top - floor, 0.8, wall);
    if (i) {
      const oldX = -half + 2 * half * (i - 1) / p.bayCount.value;
      beam(shell, new Vector3(oldX, shellRoofHeight(record, oldX) - 0.65, shellRearDownstage(record, oldX)), new Vector3(x, top - 0.65, z), 1.3, wall);
    }
  }
  // Primary roof arches, longitudinal steel and side columns; sizes remain schematic.
  for (let j = 0; j <= 6; j++) {
    const z = -p.frontUpstage.value + (p.rearDownstage.value - p.rearCurve.value + p.frontUpstage.value) * j / 6;
    for (let i = 0; i < 12; i++) {
      const x1 = -half + 2 * half * i / 12, x2 = -half + 2 * half * (i + 1) / 12;
      const a = new Vector3(x1, shellRoofHeight(record, x1) - 0.4, z), b = new Vector3(x2, shellRoofHeight(record, x2) - 0.4, z);
      beam(shell, a, b, 0.2, steel); beam(shell, a.clone().add(new Vector3(0, -1, 0)), b.clone().add(new Vector3(0, -1, 0)), 0.16, steel);
      beam(shell, a, b.clone().add(new Vector3(0, -1, 0)), 0.07, steel);
    }
    for (const side of [-1, 1]) box(shell, side * half, (p.eaveHeight.value - g.deckHeight) / 2, z, 0.65, p.eaveHeight.value + g.deckHeight, 0.65, steel);
  }
  for (let i = 0; i <= 8; i++) {
    const x = -half + 2 * half * i / 8;
    beam(shell, new Vector3(x, shellRoofHeight(record, x) - 0.4, -p.frontUpstage.value), new Vector3(x, shellRoofHeight(record, x) - 0.4, shellRearDownstage(record, x)), 0.13, steel);
  }
  const W = g.stageWidth, D = g.stageDepth, opening = p.openingHeight.value, houseW = W + 10;
  box(shell, 0, (opening - g.deckHeight) / 2, -D - 0.2, houseW, opening + g.deckHeight, 0.4, 0x131418);
  for (const side of [-1, 1]) box(shell, side * (houseW / 2 + 0.2), (opening - g.deckHeight) / 2, -D / 2, 0.4, opening + g.deckHeight, D, 0x17181c);
  box(shell, 0, opening - 0.7, 0.2, houseW, 1.4, 0.6, 0x1a1b20);
  // The original support datum is retained; roof hangers now meet the provisional steel.
  const camera = stageToWorld(g.camera), inverted = g.mountOrientation === "inverted";
  const deckY = camera.y + (inverted ? 0.55 : -0.5), span = p.catwalkSpan.value;
  const catwalk = new Group(); catwalk.name = "catwalk"; shell.add(catwalk);
  box(catwalk, camera.x, deckY, camera.z + 0.6, span, 0.08, 0.9, steel);
  for (const dz of [0.17, 1.03]) {
    box(catwalk, camera.x, deckY + 1.05, camera.z + dz, span, 0.05, 0.05, steel);
    for (let x = -span / 2; x <= span / 2; x += 2.5) box(catwalk, camera.x + x, deckY + 0.52, camera.z + dz, 0.05, 1.05, 0.05, steel);
  }
  for (let x = -span / 2; x <= span / 2; x += 5) beam(catwalk, new Vector3(camera.x + x, deckY, camera.z + 0.6), new Vector3(camera.x + x, shellRoofHeight(record, camera.x + x) - 1, camera.z + 0.6), 0.04, steel);
  const baseY = camera.y + (inverted ? 0.18 : -0.18);
  box(catwalk, camera.x, (deckY + baseY) / 2, camera.z, 0.05, Math.abs(deckY - baseY), 0.05, steel);
  box(catwalk, camera.x, baseY, camera.z, 0.2, 0.025, 0.22, steel);

  function buildFixture(f: SceneFixture, parent: Group) {
    if (!f.enabled.value) return;
    const group = new Group(); group.name = f.id; group.userData.evidence = { position: f.position, size: f.size }; parent.add(group);
    const size = f.size.value, pos = f.position.value;
    if (f.kind === "backline") {
      // Existing demo geometry, now owned by the show package.
      box(group, 0, 0.3, -D * 0.8, 2.6, 0.6, 2.4, 0x3c3f46);
      const kick = add(group, new CylinderGeometry(0.28, 0.28, 0.4, 20), 0x8a8f99); kick.rotation.x = Math.PI / 2; kick.position.set(0, 0.88, -D * 0.8 + 0.4);
      for (const [x,y,r,h] of [[0.45,1.25,0.18,0.14],[-0.45,1.3,0.2,0.2]]) { const drum = add(group,new CylinderGeometry(r,r,h,18),0x8a8f99);drum.position.set(x,y,-D*0.8+0.2); }
      for (const side of [-1,1]) box(group,side*W*0.3,0.8,-D*0.82,0.8,1.6,0.45,0x202227);
      const stand = add(group,new CylinderGeometry(0.012,0.012,1.5,6),0x6b6f78);stand.position.set(0,0.75,-D*0.06);
      const foot = add(group,new CylinderGeometry(0.14,0.14,0.02,12),steel);foot.position.set(0,0.01,-D*0.06);
      group.scale.set(size.right,size.height,size.upstage);
    } else if (f.kind === "led") {
      box(group, 0, 0, 0, size.right + 0.16, size.height + 0.16, size.upstage, 0x161c20);
      if (f.id.includes("lawn delay")) for (const side of [-1, 1]) {
        const supportHeight = Math.max(0.1, pos.height - size.height / 2 - p.rearFloor.value);
        box(group, side * size.right * 0.35, -size.height / 2 - supportHeight / 2, -0.15, 0.22, supportHeight, 0.3, steel);
      }
      // Procedural colour bars give the wall a lit face without inventing a real video feed.
      const colors = [0xd9dbd7, 0xd8c641, 0x39a8b5, 0x42a370, 0xa44b9e, 0xc05345, 0x456bba];
      for (let i = 0; i < colors.length; i++) {
        const face = box(group, -size.right / 2 + (i + 0.5) * size.right / 7, 0, size.upstage / 2 + 0.006, size.right / 7, size.height, 0.01, colors[i]);
        const material = face.material as MeshLambertMaterial; material.emissive.setHex(colors[i]); material.emissiveIntensity = 0.7;
      }
    } else if (f.kind === "foh") {
      box(group, 0, -0.1, 0, size.right, 0.2, size.upstage, 0x343c40);
      // Console desks face downstage. Rails stop short of the rear access opening.
      for (const x of [-size.right * 0.25, size.right * 0.25]) {
        box(group, x, 0.78, -size.upstage * 0.15, size.right * 0.38, 0.16, 1.05, 0x282e34);
        for (const side of [-1, 1]) box(group, x + side * size.right * 0.13, 0.35, -size.upstage * 0.15, 0.06, 0.7, 0.8, steel);
        for (const screen of [-0.45, 0.45]) {
          box(group, x + screen, 1.12, -size.upstage * 0.15 - 0.4, 0.55, 0.35, 0.07, 0x20282e);
          box(group, x + screen, 1.12, -size.upstage * 0.15 - 0.355, 0.48, 0.27, 0.01, 0x4c8190);
        }
      }
      for (const x of [-size.right/2, size.right/2]) {
        box(group, x, size.height, 0, 0.05, 0.05, size.upstage, steel);
        for (let z = -size.upstage/2; z <= size.upstage/2; z += 1) box(group, x, size.height/2, z, 0.05, size.height, 0.05, steel);
      }
      // Solid side fascia reaches below the local rake rather than leaving a floating platform.
      for (const x of [-size.right/2, size.right/2]) box(group, x, -1.5, 0, 0.1, 3, size.upstage, 0x343c40);
    } else if (f.kind === "fan") {
      const hub = add(group,new CylinderGeometry(0.2,0.2,size.height,12),steel);
      for(let i=0;i<8;i++) {const angle=i*Math.PI/4, radius=size.right/2;const blade=box(group,Math.cos(angle)*radius/2,0,-Math.sin(angle)*radius/2,radius,0.035,0.15,0xaaaead);blade.rotation.y=angle;}
      group.scale.z=size.upstage/size.right;
      hub.position.y=0.08;
    } else if (f.kind === "railing" || f.kind === "truss") {
      for(const y of [-size.height/2,size.height/2]) box(group,0,y,0,size.right,0.06,Math.max(0.06,size.upstage),steel);
      const count=Math.max(2,Math.ceil(size.right/2));
      for(let i=0;i<=count;i++) box(group,-size.right/2+size.right*i/count,0,0,0.045,size.height,0.045,steel);
      if(f.kind==='truss') for(let i=0;i<count;i++) beam(group,new Vector3(-size.right/2+size.right*i/count,-size.height/2,0),new Vector3(-size.right/2+size.right*(i+1)/count,size.height/2,0),0.05,steel);
    } else if (f.kind === "pa") {
      for(let i=0;i<8;i++) { const cab=box(group,0,-size.height/2+(i+0.5)*size.height/8,Math.sin(i/7*0.45)*size.upstage,size.right,size.height/8*0.94,size.upstage,0x16191b); cab.rotation.x=-i/7*0.3; }
    } else box(group,0,0,0,size.right,size.height,size.upstage,f.kind==='drape'?0x18171c:steel);
    group.position.set(-pos.right, f.kind === "foh" ? fohFloorHeight(g, f) : pos.height, -pos.upstage);
    group.rotation.y = f.yaw.value * Math.PI / 180;
    if (labels && (f.kind === "led" || f.kind === "foh")) {
      const label = makeLabel(f.id, {height: 0.9}); label.layers.set(1);
      label.position.set(-pos.right, group.position.y + (f.kind === "foh" ? 2 : size.height / 2 + 1), -pos.upstage);
      parent.add(label);
      labelDisposables.push(() => { label.material.map?.dispose(); label.material.dispose(); });
    }
  }
  record.fixtures.forEach(f=>buildFixture(f,fixtures)); show.fixtures.forEach(f=>buildFixture(f,production));
  // Batch static meshes by material and ownership group, retaining the roof as a ray target.
  for (const owner of [shell,fixtures,production]) {
    owner.updateMatrixWorld(true);
    const batches = new Map<MeshLambertMaterial, BufferGeometry[]>();
    owner.traverse(child=>{if(child instanceof Mesh && child.name!=="pavilion-roof") {
      const m=child.material as MeshLambertMaterial;
      if(!batches.has(m)) batches.set(m,[]);
      batches.get(m)!.push(child.geometry.clone().applyMatrix4(child.matrixWorld));
    }});
    const remove: Mesh[]=[];owner.traverse(child=>{if(child instanceof Mesh && child.name!=="pavilion-roof")remove.push(child);});remove.forEach(m=>m.removeFromParent());
    for(const [m,parts] of batches) {const geometry=mergeGeometries(parts);geometries.push(geometry);const mesh=new Mesh(geometry,m);mesh.userData.occluder=true;owner.add(mesh);parts.forEach(p=>p.dispose());}
  }
  shell.traverse(child=>child.layers.set(SHELL_LAYER));
  root.updateMatrixWorld(true);
  return {root,shell,fixtures,show:production,dispose(){labelDisposables.forEach(dispose=>dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
