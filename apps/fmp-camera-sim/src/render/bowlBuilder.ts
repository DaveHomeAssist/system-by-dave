import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, CylinderGeometry, DoubleSide, FrontSide, Group, InstancedMesh, Mesh, MeshLambertMaterial, Object3D, PlaneGeometry, RingGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { type BowlRecord, solveBowl, elevationAt } from "../domain/bowl";
import { makeLabel } from "./labels";

export function buildBowl(record: BowlRecord, pitDepth: number, deckHeight: number, labels = true) {
  const solved = solveBowl(record, pitDepth, deckHeight);
  const root = new Group(); root.name = "seating-bowl";
  const geometries: BufferGeometry[] = [];
  const materials: MeshLambertMaterial[] = [];
  const geometry = <T extends BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const material = (color: number, doubleSide = false) => { const m = new MeshLambertMaterial({ color, side: doubleSide ? DoubleSide : FrontSide }); materials.push(m); return m; };
  const concrete = material(0x696b69, true), teal = material(0x247e80, true), steel = material(0x252e31, true);
  const focus = record.focusUpstage.value;
  const treads: BufferGeometry[] = [], risers: BufferGeometry[] = [];
  const arc = (inner: number, outer: number, from: number, to: number, y: number) => {
    const g = new RingGeometry(inner, outer, Math.max(4, Math.ceil((to - from) / 2)), 1, (from - 90) * Math.PI / 180, (to - from) * Math.PI / 180);
    g.rotateX(-Math.PI / 2); g.translate(0, y, -focus); return g;
  };
  const placements: Array<{sectorId: string; x: number; y: number; z: number; angle: number}> = [];
  for (const row of solved.rows) {
    // Full tread includes the aisle; only seats leave the angular aisle gap.
    const sector = record.sectors.find(s => s.id === row.sectorId)!;
    treads.push(arc(row.inner, row.outer, sector.fromDeg.value, sector.toDeg.value, row.y));
    if (row.row === 0) {
      const foundationHeight = row.y + deckHeight;
      const foundation = new CylinderGeometry(row.inner, row.inner, foundationHeight, 20, 1, true, sector.fromDeg.value * Math.PI / 180, (sector.toDeg.value - sector.fromDeg.value) * Math.PI / 180);
      foundation.translate(0, -deckHeight + foundationHeight / 2, -focus); risers.push(foundation);
    }
    const height = Math.max(0.03, row.nextY - row.y);
    const riser = new CylinderGeometry(row.outer, row.outer, height, Math.max(4, Math.ceil((sector.toDeg.value - sector.fromDeg.value) / 2)), 1, true, sector.fromDeg.value * Math.PI / 180, (sector.toDeg.value - sector.fromDeg.value) * Math.PI / 180);
    riser.translate(0, row.y + height / 2, -focus); risers.push(riser);
    const r = row.inner + (row.outer - row.inner) * 0.57;
    const length = r * (row.toDeg - row.fromDeg) * Math.PI / 180;
    const count = Math.max(1, Math.floor(length / row.seatPitch));
    for (let i = 0; i < count; i++) {
      const angle = (row.fromDeg + (i + 0.5) / count * (row.toDeg - row.fromDeg)) * Math.PI / 180;
      placements.push({ sectorId: row.sectorId, x: r * Math.sin(angle), y: row.y, z: -focus + r * Math.cos(angle), angle });
    }
  }
  const addMerged = (parts: BufferGeometry[], name: string) => { const mesh = new Mesh(geometry(mergeGeometries(parts)), concrete); mesh.name = name; root.add(mesh); parts.forEach(g => g.dispose()); };
  addMerged(treads, "bowl-treads"); addMerged(risers, "bowl-risers");
  const transform = new Object3D();
  // Open seat shells avoid hidden box faces at venue scale. Supports use crossed plates so
  // they remain visible from the side. Instancing per sector also permits frustum culling.
  const shell = geometry(new PlaneGeometry(0.4, 0.4).rotateX(-Math.PI / 2));
  const back = geometry(new PlaneGeometry(0.4, 0.44));
  const legFront = new PlaneGeometry(0.08, 0.43), legSide = new PlaneGeometry(0.22, 0.43).rotateY(Math.PI / 2);
  const supports = geometry(mergeGeometries([legFront, legSide])); legFront.dispose(); legSide.dispose();
  const seatMaterial = material(0xffffff, true); seatMaterial.vertexColors = true;
  for (const [shape, offset, color] of [[shell, [0, 0.45, 0], 0x247e80], [back, [0, 0.67, 0.19], 0x247e80], [supports, [0, 0.215, 0], 0x252e31]] as const) {
    shape.translate(offset[0], offset[1], offset[2]);
    const c = new Color(color), colors = [];
    for (let i = 0; i < shape.getAttribute("position").count; i++) colors.push(c.r, c.g, c.b);
    shape.setAttribute("color", new Float32BufferAttribute(colors, 3));
  }
  const completeSeat = geometry(mergeGeometries([shell, back, supports]));
  const reducedSeat = geometry(mergeGeometries([shell, back]));
  for (const [name, shape] of [["seat-detail", completeSeat], ["seat-reduced", reducedSeat]] as const) {
    record.sectors.forEach((sector, index) => {
      const seats = placements.filter(p => p.sectorId === sector.id);
      const mesh = new InstancedMesh(shape, seatMaterial, seats.length); mesh.name = index === 0 ? name : `${name}:${sector.id}`;
      mesh.visible = name === "seat-detail";
      seats.forEach((p, i) => { transform.position.set(p.x, p.y, p.z); transform.rotation.set(0, p.angle, 0); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); root.add(mesh);
    });
  }
  const band = new Group(); band.name = "cross-aisle-box-band";
  for (const s of record.sectors.filter(s => s.level.value === 1)) {
    const bandRow = Math.min(record.band.rowIndex.value, s.rowCount.value);
    const bandRadius = solved.firstRadius + bandRow * s.rowRun.value;
    const bandY = solved.floor + elevationAt(s, bandRow);
    const platform = new Mesh(geometry(arc(bandRadius, bandRadius + record.band.width.value, s.fromDeg.value, s.toDeg.value, bandY + record.band.elevationStep.value)), concrete);
    band.add(platform);
    // Vertical fascia closes the level transition instead of leaving floating upper rows.
    const fascia = new CylinderGeometry(bandRadius, bandRadius, record.band.elevationStep.value, 16, 1, true, s.fromDeg.value * Math.PI / 180, (s.toDeg.value - s.fromDeg.value) * Math.PI / 180);
    fascia.translate(0, bandY + record.band.elevationStep.value / 2, -focus);
    band.add(new Mesh(geometry(fascia), concrete));
    const rail = new CylinderGeometry(bandRadius + 0.15, bandRadius + 0.15, 0.055, 20, 1, true, (s.fromDeg.value + 1) * Math.PI / 180, (s.toDeg.value - s.fromDeg.value - 2) * Math.PI / 180);
    const base = bandY + record.band.elevationStep.value;
    rail.translate(0, base + record.band.railingHeight.value, -focus); band.add(new Mesh(geometry(rail), steel));
    for (let a = s.fromDeg.value + 2; a < s.toDeg.value; a += 5) {
      const radians = a * Math.PI / 180;
      const post = new Mesh(geometry(new BoxGeometry(0.05, record.band.railingHeight.value, 0.05)), steel);
      post.position.set((bandRadius + 0.15) * Math.sin(radians), base + record.band.railingHeight.value / 2, (bandRadius + 0.15) * Math.cos(radians) - focus); band.add(post);
    }
    const localEnd = solved.firstRadius + s.rowCount.value * s.rowRun.value + record.band.width.value;
    const upperRows = solved.rows.filter(r => record.sectors.find(sector => sector.id === r.sectorId)!.level.value === 2);
    const upperStart = Math.min(...upperRows.map(r => r.inner));
    const upperY = Math.min(...upperRows.map(r => r.y));
    const localY = solved.floor + elevationAt(s, s.rowCount.value) + record.band.elevationStep.value;
    if (upperStart > localEnd) {
      const landing = new Mesh(geometry(arc(localEnd, upperStart, s.fromDeg.value, s.toDeg.value, upperY)), concrete);
      landing.name = "level-transition-landing"; band.add(landing);
    }
    if (upperY > localY) {
      const transition = new CylinderGeometry(localEnd, localEnd, upperY - localY, 20, 1, true, s.fromDeg.value * Math.PI / 180, (s.toDeg.value - s.fromDeg.value) * Math.PI / 180);
      transition.translate(0, (upperY + localY) / 2, -focus);
      const mesh = new Mesh(geometry(transition), concrete); mesh.name = "level-transition-fascia"; band.add(mesh);
    }
    const mid = (s.fromDeg.value + s.toDeg.value) / 2 * Math.PI / 180, radius = bandRadius + record.band.width.value * 0.6;
    // Central box furniture follows the P096 topology; sizes and placement remain demo.
    if (Math.abs(mid) < Math.PI / 6) {
      for (const [width, height, depth, radialOffset, elevation, mat] of [
        [1.4, 0.48, 0.65, 0, 0.24, teal],
        [1.4, 0.4, 0.1, 0.28, 0.68, teal],
        [0.45, 0.55, 0.45, -0.6, 0.275, steel],
      ] as const) {
        const furniture = new Mesh(geometry(new BoxGeometry(width, height, depth)), mat);
        furniture.position.set((radius + radialOffset) * Math.sin(mid), base + elevation, (radius + radialOffset) * Math.cos(mid) - focus);
        furniture.rotation.y = mid; band.add(furniture);
      }
    }
  }
  // Batch static band parts by material. Their transforms are baked into merged geometry.
  for (const mat of [concrete, teal, steel]) {
    const parts: BufferGeometry[] = [];
    for (const child of [...band.children]) if (child instanceof Mesh && child.material === mat && !child.name) {
      child.updateMatrix(); parts.push(child.geometry.clone().applyMatrix4(child.matrix)); band.remove(child);
    }
    if (parts.length) { band.add(new Mesh(geometry(mergeGeometries(parts)), mat)); parts.forEach(g => g.dispose()); }
  }
  root.add(band);
  if (labels) for (const s of record.sectors) {
    const row = solved.rows.find(r => r.sectorId === s.id && r.row === Math.floor(s.rowCount.value / 2))!;
    const a = (s.fromDeg.value + s.toDeg.value) / 2 * Math.PI / 180;
    const label = makeLabel(s.label, { height: 1.1 }); label.layers.set(1);
    label.position.set(row.inner * Math.sin(a), row.y + 1.4, row.inner * Math.cos(a) - focus); root.add(label);
  }
  root.userData.bowl = { rows: solved.rows, segments: solved.segments, seats: placements.length };
  return { root, extent: solved.extent, dispose() { root.traverse(child => { if (child instanceof InstancedMesh) child.dispose(); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
}
