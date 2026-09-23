import { describe, expect, it } from "vitest";
import { Matrix4, type InstancedMesh, type Mesh, Vector3 } from "three";
import { defaultBowl, elevationAt, parseBowl, solveBowl } from "./bowl";
import { IssueList } from "./validate";
import { defaultVenueProfile, parseVenueProfile } from "./venue";
import { defaultProject, parseProjectText, serializeProject } from "./project";
import { buildBowl } from "../render/bowlBuilder";

describe("sectional bowl", () => {
  it("round-trips the complete venue without changing serialized property order", () => {
    const p = defaultProject(), parsed = parseProjectText(serializeProject(p));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("parse failed");
    expect(JSON.stringify(parsed.project.venue)).toBe(JSON.stringify(p.venue));
  });
  it("keeps unequal P096-informed spans provisional and derives the unverified starting pitch", () => {
    const bowl = defaultBowl(), solved = solveBowl(bowl, 3.6576, 1.524);
    expect(new Set(bowl.sectors.map(s => s.toDeg.value - s.fromDeg.value)).size).toBeGreaterThan(1);
    expect(solved.segments[0].angle).toBeCloseTo(9.4623, 3);
    expect(solved.segments[5].angle).toBeCloseTo(25.0169, 3);
    expect(bowl.sectors.every(s => s.rowRun.status === "demo")).toBe(true);
  });
  it("interpolates piecewise elevations for tread positions, pitches and seat supports", () => {
    const b = defaultBowl(), s = b.sectors[0];
    s.elevations.splice(1, 0, { row: { ...s.elevations[0].row, value: 14 }, elevation: { ...s.elevations[0].elevation, value: 1.4 } });
    const solved = solveBowl(b, 3, 1), sector = solved.rows.filter(r => r.sectorId === s.id);
    expect(elevationAt(s, 7)).toBeCloseTo(0.7);
    expect(sector[7].y).toBeCloseTo(-0.75 + 0.7);
    expect(solved.segments[0].grade).toBeCloseTo(100 * 1.4 / 12.6);
    const built = buildBowl(b, 3, 1, false);
    const supports = built.root.getObjectByName("seat-detail") as InstancedMesh;
    const m = new Matrix4(); supports.getMatrixAt(0, m);
    supports.geometry.computeBoundingBox();
    expect(new Vector3().setFromMatrixPosition(m).y + supports.geometry.boundingBox!.min.y).toBeCloseTo(sector[0].y);
    const tread = built.root.getObjectByName("bowl-treads") as Mesh;
    const ys = tread.geometry.getAttribute("position");
    expect(Array.from({length:ys.count}, (_,i)=>ys.getY(i)).some(y=>Math.abs(y-sector[7].y)<1e-5)).toBe(true);
    expect(built.root.userData.bowl.seats).toBeGreaterThan(1000);
    built.dispose();
  });
  it("joins the lower endpoint to the cross aisle and upper treads without a floating transition", () => {
    const b = defaultBowl(), a = solveBowl(b, 3, 1);
    const last = a.rows.filter(r => r.sectorId === "102").at(-1)!;
    const first = a.rows.find(r => r.sectorId === "202")!;
    expect(first.inner - last.outer).toBeCloseTo(b.band.width.value);
    expect(first.y - last.nextY).toBeCloseTo(b.band.elevationStep.value);
    const built = buildBowl(b, 3, 1, false);
    const band = built.root.getObjectByName("cross-aisle-box-band")!;
    const heights = band.children.flatMap(child => {
      const position = (child as Mesh).geometry.getAttribute("position");
      return Array.from({ length: position.count }, (_, i) => position.getY(i));
    });
    expect(heights.some(y => Math.abs(y - first.y) < 1e-5)).toBe(true);
    expect(heights.some(y => Math.abs(y - first.y - b.band.railingHeight.value - 0.0275) < 1e-5)).toBe(true);
    expect(a.rows.every(r => r.toDeg < b.sectors.find(s=>s.id===r.sectorId)!.toDeg.value)).toBe(true);
    built.dispose();
  });
  it("fills the transition when a sector has a shorter run or lower endpoint", () => {
    const b = defaultBowl(); b.sectors[0].rowRun.value = 0.7; b.sectors[0].elevations[1].elevation.value = 3;
    const built = buildBowl(b, 3, 1, false);
    expect(built.root.getObjectByName("level-transition-landing")).toBeDefined();
    expect(built.root.getObjectByName("level-transition-fascia")).toBeDefined(); built.dispose();
  });
  it("migrates a v2 venue without changing dimensions or presets", () => {
    const p = JSON.parse(serializeProject(defaultProject())); p.venue.version = 2; delete p.venue.bowl; delete p.venue.mount.headingEvidence;
    const before = JSON.stringify(p.venue.dimensions), presets = JSON.stringify(p.session.presets);
    const parsed = parseProjectText(JSON.stringify(p)); expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("migration failed");
    expect(JSON.stringify(parsed.project.venue.dimensions)).toBe(before);
    expect(JSON.stringify(parsed.project.session.presets)).toBe(presets);
    expect(parsed.project.venue.bowl).toEqual(defaultBowl());
  });
  it("rejects malformed fields at their path and overlapping sectors", () => {
    const b = defaultBowl(); b.sectors[0].rowRun.value = 0;
    const v = defaultVenueProfile(); v.bowl = b; const result = parseVenueProfile(v);
    expect(result.ok).toBe(false); if (!result.ok) expect(result.issues.some(i=>i.path==='venue.bowl.sectors[0].rowRun.value')).toBe(true);
    b.sectors[0].rowRun.value = 0.9; b.sectors[1].fromDeg.value = -50;
    const issues = new IssueList(); parseBowl(b, issues);
    expect(issues.issues.some(i=>i.path==='venue.bowl.sectors[1].fromDeg.value')).toBe(true);
  });
});
